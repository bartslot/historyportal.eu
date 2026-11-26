import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSeaGrid, isLand, seaSafeDef, stretchesOverLand } from '../sea-route.js'
import voyagesDoc from '../voyages.json'

/**
 * Ships go round the land, also on a lesson's own (older, or hand-bent) copy of a route.
 * Bart, 2026-11-26: "now you see boats crossing over islands ... also for current routes."
 */
const grid = parseSeaGrid(readFileSync(resolve(__dirname, '../../../../public/map-chart/sea-grid.bin')))

// Napoleon's route as lessons copied it before the catalog fix: Toulon to Malta straight through
// Sardinia, and a ride from Paris before it.
const TOULON = [5.93, 43.12]
const MALTA = [14.51, 35.9]
const ALEXANDRIA = [29.92, 31.2]
const oldNapoleon = () => ({
  id: 'napoleon-1796',
  waypoints: [[2.35, 48.86], TOULON, MALTA, ALEXANDRIA],
  legs: [
    { wp: [0, 1], transport: 'horse', depart: '1798-05-03' },
    { wp: [1, 2], transport: 'sea', depart: '1798-05-19' },
    { wp: [2, 3], transport: 'sea', depart: '1798-06-19' },
  ],
  label_at: 2,
})
const at = (def, p) => def.waypoints.findIndex((q) => q[0] === p[0] && q[1] === p[1])

describe('the land mask', () => {
  it('knows the islands and the sea between them', () => {
    expect(isLand(grid, 9.1, 42.15)).toBe(true)     // Corsica
    expect(isLand(grid, 9.0, 40.0)).toBe(true)      // Sardinia
    expect(isLand(grid, 11.5, 40.5)).toBe(false)    // Tyrrhenian Sea
    expect(isLand(grid, 5.0, 42.0)).toBe(false)     // Gulf of Lion
  })
})

describe('seaSafeDef', () => {
  it('sends a ship stretch over an island round it', () => {
    const def = oldNapoleon()
    expect(stretchesOverLand(def, grid)).toContain(1)
    const fixed = seaSafeDef(def, grid)
    expect(stretchesOverLand(fixed, grid)).toEqual([])
    expect(fixed.waypoints.length).toBeGreaterThan(def.waypoints.length)
    // Every stop is still where it was, and every leg still runs between the same stops.
    const legs = fixed.legs.map((l) => l.wp)
    expect(legs[0]).toEqual([0, at(fixed, TOULON)])
    expect(legs[1]).toEqual([at(fixed, TOULON), at(fixed, MALTA)])
    expect(legs[2]).toEqual([at(fixed, MALTA), at(fixed, ALEXANDRIA)])
    expect(fixed.label_at).toBe(at(fixed, MALTA))
    expect(fixed.legs[1].depart).toBe('1798-05-19')
  })

  it('leaves the given route alone', () => {
    const def = oldNapoleon()
    const copy = JSON.parse(JSON.stringify(def))
    seaSafeDef(def, grid)
    expect(def).toEqual(copy)
  })

  it('gives the same route back the second time, so a saved fix is not fixed again', () => {
    const fixed = seaSafeDef(oldNapoleon(), grid)
    expect(seaSafeDef(fixed, grid)).toBe(fixed)
  })

  it('leaves a ride overland on land', () => {
    const def = { waypoints: [[2.35, 48.86], [4.83, 45.76], TOULON], legs: [{ wp: [0, 2], transport: 'horse' }] }
    expect(seaSafeDef(def, grid)).toBe(def)
  })

  it('does not sail round Spain for a road that was labelled as sea', () => {
    // Frejus to Paris is a road; by sea it would be four times as far.
    const def = { waypoints: [[6.74, 43.43], [2.35, 48.86]], legs: [{ wp: [0, 1], transport: 'sea' }] }
    expect(seaSafeDef(def, grid)).toBe(def)
  })

  it('leaves a stretch that no leg covers to the data check', () => {
    const def = { waypoints: [[2.35, 48.86], TOULON, MALTA], legs: [{ wp: [1, 2], transport: 'sea' }] }
    const fixed = seaSafeDef(def, grid)
    expect(fixed.waypoints.slice(0, 2)).toEqual([[2.35, 48.86], TOULON])
  })

  it.each(voyagesDoc.voyages.map((v) => [v.id, v]))('has nothing to change on the catalog route %s', (_id, v) => {
    expect(seaSafeDef(v, grid)).toBe(v)
  })
})
