import { describe, it, expect } from 'vitest'
import { wordSpans, nearestWordStart, snapTime, wordAt } from '../narration-clock.js'
import alignment from './fixtures/alignment-scene-192.json'

/**
 * The narration is the clock. `scenes.audio_alignment` gives one entry per SPOKEN character, so
 * every word in a lesson already has a timestamp — which is what lets a keyframe snap to a word
 * instead of to a number a teacher had to guess.
 *
 * The fixture is a verbatim dump of scene 192's stored alignment (480 characters, 28.746s), NOT a
 * hand-written object in the shape this module wants. A fixture built to suit its only reader
 * cannot catch the reader being wrong about the server, and that has cost this project a green
 * suite over a dead feature more than once.
 *
 * Assertions below are absolute where the data makes them absolute: 80 words, "Netherlands" at
 * 0.267s, "sea" at 2.856s. A suite of relative checks is satisfied by a uniform offset.
 */

describe('wordSpans', () => {
  const spans = wordSpans(alignment)

  it('finds every word in the narration', () => {
    // 81 runs of non-whitespace, one of which is a lone em dash at 17.16s — see below.
    expect(spans).toHaveLength(80)
  })

  it('does not offer a lone punctuation mark as somewhere to snap', () => {
    // The script has a standalone em dash at char 284 (17.16s). It is spoken time, but it is not
    // a word, and a keyframe that landed on it would read as landing on nothing.
    expect(spans.map((s) => s.word)).not.toContain('—')
    expect(spans.some((s) => s.start === 17.16)).toBe(false)
  })

  it('times each word from its first character to its last', () => {
    expect(spans[0]).toMatchObject({ word: 'The', start: 0 })
    expect(spans[1]).toMatchObject({ word: 'Netherlands', start: 0.267, end: 0.708 })
    expect(spans[7].word).toBe('sea')
    expect(spans[7].start).toBe(2.856)
  })

  it('runs to the end of the audio', () => {
    expect(spans.at(-1).end).toBe(28.746)
  })

  it('keeps punctuation out of the label but not out of the timing', () => {
    const last = spans.at(-1)
    expect(last.word).toBe('holding')
    expect(last.end).toBe(28.746)     // the full stop is still spoken time
  })

  it('is empty rather than broken for a scene with no narration', () => {
    expect(wordSpans([])).toEqual([])
    expect(wordSpans(null)).toEqual([])
    expect(wordSpans(undefined)).toEqual([])
  })

  it('ignores entries the provider left without usable times', () => {
    const spans = wordSpans([
      { character: 'h', start_time: 1, end_time: 1.1 },
      { character: 'i', start_time: null, end_time: undefined },
    ])
    expect(spans).toHaveLength(1)
    expect(spans[0]).toMatchObject({ word: 'h', start: 1 })
  })
})

describe('nearestWordStart', () => {
  const spans = wordSpans(alignment)

  it('finds the word a dropped keyframe is closest to', () => {
    expect(nearestWordStart(spans, 2.9, 0.2).word).toBe('sea')       // "sea" starts at 2.856
    expect(nearestWordStart(spans, 0.30, 0.2).word).toBe('Netherlands')
  })

  it('refuses when nothing is close enough, so a free placement stays free', () => {
    expect(nearestWordStart(spans, 2.9, 0.01)).toBeNull()
  })

  it('picks the nearer of two candidates rather than the first it meets', () => {
    // "decided" 2.241, "the" 2.74 — 2.7 is nearer "the".
    expect(nearestWordStart(spans, 2.7, 0.6).word).toBe('the')
    expect(nearestWordStart(spans, 2.3, 0.6).word).toBe('decided')
  })

  it('is null with nothing to snap to', () => {
    expect(nearestWordStart([], 1, 1)).toBeNull()
  })
})

describe('snapTime', () => {
  const spans = wordSpans(alignment)

  it('returns the word start when one is in reach', () => {
    expect(snapTime(spans, 2.9, 0.2)).toBe(2.856)
  })

  it('returns the time untouched when none is', () => {
    expect(snapTime(spans, 2.9, 0.01)).toBe(2.9)
    expect(snapTime([], 4.2, 1)).toBe(4.2)
  })
})

describe('wordAt', () => {
  const spans = wordSpans(alignment)

  it('names the word being spoken at a moment', () => {
    expect(wordAt(spans, 0.5).word).toBe('Netherlands')
    expect(wordAt(spans, 2.9).word).toBe('sea')
  })

  it('is null in the silence between words', () => {
    expect(wordAt(spans, 0.24)).toBeNull()       // after "The" ends at 0.209, before 0.267
  })

  it('is null past the end of the narration', () => {
    expect(wordAt(spans, 99)).toBeNull()
  })
})
