import { describe, it, expect } from 'vitest'
import { fillPercent } from '../ui/range-fill.js'

/** A stand-in for the input, since only min/max/value are read. */
const range = (min, max, value) => ({ min: String(min), max: String(max), value: String(value) })

describe('how far along the rail the fill stops', () => {
  it('reads a value as its share of the track', () => {
    expect(fillPercent(range(0, 100, 50))).toBe(50)
    expect(fillPercent(range(0, 100, 0))).toBe(0)
    expect(fillPercent(range(0, 100, 100))).toBe(100)
  })

  /**
   * The panel's ranges rarely start at zero — Scale is 0.2 to 6, Opacity 0.05 to 1. Treating the
   * value as a percentage of the MAX alone would leave every one of them filled wrongly, and Scale
   * at its minimum would show a fill instead of an empty rail.
   */
  it('measures from the minimum, not from zero', () => {
    expect(fillPercent(range(0.2, 6, 0.2))).toBe(0)
    expect(fillPercent(range(0.2, 6, 6))).toBe(100)
    expect(fillPercent(range(0.2, 6, 3.1))).toBeCloseTo(50, 6)
  })

  it('handles a range that runs negative', () => {
    expect(fillPercent(range(-180, 180, 0))).toBe(50)
    expect(fillPercent(range(-180, 180, -180))).toBe(0)
  })

  it('clamps a value outside the track', () => {
    expect(fillPercent(range(0, 100, 150))).toBe(100)
    expect(fillPercent(range(0, 100, -50))).toBe(0)
  })

  /** A range whose ends are equal has no track to fill, and dividing by its span is a NaN. */
  it('reports nothing filled when there is no track', () => {
    expect(fillPercent(range(5, 5, 5))).toBe(0)
  })

  it('reports nothing filled for a value it cannot read', () => {
    expect(fillPercent(range(0, 100, ''))).toBe(0)
    expect(fillPercent({ min: '', max: '', value: 'abc' })).toBe(0)
  })
})
