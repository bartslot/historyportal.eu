/**
 * volumetric-clouds.js — real 3D clouds on the globe, close in, as a MapLibre custom layer.
 *
 * Bart, 2026-11-26: "I wanted volumetric clouds", and of Takram's custom-layers demo: "this was eye
 * opening". So the clouds are Takram's (@takram/three-clouds), not a renderer of ours. This file is
 * the small part every map loads: when to show them, how they hand over from the flat deck
 * (clouds.js), and when to give up. The renderer itself, with three.js post-processing and its
 * textures, is volumetric-clouds-engine.js and is only downloaded the first time the camera comes
 * down far enough to need it.
 *
 * WHY TWO LAYERS. Takram's march is built for a camera near the clouds: it steps by a fraction of
 * the distance to them, so from orbit one step clears the whole layer and nothing is drawn
 * (measured on the M3 Pro: nothing at 8000 km, speckle at 600 km, real cumulus at 40 km). The flat
 * deck is right from orbit and wrong close in. Each does the range it is good at and they cross-fade
 * by camera height, reading the SAME weather, so a cloud is in the same place in both.
 *
 * WHEN IT GIVES UP. No WebGL2, a failed download, a shader the driver rejects, or a frame rate that
 * stays low: the layer switches itself off and the hand-over returns to 0, which leaves the flat
 * deck exactly as it was before this file existed. Nothing here can cost the map its clouds.
 */
import { mapTransform, EARTH_RADIUS_M } from '../map/maplibre-compat.js'
import { CLOUD_FIELD_MOTION } from './cloud-field.js'

export const CLOUD_VOLUME_LAYER_ID = 'tm-cloud-volume'

/**
 * Camera heights, in metres, over which the 3D clouds take over from the flat deck.
 *
 * The Time-Map stops at zoom 7, which puts the camera 180 to 550 km up depending on the tilt, and
 * zoom 6 is about twice that. So the band sits between zoom 6 and zoom 5: all 3D by about zoom 6,
 * all flat by about zoom 5. In height and not in zoom for the reason clouds.js gives for its own
 * fade: zoom carries cos(lat), height does not.
 */
export const VOLUME_FULL_BELOW_M = 900e3
export const VOLUME_NONE_ABOVE_M = 1900e3
/** Start downloading a little before the first cloud is due, so the fade has something to show. */
const PRELOAD_BELOW_M = 2400e3

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Share of the 3D clouds at a camera height: 1 close in, 0 from orbit. NaN is 0. */
export const volumetricFade = (altitudeMetres) =>
  (Number.isFinite(altitudeMetres) ? 1 - smoothstep(VOLUME_FULL_BELOW_M, VOLUME_NONE_ABOVE_M, altitudeMetres) : 0)

/**
 * How much of the sky the 3D clouds have taken over on a map, 0..1, for the flat deck to give up.
 *
 * Written by this layer each frame and read by clouds.js. It is only ever above 0 while the 3D
 * clouds are actually being drawn, so a map without this layer, or one where it gave up, reads 0.
 */
const handover = new WeakMap()
export const cloudHandover = (map) => handover.get(map) ?? 0

/** Frames over 250 ms in a row before they count as the machine being slow, not the tab hidden. */
const STALLS_TO_STEP_DOWN = 8

/**
 * Decide, from frame times alone, when the 3D clouds are costing too much.
 *
 * Steps DOWN only, never back up: a machine that could not hold the frame rate a minute ago will
 * not hold it now, and a quality that hunts up and down is a worse picture than a lower one.
 * Returns the index into `levels` to use; `levels.length` means "off".
 *
 * Two levels (full, half resolution), then off; below 28 fps averaged over `window` frames, step down.
 *
 * @param {object} [opts]
 * @param {number} [opts.window]   frames per judgement
 * @param {number} [opts.settle]   frames ignored after every change (shader compiles, uploads)
 */
const QUALITY_LEVELS = 2
const MIN_FPS = 28
export const createQualityGovernor = ({ window = 90, settle = 45 } = {}) => {
  let level = 0
  let skip = settle
  let frames = 0
  let total = 0
  let stalls = 0
  return {
    get level() { return level },
    /** @param {number} dtMs time since the previous frame */
    sample(dtMs) {
      if (level >= QUALITY_LEVELS || !(dtMs > 0)) return level
      // One gap this long is a hidden tab or a stalled loader, not a slow frame. A run of them is a
      // machine drawing under 4 frames a second, which no average is needed to judge.
      if (dtMs > 250) {
        if (++stalls < STALLS_TO_STEP_DOWN) return level
        level++
        stalls = frames = total = 0
        skip = settle
        return level
      }
      stalls = 0
      if (skip > 0) { skip--; return level }
      frames++
      total += dtMs
      if (frames < window) return level
      const fps = 1000 * frames / total
      frames = 0
      total = 0
      if (fps < MIN_FPS) { level++; skip = settle }
      return level
    },
  }
}

/**
 * @param {object} opts
 * @param {string}   opts.assetsUrl    folder with Takram's atmosphere/, clouds/ and core/ textures
 * @param {number[]} [opts.sun]        direction TO the sun, planet space
 * @param {function} [opts.deckOpacity] () => the teacher's Clouds slider, 0..1; scales these too
 * @param {function} [opts.loadEngine] test seam; defaults to the lazy import
 * Everything else (fieldUrl, patchUrl, windUrl, wind*, animate …) is the flat deck's own weather
 * options, passed through so both layers read one sky.
 */
export const createVolumetricCloudLayer = ({
  assetsUrl = '/vendor/clouds3d',
  loadEngine = () => import('./volumetric-clouds-engine.js'),
  ...options
} = {}) => {
  let map = null
  let gl = null
  let engine = null
  let loading = false
  let dead = false
  let last = 0
  let state = {
    sun: [0.4, 0.5, 0.75], strength: 1,
    // The deck's own drift and wind, so the baked weather moves exactly as the deck's does.
    ...CLOUD_FIELD_MOTION,
    // How many times taller than life the cloud layers are drawn. Real cloud tops out near 12 km,
    // which from 700 km up is a film; the flat deck exaggerates for the same reason (90 km).
    scale: 12,
    coverage: 0.45,
    exposure: 16,
    // Gains on red, green and blue before the tone curve, so a sunlit cloud top is white. Takram's
    // sunlight through its own atmosphere comes out pink against our map (measured: green 12% and
    // blue 6% under red).
    whiteBalance: [1, 1.14, 1.07],
    stepScale: 1.001,
    shadows: true,
    // Takram's quality preset, and how much of the thin high veil (the third layer) is drawn.
    // `upscale` (Takram's temporal upscaling) is left unset: off, until the frame rate asks for it.
    preset: 'medium',
    veil: 1,
    skyLight: 1,
    // AgX greys white cloud; neutral keeps the tops white (compared on the M3 Pro).
    tone: 'neutral',
    // The field values that become "no cloud" and "full cloud" in the baked weather. Wider than the
    // deck's own 0.16 and 0.62 on purpose: with the deck's pair every cloud is a solid slab with a
    // hard rim, with a soft ramp the same weather breaks up into separate cumulus.
    weatherLow: 0.1,
    weatherHigh: 0.95,
    ...options,
  }
  const governor = createQualityGovernor()

  const giveUp = (why) => {
    dead = true
    if (map) handover.set(map, 0)
    engine?.dispose()
    engine = null
    console.warn(`[cloud-volume] off, flat clouds stay: ${why}`)
    map?.triggerRepaint()
  }

  const altitude = () => {
    const raw = mapTransform(map)?.cameraPosition
    return raw ? (Math.hypot(raw[0], raw[1], raw[2]) - 1) * EARTH_RADIUS_M : NaN
  }

  const start = () => {
    loading = true
    loadEngine()
      .then(({ createCloudEngine }) => {
        if (!map || dead) return
        engine = createCloudEngine({ map, gl, assetsUrl, state, onReady: () => map?.triggerRepaint(), onError: giveUp })
      })
      .catch((error) => giveUp(error?.message ?? String(error)))
  }

  return {
    id: CLOUD_VOLUME_LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(mapInstance, glContext) {
      map = mapInstance
      gl = glContext
      // Takram's shaders are GLSL ES 3.00 and its volumes are 3D textures.
      if (typeof gl.texStorage3D !== 'function') dead = true
    },

    render(_gl, args) {
      if (dead || !map) return
      const high = altitude()
      const wanted = volumetricFade(high) * state.strength * (state.deckOpacity?.() ?? 1)
      // Only the globe. Mid-change to another projection the matrix is not a camera.
      const globe = args?.shaderData?.variantName?.startsWith?.('globe') !== false
        && (args?.defaultProjectionData?.projectionTransition ?? 1) >= 0.999
      const matrix = args?.defaultProjectionData?.mainMatrix

      if (!engine) {
        if (!loading && high < PRELOAD_BELOW_M && state.strength > 0) start()
        handover.set(map, 0)
        return
      }
      if (!engine.ready || wanted <= 0.001 || !globe || !matrix) {
        handover.set(map, 0)
        last = 0
        return
      }

      const now = performance.now()
      const dt = last ? now - last : 0
      last = now
      const level = governor.sample(dt)
      if (level >= QUALITY_LEVELS) { giveUp('frame rate stayed low'); return }

      let drawn = false
      try {
        drawn = engine.render(matrix, wanted, dt / 1000, level)
      } catch (error) {
        giveUp(error?.message ?? String(error))
        return
      }
      // The deck gives up exactly as much as was drawn over it, and only if it was drawn.
      handover.set(map, drawn ? volumetricFade(high) * state.strength : 0)
      // The march rebuilds the picture over several frames and the weather drifts.
      map.triggerRepaint()
    },

    onRemove() {
      if (map) handover.delete(map)
      engine?.dispose()
      engine = null
      map = null
      gl = null
    },

    setOptions(next = {}) {
      state = { ...state, ...next }
      engine?.setOptions(state)
      map?.triggerRepaint()
    },
    getOptions: () => ({ ...state }),
    /** For the proof page and the harness: what state the layer is in. */
    get status() { return dead ? 'off' : engine?.ready ? 'ready' : loading ? 'loading' : 'idle' },
    debug: () => engine?.debug?.(),
  }
}
