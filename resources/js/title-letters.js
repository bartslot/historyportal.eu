/**
 * The lettered title (TitlePoster::LETTERS): the series in ComicRoma, Bart's carved-sign capitals,
 * the episode small under it in ComicRoma Lettering. ComicRoma has a short character set; a series
 * with a character it lacks is drawn in the plain style instead, never with a fallback face
 * mid-word.
 */

// ComicRoma's cmap, uppercased (it is caps-only): public/fonts/comicroma/ComicRoma.woff2.
// Regenerate after a font rebuild: python3 -c "from fontTools.ttLib import TTFont; ..." (getBestCmap).
export const COMICROMA = " !',-.0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉËÏÖÙÜ’"

/** Pure: the series (before the first ": ") and the episode (after it, '' without a colon). */
export function splitTitle (title = '') {
  const i = title.indexOf(': ')
  return i < 0 ? { series: title, episode: '' } : { series: title.slice(0, i), episode: title.slice(i + 2) }
}

/** Pure: the characters of `text` (as drawn: uppercase) the font lacks, each once. */
export const missingGlyphs = (text = '', charset = COMICROMA) => [...new Set([...text.toUpperCase()].filter(c => !charset.includes(c)))]

/** Pure: the title's series can be drawn in ComicRoma (else the plain style stands in). */
export const canLetter = (title) => missingGlyphs(splitTitle(title).series).length === 0

/**
 * Pure: the largest font size (px, from `size` down by `step` to `min`) at which `measure(size)`
 * reports at most `maxLines` lines and no overflow. `min` when nothing fits.
 *
 * @param {(size: number) => {lines: number, overflow: boolean}} measure
 */
export function fitLines (measure, size, min, maxLines = 2, step = 0.92) {
  for (let s = size; s > min; s *= step) {
    const m = measure(s)
    if (m.lines <= maxLines && !m.overflow) return s
  }
  return min
}
