import { describe, it, expect } from 'vitest'
import { applyMapPreset, mapRestingValues, MAP_ENTRANCE_PRESETS, MAP_EXIT_PRESETS } from '../map-presets.js'

const T = 'terr:map'
const rest = (o = {}) => (p) => o[p] ?? null
const track = (tracks, p) => tracks.find((t) => t.target === T && t.property === p)

describe('Map block motion presets (Bart 11-24)', () => {
  it('lists its entrances and its exit', () => {
    expect(MAP_ENTRANCE_PRESETS).toEqual(['draw', 'drawThenFill', 'fade', 'grow'])
    expect(MAP_EXIT_PRESETS).toEqual(['fadeOut'])
  })
  it('Fade in writes border and fill from nothing to as set, at the playhead', () => {
    const { tracks, from, to } = applyMapPreset([], T, 'fade', { start: 2, duration: 20, rest: rest({ border: 1, fill: 0.8 }) })
    expect([from, to]).toEqual([2, 3])
    expect(track(tracks, 'border').keyframes.map((k) => [k.time, k.value])).toEqual([[2, 0], [3, 1]])
    expect(track(tracks, 'fill').keyframes.map((k) => [k.time, k.value])).toEqual([[2, 0], [3, 0.8]])
  })
  it('a second entrance at the same playhead replaces the first', () => {
    const first = applyMapPreset([], T, 'drawThenFill', { start: 0, rest: rest() }).tracks
    const { tracks } = applyMapPreset(first, T, 'fade', { start: 0, rest: rest() })
    expect(track(tracks, 'fill').keyframes.map((k) => k.time)).toEqual([0, 1])
    expect(track(tracks, 'draw')).toBeUndefined()
  })
  it('Draw runs the line from 0 to all the way round', () => {
    const { tracks, to } = applyMapPreset([], T, 'draw', { start: 1, rest: rest() })
    expect(to).toBe(4)
    expect(track(tracks, 'draw').keyframes.map((k) => [k.time, k.value])).toEqual([[1, 0], [4, 1]])
  })
  it('Grow runs the year up from the founding year to the scene year', () => {
    const { tracks } = applyMapPreset([], T, 'grow', { start: 0, rest: rest({ year: 1271, from: 1206 }) })
    expect(track(tracks, 'year').keyframes.map((k) => [k.time, k.value])).toEqual([[0, 1206], [6, 1271]])
  })
  it('without a founding year Grow starts a hundred years back', () => {
    expect(mapRestingValues(rest({ year: 1271 })).from).toBe(1171)
  })
  it('keeps the other targets and keys outside the stretch', () => {
    const other = { target: 'camera:map', property: 'zoom', keyframes: [{ time: 0, value: 3 }] }
    const late = { target: T, property: 'border', keyframes: [{ time: 15, value: 1 }] }
    const { tracks } = applyMapPreset([other, late], T, 'fade', { start: 0, rest: rest() })
    expect(tracks).toContainEqual(other)
    expect(track(tracks, 'border').keyframes.map((k) => k.time)).toEqual([0, 1, 15])
  })
})
