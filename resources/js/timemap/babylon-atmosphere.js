/**
 * babylon-atmosphere.js — Babylon's physically based atmosphere, drawn as a MapLibre custom layer.
 *
 * PROTOTYPE (2026-11-26). Bart approved a hybrid: MapLibre keeps the borders, labels, routes and
 * tiles; the air around the planet comes from @babylonjs/addons' Atmosphere instead of our own
 * hand-written haze shell (atmosphere.js). This is the drop-in for that one layer: same id slot,
 * same `setOptions({ sun, strength })` contract, so the sun-follows-view code and the Globe layers
 * panel drive it without knowing which one is mounted.
 *
 * HOW IT SHARES THE CANVAS. Babylon gets an Engine built on MapLibre's own WebGL context, and no
 * Scene ever renders. We call the Atmosphere's three steps ourselves:
 *
 *   prerender  — the lookup tables (transmittance, multiple scattering, sky view). These draw into
 *                Babylon's own render targets, which is only safe BEFORE MapLibre starts its main
 *                pass; MapLibre's custom-layer contract gives us `prerender` for exactly that.
 *   render     — the globe compositor: one full-screen pass that ray-marches the air between the
 *                camera and the planet (or space), blended premultiplied over what MapLibre drew.
 *
 * Babylon's camera is a stub fed from MapLibre's matrix. World space is MapLibre's globe frame (unit
 * sphere, x toward 0°E·0°N's... MapLibre convention: x = sin(lng)cos(lat), y = sin(lat),
 * z = cos(lng)cos(lat)) scaled to metres, so the projection Babylon inverts for its view rays is
 * MapLibre's `mainMatrix` with a scale in front. Babylon puts its world origin on the planet's
 * surface (it adds planetRadius to the camera's y), so the camera's position is handed over with
 * that radius taken off again.
 *
 * GL STATE. Babylon caches state it believes it set; MapLibre does the same. Each side is told to
 * forget: `engine.wipeCaches(true)` before Babylon draws, and MapLibre marks its own context dirty
 * after every custom layer. The vertex array is unbound by hand, because that is the one binding
 * MapLibre would otherwise inherit and draw through.
 */
import { Engine } from '@babylonjs/core/Engines/engine.js'
import { Scene } from '@babylonjs/core/scene.js'
import { Camera } from '@babylonjs/core/Cameras/camera.js'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { Color3 } from '@babylonjs/core/Maths/math.color.js'
import { Atmosphere } from '@babylonjs/addons/atmosphere/atmosphere.js'
import { mapTransform, EARTH_RADIUS_M } from '../map/maplibre-compat.js'
import { AtmospherePhysicalProperties } from '@babylonjs/addons/atmosphere/atmospherePhysicalProperties.js'

const LAYER_ID = 'tm-atmosphere'

/**
 * MapLibre's earth radius, km, handed to Babylon as its planet (Babylon's default is 6360). They
 * must agree to the metre: 11 km of disagreement put a bright seam round the limb, where Babylon's
 * rays missed a planet MapLibre had drawn.
 */
const PLANET_RADIUS_KM = EARTH_RADIUS_M / 1000

/** planet space ([cos·cos, sin, cos·sin], what sun.js returns) → MapLibre's globe frame. */
const toMapLibreFrame = ([x, y, z]) => [z, y, x]

/**
 * @param {object} [opts]
 * @param {number[]} [opts.sun]       direction TO the sun, planet space (sun.js convention)
 * @param {number}   [opts.strength]  overall brightness; 0 hides the layer (the panel's slider)
 * @param {number}   [opts.exposure]  Babylon's exposure, 1 = physically correct
 * @param {number}   [opts.multiScattering]  more = a bluer, softer limb
 */
export const createBabylonAtmosphereLayer = ({
  sun = [0.4, 0.5, 0.75],
  strength = 1,
  exposure = 1,
  multiScattering = 1,
  lightIntensity = 1,
  thickness = 100,
  rayleigh = 1,
  mie = 1,
} = {}) => {
  let map = null
  let engine = null
  let scene = null
  let camera = null
  let light = null
  let atmosphere = null
  let state = { sun, strength, exposure, multiScattering, lightIntensity, thickness, rayleigh, mie }
  let framed = false   // whether prerender framed this frame's camera

  const metres = PLANET_RADIUS_KM * 1000
  const view = Matrix.Identity()
  const projection = Matrix.Identity()
  const position = new Vector3()
  const forward = new Vector3(0, 0, 1)
  const scale = Matrix.Scaling(1 / metres, 1 / metres, 1 / metres)
  const temp = new Matrix()

  const applyLight = () => {
    if (!light) return
    const [x, y, z] = toMapLibreFrame(state.sun)
    const length = Math.hypot(x, y, z) || 1
    light.direction.set(-x / length, -y / length, -z / length)
    light.intensity = state.lightIntensity * state.strength
  }

  const applyAtmosphere = () => {
    if (!atmosphere) return
    atmosphere.exposure = state.exposure
    atmosphere.multiScatteringIntensity = state.multiScattering
    // The physical shell. Earth's is 100 km, a hair at globe zoom; a thicker one is the stylised
    // limb the Time-Map has always had, now with real scattering colours in it.
    const physical = atmosphere.physicalProperties
    if (physical.atmosphereThickness !== state.thickness) physical.atmosphereThickness = state.thickness
    if (physical.rayleighScatteringScale !== state.rayleigh) physical.rayleighScatteringScale = state.rayleigh
    if (physical.mieScatteringScale !== state.mie) physical.mieScatteringScale = state.mie
  }

  /** Feed MapLibre's camera into the stub. Returns false when there is no usable frame. */
  const frameCamera = (args) => {
    const projectionData = args?.defaultProjectionData
    const raw = mapTransform(map)?.cameraPosition
    if (!projectionData?.mainMatrix || !raw) return false

    // Camera position, metres, MapLibre globe frame with the planet at the origin.
    const cx = raw[0] * metres
    const cy = raw[1] * metres
    const cz = raw[2] * metres

    // view = translate(-camera); projection = translate(camera) · scale(1/R) · mainMatrix, so
    // view · projection is exactly MapLibre's own transform. Babylon strips the view's
    // translation before inverting, which leaves the projection carrying all the rotation.
    Matrix.TranslationToRef(-cx, -cy, -cz, view)
    Matrix.FromArrayToRef(projectionData.mainMatrix, 0, temp)
    Matrix.TranslationToRef(cx, cy, cz, projection)
    projection.multiplyToRef(scale, projection)
    projection.multiplyToRef(temp, projection)

    // Babylon's non-floating-origin convention: origin on the surface, planet centre at -R on y.
    position.set(cx, cy - metres, cz)
    const length = Math.hypot(cx, cy, cz) || 1
    forward.set(-cx / length, -cy / length, -cz / length)
    return true
  }

  /**
   * MapLibre 6 draws through uniform buffers bound at fixed indices, and Babylon binds its own at
   * the same indices. Its setDirty() does not cover those, so a frame after Babylon has drawn finds
   * Babylon's (smaller) buffer where its own should be: "uniform buffer that is too small", and the
   * layers above draw wrong. So the bindings are read before Babylon touches anything and put back.
   */
  let uboSlots = 0
  const saved = []
  const saveUniformBuffers = (gl) => {
    if (!gl.getIndexedParameter) return
    uboSlots ||= Math.min(24, gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS))
    for (let i = 0; i < uboSlots; i++) {
      saved[i] = [gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, i),
        gl.getIndexedParameter(gl.UNIFORM_BUFFER_START, i),
        gl.getIndexedParameter(gl.UNIFORM_BUFFER_SIZE, i)]
    }
    saved.generic = gl.getParameter(gl.UNIFORM_BUFFER_BINDING)
  }
  const restoreUniformBuffers = (gl) => {
    if (!gl.getIndexedParameter) return
    for (let i = 0; i < uboSlots; i++) {
      const [buffer, start, size] = saved[i]
      if (buffer && size > 0) gl.bindBufferRange(gl.UNIFORM_BUFFER, i, buffer, start, size)
      else gl.bindBufferBase(gl.UNIFORM_BUFFER, i, buffer)
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, saved.generic)
  }

  return {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(mapInstance, gl) {
      map = mapInstance
      // On MapLibre's context. High-precision matrices: the camera sits ~2e7 m from the origin and
      // a float32 inverse of that projection is visibly noisy at the limb.
      engine = new Engine(gl, false, { useHighPrecisionMatrix: true, doNotHandleContextLost: true }, false)
      // Plain uniforms rather than UBOs: MapLibre 6 owns the uniform-buffer binding points.
      engine.disableUniformBuffers = true
      scene = new Scene(engine)
      scene.autoClear = false
      scene.autoClearDepthAndStencil = false

      camera = new Camera('maplibre', Vector3.Zero(), scene)
      camera.minZ = 1
      camera.getViewMatrix = () => view
      camera.getProjectionMatrix = () => projection
      camera.getForwardRayToRef = (ray, length = 1) => {
        ray.origin.copyFrom(position)
        ray.direction.copyFrom(forward)
        ray.length = length
        return ray
      }
      Object.defineProperty(camera, 'globalPosition', { get: () => position })
      scene.activeCamera = camera

      light = new DirectionalLight('sun', new Vector3(0, -1, 0), scene)
      light.diffuse = new Color3(1, 1, 1)
      applyLight()

      atmosphere = new Atmosphere('air', scene, [light], {
        physicalProperties: new AtmospherePhysicalProperties({ planetRadius: PLANET_RADIUS_KM, atmosphereThickness: state.thickness }),
        // Premultiplied over the ground: the air both adds light and takes some away, so a planet
        // seen through the limb dims as it should. Space is transparent canvas on the Time-Map —
        // the container's gradient shows through — and premultiplied alpha composites onto it.
        applyApproximateTransmittance: true,
        isLinearSpaceComposition: false,
        isLinearSpaceLight: false,
        isDiffuseSkyIrradianceLutEnabled: false,
        isAerialPerspectiveLutEnabled: false,
        // The sky-view table is parameterised around the camera's nadir, and seen from orbit its
        // rows show as rings centred on the screen. Marching every pixel costs more and has none.
        isSkyViewLutEnabled: false,
        exposure: state.exposure,
        multiScatteringIntensity: state.multiScattering,
      })
      applyAtmosphere()
    },

    prerender(gl, args) {
      framed = false
      if (!atmosphere || state.strength <= 0) return
      if (!frameCamera(args)) return
      saveUniformBuffers(gl)
      engine.wipeCaches(true)
      atmosphere.renderGlobalLuts()
      atmosphere._updatePerCameraVariables(camera)
      atmosphere._renderLutsForCamera(camera)
      // The transmittance table is read back to the CPU "at the end of the frame", which Babylon
      // hooks to a scene render that never happens here. Ring that bell ourselves.
      scene.onAfterRenderObservable.notifyObservers(scene)
      engine.restoreDefaultFramebuffer()
      engine.unbindAllAttributes?.()
      gl.bindVertexArray?.(null)
      restoreUniformBuffers(gl)
      framed = true
    },

    render(gl) {
      if (!framed) return
      saveUniformBuffers(gl)
      engine.wipeCaches(true)
      atmosphere.drawGlobeAtmosphereCompositor()
      engine.unbindAllAttributes?.()
      gl.bindVertexArray?.(null)
      gl.useProgram(null)
      restoreUniformBuffers(gl)
      // The tables build over a few frames while their shaders compile; keep asking until they do.
      if (!atmosphere._isGlobalLutsReady) map?.triggerRepaint()
    },

    onRemove() {
      atmosphere?.dispose()
      scene?.dispose()
      // Not engine.dispose(): it would lose MapLibre's context along with its own.
      atmosphere = scene = camera = light = engine = null
      map = null
    },

    setOptions(next = {}) {
      state = { ...state, ...next }
      applyLight()
      applyAtmosphere()
      map?.triggerRepaint()
    },
    getOptions: () => ({ ...state }),
    /** For the proof page and the tuner: the live Babylon objects. */
    debug: () => ({ engine, scene, camera, light, atmosphere, ready: atmosphere?._isGlobalLutsReady }),
  }
}

export const BABYLON_ATMOSPHERE_LAYER_ID = LAYER_ID
