/**
 * territory-look.js — how a map scene draws the territory the teacher linked.
 *
 * Bart, 2026-11-23: "standard it could be black, border (like a pen drawing)", "fill would be
 * transparent ... or maybe etched". So the default is a black ink line with a lightly etched
 * (hatched) inside, and the teacher can change it per scene (config.territory) and key it on the
 * timeline (the Territory row: fill, border, year).
 *
 * Only the LINKED territory takes this look. The atlas's other territories keep their faint pencil
 * lines, shown only with the Territory borders switch on.
 */

export const FILL_STYLES = ['none', 'etched', 'wash']

/** The ink of the History Lines drawings: near-black, a touch warm. */
export const TERRITORY_DEFAULTS = Object.freeze({
  border_color: '#1b1712',
  border_width: 1.6,
  fill_style: 'etched',
  fill_color: '#1b1712',
  fill_strength: 0.55,
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
export const linePaint = (look, anim, { showOthers = false, otherColor = '#a08868' } = {}) => ({
  'line-color': ['case', HIGHLIGHT, look.border_color, otherColor],
  'line-width': ['case', HIGHLIGHT, look.border_width, 0.6],
  'line-opacity': ['case', HIGHLIGHT, look.border_width > 0 ? anim.border : 0, showOthers ? 0.3 : 0],
  // A pen line, not a vector stroke: a hair of softness on its edge.
  'line-blur': ['case', HIGHLIGHT, 0.35, 0],
})

/**
 * The colour wash. Also carries the configurator's hover (the soft pre-selection when a teacher
 * moves over the map to pick a territory), whatever the fill style.
 */
export const washPaint = (look, anim) => ({
  'fill-color': look.fill_color,
  'fill-opacity': ['case',
    HIGHLIGHT, look.fill_style === 'wash' ? look.fill_strength * anim.fill : 0,
    HOVER, 0.12,
    0],
})

/** The etching: a hatch pattern, on the linked territory only. */
export const etchPaint = (look, anim) => ({
  'fill-pattern': ETCH_IMAGE,
  'fill-opacity': ['case', HIGHLIGHT, look.fill_style === 'etched' ? look.fill_strength * anim.fill : 0, 0],
})

export const ETCH_IMAGE = 'territory-etch'

/**
 * The hatch tile: fine diagonal pen strokes in the fill colour, transparent between them. 12 css px
 * between strokes; drawn at 2x so the lines stay crisp on a retina screen. The strokes run corner
 * to corner across the tile and wrap, so neighbouring tiles join into one continuous line.
 */
export const etchTile = (color, { size = 12, ratio = 2 } = {}) => {
  const px = size * ratio
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(px, px) : Object.assign(document.createElement('canvas'), { width: px, height: px })
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, px, px)
  ctx.strokeStyle = color
  ctx.lineWidth = 0.9 * ratio
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const o of [-px, 0, px]) { ctx.moveTo(o, px); ctx.lineTo(o + px, 0) }
  ctx.stroke()
  return { image: ctx.getImageData(0, 0, px, px), pixelRatio: ratio }
}
