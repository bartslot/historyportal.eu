import { describe, expect, it } from 'vitest'
import { bandSlot, castSlot } from './layout'

describe('a cast shadow is drawn before what stands on it', () => {
  it('a bush at 6 m whose shadow falls 2 m back draws before a stone standing at 7.25 m', () => {
    expect(castSlot(bandSlot(6), 6, 2)).toBeLessThan(bandSlot(7.25))
  })
  it('a shadow falling toward the camera draws just before its caster', () => {
    expect(castSlot(bandSlot(6), 6, -2)).toBeLessThan(bandSlot(6))
    expect(castSlot(bandSlot(6), 6, -2)).toBeGreaterThan(bandSlot(7.25))
  })
})
