/**
 * narration-clock.js — the spoken word as a unit of time.
 *
 * `scenes.audio_alignment` stores one entry per SPOKEN character, `{character, start_time,
 * end_time}`, normalised by app/Services/Support/NarrationTiming.php from whichever provider
 * spoke it. shot-sync.js already uses it to switch a storyboard shot when the narration reaches a
 * sentence; this module turns the same data into words, so a keyframe can land ON a word.
 *
 * That is the whole reason the timeline is worth building rather than borrowing. Figma has no
 * narration to snap to, and Keynote fires a build on a click or after a delay. Dragging a camera
 * keyframe onto "Samarkand" is one gesture, and it replaces a teacher guessing at 12.4 seconds.
 */

const usable = (e) => e && typeof e.character === 'string' && Number.isFinite(e.start_time)

// Trailing and leading punctuation is spoken time but not part of the word a teacher reads.
const LABEL_TRIM = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu

// A run that ends a sentence: a full stop, ? or ! (or an ellipsis), with any closing quote or bracket after it.
const SENTENCE_END = /[.!?…]["'”’»)\]]*$/u

/**
 * The narration as words, each with the time its first character begins and its last one ends.
 *
 * A word is a run of non-whitespace characters — the same rule shot-sync.js normalises by, rather
 * than a second definition that could drift from it.
 *
 * @param {Array<{character: string, start_time: number, end_time: number}>|null} alignment
 * @returns {Array<{word: string, start: number, end: number}>}
 */
export const wordSpans = (alignment) => {
  const chars = (alignment ?? []).filter(usable)
  const spans = []

  let i = 0
  while (i < chars.length) {
    if (/\s/.test(chars[i].character)) { i++; continue }

    let j = i
    while (j < chars.length && !/\s/.test(chars[j].character)) j++

    const raw = chars.slice(i, j).map((c) => c.character).join('')
    const word = raw.replace(LABEL_TRIM, '')
    if (word) {
      spans.push({
        word,
        start: chars[i].start_time,
        end: Number.isFinite(chars[j - 1].end_time) ? chars[j - 1].end_time : chars[j - 1].start_time,
        // Said as part of the raw run, before LABEL_TRIM took it away: the sentence ends here.
        sentenceEnd: SENTENCE_END.test(raw),
      })
    } else if (spans.length && SENTENCE_END.test(raw)) {
      // A lone mark ("…" spoken on its own) still closes the sentence before it.
      spans[spans.length - 1].sentenceEnd = true
    }
    i = j
  }

  return spans
}

/**
 * The word whose START is nearest `time`, if one is within `tolerance` seconds. Null otherwise, so
 * a placement outside reach stays exactly where the hand put it.
 *
 * Tolerance is in seconds and belongs to the CALLER, which converts it from pixels — snapping
 * should feel the same at every zoom level, and a fixed number of seconds would not.
 */
export const nearestWordStart = (spans, time, tolerance) => {
  let best = null
  let bestGap = Infinity

  for (const span of spans ?? []) {
    const gap = Math.abs(span.start - time)
    if (gap <= tolerance && gap < bestGap) {
      best = span
      bestGap = gap
    }
  }

  return best
}

/** `time` pulled onto the nearest word start when one is in reach, or left alone when none is. */
export const snapTime = (spans, time, tolerance) => nearestWordStart(spans, time, tolerance)?.start ?? time

/** The word being spoken at `time`, or null in the silence between words. */
export const wordAt = (spans, time) =>
  (spans ?? []).find((s) => time >= s.start && time < s.end) ?? null

/**
 * The sentence the playhead is in, as its words, and which of them is being spoken right now.
 *
 * The sentence is the one holding the last word to have STARTED, so it stays on screen through the
 * silence between words and between sentences instead of blinking out. Before the first word it is
 * the first sentence. `current` is the index of the word being spoken, or -1 in a silence, so the
 * readout never lights a word that is not being said.
 *
 * @returns {{ words: Array<{word: string, start: number, end: number}>, current: number }}
 */
export const sentenceAt = (spans, time) => {
  const list = spans ?? []
  if (!list.length) return { words: [], current: -1 }

  let last = 0
  for (let k = 0; k < list.length; k++) {
    if (list[k].start <= time) last = k
    else break
  }

  let from = last
  while (from > 0 && !list[from - 1].sentenceEnd) from--
  let to = last
  while (to < list.length - 1 && !list[to].sentenceEnd) to++

  const words = list.slice(from, to + 1)
  const spoken = wordAt(words, time)
  return { words, current: spoken ? words.indexOf(spoken) : -1 }
}
