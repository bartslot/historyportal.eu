import { describe, it, expect } from 'vitest'
import { territoryLook, territoryAnim, linePaint, washPaint, TERRITORY_DEFAULTS } from '../territory-look.js'
import { isTileCut, tileToLngLat, territoryParts, noise2 } from '../territory-ink.js'
import { applyFrameTo } from '../../anim/scene-animation.js'
import { propertiesFor } from '../../anim/properties.js'
import { groupsFor } from '../../anim/timeline-groups.js'

// Bart 11-23: "standard it could be black, border (like a pen drawing)", "maybe etched".
describe('territoryLook', () => {
  // Hatching everywhere was "too much"; etching only along the edges stayed (Bart 11-23).
  it('defaults to a black pen line with an etched edge', () => {
    expect(territoryLook()).toEqual({ ...TERRITORY_DEFAULTS })
    expect(TERRITORY_DEFAULTS.fill_style).toBe('etched')
  })

  it('keeps what the teacher set and drops junk', () => {
    const look = territoryLook({ border_color: '#ff0000', border_width: '3', fill_style: 'wash', fill_strength: 9, fill_color: 'red' })
    expect(look).toMatchObject({ border_color: '#ff0000', border_width: 3, fill_style: 'wash', fill_strength: 1, fill_color: TERRITORY_DEFAULTS.fill_color })
  })
})

describe('territory paint', () => {
  const look = territoryLook()
  const caseValue = (expr, highlighted) => (highlighted ? expr[2] : expr[3])

  it('draws the linked territory in the look and hides the others with the switch off', () => {
    const off = linePaint(look, territoryAnim(), { showOthers: false })
    expect(caseValue(off['line-color'], true)).toBe(look.border_color)
    expect(caseValue(off['line-opacity'], true)).toBe(1)
    expect(caseValue(off['line-opacity'], false)).toBe(0)
    expect(caseValue(linePaint(look, territoryAnim(), { showOthers: true })['line-opacity'], false)).toBe(0.3)
  })

  it('washes only with Wash, scaled by the timeline', () => {
    const half = territoryAnim({ fill: 0.5 })
    const wash = territoryLook({ fill_style: 'wash' })
    expect(washPaint(wash, half)['fill-opacity'][2]).toBeCloseTo(wash.fill_strength * 0.5)
    expect(washPaint(territoryLook({ fill_style: 'etched' }), half)['fill-opacity'][2]).toBe(0)
    expect(washPaint(territoryLook({ fill_style: 'none' }), half)['fill-opacity'][2]).toBe(0)
  })

  it("stands the map's own line down while the border is drawn by hand", () => {
    expect(caseValue(linePaint(look, territoryAnim(), { inked: true })['line-opacity'], true)).toBe(0)
  })

  it("keeps a voyage's border opacity behind the switch", () => {
    const styled = { otherOpacity: 0.8, otherWidth: 2, otherColor: '#123456' }
    expect(caseValue(linePaint(look, territoryAnim(), { ...styled, showOthers: false })['line-opacity'], false)).toBe(0)
    expect(caseValue(linePaint(look, territoryAnim(), { ...styled, showOthers: true })['line-opacity'], false)).toBe(0.8)
  })

  it('fades the border on the timeline', () => {
    expect(linePaint(look, territoryAnim({ border: 0.25 }))['line-opacity'][2]).toBe(0.25)
  })
})

describe('the Territory row on the timeline', () => {
  it('keys fill, border and year', () => {
    expect(propertiesFor('terr').map((p) => p.key)).toEqual(['fill', 'border', 'year'])
  })

  it('groups the Map block as Year, then Territory', () => {
    expect(groupsFor('terr').map((g) => [g.id, g.props.map((p) => p.key)])).toEqual([['year', ['year']], ['territory', ['fill', 'border']]])
  })

  it('hands its frame to the map in the player', () => {
    const got = []
    applyFrameTo({ 'terr:map': { fill: 0.4, year: 1250 } }, { territory: { setTerritoryValues: (v) => got.push(v) } })
    expect(got).toEqual([{ fill: 0.4, year: 1250 }])
  })
})

describe('the hand-drawn territory', () => {
  it('never inks the cut a tile made', () => {
    expect(isTileCut({ x: -64, y: 10 }, { x: -64, y: 900 }, 4096)).toBe(true)
    expect(isTileCut({ x: 4160, y: 10 }, { x: 4160, y: 900 }, 4096)).toBe(true)
    expect(isTileCut({ x: 10, y: 10 }, { x: 900, y: 900 }, 4096)).toBe(false)
    expect(isTileCut({ x: -64, y: 10 }, { x: 30, y: 10 }, 4096)).toBe(false)
  })

  it('puts tile units back on the globe', () => {
    const [lng, lat] = tileToLngLat(2048, 2048, 0, 0, 0, 4096)
    expect(lng).toBeCloseTo(0)
    expect(lat).toBeCloseTo(0)
    expect(tileToLngLat(0, 0, 1, 1, 0, 4096)[0]).toBeCloseTo(0)
  })

  it('takes the parts from the most detailed zoom only, once per tile', () => {
    const f = (z, x, y) => ({ _z: z, _x: x, _y: y, id: 'Q1', _vectorTileFeature: { extent: 4096, loadGeometry: () => [[{ x: 0, y: 0 }]] } })
    const parts = territoryParts([f(2, 1, 1), f(3, 2, 2), f(3, 2, 2), f(3, 3, 2)])
    expect(parts.map((p) => `${p.z}/${p.x}/${p.y}`)).toEqual(['3/2/2', '3/3/2'])
  })

  it('wobbles the same way for the same spot', () => {
    expect(noise2(1.3, 4.2)).toBe(noise2(1.3, 4.2))
    expect(noise2(1.3, 4.2)).toBeGreaterThanOrEqual(0)
    expect(noise2(1.3, 4.2)).toBeLessThanOrEqual(1)
  })
})

describe('clipToTile', () => {
  it('keeps only the stretch inside the tile, so neighbours meet end to end', async () => {
    const { clipToTile } = await import('../territory-ink.js')
    expect(clipToTile({ x: 4000, y: 10 }, { x: 4160, y: 10 }, 4096)).toEqual([{ x: 4000, y: 10 }, { x: 4096, y: 10 }])
    expect(clipToTile({ x: -64, y: 10 }, { x: 100, y: 10 }, 4096)).toEqual([{ x: 0, y: 10 }, { x: 100, y: 10 }])
    expect(clipToTile({ x: -64, y: 10 }, { x: -10, y: 10 }, 4096)).toBeNull()
  })
})

describe('the ink sits under the names (Bart 11-24: "the text is over the venice label")', () => {
  it('goes under the voyage route when there is one', async () => {
    const { inkBeforeId } = await import('../territory-ink.js')
    expect(inkBeforeId([{ id: 'land', type: 'fill' }, { id: 'chart-ridges', type: 'symbol' }, { id: 'lesson-route', type: 'line' }, { id: 'lesson-labels', type: 'symbol' }])).toBe('lesson-route')
  })
  it('else under the first name or dot', async () => {
    const { inkBeforeId } = await import('../territory-ink.js')
    expect(inkBeforeId([{ id: 'land', type: 'fill' }, { id: 'city-dots', type: 'circle' }, { id: 'city-labels', type: 'symbol' }])).toBe('city-dots')
    expect(inkBeforeId([])).toBeUndefined()
  })
})

describe('border styles (Bart 11-24: "solid, ink, dashed, wavy")', () => {
  it('keeps the four styles, and an old scene draws ink', () => {
    expect(territoryLook({}).border_style).toBe('ink')
    for (const s of ['ink', 'solid', 'dashed', 'wavy']) expect(territoryLook({ border_style: s }).border_style).toBe(s)
    expect(territoryLook({ border_style: 'dotted' }).border_style).toBe('ink')
  })
  it('joins tile runs into one chain, and starts a loop at its westernmost point', async () => {
    const { joinRuns } = await import('../territory-ink.js')
    const P = (lng, lat) => [lng * 10, lat * 10, lng, lat]
    expect(joinRuns([[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)]])).toEqual([[P(0, 0), P(1, 0), P(2, 0)]])
    const loop = joinRuns([[P(5, 5), P(6, 5), P(6, 6)], [P(6, 6), P(4, 6), P(5, 5)]])
    expect(loop).toHaveLength(1)
    expect(loop[0][0]).toEqual(P(4, 6))
    expect(loop[0].at(-1)).toEqual(P(4, 6))
  })
  it('a wavy line swings to both sides of the border, no further than its amplitude', async () => {
    const { waveLine } = await import('../territory-ink.js')
    const ys = waveLine([[0, 0], [100, 0]], { amp: 3, wavelength: 20, step: 1 }).map((p) => p[1])
    expect(Math.max(...ys)).toBeGreaterThan(2.5)
    expect(Math.min(...ys)).toBeLessThan(-2.5)
    expect(Math.max(...ys.map(Math.abs))).toBeLessThanOrEqual(3.0001)
  })
})
