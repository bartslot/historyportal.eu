import { describe, expect, it } from 'vitest'
import { density } from './Card'

describe('card text density', () => {
  it('keeps a roomy card at full size and steps a long one down, never below 0.72', () => {
    expect(density(120)).toBe(1)
    expect(density(220)).toBe(1)
    expect(density(400)).toBe(0.72) // the floor
    expect(density(340)).toBeCloseTo(0.8, 5)
    expect(density(5000)).toBe(0.72)
  })
})
