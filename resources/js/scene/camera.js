/**
 * The per-shot camera of the web-comic player: each panel (shot) carries
 *
 *     camera: { move, amount, duration, ease, delay }    entry: 'fade' | 'cut' | 'slide' | 'reveal' | 'match'
 *
 * and plays it over the plate + layers. Pure math here (unit-tested); ParallaxScene applies it to
 * its planes and hands the same frame to ArtworkOverlay, so figures and backdrop move as one
 * picture and parallax by depth stays right during the move:
 *
 *   pan / tilt   the camera turns: every plane shifts the same (no parallax, that is the physics)
 *   truck        the camera slides sideways: a plane shifts by its depth (near moves more)
 *   push / pull  the camera dollies in / out: a plane scales by its depth (the sky barely changes)
 *   shake        a short, decaying jolt, the same for every plane
 *
 * The vocabulary is mirrored in app/Services/Support/ShotCamera.php (validation, the editor and
 * the lesson composer). Distances are % of the stage.
 */
import { easingCurve } from './animations.js'

export const CAMERA_MOVES = ['hold', 'push', 'pull', 'pan-l', 'pan-r', 'tilt-up', 'tilt-down', 'truck-l', 'truck-r', 'shake']
export const CAMERA_ENTRIES = ['fade', 'cut', 'slide', 'reveal', 'match']
export const CAMERA_EASES = ['enter', 'move', 'exit', 'pop', 'linear']

/**
 * Defaults, from the motion rules (motion-design skill), and mutable so the dev tuner reads them
 * here instead of restating them:
 *  - a camera move is on-screen motion that starts and ends at rest: ease `move` (power2.inOut,
 *    easing.js's own "reposition / camera" curve), never linear, no overshoot;
 *  - a dolly or a pan is a slow, calm, shot-long move (calm = smooth, long); a shake is a jolt
 *    (urgency = short, 2-3 oscillations' worth of energy, then settle);
 *  - amplitudes stay inside the plates' 6% bleed at the highest amount, so no edge is ever shown.
 */
export const MOVE_DURATION_S = {
  hold: 0, push: 8, pull: 8, 'pan-l': 10, 'pan-r': 10, 'tilt-up': 7, 'tilt-down': 7,
  'truck-l': 10, 'truck-r': 10, shake: 1.2,
}
export const CAMERA_AMP = {
  zoom: 0.12,     // push/pull: scale gained at depth 1, amount 1
  pan: 2.5,       // pan/tilt: % of the stage either side of centre
  truck: 3,       // truck: % at depth 1 either side of centre
  shake: 0.8,     // shake: % of the stage, peak
  shakeHz: 7,     // shake: main frequency
}

/** How a panel comes in, in ms. Slide = a page transition (400-600ms, decelerating). */
export const ENTRY_MS = { fade: 900, cut: 0, slide: 500, reveal: 600, match: 600 }
export const CAMERA_DEFAULTS = { amount: 1, ease: 'move', delay: 0, entry: 'fade' }
export const CAMERA_RANGES = { amount: [0, 2], duration: [0.3, 30], delay: [0, 10] }

const clamp = (n, [min, max], fallback) => (n !== null && n !== '' && Number.isFinite(Number(n))
  ? Math.min(max, Math.max(min, Number(n)))
  : fallback)

/**
 * Pure: the camera a shot asks for, normalised, or null for a still camera (hold, nothing, junk).
 * A missing duration takes the move's own default.
 *
 * @returns {{move: string, amount: number, duration: number, delay: number, ease: string}|null}
 */
export function cameraSpec (camera) {
  if (!camera || typeof camera !== 'object') return null
  const move = CAMERA_MOVES.includes(camera.move) ? camera.move : null
  if (!move || move === 'hold') return null

  return {
    move,
    amount: clamp(camera.amount, CAMERA_RANGES.amount, CAMERA_DEFAULTS.amount),
    duration: clamp(camera.duration, CAMERA_RANGES.duration, MOVE_DURATION_S[move]),
    delay: clamp(camera.delay, CAMERA_RANGES.delay, CAMERA_DEFAULTS.delay),
    ease: CAMERA_EASES.includes(camera.ease) ? camera.ease : CAMERA_DEFAULTS.ease,
  }
}

/** Pure: the panel entry, normalised. Anything unknown is today's fade. */
export const cameraEntry = (entry) => (CAMERA_ENTRIES.includes(entry) ? entry : CAMERA_DEFAULTS.entry)

/** How long the panel before must stay under this one while it comes in. */
export const entryLingerMs = (entry) => {
  const e = cameraEntry(entry)

  return e === 'fade' || e === 'cut' ? 0 : ENTRY_MS[e]
}

const STILL = { panX: 0, panY: 0, truckX: 0, truckY: 0, zoom: 1 }

/**
 * Pure: where the camera is `t` seconds after the shot appeared.
 * The move runs once (after its delay) and holds its last pose; a shake settles back to centre.
 *
 * @returns {{panX: number, panY: number, truckX: number, truckY: number, zoom: number}}
 */
export function cameraPose (spec, t) {
  if (!spec) return { ...STILL }
  const u = Math.min(1, Math.max(0, (Number(t) - spec.delay) / spec.duration))
  const a = spec.amount

  if (spec.move === 'shake') return { ...STILL, ...shakeOffset(t - spec.delay, u, a) }

  const k = easingCurve(spec.ease)(u)
  const swing = 1 - 2 * k   // +1 → -1 across the move: the content travels through the centre
  switch (spec.move) {
    case 'push': return { ...STILL, zoom: 1 + CAMERA_AMP.zoom * a * k }
    case 'pull': return { ...STILL, zoom: 1 + CAMERA_AMP.zoom * a * (1 - k) }
    // The camera turns right, so the picture travels left.
    case 'pan-r': return { ...STILL, panX: CAMERA_AMP.pan * a * swing }
    case 'pan-l': return { ...STILL, panX: -CAMERA_AMP.pan * a * swing }
    case 'tilt-up': return { ...STILL, panY: -CAMERA_AMP.pan * a * swing }
    case 'tilt-down': return { ...STILL, panY: CAMERA_AMP.pan * a * swing }
    case 'truck-r': return { ...STILL, truckX: CAMERA_AMP.truck * a * swing }
    case 'truck-l': return { ...STILL, truckX: -CAMERA_AMP.truck * a * swing }
    default: return { ...STILL }
  }
}

/**
 * Pure: a second move that starts where the camera already is (a power-meter payoff after the
 * panel's own move): the new move's change from its first pose, added onto `base`. Nothing jumps.
 */
export function chainPose (base, spec, t) {
  const b = base || STILL
  const from = cameraPose(spec, spec ? spec.delay : 0)
  const now = cameraPose(spec, t)

  return {
    panX: b.panX + now.panX - from.panX,
    panY: b.panY + now.panY - from.panY,
    truckX: b.truckX + now.truckX - from.truckX,
    truckY: b.truckY + now.truckY - from.truckY,
    zoom: b.zoom * (now.zoom / from.zoom),
  }
}

/**
 * A jolt: two incommensurate sines (it never repeats visibly), under an envelope that snaps in
 * over the first 10% and dies away over the last 40%. Zero before the delay and after the end.
 */
function shakeOffset (t, u, amount) {
  if (t < 0 || u >= 1) return { panX: 0, panY: 0 }
  const env = u < 0.1 ? u / 0.1 : (u > 0.6 ? (1 - u) / 0.4 : 1)
  const w = 2 * Math.PI * CAMERA_AMP.shakeHz * t
  const peak = CAMERA_AMP.shake * amount * env

  return {
    panX: peak * (0.6 * Math.sin(w) + 0.4 * Math.sin(w * 1.73 + 1.3)),
    panY: peak * 0.7 * (0.6 * Math.sin(w * 1.31 + 0.7) + 0.4 * Math.sin(w * 2.17)),
  }
}

/**
 * Pure: one plane's transform at a pose. depth 0 = pinned sky, 1 = focal plane, >1 = foreground.
 *
 * @returns {{translateX: number, translateY: number, scale: number}}  % of the stage, and a scale
 *          about the stage centre
 */
export function cameraFrame (pose, depth = 1) {
  const d = Number.isFinite(depth) ? Math.max(0, depth) : 1
  const p = pose || STILL
  const tidy = (n) => (Math.abs(n) < 1e-9 ? 0 : Math.round(n * 1e4) / 1e4)

  return {
    translateX: tidy(p.panX + p.truckX * d),
    translateY: tidy(p.panY + p.truckY * d),
    scale: tidy(1 + (p.zoom - 1) * d) || 1,
  }
}

/** Seconds a looping editor preview takes per cycle: the move, then a short rest on its last pose. */
export const PREVIEW_REST_S = 1.5
export const previewCycleS = (spec) => (spec ? spec.delay + spec.duration + PREVIEW_REST_S : 0)

/** Bart's dev tuner: the camera's magnitudes and per-move durations, read from the objects above. */
let tunerOff = null
export function registerCameraTuner () {
  if (tunerOff || typeof window === 'undefined' || !window.__tune?.register) return
  tunerOff = window.__tune.register('Camera moves', [
    ...Object.keys(CAMERA_AMP).map((k) => ({
      key: k, label: k, min: 0, max: CAMERA_AMP[k] * 4, step: 0.01,
      value: CAMERA_AMP[k], apply: (v) => { CAMERA_AMP[k] = Number(v) },
    })),
    ...Object.keys(MOVE_DURATION_S).filter((m) => m !== 'hold').map((m) => ({
      key: `duration_${m}`, label: `${m} duration (s)`, min: 0.3, max: 30, step: 0.1,
      value: MOVE_DURATION_S[m], apply: (v) => { MOVE_DURATION_S[m] = Number(v) },
    })),
    ...Object.keys(ENTRY_MS).filter((e) => e !== 'cut').map((e) => ({
      key: `entry_${e}`, label: `${e} entry (ms)`, min: 0, max: 2000, step: 10,
      value: ENTRY_MS[e], apply: (v) => { ENTRY_MS[e] = Number(v) },
    })),
  ], { tab: 'Lesson' }) ?? null
}
