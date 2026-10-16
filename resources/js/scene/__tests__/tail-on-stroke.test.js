import { describe, it, expect } from 'vitest'
import { tailShape, thoughtTrail, thoughtRoot, cloudArcs, TRAIL_SHARES } from '../balloon-shape.js'

// Bart 2026-10-16: "it should always be on the edge/stroke of the balloon". The tail starts ON the
// balloon's pencil line, so the outline runs on into the tail as one line: the rounded box's
// stroke for speech, the cloud's outline for a thought.
const rect = { left: 100, top: 100, w: 300, h: 120 }
const INK = 2

describe('a speech tail starts on the stroke', () => {
  it('its two base points sit on the stroke\'s centre line, half the pencil inside the box', () => {
    const shape = tailShape(rect, [700, 160], { ink: INK, radius: 20 })
    const strokeX = rect.left + rect.w - INK / 2
    expect(shape.a[0]).toBeCloseTo(strokeX, 6)
    expect(shape.b[0]).toBeCloseTo(strokeX, 6)
    expect(shape.root[0]).toBeCloseTo(strokeX, 6)
  })

  it('on the bottom edge too', () => {
    const shape = tailShape(rect, [250, 500], { ink: INK, radius: 20 })
    expect(shape.root[1]).toBeCloseTo(rect.top + rect.h - INK / 2, 6)
  })
})

describe('a thought trail starts on the cloud', () => {
  // How far a point is from the nearest scallop arc the cloud draws (0 = on the line).
  const offCloud = ([x, y]) => Math.min(...cloudArcs(rect).map(a => Math.abs(Math.hypot(x - a.cx, y - a.cy) - a.r)))

  for (const tip of [[700, 160], [600, 500], [0, 0], [250, 600]]) {
    it(`toward ${tip}: the root is on the cloud's outline and the first circle touches it`, () => {
      const root = thoughtRoot(rect, tip)
      expect(offCloud(root)).toBeLessThan(1e-6)
      const [first] = thoughtTrail(rect, tip)
      const r0 = Math.max(5, TRAIL_SHARES[0] * rect.h)
      expect(Math.hypot(first.x - root[0], first.y - root[1])).toBeCloseTo(first.r, 6)
      expect(first.r).toBeGreaterThanOrEqual(r0 - 1e-9)
    })
  }

  it('a pinned root is carried to the cloud too', () => {
    const root = thoughtRoot(rect, [700, 160], 0.1)
    expect(offCloud(root)).toBeLessThan(1e-6)
  })
})
