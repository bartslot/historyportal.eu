import { describe, expect, it } from 'vitest'
import { flockAt, FLOCK_CROSS_S, FLOCK_EVERY_S, PUFFS, smokeAge, smokes } from './life'
import { aliveOf, FOOT_M, STAGE_SHEET } from './look'

describe('life: smoke and birds follow the lesson clock (a seek shows the same frame)', () => {
  it('puffs leave one after the other, each 0..1 and looping', () => {
    const ages = Array.from({ length: PUFFS }, (_, i) => smokeAge(12.3, i))
    for (const a of ages) { expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(1) }
    expect(new Set(ages.map((a) => a.toFixed(3))).size).toBe(PUFFS)
    expect(smokeAge(12.3, 0)).toBeCloseTo(smokeAge(12.3 + 9, 0))
  })
  it('a flock crosses now and then, not always', () => {
    expect(flockAt(0)).toBe(0)
    expect(flockAt(FLOCK_CROSS_S / 2)).toBeCloseTo(0.5)
    expect(flockAt(FLOCK_CROSS_S + 1)).toBeNull()
    expect(flockAt(FLOCK_EVERY_S + 1)).toBeCloseTo(1 / FLOCK_CROSS_S)
  })
  it('fires, hearths and chimneys smoke; a barrel does not', () => {
    expect(smokes({ id: 'fire-pit-01', tags: [] })).toBe(true)
    expect(smokes({ id: 'house-01', tags: ['chimney'] })).toBe(true)
    expect(smokes({ id: 'barrels-01', tags: ['barrel'] })).toBe(false)
  })
})

describe('aliveOf: no sticker look', () => {
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
