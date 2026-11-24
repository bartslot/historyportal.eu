/**
 * territory-look.js — how a map scene draws the territory the teacher linked.
 *
 * Bart, 2026-11-23: "standard it could be black, border (like a pen drawing)". Hatching over the
 * whole area was "too much"; what stayed is etching "only [at] the edges", fading toward the middle,
 * and lines that look "more drawn" (map/territory-ink.js). So the default is a black pen line with an
 * etched band inside it, and the teacher can change it per scene (config.territory) and key it on the
 * timeline (the Territory row: fill, border, year).
 *
 * Only the LINKED territory takes this look. The atlas's other territories keep their faint pencil
 * lines, shown only with the Territory borders switch on.
 */

export const FILL_STYLES = ['none', 'etched', 'wash']
/** Bart, 2026-11-24: "border has a couple of settings. it should be solid, ink, dashed, wavy". */
export const BORDER_STYLES = ['ink', 'solid', 'dashed', 'wavy']

/** The ink of the History Lines drawings: near-black, a touch warm. */
export const TERRITORY_DEFAULTS = Object.freeze({
  border_color: '#1b1712',
  border_width: 1.6,
  border_style: 'ink',
  fill_style: 'etched',
  fill_color: '#1b1712',
  fill_strength: 0.3,
})

const HEX = /^#[0-9a-f]{6}$/i
const clamp = (v, lo, hi, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/** A scene's stored look (config.territory, any of its fields missing or junk) as a whole look. */
export const territoryLook = (stored = {}) => {
  const s = stored && typeof stored === 'object' ? stored : {}
  const d = TERRITORY_DEFAULTS
  return {
    border_color: HEX.test(String(s.border_color ?? '')) ? s.border_color : d.border_color,
    border_width: clamp(s.border_width, 0, 12, d.border_width),
    border_style: BORDER_STYLES.includes(s.border_style) ? s.border_style : d.border_style,
    fill_style: FILL_STYLES.includes(s.fill_style) ? s.fill_style : d.fill_style,
    fill_color: HEX.test(String(s.fill_color ?? '')) ? s.fill_color : d.fill_color,
    fill_strength: clamp(s.fill_strength, 0, 1, d.fill_strength),
  }
}

/** The timeline's Territory row: 1 = as the inspector sets it, 0 = gone. Missing = 1. */
export const territoryAnim = (values = {}) => ({
  fill: clamp(values.fill, 0, 1, 1),
  border: clamp(values.border, 0, 1, 1),
})

const HIGHLIGHT = ['boolean', ['feature-state', 'highlight'], false]
const HOVER = ['boolean', ['feature-state', 'hover'], false]

/**
 * Paint of the shared boundaries line layer: the linked territory in the look, every other
 * territory a faint pencil line, or nothing with the Territory borders switch off.
 */
export const linePaint = (look, anim, { showOthers = false, otherColor = '#a08868', otherWidth = 0.6, otherOpacity = 0.3, inked = false } = {}) => ({
  'line-color': ['case', HIGHLIGHT, look.border_color, otherColor],
  'line-width': ['case', HIGHLIGHT, look.border_width, otherWidth],
  // `inked`: the hand-drawn border (territory-ink.js) is on, so the map's own line for it stands down.
  'line-opacity': ['case', HIGHLIGHT, look.border_width > 0 && !inked ? anim.border : 0, showOthers ? otherOpacity : 0],
  // A pen line, not a vector stroke: a hair of softness on its edge.
  'line-blur': ['case', HIGHLIGHT, 0.35, 0],
})

/**
 * The colour wash (the etching is drawn by hand: map/territory-ink.js). Also carries the
 * configurator's hover, the soft pre-selection when a teacher moves over the map to pick a
 * territory, whatever the fill style.
 */
export const washPaint = (look, anim) => ({
  'fill-color': look.fill_color,
  'fill-opacity': ['case',
    HIGHLIGHT, look.fill_style === 'wash' ? look.fill_strength * anim.fill : 0,
    HOVER, 0.12,
    0],
})
