import { describe, expect, it } from 'vitest'
import { CELL_M, cellsCovered, contractOf, overlaps, snapCentre, turnedFootprint } from './contract'

describe('asset contract', () => {
  it('fills defaults: floor, 90° steps, footprint measured later', () => {
    expect(contractOf({ name: 'Crate' })).toEqual({ snaps_to: 'floor', height_m: null, footprint: undefined, turn_step: 90, forward: 0 })
  })

  it('reads the old height field as height_m', () => {
    expect(contractOf({ name: 'Girl', height: 1.6 }).height_m).toBe(1.6)
  })

  it('refuses malformed entries, naming the asset', () => {
    expect(() => contractOf({ name: 'Bad', snaps_to: 'ceiling' })).toThrow(/Bad: snaps_to/)
    expect(() => contractOf({ name: 'Bad', footprint: [1.5, 2] })).toThrow(/Bad: footprint/)
    expect(() => contractOf({ name: 'Bad', height_m: 0 })).toThrow(/Bad: height_m/)
    expect(() => contractOf({ name: 'Bad', turn_step: 0 })).toThrow(/Bad: turn_step/)
  })

  it('a quarter turn swaps across and deep; 45° grows to the bounding cells', () => {
    expect(turnedFootprint([4, 2], 90)).toEqual([2, 4])
    expect(turnedFootprint([4, 2], 180)).toEqual([4, 2])
    expect(turnedFootprint([1, 1], 45)).toEqual([2, 2])
  })

  it('odd spans centre in a cell, even spans on a line, so the footprint sits on the grid', () => {
    expect(snapCentre(0.3, 1)).toBe(0.25)
    expect(snapCentre(0.3, 2)).toBe(0.5)
    const cells = cellsCovered(snapCentre(0.3, 3), snapCentre(0.1, 2), [3, 2])
    expect(cells.size).toBe(6)
  })

  it('footprints that share a cell overlap; neighbours do not', () => {
    const a = cellsCovered(0, 0, [2, 2])
    expect(overlaps(a, cellsCovered(CELL_M, 0, [2, 2]))).toBe(true)
    expect(overlaps(a, cellsCovered(2 * CELL_M, 0, [2, 2]))).toBe(false)
  })
})
