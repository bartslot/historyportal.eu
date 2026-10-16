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
