import { describe, it, expect } from 'vitest'
import { territoryLook, territoryAnim, linePaint, washPaint, etchPaint, TERRITORY_DEFAULTS } from '../territory-look.js'
import { applyFrameTo } from '../../anim/scene-animation.js'
import { propertiesFor } from '../../anim/properties.js'

// Bart 11-23: "standard it could be black, border (like a pen drawing)", "maybe etched".
describe('territoryLook', () => {
  // Etched as the default was "too much" (Bart 11-23): the line alone, the inside left clear.
  it('defaults to a black pen line with nothing inside', () => {
    expect(territoryLook()).toEqual({ ...TERRITORY_DEFAULTS })
    expect(TERRITORY_DEFAULTS.fill_style).toBe('none')
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

  it('paints only the chosen fill, scaled by the timeline', () => {
    const half = territoryAnim({ fill: 0.5 })
    const etched = territoryLook({ fill_style: 'etched' })
    expect(etchPaint(etched, half)['fill-opacity'][2]).toBeCloseTo(etched.fill_strength * 0.5)
    expect(washPaint(etched, half)['fill-opacity'][2]).toBe(0)
    const wash = territoryLook({ fill_style: 'wash' })
    expect(washPaint(wash, half)['fill-opacity'][2]).toBeCloseTo(wash.fill_strength * 0.5)
    expect(etchPaint(wash, half)['fill-opacity'][2]).toBe(0)
    const none = territoryLook({ fill_style: 'none' })
    expect(washPaint(none, half)['fill-opacity'][2]).toBe(0)
    expect(etchPaint(none, half)['fill-opacity'][2]).toBe(0)
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

  it('hands its frame to the map in the player', () => {
    const got = []
    applyFrameTo({ 'terr:map': { fill: 0.4, year: 1250 } }, { territory: { setTerritoryValues: (v) => got.push(v) } })
    expect(got).toEqual([{ fill: 0.4, year: 1250 }])
  })
})
