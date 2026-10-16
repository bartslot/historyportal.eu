/**
 * Split scene: one scene shown as two comic panels, stacked (h) or side by side (v), with a white
 * gutter between them and a thin ink line on each panel's gutter edge (Bart, 2026-10-16).
 *
 * Data: scene.config.split = { dir: 'h'|'v', at: 0.25..0.75 }; the two panels are shots[0] and
 * shots[1], each with its own backdrop, figures, camera and focus. Without config.split a scene is
 * Standard (the layered ParallaxScene). The retired view modes (config.slideshow_mode 'parallax' /
 * 'drawing', config.parallax) read as Standard: nothing reads them any more.
 *
 * Pure maths only; SplitStage.js is the DOM. Mirrors App\Services\Support\SceneSplit on the server.
 */

/** Everything is measured at this stage width and scaled with the stage. */
export const REF_WIDTH = 1920
/** White gutter between the panels, px at REF_WIDTH. */
export const GUTTER_REF = 10
/** Never a thinner gutter than this: on a phone the white must still read as a gap. */
export const GUTTER_MIN_PX = 4
/** Ink line on each panel edge, px at REF_WIDTH. */
export const INK_REF = 2
/** Below this stage width a side-by-side split stacks, so neither panel is too thin to read. */
export const NARROW_PX = 640
export const AT_MIN = 0.25
export const AT_MAX = 0.75
export const AT_DEFAULT = 0.5

/** config.split as stored → { dir, at } or null (not a split scene). */
export function normalizeSplit (raw) {
  if (!raw || typeof raw !== 'object') return null
  const dir = raw.dir === 'v' ? 'v' : 'h'
  const n = Number(raw.at)
  const at = Number.isFinite(n) ? Math.min(AT_MAX, Math.max(AT_MIN, n)) : AT_DEFAULT

  return { dir, at }
}

/** The scene's view mode: 'split' or 'standard'. Every older mode (parallax, drawing) is standard. */
export function sceneMode (config) {
  return normalizeSplit(config?.split) ? 'split' : 'standard'
}

/** Gutter and ink line in real px for a stage this wide. */
export function splitStrokes (stageW) {
  const k = (Number(stageW) || REF_WIDTH) / REF_WIDTH

  return { gutter: Math.max(GUTTER_MIN_PX, GUTTER_REF * k), ink: Math.max(1, INK_REF * k) }
}

/**
 * The two panel boxes (px, in the stage) for a split on a W×H stage. Full bleed on the outer edges
 * (as the reference page), the gutter between them. A vertical split on a narrow stage stacks.
 *
 * @returns {{dir: 'h'|'v', gutter: number, ink: number, panels: Array<{x:number,y:number,w:number,h:number}>}|null}
 */
export function splitLayout (split, stageW, stageH) {
  const s = normalizeSplit(split)
  if (!s || !(stageW > 0) || !(stageH > 0)) return null
  const dir = s.dir === 'v' && stageW < NARROW_PX ? 'h' : s.dir
  const { gutter, ink } = splitStrokes(stageW)
  const total = dir === 'h' ? stageH : stageW
  const first = Math.max(0, total * s.at - gutter / 2)
  const second = Math.max(0, total - first - gutter)
  const panels = dir === 'h'
    ? [{ x: 0, y: 0, w: stageW, h: first }, { x: 0, y: first + gutter, w: stageW, h: second }]
    : [{ x: 0, y: 0, w: first, h: stageH }, { x: first + gutter, y: 0, w: second, h: stageH }]

  return { dir, gutter, ink, panels }
}

/** A panel's focus point as CSS object-position ('50% 50%' when unset). x/y are 0..100. */
export function focusPosition (focus) {
  const pct = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50
  }

  return `${pct(focus?.x)}% ${pct(focus?.y)}%`
}

/** How far a panel's picture zooms in (1 = the plain cover crop). Same range as SceneSplit::ZOOM. */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 4
/** Within this of the middle, a dragged divider settles on it. */
const AT_SNAP = 0.015
/** Wheel delta → zoom factor: one notch (~100) is about 16%. */
const WHEEL_RATE = 0.0015

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** A panel's focus as stored → { x, y, zoom }: x/y 0..100 (50 when unset), zoom 1..4. */
export function normalizeFocus (focus) {
  const pct = (v) => (Number.isFinite(Number(v)) && v !== null ? clamp(Number(v), 0, 100) : 50)
  const z = Number(focus?.zoom)

  return { x: pct(focus?.x), y: pct(focus?.y), zoom: Number.isFinite(z) ? clamp(z, ZOOM_MIN, ZOOM_MAX) : 1 }
}

/** The pointer `px` along a split `total` px long → the split position, clamped, snapped to the middle. */
export function atFromPointer (px, total) {
  const at = clamp(total > 0 ? px / total : AT_DEFAULT, AT_MIN, AT_MAX)

  return Math.abs(at - AT_DEFAULT) < AT_SNAP ? AT_DEFAULT : Math.round(at * 1000) / 1000
}

/**
 * A pane dragged by (dx, dy) px in a w×h box → its new focus. The picture follows the pointer: a
 * drag to the right shows more of its left, so x goes DOWN. A drag across the whole box moves the
 * focus from one edge to the other.
 */
export function panFocus (focus, dx, dy, w, h) {
  const f = { x: 50, y: 50, ...(focus || {}) }
  const round = (v) => Math.round(v * 10) / 10
  const next = { ...f, x: round(clamp(f.x - (w > 0 ? dx / w * 100 : 0), 0, 100)), y: round(clamp(f.y - (h > 0 ? dy / h * 100 : 0), 0, 100)) }

  return next
}

/** The zoom after one wheel event: wheel up (negative delta) zooms in. */
export function wheelZoom (zoom, deltaY) {
  const z = (Number(zoom) || 1) * Math.exp(-(Number(deltaY) || 0) * WHEEL_RATE)

  return Math.round(clamp(z, ZOOM_MIN, ZOOM_MAX) * 1000) / 1000
}
