import { describe, expect, it } from 'vitest'
import { aliveOf, FOOT_M, STAGE_SHEET } from './look'

describe('aliveOf: no sticker look', () => {
  it('a figure keeps its feet: no foot blend and no grass over it, but the same light and soft edge', () => {
    const f = aliveOf({}, 'figure', -0.4, tint), s = aliveOf({}, 'standing', -0.4, tint)
    expect(f).toMatchObject({ footM: 0, grounding: 0, grass: 0, light: s.light, edgeSoft: s.edgeSoft })
  })
  const tint: [number, number, number] = [0.6, 0.5, 0.3]
  it('a standing thing gets a foot, soft edges and the full light; a far strip half the light, no foot', () => {
    const a = aliveOf({}, 'standing', -0.4, tint), strip = aliveOf({}, 'strip', -0.4, tint)
    expect(a.footM).toBe(FOOT_M); expect(a.edgeSoft).toBe(STAGE_SHEET.edgeSoft); expect(a.light).toBe(STAGE_SHEET.sunLight)
    expect(strip.footM).toBe(0); expect(strip.light).toBeCloseTo(STAGE_SHEET.sunLight / 2)
  })
  it('the sky drifts and is never edged or lit', () => {
    expect(aliveOf({}, 'sky', -0.4, tint)).toMatchObject({ edgeSoft: 0, light: 0, footM: 0, drift: STAGE_SHEET.cloudDrift })
  })
  it('the lit side faces the sun: light travelling left (x < 0) comes from the right', () => {
    expect(aliveOf({}, 'standing', -0.4, tint).sunSide).toBe(1)
    expect(aliveOf({}, 'standing', 0.4, tint).sunSide).toBe(-1)
  })
  it('every value is a teacher slider', () => {
    expect(aliveOf({ edgeSoft: 0, sunLight: 0.2 }, 'standing', 1, tint)).toMatchObject({ edgeSoft: 0, light: 0.2 })
  })
})
