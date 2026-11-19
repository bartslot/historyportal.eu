import { describe, it, expect } from 'vitest'
import { applyTextPreset, presetKeys, presetSpan, restingValues, ENTRANCE_PRESETS, EXIT_PRESETS } from '../text-presets.js'
import { sampleFrame } from '../properties.js'
import { frameAt } from '../scene-animation.js'

const T = 'text:txt_a'
const rest = (values = {}) => (p) => values[p] ?? null
const at = (tracks, time) => frameAt({ tracks }, time)[T] ?? {}

describe('text presets: a shortcut that writes ordinary keys', () => {
  it('lists the entrances and one exit, and Typewriter is among them', () => {
    expect(ENTRANCE_PRESETS).toEqual(['appear', 'fade', 'rise', 'zoom', 'blur', 'typewriter', 'words'])
    expect(EXIT_PRESETS).toEqual(['fadeOut'])
  })

  it('Fade in writes opacity 0 -> the text\'s own opacity from the playhead', () => {
    const { tracks, from, to } = applyTextPreset([], T, 'fade', { start: 2, duration: 10, rest: rest({ opacity: 0.8 }) })
    expect([from, to]).toEqual([2, 2.6])
    expect(tracks).toEqual([{ target: T, property: 'opacity', base: 0.8, keyframes: [{ time: 2, value: 0, easing: 'easeOutCubic' }, { time: 2.6, value: 0.8 }] }])
    expect(at(tracks, 1).opacity).toBe(0)          // not there before it enters
    expect(at(tracks, 2.3).opacity).toBeGreaterThan(0)
    expect(at(tracks, 2.3).opacity).toBeLessThan(0.8)
    expect(at(tracks, 5).opacity).toBe(0.8)
  })

  it('Appear is a cut: nothing, then the whole text, no frames in between', () => {
    const { tracks } = applyTextPreset([], T, 'appear', { start: 1, rest: rest() })
    expect(at(tracks, 1.05).opacity).toBe(0)
    expect(at(tracks, 1.1).opacity).toBe(1)
  })

  it('Typewriter keys reveal 0 -> 1 linearly, timed by the letters (20 a second, 0.5..4 s)', () => {
    expect(presetSpan('typewriter', 'Venice 1217')).toBe(0.5)
    expect(presetSpan('typewriter', 'x'.repeat(40))).toBe(2)
    expect(presetSpan('typewriter', 'x'.repeat(400))).toBe(4)
    const { tracks } = applyTextPreset([], T, 'typewriter', { start: 0, text: 'x'.repeat(40), rest: rest() })
    expect(at(tracks, 1).reveal).toBeCloseTo(0.5)
    expect(at(tracks, 3).reveal).toBe(1)
  })

  it('Word by word keys revealWords, timed by the words (3 a second)', () => {
    const keys = presetKeys('words', { start: 1, text: 'In the year of our Lord 1217', rest: restingValues() })
    expect(keys.revealWords.map((k) => [k.time, k.value])).toEqual([[1, 0], [3.333, 1]])
  })

  it('Rise and Zoom in end where the text rests, starting a little below and a little smaller', () => {
    const rise = presetKeys('rise', { start: 0, rest: restingValues(rest({ y: 20 })) })
    expect(rise.y.map((k) => k.value)).toEqual([24, 20])
    const zoom = presetKeys('zoom', { start: 0, rest: restingValues(rest({ scale: 2 })) })
    expect(zoom.scale.map((k) => k.value)).toEqual([1.7, 2])
  })

  it('a transparent text comes in to fully opaque, never to nothing', () => {
    expect(restingValues(rest({ opacity: 0 })).opacity).toBe(1)
  })

  it('picking another entrance at the same playhead replaces the first', () => {
    const first = applyTextPreset([], T, 'typewriter', { start: 1, text: 'Venice 1217', rest: rest() }).tracks
    const second = applyTextPreset(first, T, 'fade', { start: 1, text: 'Venice 1217', rest: rest() }).tracks
    expect(second.map((t) => t.property)).toEqual(['opacity'])
  })

  it('keeps the teacher\'s own keys outside the preset\'s stretch and every other row', () => {
    const own = [
      { target: T, property: 'opacity', keyframes: [{ time: 8, value: 1 }, { time: 9, value: 0 }] },
      { target: T, property: 'x', keyframes: [{ time: 0, value: 10 }, { time: 1, value: 20 }] },
      { target: 'text:other', property: 'opacity', keyframes: [{ time: 1, value: 0 }, { time: 2, value: 1 }] },
    ]
    const { tracks } = applyTextPreset(own, T, 'fade', { start: 1, rest: rest() })
    expect(tracks.find((t) => t.target === T && t.property === 'opacity').keyframes.map((k) => k.time)).toEqual([1, 1.6, 8, 9])
    expect(tracks[1]).toBe(own[1])
    expect(tracks[2]).toBe(own[2])
    expect(own[0].keyframes).toHaveLength(2)   // pure: the old tracks are untouched
  })

  it('ends by the scene\'s end: a preset picked at the very end starts earlier', () => {
    const { from, to } = applyTextPreset([], T, 'fade', { start: 9.9, duration: 10, rest: rest() })
    expect([from, to]).toEqual([9.4, 10])
  })

  it('Fade out takes the text away from the playhead', () => {
    const { tracks } = applyTextPreset([], T, 'fadeOut', { start: 4, rest: rest() })
    expect(at(tracks, 3).opacity).toBe(1)
    expect(at(tracks, 5).opacity).toBe(0)
  })

  it('the sampler knows the new rows: reveal and revealWords are text properties', () => {
    const tracks = [{ target: T, property: 'reveal', keyframes: [{ time: 0, value: 0, easing: 'linear' }, { time: 2, value: 1 }] }]
    expect(sampleFrame(tracks, 1)[T].reveal).toBeCloseTo(0.5)
  })

  it('an unknown preset changes nothing', () => {
    expect(applyTextPreset([], T, 'bounce')).toBeNull()
  })
})
