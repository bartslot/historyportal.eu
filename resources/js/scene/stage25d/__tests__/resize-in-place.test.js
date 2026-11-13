import { describe, expect, it } from 'vitest'
import { isSunk, resizedInPlace } from '../live.js'

describe('a close-up resizes in place', () => {
  it('a picture set below the floor is a close-up; one standing on it is not', () => {
    expect(isSunk({ y: -0.376 })).toBe(true)
    expect(isSunk({ keys: [{ t: 0, y: -0.37 }] })).toBe(true)
    expect(isSunk({ y: 0 })).toBe(false)
    expect(isSunk({})).toBe(false)
  })

  it('keeps its middle where it is: y and every key move by half the growth', () => {
    const bust = { scale: 7, y: -0.4, keys: [{ t: 0, y: -0.37 }, { t: 1, y: -0.38 }, { t: 2, x: 0.5 }] }
    const out = resizedInPlace(bust, 5, 0.46)   // 0.46 m * 2 smaller / 2 = 0.46 m up
    expect(out.scale).toBe(5)
    expect(out.y).toBeCloseTo(0.06)
    expect(out.keys.map((k) => k.y)).toEqual([0.09, 0.08, undefined])
    // the middle of the picture (its foot plus half its height) is where it was
    expect(out.y + 0.46 * 5 / 2).toBeCloseTo(bust.y + 0.46 * 7 / 2)
  })

  it('leaves keys alone when none of them moves its height', () => {
    expect(resizedInPlace({ scale: 2, y: -1, keys: [{ t: 0, x: 0.3 }] }, 3, 1).keys).toBeUndefined()
  })
})
