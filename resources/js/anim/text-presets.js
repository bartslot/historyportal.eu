/**
 * text-presets.js: a text layer's motion presets (the Motion tab of its inspector) turned into ordinary keys on its
 * timeline rows. A preset is a shortcut that writes keys, not a mode: once picked, every key is the teacher's to
 * move, change or delete like any other, and the player plays them like any other (anim/scene-animation.js).
 *
 * Pure: tracks in, new tracks out. The timeline panel (timeline-panel.js applyTextPreset) saves them as one edit.
 */
import { presetLibrary } from './preset-lay.js'

/** The rows a preset writes. An entrance picked at the playhead replaces whatever entrance these rows had there. */
export const PRESET_PROPERTIES = ['opacity', 'y', 'scale', 'blur', 'reveal', 'revealWords']

/** Typing speed (letters a second) and reading speed (words a second), with the shortest and longest a reveal runs. */
const LETTERS_PER_S = 20
const WORDS_PER_S = 3
const REVEAL_S = [0.5, 4]
/** Appear: the cut, two keys this far apart so both diamonds can be grabbed. */
const APPEAR_S = 0.1
/** Rise: from this far below (% of the stage height). Zoom in: from this share of its size. Blur in: from this blur
 *  (the most the Format panel's Blur gives a text, App\Services\Support\TextLayerStyle). */
const RISE_PCT = 4
const ZOOM_FROM = 0.85
const BLUR_FROM = 2.5

const OUT = 'easeOutCubic'
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const letterCount = (text) => String(text ?? '').replace(/\s+/g, '').length
const wordCount = (text) => String(text ?? '').trim().split(/\s+/).filter(Boolean).length

/**
 * Each preset: how long it runs for this text, and its keys as `[offset s, value, easing?]` per row, from the
 * text's resting values `r` (what it looks like when it has fully come in).
 */
const PRESETS = {
  appear: { span: () => APPEAR_S, keys: (r) => ({ opacity: [[0, 0, 'hold'], [APPEAR_S, r.opacity]] }) },
  fade: { span: () => 0.6, keys: (r, s) => ({ opacity: [[0, 0, OUT], [s, r.opacity]] }) },
  rise: {
    span: () => 0.8,
    keys: (r, s) => ({ opacity: [[0, 0, OUT], [s, r.opacity]], y: [[0, r.y + RISE_PCT, OUT], [s, r.y]] }),
  },
  zoom: {
    span: () => 0.7,
    keys: (r, s) => ({ opacity: [[0, 0, OUT], [s, r.opacity]], scale: [[0, r.scale * ZOOM_FROM, OUT], [s, r.scale]] }),
  },
  blur: {
    span: () => 0.8,
    keys: (r, s) => ({ opacity: [[0, 0, OUT], [s, r.opacity]], blur: [[0, BLUR_FROM, OUT], [s, r.blur]] }),
  },
  typewriter: {
    span: (text) => clamp(letterCount(text) / LETTERS_PER_S, ...REVEAL_S),
    keys: (r, s) => ({ reveal: [[0, 0, 'linear'], [s, 1]] }),
  },
  words: {
    span: (text) => clamp(wordCount(text) / WORDS_PER_S, ...REVEAL_S),
    keys: (r, s) => ({ revealWords: [[0, 0, 'linear'], [s, 1]] }),
  },
  fadeOut: { exit: true, span: () => 0.6, keys: (r, s) => ({ opacity: [[0, r.opacity, 'easeInCubic'], [s, 0]] }) },
}

/**
 * The resting value of each row: `rest(property)` as the caller reads it (the value before the row was keyed, else
 * the live one), with the look's defaults where it has none. A text kept fully transparent comes in to fully opaque,
 * never to nothing; a reveal always ends on every letter.
 */
export function restingValues (rest = () => null) {
  const read = (p, fallback) => (Number.isFinite(rest(p)) ? rest(p) : fallback)
  const opacity = read('opacity', 1)
  return {
    opacity: opacity > 0.05 ? opacity : 1,
    y: read('y', 50),
    scale: read('scale', 1) || 1,
    blur: read('blur', 0),
    reveal: 1,
    revealWords: 1,
  }
}

const library = presetLibrary(PRESETS, PRESET_PROPERTIES, restingValues)
export const ENTRANCE_PRESETS = library.ENTRANCE
export const EXIT_PRESETS = library.EXIT

/** How long preset `id` runs on a text with these words, in seconds. */
export const presetSpan = (id, text = '') => library.span(id, text)

/** Preset `id`'s keys from `start`, as `{ property: [{ time, value, easing? }] }`. */
export const presetKeys = (id, { start = 0, text = '', rest = {} } = {}) => library.keys(id, { start, ctx: text, rest })

/** The text's tracks with preset `id` laid in at `start` (preset-lay.js apply). */
export const applyTextPreset = (tracks, target, id, { start = 0, duration = Infinity, text = '', rest = () => null } = {}) =>
  library.apply(tracks, target, id, { start, duration, ctx: text, rest })
