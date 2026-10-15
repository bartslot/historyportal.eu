import { describe, it, expect } from 'vitest'
import { readHold, unitsPerZone, gridFor, cellRects, slotPlan, draughtFor, nearlyFull, zoomedPlace, DRAUGHT_AMOUNT } from '../cargo-hold.js'
import { rolesFor, numberWith, roleLine } from '../team-roles.js'

// The painted hold of hold_ship_cutaway (its .hold.json): two decks.
const zones = [{ x: 20.5, y: 61.5, w: 62, h: 9.5 }, { x: 23.5, y: 74, w: 55.5, h: 9.8 }]
const catalogue = [['water', 3], ['compass', 1], ['rice', 3], ['ships_bread', 2], ['meat', 2], ['spare_sails', 3], ['spare_rope', 2],
  ['spare_timber', 3], ['tools', 1], ['firewood', 2], ['charts', 1], ['paper_ink', 1], ['trade_textiles', 2], ['trade_metal', 1]]
  .map(([key, cost]) => ({ key, cost }))
const overlaps = (a, b) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01

describe('the hold: every item its own slot (plan §5)', () => {
  it('shares units over the zones by area, always adding up', () => {
    expect(unitsPerZone(zones, 32).reduce((a, b) => a + b)).toBe(32)
    expect(unitsPerZone([{ x: 0, y: 0, w: 30, h: 10 }, { x: 0, y: 0, w: 10, h: 10 }], 8)).toEqual([6, 2])
    expect(unitsPerZone([], 16)).toEqual([])
  })

  it('lays units out as near-square cells', () => {
    expect(gridFor(8, 8)).toEqual({ rows: 1, cols: 8 })
    expect(gridFor(4, 1)).toEqual({ rows: 2, cols: 2 })
  })

  it('gives one cell per point inside its zone', () => {
    const cells = cellRects(zones, 32, 16 / 9)
    expect(cells).toHaveLength(32)
    cells.forEach(c => expect(zones.some(z => c.x >= z.x - 0.01 && c.x + c.w <= z.x + z.w + 0.01 && c.y >= z.y - 0.01 && c.y + c.h <= z.y + z.h + 0.01)).toBe(true))
  })

  it('places the whole catalogue with no overlap, so every legal load fits', () => {
    const plan = slotPlan(catalogue, zones, 16 / 9)
    const rects = [...plan.values()].flat()
    expect(plan.size).toBe(14)
    rects.forEach((a, i) => rects.slice(i + 1).forEach(b => expect(overlaps(a, b)).toBe(false)))
    // Nothing is split over two rows in the Tasman hold.
    expect([...plan.values()].every(r => r.length === 1)).toBe(true)
  })

  it('gives an item the same slot every time', () => {
    expect(slotPlan(catalogue, zones, 16 / 9).get('spare_sails')).toEqual(slotPlan(catalogue, zones, 16 / 9).get('spare_sails'))
  })

  it('gives free items no space', () => {
    expect(slotPlan([{ key: 'x', cost: 0 }], zones, 16 / 9).get('x')).toEqual([])
  })
})

describe('the hold: the ship sits lower as it fills (a weight joke, on by default)', () => {
  it('maps the load to a draught, empty to full', () => {
    expect(draughtFor(0, 16, 0.045)).toBe(0)
    expect(draughtFor(8, 16, 0.04)).toBe(0.02)
    expect(draughtFor(16, 16, 0.045)).toBe(0.045)
  })

  it('clamps: never past full, never above empty, nothing for a broken capacity', () => {
    expect(draughtFor(21, 16, 0.045)).toBe(0.045)
    expect(draughtFor(-3, 16, 0.045)).toBe(0)
    expect(draughtFor(4, 0, 0.045)).toBe(0)
  })

  it('is on unless the game switches it off, and never deeper than 5% of the ship', () => {
    expect(readHold({}).draught).toBe(DRAUGHT_AMOUNT)
    expect(readHold({ draught: true }).draught).toBe(DRAUGHT_AMOUNT)
    expect(readHold({ draught: false }).draught).toBe(0)
    expect(DRAUGHT_AMOUNT).toBeLessThanOrEqual(0.05)
  })

  it('tints the bar near full', () => {
    expect([nearlyFull(14, 16), nearlyFull(15, 16), nearlyFull(17, 16)]).toEqual([false, true, true])
  })
})

describe('the hold config', () => {
  it('reads numbers as numbers and drops empty zones', () => {
    const h = readHold({ ship: '/s.webp', zones: [{ x: '10', y: 5, w: 20, h: 10 }, { x: 1, y: 1, w: 0, h: 5 }] })
    expect(h.zones).toEqual([{ x: 10, y: 5, w: 20, h: 10 }])
  })

  it('zooms a small ship onto its hull, the hold inside the stage', () => {
    const p = zoomedPlace(readHold({ zones, aspect: 16 / 9 }), 1.9)
    const shipW = (p.h / 100) * (16 / 9) / 1.9 * 100   // % of the stage's width
    expect(p.x - shipW / 2 + 0.205 * shipW).toBeGreaterThan(0)
    expect(p.x - shipW / 2 + 0.825 * shipW).toBeLessThan(100)
  })
})

describe('rotating roles (Bart, 10-15)', () => {
  const roles = ['Kapitein', 'Bootsman', 'Verkenner', 'Stuurman']

  it('team of 4: number n holds roles[(n - 1 + index) % 4]', () => {
    expect(rolesFor(roles, 4, 0)).toEqual([['Kapitein'], ['Bootsman'], ['Verkenner'], ['Stuurman']])
    expect(rolesFor(roles, 4, 1)).toEqual([['Bootsman'], ['Verkenner'], ['Stuurman'], ['Kapitein']])
    expect(numberWith(rolesFor(roles, 4, 1), 'Kapitein')).toBe(4)
  })

  it('wraps the index', () => {
    expect(rolesFor(roles, 4, 4)).toEqual(rolesFor(roles, 4, 0))
    expect(rolesFor(roles, 4, 6)).toEqual(rolesFor(roles, 4, 2))
    expect(rolesFor(roles, 4, -1)).toEqual(rolesFor(roles, 4, 3))
  })

  it('team of 3: one number holds two roles, and which one rotates', () => {
    const doubled = (i) => rolesFor(roles, 3, i).findIndex(rs => rs.length === 2) + 1
    expect(rolesFor(roles, 3, 0)).toEqual([['Kapitein', 'Stuurman'], ['Bootsman'], ['Verkenner']])
    expect([doubled(0), doubled(1), doubled(2), doubled(3)]).toEqual([1, 2, 3, 1])
    expect(rolesFor(roles, 3, 1).flat().sort()).toEqual([...roles].sort())   // every role held, once
  })

  it('writes the line for a team card', () => {
    expect(roleLine(rolesFor(roles, 4, 1))).toBe('1 Bootsman · 2 Verkenner · 3 Stuurman · 4 Kapitein')
    expect(roleLine(rolesFor(roles, 3, 0))).toBe('1 Kapitein + Stuurman · 2 Bootsman · 3 Verkenner')
  })

  it('has nothing to rotate without roles', () => {
    expect(rolesFor([], 4, 2)).toEqual([])
  })
})
