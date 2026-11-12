import { describe, expect, it } from 'vitest'
import { isSoil, soilRecolour } from './soil'

describe('soil colour', () => {
  it('moves a picture average onto the soil colour', () => {
    const k = soilRecolour([0.5, 0.4, 0.3], [0.6, 0.4, 0.15])
    expect(k[0]).toBeCloseTo(1.2)
    expect(k[1]).toBeCloseTo(1)
    expect(k[2]).toBeCloseTo(0.5)
  })

  it('never stretches a near-black channel into noise', () => {
    expect(soilRecolour([0.01, 0.5, 0.5], [0.9, 0.5, 0.5])[0]).toBe(3)
    expect(soilRecolour([0.9, 0.5, 0.5], [0.01, 0.5, 0.5])[0]).toBe(0.25)
  })

  it('leaves water, built floors and perspective paintings alone', () => {
    expect(isSoil({ tags: ['silt', 'earth'] })).toBe(true)
    expect(isSoil({ tags: ['sea', 'calm'] })).toBe(false)
    expect(isSoil({ tags: ['cobbles'] })).toBe(false)
    expect(isSoil({ tags: ['sand'], perspective: true })).toBe(false)
  })
})
