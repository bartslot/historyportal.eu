/**
 * map-presets.js: the Map block's motion presets (the Motion tab when the map is selected) as keys on its timeline
 * rows, the Territory row's Border and Fill (0 gone, 1 as the inspector sets them) and its Year.
 *
 * Bart, 2026-11-24, on the Motion tab showing the scene transition with the map selected: "this field should hold
 * presets about the selection (for all layers), because the layer is selected, not about the scene animations."
 * Picking one replaces the last one picked there (preset-lay.js); the keys are then the teacher's on the timeline.
 */
import { presetLibrary } from './preset-lay.js'

export const MAP_PRESET_PROPERTIES = ['border', 'fill', 'draw', 'year']

const OUT = 'easeOutCubic'
/** Grow: the years run this long, the empire spreading while the narrator speaks. */
const GROW_S = 6
/** With no founding year to go on, Grow starts this many years before the scene's year. */
const GROW_FALLBACK_YEARS = 100

/** Draw: the pen goes once round the border in this long. */
const DRAW_S = 3
const SMOOTH = 'easeInOutCubic'

const PRESETS = {
  // Bart 11-24: "the line that is drawn around a territory from 0% to 100%. that line starts at 0."
  draw: { span: () => DRAW_S, keys: () => ({ draw: [[0, 0, SMOOTH], [DRAW_S, 1]] }) },
  // The line first, then its inside: a border is drawn, then the land within it is claimed.
  drawThenFill: {
    span: () => DRAW_S + 1,
    keys: (r) => ({ draw: [[0, 0, SMOOTH], [DRAW_S, 1]], fill: [[0, 0, 'hold'], [DRAW_S, 0, OUT], [DRAW_S + 1, r.fill]] }),
  },
  fade: { span: () => 1, keys: (r, s) => ({ border: [[0, 0, OUT], [s, r.border]], fill: [[0, 0, OUT], [s, r.fill]] }) },
  // The borders step through the years up to the scene's: the empire grows.
  grow: {
    span: () => GROW_S,
    keys: (r, s) => ({ year: [[0, Math.min(r.from, r.year), 'linear'], [s, r.year]] }),
  },
  fadeOut: { exit: true, span: () => 1, keys: (r, s) => ({ border: [[0, r.border, 'easeInCubic'], [s, 0]], fill: [[0, r.fill, 'easeInCubic'], [s, 0]] }) },
}

/**
 * The resting values: as set (1) unless the teacher keeps a row lower; a row kept at nothing comes in to full.
 * `from`: the year Grow starts at (the territory's founding year when the map knows it).
 */
export function mapRestingValues (rest = () => null) {
  const read = (p, fallback) => (Number.isFinite(rest(p)) ? rest(p) : fallback)
  const share = (p) => { const v = read(p, 1); return v > 0.05 ? v : 1 }
  const year = Math.round(read('year', 1271))
  const from = Math.round(read('from', year - GROW_FALLBACK_YEARS))
  return { border: share('border'), fill: share('fill'), draw: 1, year, from: from < year ? from : year - GROW_FALLBACK_YEARS }
}

const library = presetLibrary(PRESETS, MAP_PRESET_PROPERTIES, mapRestingValues)
export const MAP_ENTRANCE_PRESETS = library.ENTRANCE
export const MAP_EXIT_PRESETS = library.EXIT
export const mapPresetSpan = (id) => library.span(id)
export const applyMapPreset = (tracks, target, id, { start = 0, duration = Infinity, rest = () => null } = {}) =>
  library.apply(tracks, target, id, { start, duration, rest })
