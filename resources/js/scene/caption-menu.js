// Audio & Subtitles panel + translated captions (pure logic, unit-tested).
//
// A translated caption is a translation of the whole narration LINE, cut into cues over that
// line's own time span, so the timing is the original's. Translations arrive as a map of
// spoken source text → translated text (LessonCaptionsController); a line missing from it shows
// in the original language until it arrives.

import { buildCues, cueChars, lineCues, spokenText } from './captions.js'

const RTL = ['ar']

export const isRtl = (lang) => RTL.includes(String(lang ?? '').slice(0, 2))

/**
 * The Subtitles column: Off, the lesson's own language, then the others in the given order.
 *
 * @param {Array<{code: string, name: string}>} languages
 * @param {string} lessonLang
 * @param {string} offLabel
 */
export const subtitleRows = (languages, lessonLang, offLabel) => {
  const own = languages.find(l => l.code === lessonLang) ?? { code: lessonLang, name: lessonLang }
  return [{ code: '', name: offLabel }, own, ...languages.filter(l => l.code !== lessonLang)]
}

/** One line in the chosen language when it is cached: {text, lang}. */
export const translateLine = (text, set, lang, sourceLang) => {
  const hit = lang !== sourceLang ? set?.texts?.[spokenText(text)] : null
  return hit ? { text: hit, lang } : { text, lang: sourceLang }
}

/**
 * Timed cues for a scene in the chosen language. A scene in lines keeps each narrator line's
 * start and end; a single-script scene spreads the translation over the audio, and only the
 * original may use the TTS character alignment (it indexes the ORIGINAL characters).
 */
export const translatedCues = (source, duration, set, lang, sourceLang) => {
  // A scene in lines has narrator lines; balloons alone (added in the editor) leave the script's captions.
  if (source?.lines?.some?.(l => l?.speaker === 'narrator')) {
    return source.lines
      .filter(l => l?.speaker === 'narrator' && l.end > l.start)
      .flatMap(l => {
        const t = translateLine(l.text, set, lang, sourceLang)
        return lineCues([{ ...l, text: t.text }], cueChars(t.lang)).map(c => ({ ...c, lang: t.lang, source: spokenText(l.text) }))
      })
  }
  const t = translateLine(source?.script, set, lang, sourceLang)
  const alignment = t.lang === sourceLang ? source?.alignment : null
  return buildCues(t.text, duration, alignment, cueChars(t.lang)).map(c => ({ ...c, lang: t.lang, source: spokenText(source?.script) }))
}

/** The faint preview beside a language: the line's first words (first characters in CJK). */
export const previewOf = (text, lang) => {
  const clean = spokenText(text)
  if (!clean) return ''
  if (/^(zh|ja)/.test(String(lang))) return clean.length > 4 ? `${clean.slice(0, 4)}…` : clean
  const words = clean.split(' ')
  return words.length > 2 ? `${words.slice(0, 2).join(' ').replace(/[,.;:!?،؛]+$/, '')}…` : clean
}

/**
 * Keyboard focus in the two-column panel: ↑/↓ within a column, ←/→ between columns (the row is
 * clamped to the new column's length). Returns null for a key the panel does not use.
 *
 * @param {{col: number, row: number}} at
 * @param {string} key  KeyboardEvent.key
 * @param {number[]} lengths  rows per column
 */
export const moveFocus = (at, key, lengths) => {
  const clamp = (v, max) => Math.max(0, Math.min(v, max))
  const cols = lengths.length
  let { col, row } = at
  if (key === 'ArrowDown') row += 1
  else if (key === 'ArrowUp') row -= 1
  else if (key === 'ArrowRight') col += 1
  else if (key === 'ArrowLeft') col -= 1
  else return null
  col = clamp(col, cols - 1)
  // A column with no rows (no other audio language) is skipped over.
  if (!lengths[col]) col = at.col
  return { col, row: clamp(row, (lengths[col] || 1) - 1) }
}
