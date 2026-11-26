/**
* DRAFT, UNTESTED (2026-11-26): written but never run; stopped by Bart for a planned approach.
 * volumetric-clouds.js — Takram's volumetric clouds (@takram/three-clouds) as a MapLibre custom layer.
 *
 * Bart, 2026-11-26: "I wanted volumetric clouds." Our flat cloud deck (clouds.js) stays for the
 * globe view, where Takram's ray march draws nothing (measured on the M3 Pro: no clouds at 8000 km,
 * speckle at 600 km, real cumulus at 40 km). So this layer fades IN as the camera comes down to a
 * region and the flat deck fades OUT over the same band.
 *
 * HOW IT SHARES THE CANVAS. A three.js WebGLRenderer on MapLibre's own GL context. Each frame the
 * postprocessing composer renders an empty scene (clear, transparent) through CloudsEffect and a
 * tone map, and the last pass is blended premultiplied over what MapLibre has drawn, so the clouds
 * sit on the ground and the labels (above this layer's anchor) stay on top.
 *
 * THE CAMERA. Takram works in ECEF metres. MapLibre hands us `mainMatrix`: its unit globe frame to
 * clip space. That is turned into an ECEF view-projection and split exactly into a rigid view and a
 * perspective (see decompose()), because Takram's temporal reprojection needs a real camera, not
 * a frozen product of the two.
 *
 * THE PLANET. Takram defaults to the WGS84 ellipsoid; MapLibre draws a sphere of 6371.0088 km. They
 * differ by up to 15 km, which is more than the whole cloud layer is thick, so the clouds are told
 * the planet is MapLibre's sphere.
 */
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode,
} from 'postprocessing'
import {
  CustomBlending, Data3DTexture, HalfFloatType, LinearFilter, LinearMipMapLinearFilter, Matrix4,
  NoColorSpace, NoToneMapping, OneFactor, OneMinusSrcAlphaFactor, PerspectiveCamera, RedFormat,
  RepeatWrapping, Scene, TextureLoader, Vector3, WebGLRenderer, AddEquation,
} from 'three'
import { PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { CLOUD_SHAPE_DETAIL_TEXTURE_SIZE, CLOUD_SHAPE_TEXTURE_SIZE, CloudsEffect } from '@takram/three-clouds'
import { DataTextureLoader, Ellipsoid, parseUint8Array, STBNLoader } from '@takram/three-geospatial'
import { mapTransform, EARTH_RADIUS_M } from '../map/maplibre-compat.js'

const LAYER_ID = 'tm-volumetric-clouds'

/**
 * Camera altitude band, metres, over which the 3D clouds take over from the flat deck. Below
 * FULL they are all there is; above NONE they are off and not rendered at all (no cost).
 */
const FULL_BELOW_M = 120e3
const NONE_ABOVE_M = 350e3

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Fade of the 3D clouds for a camera altitude: 1 close in, 0 from orbit. */
export const volumetricFade = (altitudeMetres) => 1 - smoothstep(FULL_BELOW_M, NONE_ABOVE_M, altitudeMetres)

/** planet space (sun.js: [cos·cos, sin, cos·sin]) → ECEF ([cos·cos, cos·sin, sin]). */
const planetToEcef = ([x, y, z]) => new Vector3(x, z, y)

// ECEF → MapLibre's globe frame (x = cos·sin, y = sin, z = cos·cos): ml = (ecef.y, ecef.z, ecef.x).
const ECEF_TO_ML = new Matrix4().set(
  0, 1, 0, 0,
  0, 0, 1, 0,
  1, 0, 0, 0,
  0, 0, 0, 1,
)

/**
 * Split an ECEF→clip matrix into a camera: world matrix (rigid) + perspective projection.
 *
 * With the camera at c, A = M·T(c) maps camera-relative points to clip and equals P·R, where R is
 * the view rotation and P = [[a,0,b,0],[0,c,d,0],[0,0,e,f],[0,0,-1,0]]. Its rows give R directly:
 * row 3 is -R₂; rows 0 and 1 are R₀, R₁ scaled plus an off-axis share of R₂ (MapLibre's centre
 * offset); row 2 is e·R₂ with f in the last column. Exact, no fitting.
 */
const decompose = (M, c, camera) => {
  const A = new Matrix4().makeTranslation(c.x, c.y, c.z).premultiply(M)
  const e = A.elements   // column-major: row r, column k is e[k * 4 + r]
  const row = (r) => new Vector3(e[r], e[4 + r], e[8 + r])
  const r2 = row(3).negate()
  const s = r2.length()
  r2.divideScalar(s)
  const fit = (r) => {
    const v = row(r).divideScalar(s)
    const off = v.dot(r2)
    v.addScaledVector(r2, -off)
    const scale = v.length()
    return { axis: v.divideScalar(scale), scale, off }
  }
  const x = fit(0)
  const y = fit(1)
  const zRow = row(2).divideScalar(s)
  const ez = zRow.dot(r2)
  const fz = e[14] / s

  // Camera looks down -Z: world matrix columns are R's rows (x, y, -forward... R₂ is already +Z).
  camera.matrixWorld.makeBasis(x.axis, y.axis, r2).setPosition(c)
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  camera.position.copy(c)

  // Perspective with near/far recovered from e, f; ez = -(f+n)/(f-n), fz = -2fn/(f-n).
  const near = fz / (ez - 1)
  const far = fz / (ez + 1)
  camera.near = near
  camera.far = Math.abs(far)
  camera.projectionMatrix.set(
    x.scale, 0, x.off, 0,
    0, y.scale, y.off, 0,
    0, 0, ez, fz,
    0, 0, -1, 0,
  )
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}

/**
 * @param {object} opts
 * @param {string}   opts.assetsUrl  folder holding atmosphere/, clouds/ and core/stbn.bin
 * @param {number[]} [opts.sun]      direction TO the sun, planet space
 * @param {number}   [opts.coverage] 0..1
 * @param {string}   [opts.quality]  Takram preset: low | medium | high | ultra
 * @param {function} [opts.onFade]   (fade 0..1) per frame, so the flat deck can fade the other way
 */
export const createVolumetricCloudLayer = ({
  assetsUrl,
  sun = [0.4, 0.5, 0.75],
  coverage = 0.35,
  quality = 'medium',
  exposure = 10,
  onFade = null,
} = {}) => {
  let map = null
  let renderer = null
  let composer = null
  let clouds = null
  let lastFade = -1
  let state = { sun, coverage, quality, exposure, strength: 1 }

  const camera = new PerspectiveCamera()
  camera.matrixAutoUpdate = false
  camera.matrixWorldAutoUpdate = false
  const scene = new Scene()
  const sphere = EARTH_RADIUS_M
  const toUnit = new Matrix4().makeScale(1 / sphere, 1 / sphere, 1 / sphere)
  const ml = new Matrix4()
  const M = new Matrix4()
  const position = new Vector3()

  const apply = () => {
    if (!clouds) return
    clouds.sunDirection.copy(planetToEcef(state.sun)).normalize()
    clouds.coverage = state.coverage
    renderer.toneMappingExposure = state.exposure
  }

  const load = () => {
    const repeat = (t) => {
      t.minFilter = LinearMipMapLinearFilter; t.magFilter = LinearFilter
      t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = NoColorSpace; t.needsUpdate = true
      map?.triggerRepaint()
      return t
    }
    const volume = (t) => {
      t.format = RedFormat; t.minFilter = t.magFilter = LinearFilter
      t.wrapS = t.wrapT = t.wrapR = RepeatWrapping; t.colorSpace = NoColorSpace; t.needsUpdate = true
      map?.triggerRepaint()
      return t
    }
    Object.assign(clouds, new PrecomputedTexturesLoader({ format: 'binary' }).setType(renderer).load(`${assetsUrl}/atmosphere`))
    new TextureLoader().load(`${assetsUrl}/clouds/local_weather.png`, (t) => { if (clouds) clouds.localWeatherTexture = repeat(t) })
    new TextureLoader().load(`${assetsUrl}/clouds/turbulence.png`, (t) => { if (clouds) clouds.turbulenceTexture = repeat(t) })
    const size = (n) => ({ width: n, height: n, depth: n })
    new DataTextureLoader(Data3DTexture, parseUint8Array, size(CLOUD_SHAPE_TEXTURE_SIZE))
      .load(`${assetsUrl}/clouds/shape.bin`, (t) => { if (clouds) clouds.shapeTexture = volume(t) })
    new DataTextureLoader(Data3DTexture, parseUint8Array, size(CLOUD_SHAPE_DETAIL_TEXTURE_SIZE))
      .load(`${assetsUrl}/clouds/shape_detail.bin`, (t) => { if (clouds) clouds.shapeDetailTexture = volume(t) })
    new STBNLoader().load(`${assetsUrl}/core/stbn.bin`, (t) => { if (clouds) { clouds.stbnTexture = t; map?.triggerRepaint() } })
  }

  const fadeFor = () => {
    const raw = mapTransform(map)?.cameraPosition
    if (!raw) return 0
    const altitude = (Math.hypot(raw[0], raw[1], raw[2]) - 1) * sphere
    return volumetricFade(altitude) * state.strength
  }

  return {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(mapInstance, gl) {
      map = mapInstance
      const canvas = map.getCanvas()
      renderer = new WebGLRenderer({ canvas, context: gl, depth: true, alpha: true, antialias: false })
      renderer.autoClear = false
      renderer.setPixelRatio(1)
      renderer.setSize(canvas.width, canvas.height, false)
      renderer.toneMapping = NoToneMapping

      clouds = new CloudsEffect(camera)
      // Takram only draws through its AerialPerspective unless told otherwise; we have none.
      clouds.skipRendering = false
      clouds.qualityPreset = state.quality
      clouds.ellipsoid = new Ellipsoid(sphere, sphere, sphere)
      clouds.localWeatherVelocity.set(0.0005, 0)

      composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0, alpha: true })
      const render = new RenderPass(scene, camera)
      render.clearPass.overrideClearColor = null
      render.clearPass.overrideClearAlpha = 0
      composer.addPass(render)
      composer.addPass(new EffectPass(camera, clouds))
      const last = new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.AGX }))
      // Over MapLibre's frame, premultiplied: clouds.rgb + ground · (1 - clouds.a).
      Object.assign(last.fullscreenMaterial, {
        transparent: true, blending: CustomBlending, blendEquation: AddEquation,
        blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
        blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor,
        depthTest: false, depthWrite: false,
      })
      composer.addPass(last)
      composer.setSize(canvas.width, canvas.height, false)

      apply()
      load()
    },

    render(gl, args) {
      if (!composer) return
      const fade = fadeFor()
      if (fade !== lastFade) { onFade?.(fade); lastFade = fade }
      if (fade <= 0.001) return
      const projection = args?.defaultProjectionData
      const raw = mapTransform(map)?.cameraPosition
      if (!projection?.mainMatrix || !raw) return

      // ECEF metres → clip: mainMatrix · scale(1/R) · (ECEF → MapLibre frame).
      ml.fromArray(projection.mainMatrix)
      M.copy(ml).multiply(toUnit).multiply(ECEF_TO_ML)
      position.set(raw[2] * sphere, raw[0] * sphere, raw[1] * sphere)
      decompose(M, position, camera)

      const canvas = map.getCanvas()
      const size = renderer.getDrawingBufferSize(new Vector3())
      if (size.x !== canvas.width || size.y !== canvas.height) {
        renderer.setSize(canvas.width, canvas.height, false)
        composer.setSize(canvas.width, canvas.height, false)
      }

      clouds.blendMode.opacity.value = fade
      renderer.resetState()
      composer.render()
      renderer.resetState()
      gl.bindVertexArray?.(null)
      // The ray march accumulates over frames (temporal upscaling) and the weather drifts.
      map.triggerRepaint()
    },

    onRemove() {
      composer?.dispose()
      clouds?.dispose()
      // Not renderer.dispose()/forceContextLoss: the context is MapLibre's.
      composer = clouds = renderer = null
      onFade?.(0)
      map = null
    },

    setOptions(next = {}) {
      state = { ...state, ...next }
      if (next.quality && clouds) clouds.qualityPreset = next.quality
      apply()
      map?.triggerRepaint()
    },
    getOptions: () => ({ ...state }),
    debug: () => ({ renderer, composer, clouds, camera }),
  }
}

export const VOLUMETRIC_CLOUD_LAYER_ID = LAYER_ID
