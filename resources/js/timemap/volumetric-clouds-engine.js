/**
 * volumetric-clouds-engine.js — Takram's volumetric clouds, drawn on MapLibre's own GL context.
 *
 * Loaded lazily by volumetric-clouds.js; see that file for when and why. This one is the renderer:
 * a three.js WebGLRenderer on the map's context (the voyage ships already work this way), a
 * post-processing chain of an empty scene, Takram's CloudsEffect and a tone map, and the last pass
 * blended premultiplied over what MapLibre has drawn. Labels sit above this layer's anchor and stay
 * on top; our own haze layer draws after it. Takram's atmosphere is never drawn, only its lookup
 * tables are used to colour the light.
 *
 * THE WEATHER IS OURS. Takram ships a small tiling weather picture; using it would put clouds where
 * the flat deck has none. So the deck's own field (cloud-field.js: NASA cover, the patch atlas, the
 * wind) is baked into a whole-planet texture and handed to Takram as its weather. One line of
 * Takram's shader is swapped so it looks that texture up by longitude and latitude (its own
 * `getSphericalUv`) and not by its tiling cube mapping. The swap is checked: if a later version of
 * the package no longer has that line, the engine refuses to start and the flat deck stays.
 *
 * TALLER THAN LIFE. The camera here is never closer than about 600 km, where real cloud heights are
 * a film. The layers are drawn `scale` times taller, with the noise and the march steps scaled to
 * match, which is the same picture Takram draws from `scale` times closer — the range it is good at.
 *
 * SPEED. Takram marches one pixel in sixteen each frame and rebuilds the rest from earlier frames
 * (temporal upscaling with variance clipping), jittered by blue noise so the grain averages out.
 * The cloud buffer is kept at CSS-pixel size, not device-pixel size, and volumetric-clouds.js asks
 * for half of that again (`level` 1) when the frame rate drops.
 */
import {
  Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode,
} from 'postprocessing'
import {
  AddEquation, CustomBlending, Data3DTexture, ExternalTexture, HalfFloatType, LinearFilter,
  NoColorSpace, NoToneMapping, OneFactor, OneMinusSrcAlphaFactor, PerspectiveCamera, RedFormat,
  RepeatWrapping, Scene, Uniform, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { CLOUD_SHAPE_DETAIL_TEXTURE_SIZE, CLOUD_SHAPE_TEXTURE_SIZE, CloudsEffect } from '@takram/three-clouds'
import { DataTextureLoader, Ellipsoid, parseUint8Array, STBNLoader } from '@takram/three-geospatial'
import { EARTH_RADIUS_M } from '../map/maplibre-compat.js'
import { CLOUD_FIELD_GLSL, CLOUD_FIELD_UNIFORMS, setCloudFieldUniforms } from './cloud-field.js'
import { acquireEquirectTexture } from './equirect-texture.js'
import { buildProgram, EQUIRECT_GLSL } from './planet-mesh.js'
import { createScreenQuad, drawScreenQuad, SCREEN_QUAD_VERTEX_GLSL } from './render-target.js'
import { cameraFromMapLibre, planetToEcef } from './volumetric-camera.js'

/**
 * The cloud layers, at their real sizes in metres: the three from Takram's "custom layers" demo
 * that Bart pointed at. Its fourth is ground fog, which from above is a white film over the map,
 * so that slot is left empty. Every layer reads the one channel our weather has.
 */
const LAYERS = [
  { altitude: 1000, height: 1000, densityScale: 0.2, shapeAmount: 0.8, weatherExponent: 0.6, shadow: true },
  { altitude: 2000, height: 800, densityScale: 0.1, shapeAmount: 0.8, shapeAlteringBias: 0.5 },
  { altitude: 2000, height: 2000, densityScale: 2e-3, shapeAmount: 0.3, veil: true },
  { altitude: 0, height: 0 },
]

/** The baked weather: whole planet, one byte per texel. 4096 wide is about 10 km at the equator. */
const WEATHER_WIDTH = 4096
const WEATHER_HEIGHT = 2048
/** The bake is refreshed a strip at a time, so the wind keeps turning it without a hitch. */
const WEATHER_STRIPS = 16

const TONE_MODES = {
  agx: ToneMappingMode.AGX, neutral: ToneMappingMode.NEUTRAL, aces: ToneMappingMode.ACES_FILMIC,
  reinhard: ToneMappingMode.REINHARD2, linear: ToneMappingMode.LINEAR,
}

const UV_LINE = 'return getCubeSphereUv(position);'
const UV_LINE_OURS = 'return getSphericalUv(position);'

// Takram's spherical lookup: u = lon/2π + 0.5, v = lat/π + 0.5, in ECEF. So texel (u, v) is baked
// from the planet-space point at that longitude and latitude, through the deck's own sampler, and
// thresholded the way the deck thresholds it: where the deck is solid, the weather is 1.
const WEATHER_FRAGMENT = /* glsl */`precision highp float;
varying vec2 v_uv;
uniform vec2 u_weatherRange;   // field values that become weather 0 and weather 1
${EQUIRECT_GLSL}
${CLOUD_FIELD_GLSL}
void main() {
  float lon = (v_uv.x - 0.5) * 6.28318530718;
  float lat = (v_uv.y - 0.5) * 3.14159265359;
  vec3 p = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float field = advectedField(equirectUV(p, u_drift), lat);
  gl_FragColor = vec4(vec3(smoothstep(u_weatherRange.x, u_weatherRange.y, field)), 1.0);
}`

/**
 * The deck's weather as a texture Takram can read. Raw GL, like every other layer here, because the
 * field textures are shared with the deck through equirect-texture.js and are not three.js objects.
 */
const createWeatherBake = (gl, state, repaint) => {
  const program = buildProgram(gl, SCREEN_QUAD_VERTEX_GLSL, WEATHER_FRAGMENT, 'tm-cloud-weather', { es300: true })
  const corner = gl.getAttribLocation(program, 'a_corner')
  const uniforms = Object.fromEntries(CLOUD_FIELD_UNIFORMS.map((name) =>
    [name, gl.getUniformLocation(program, `u_${name}`)]))
  const weatherRange = gl.getUniformLocation(program, 'u_weatherRange')
  const quad = createScreenQuad(gl)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, WEATHER_WIDTH, WEATHER_HEIGHT, 0, gl.RED, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  const framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  if (!complete) throw new Error('weather texture is not renderable')

  // The same three textures the deck holds; acquiring them again shares, it does not reload.
  const sources = {
    field: state.fieldUrl ? acquireEquirectTexture(gl, state.fieldUrl, repaint, { channels: 1 }) : null,
    wind: state.windUrl ? acquireEquirectTexture(gl, state.windUrl, repaint) : null,
    patches: state.patchUrl ? acquireEquirectTexture(gl, state.patchUrl, repaint, { channels: 1 }) : null,
  }
  let strip = -1   // -1: nothing baked yet, so the first bake is the whole texture
  // Which sources have arrived. One landing changes the whole sky, so the next bake is all of it:
  // refreshed a strip at a time, the old sky and the new would sit side by side for sixteen frames.
  let arrived = ''

  return {
    texture,
    framebuffer,
    get hasSource() { return !!(sources.field?.ready || sources.patches?.ready) },
    get baked() { return strip >= 0 },
    /** The next bake is the whole texture again: something about the weather itself changed. */
    restart() { strip = -1 },
    /** Draw the next strip (or everything, the first time). Leaves GL state for the caller to reset. */
    bake(current) {
      if (!this.hasSource) return
      const now = Object.values(sources).map((source) => (source?.ready ? 1 : 0)).join('')
      if (now !== arrived) { arrived = now; strip = -1 }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.viewport(0, 0, WEATHER_WIDTH, WEATHER_HEIGHT)
      gl.useProgram(program)
      gl.disable(gl.BLEND)
      gl.disable(gl.DEPTH_TEST)
      gl.depthMask(false)
      const rows = WEATHER_HEIGHT / WEATHER_STRIPS
      if (strip >= 0) {
        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(0, strip * rows, WEATHER_WIDTH, rows)
      }
      gl.uniform2f(weatherRange, current.weatherLow, current.weatherHigh)
      setCloudFieldUniforms(gl, uniforms, current, { seconds: performance.now() * 0.001, ...sources }, 0, 1, 2)
      drawScreenQuad(gl, quad, corner)
      gl.disable(gl.SCISSOR_TEST)
      gl.depthMask(true)
      strip = (strip + 1) % WEATHER_STRIPS
    },
    dispose() {
      Object.values(sources).forEach((source) => source?.release())
      gl.deleteTexture(texture)
      gl.deleteFramebuffer(framebuffer)
      gl.deleteBuffer(quad)
      gl.deleteProgram(program)
    },
  }
}

/** Swap Takram's tiling weather lookup for its own longitude/latitude one, or refuse to start. */
const useGlobalWeatherLookup = (material) => {
  if (!material.fragmentShader.includes(UV_LINE)) {
    throw new Error('Takram\'s weather lookup has changed; the shader swap no longer applies')
  }
  material.fragmentShader = material.fragmentShader.replace(UV_LINE, UV_LINE_OURS)
  material.needsUpdate = true
}

/**
 * @param {object} opts
 * @param {object}   opts.map
 * @param {WebGL2RenderingContext} opts.gl
 * @param {string}   opts.assetsUrl
 * @param {object}   opts.state    the layer's options; see volumetric-clouds.js
 * @param {function} opts.onReady  called when a texture lands, so the map repaints
 * @param {function} opts.onError  (message) a load failed; the layer gives up
 */
export const createCloudEngine = ({ map, gl, assetsUrl, state: initial, onReady, onError }) => {
  let state = initial
  const canvas = map.getCanvas()
  const sphere = EARTH_RADIUS_M

  const renderer = new WebGLRenderer({ canvas, context: gl, depth: true, alpha: true, antialias: false })
  renderer.autoClear = false
  renderer.setPixelRatio(1)
  renderer.toneMapping = NoToneMapping

  const camera = new PerspectiveCamera()
  camera.matrixAutoUpdate = false
  camera.matrixWorldAutoUpdate = false
  const scene = new Scene()

  const clouds = new CloudsEffect(camera)
  // Takram only draws through its own aerial-perspective effect unless told otherwise. We have
  // none: our haze is a MapLibre layer of its own.
  clouds.skipRendering = false
  clouds.haze = false
  // MapLibre draws a sphere, Takram defaults to the WGS84 ellipsoid; they differ by up to 21 km.
  clouds.ellipsoid = new Ellipsoid(sphere, sphere, sphere)
  clouds.localWeatherRepeat.set(1, 1)
  useGlobalWeatherLookup(clouds.cloudsPass.currentMaterial)
  useGlobalWeatherLookup(clouds.shadowPass.currentMaterial)

  const weather = createWeatherBake(gl, state, onReady)
  clouds.localWeatherTexture = new ExternalTexture(weather.texture)

  const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX })
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0, alpha: true })
  const scenePass = new RenderPass(scene, camera)
  scenePass.clearPass.overrideClearColor = null
  scenePass.clearPass.overrideClearAlpha = 0
  composer.addPass(scenePass)
  composer.addPass(new EffectPass(camera, clouds))
  // The clouds arrive premultiplied (colour × cover). A tone curve and the sRGB curve both lift dark
  // values, so run on premultiplied colour they brighten exactly the thin pixels: a white rim round
  // every cloud. So: divide the cover out, tone, encode, multiply it back in.
  const straighten = new Effect('StraightAlpha', `
    uniform vec3 whiteBalance;
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      outputColor = inputColor.a > 1e-4
        ? vec4(inputColor.rgb / inputColor.a * whiteBalance, inputColor.a) : vec4(0.0);
    }`, { uniforms: new Map([['whiteBalance', new Uniform(new Vector3(1, 1, 1))]]) })
  const present = new Effect('EncodePremultiplied', `
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
      vec3 srgb = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      outputColor = vec4(srgb * inputColor.a, inputColor.a);
    }`)
  const last = new EffectPass(camera, straighten, tone, present)
  last.fullscreenMaterial.encodeOutput = false
  // Over MapLibre's frame, premultiplied: clouds.rgb + ground · (1 - clouds.a).
  Object.assign(last.fullscreenMaterial, {
    transparent: true, blending: CustomBlending, blendEquation: AddEquation,
    blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor,
    depthTest: false, depthWrite: false,
  })
  composer.addPass(last)

  let preset = null
  let level = -1
  // Takram's temporal upscaling marches 1 pixel in 16 a frame. It is what makes the clouds grainy
  // (compared on the M3 Pro, which holds 60 fps without it), so it is the fallback for a machine
  // that cannot keep up, not the default.
  const upscale = () => { clouds.temporalUpscale = !!(state.upscale ?? level > 0) }
  const apply = () => {
    const k = Math.max(1, state.scale)
    // Before the step sizes below: a preset writes its own.
    if (state.preset !== preset) clouds.qualityPreset = preset = state.preset
    upscale()
    LAYERS.forEach(({ veil, ...layer }, index) => {
      clouds.cloudLayers[index].set({
        channel: 'r',
        ...layer,
        altitude: layer.altitude * k,
        height: layer.height * k,
        // Same optical depth through a layer k times thicker.
        densityScale: (layer.densityScale ?? 0.2) * (veil ? state.veil : 1) / k,
        shadow: !!layer.shadow && !!state.shadows,
      })
    })
    clouds.shapeRepeat.setScalar(0.0003 / k)
    clouds.shapeDetailRepeat.setScalar(0.006 / k)
    clouds.clouds.minStepSize = 50 * k
    clouds.clouds.maxStepSize = 1000 * k
    clouds.clouds.perspectiveStepScale = state.stepScale
    clouds.shadow.maxFar = 1e5 * k
    clouds.coverage = state.coverage
    clouds.skyLightScale = state.skyLight
    straighten.uniforms.get('whiteBalance').value.fromArray(state.whiteBalance)
    tone.mode = TONE_MODES[state.tone] ?? ToneMappingMode.AGX
    clouds.sunDirection.copy(planetToEcef(state.sun)).normalize()
    renderer.toneMappingExposure = state.exposure
  }
  apply()

  // ── Textures. Decoration: one that fails takes the 3D clouds with it, never the map. ──
  let pending = 0
  let failed = false
  const landed = () => { pending--; onReady?.() }
  const fail = (what) => () => { if (!failed) { failed = true; onError?.(`could not load ${what}`) } }
  const volume = (texture) => {
    texture.format = RedFormat
    texture.minFilter = texture.magFilter = LinearFilter
    texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping
    texture.colorSpace = NoColorSpace
    texture.needsUpdate = true
    return texture
  }
  const cube = (n) => ({ width: n, height: n, depth: n })

  pending++
  // Higher-order scattering is 8 MB the clouds can do without; the three below are 8.2 MB together.
  Object.assign(clouds, new PrecomputedTexturesLoader({ format: 'binary', higherOrderScattering: false })
    .setType(renderer).load(`${assetsUrl}/atmosphere`, landed, undefined, fail('the atmosphere tables')))
  pending++
  new DataTextureLoader(Data3DTexture, parseUint8Array, cube(CLOUD_SHAPE_TEXTURE_SIZE))
    .load(`${assetsUrl}/clouds/shape.bin`, (t) => { clouds.shapeTexture = volume(t); landed() }, undefined, fail('the cloud shape'))
  pending++
  new DataTextureLoader(Data3DTexture, parseUint8Array, cube(CLOUD_SHAPE_DETAIL_TEXTURE_SIZE))
    .load(`${assetsUrl}/clouds/shape_detail.bin`, (t) => { clouds.shapeDetailTexture = volume(t); landed() }, undefined, fail('the cloud detail'))
  pending++
  new STBNLoader().load(`${assetsUrl}/core/stbn.bin`, (t) => { clouds.stbnTexture = t; landed() }, undefined, fail('the blue noise'))

  const size = new Vector2()

  return {
    get ready() { return pending === 0 && !failed && weather.hasSource },

    /**
     * Draw one frame over the map.
     *
     * @param {ArrayLike<number>} mainMatrix  MapLibre's globe matrix for this frame
     * @param {number} opacity  0..1, the hand-over times the teacher's slider
     * @param {number} seconds  since the previous frame
     * @param {number} quality  0 full, 1 half resolution
     * @returns {boolean} whether anything was drawn
     */
    render(mainMatrix, opacity, seconds, quality) {
      if (cameraFromMapLibre(mainMatrix, camera) === null) return false

      weather.bake(state)
      if (!weather.baked) return false

      renderer.getDrawingBufferSize(size)
      if (size.x !== canvas.width || size.y !== canvas.height) {
        renderer.setSize(canvas.width, canvas.height, false)
        composer.setSize(canvas.width, canvas.height, false)
      }
      if (quality !== level) {
        level = quality
        // CSS pixels, not device pixels: on a Retina screen that is a quarter of the march.
        const css = canvas.clientWidth > 0 ? canvas.clientWidth / canvas.width : 1
        clouds.resolutionScale = Math.min(1, css) * (quality > 0 ? 0.5 : 1)
        upscale()
      }

      clouds.blendMode.opacity.value = opacity
      // The bake above was raw GL; three must not trust what it remembers of the context.
      renderer.resetState()
      composer.render(seconds)
      renderer.resetState()
      return true
    },

    setOptions(next) {
      if (next.weatherLow !== state.weatherLow || next.weatherHigh !== state.weatherHigh) weather.restart()
      state = next
      apply()
    },

    dispose() {
      composer.dispose()
      clouds.dispose()
      weather.dispose()
      // Not renderer.dispose(): the context is MapLibre's.
      renderer.resetState()
    },

    debug: () => ({ renderer, composer, clouds, camera, tone, weather, gl }),
  }
}
