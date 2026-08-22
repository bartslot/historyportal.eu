import { describe, it, expect } from 'vitest'
import { createAspectLock } from '../ui/aspect-lock.js'

/**
 * The examples here are deliberately NOT the 11.05 x 11.06 pair from the design.
 *
 * That pair is very nearly square, so "keep the proportion" and the wrong implementation everyone
 * writes first — copy the number across — agree to within a hundredth. A test built on it passes
 * while the maths is wrong. Every proportional case below uses a shape whose sides genuinely
 * differ, so copying across fails loudly.
 */
describe('locking the proportion', () => {
  it('scales the height proportionally when the width changes', () => {
    // Arrange — a 4:1 box, locked at that shape.
    const lock = createAspectLock({ width: 200, height: 50, locked: true })

    // Act
    lock.setWidth(100)

    // Assert — half the width is half the height, NOT 100.
    expect(lock.height).toBe(25)
    expect(lock.width).toBe(100)
  })

  it('scales the width proportionally when the height changes', () => {
    const lock = createAspectLock({ width: 200, height: 50, locked: true })

    lock.setHeight(10)

    expect(lock.width).toBe(40)
  })

  it('leaves the other side alone while unlocked', () => {
    const lock = createAspectLock({ width: 200, height: 50, locked: false })

    lock.setWidth(100)

    expect(lock.height).toBe(50)
  })

  it('reproduces the near-square case from the design', () => {
    const lock = createAspectLock({ width: 11.05, height: 11.06, locked: true })

    lock.setWidth(101)

    // 101 / (11.05/11.06) — about 101.09, which reads as 101 in a two-decimal field.
    expect(lock.height).toBeCloseTo(101.091, 3)
  })
})

describe('when the ratio is captured', () => {
  /**
   * THE REGRESSION THIS FILE EXISTS FOR. Recomputing width/height on every edit re-derives the
   * ratio from values that have already been rounded for display, and the error compounds. Here
   * the shape is round-tripped repeatedly; a captured ratio returns to exactly 200 x 50, a
   * recomputed one drifts.
   */
  it('captures the ratio once and never recomputes it from the rounded fields', () => {
    // Arrange — 200 x 60 is 10:3, which is NOT exactly representable at two decimals, so a
    // recomputed ratio has somewhere to drift to. (200 x 50 would be 4 exactly and would let the
    // bug through: this test passed against a deliberately broken build until the shape changed.)
    const lock = createAspectLock({ width: 200, height: 60, locked: true })
    const captured = lock.ratio

    // Act — a panel writes back what it DISPLAYS, so every value goes in rounded to two decimals.
    lock.setWidth(137.77)
    lock.setHeight(Number(lock.height.toFixed(2)))
    lock.setWidth(Number(lock.width.toFixed(2)))
    lock.setHeight(Number(lock.height.toFixed(2)))

    // Assert — the held proportion is the one captured at lock time, bit for bit.
    expect(lock.ratio).toBe(captured)
  })

  it('keeps a shape exactly on its captured proportion through many rounded edits', () => {
    const lock = createAspectLock({ width: 200, height: 60, locked: true })

    for (let i = 1; i <= 40; i++) {
      lock.setWidth(Number((200 + i).toFixed(2)))
      lock.setHeight(Number(lock.height.toFixed(2)))
    }

    // Whatever the sides ended up as, they are still 10:3.
    expect(lock.width / lock.height).toBeCloseTo(200 / 60, 9)
  })

  it('re-captures the new shape when the lock is released and re-engaged', () => {
    const lock = createAspectLock({ width: 200, height: 50, locked: true })

    lock.setLocked(false)
    lock.setWidth(100)      // free to change one side alone
    expect(lock.height).toBe(50)   // now a 2:1 box

    lock.setLocked(true)
    expect(lock.ratio).toBe(2)

    lock.setWidth(50)
    expect(lock.height).toBe(25)   // holds 2:1, not the original 4:1
  })

  it('forgets the ratio while unlocked', () => {
    const lock = createAspectLock({ width: 200, height: 50, locked: true })

    lock.setLocked(false)

    expect(lock.ratio).toBeNull()
  })
})

describe('guarding against a shape that cannot be described', () => {
  /**
   * A field a teacher has just emptied reads as '' and a cleared one as 0. Capturing a ratio from
   * either gives 0 or Infinity, and the next edit writes NaN into the layer — which the renderer
   * turns into a blank node, with no error anywhere.
   */
  it('captures nothing when a side is zero', () => {
    const lock = createAspectLock({ width: 200, height: 0, locked: true })

    expect(lock.ratio).toBeNull()
  })

  it('passes edits through untouched when no ratio is held', () => {
    const lock = createAspectLock({ width: 0, height: 0, locked: true })

    lock.setWidth(120)

    expect(lock.width).toBe(120)
    expect(Number.isNaN(lock.height)).toBe(false)
    expect(lock.height).toBe(0)
  })

  it('does not drive the other side from an emptied field', () => {
    const lock = createAspectLock({ width: 200, height: 50, locked: true })

    lock.setWidth('')

    // The width is whatever the empty field gave, but the height must NOT become NaN or Infinity.
    expect(lock.height).toBe(50)
  })
})
