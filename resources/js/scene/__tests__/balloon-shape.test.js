import { describe, it, expect } from 'vitest'
import { tailRoot, tailShape, thoughtTrail, tipShortOf, clampToView, cloudPath, ROOT_SHARE, TRAIL_SHARES } from '../balloon-shape.js'
import { onEdge } from '../balloon-edit.js'

const rect = { left: 100, top: 100, w: 400, h: 140 }
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('tailRoot', () => {
  it('leaves from the bottom edge for a speaker below the balloon', () => {
    const r = tailRoot(rect, [300, 500])
    expect(r.point).toEqual([300, 240])
    expect(r.normal).toEqual([0, 1])
  })

  it('leaves from the side edge for a speaker beside the balloon', () => {
    const r = tailRoot(rect, [800, 180])
    expect(r.point).toEqual([500, 180])
    expect(r.normal).toEqual([1, 0])
  })

  it('snaps along the edge as the tip moves, keeping clear of the rounded corner', () => {
    const near = tailRoot(rect, [120, 600], { radius: 30, half: 10 })
    expect(near.point).toEqual([140, 240])
    const moved = tailRoot(rect, [260, 600], { radius: 30, half: 10 })
    expect(moved.point).toEqual([260, 240])
  })

  it('has no tail for a tip inside the balloon', () => {
    expect(tailRoot(rect, [300, 150])).toBeNull()
  })
})

describe('tailShape', () => {
  it('has a narrow root, a seventh of the balloon height', () => {
    const t = tailShape(rect, [200, 420])
    expect(dist(t.a, t.b)).toBeCloseTo(rect.h * ROOT_SHARE, 6)
    expect(t.root[1]).toBe(240)
  })

  it('bends once, its control point off the straight line by the bend share of its length', () => {
    const tip = [200, 440]
    const t = tailShape(rect, tip, { bend: 0.12 })
    const len = dist(t.root, tip)
    const mid = [(t.root[0] + tip[0]) / 2, (t.root[1] + tip[1]) / 2]
    expect(dist(t.ctrl, mid)).toBeCloseTo(0.12 * len, 6)
    // One quadratic per side, no S: exactly two Q commands in the ink.
    expect(t.ink.match(/Q/g)).toHaveLength(2)
  })

  it('a straight tail with no bend has its control point on the line', () => {
    const t = tailShape(rect, [300, 440], { bend: 0 })
    expect(t.ctrl).toEqual([300, 340])
  })

  it('tucks the fill into the balloon so no outline shows across the root', () => {
    const t = tailShape(rect, [300, 440])
    const start = t.fill.match(/^M ([\d.]+) ([\d.]+)/).slice(1).map(Number)
    expect(start[1]).toBeLessThan(240)
  })
})

describe('tipShortOf', () => {
  it('stops the given gap short of the mouth', () => {
    const tip = tipShortOf([300, 240], [300, 500], 55)
    expect(dist(tip, [300, 500])).toBeCloseTo(55, 6)
  })

  it('never passes the mouth when it is closer than the gap', () => {
    expect(tipShortOf([300, 240], [300, 260], 55)).toEqual([300, 240])
  })
})

describe('clampToView', () => {
  it('runs a tail to an off-panel speaker only as far as the panel edge', () => {
    expect(clampToView([1400, 300], { x0: 0, y0: 0, x1: 960, y1: 540 })).toEqual([960, 300])
  })
})

describe('thoughtTrail', () => {
  it('is three circles, each smaller than the one before, the last on the tip', () => {
    const tip = [180, 480]
    const trail = thoughtTrail(rect, tip)
    expect(trail).toHaveLength(3)
    expect(trail[0].r).toBeGreaterThan(trail[1].r)
    expect(trail[1].r).toBeGreaterThan(trail[2].r)
    expect(trail[0].r).toBeCloseTo(TRAIL_SHARES[0] * rect.h, 6)
    expect([trail[2].x, trail[2].y]).toEqual(tip)
  })

  it('walks away from the balloon toward the head', () => {
    const trail = thoughtTrail(rect, [300, 520])
    expect(trail[0].y).toBeLessThan(trail[1].y)
    expect(trail[1].y).toBeLessThan(trail[2].y)
    expect(trail[0].y).toBeGreaterThan(240)
  })

  it('is empty for a tip inside the balloon', () => {
    expect(thoughtTrail(rect, [300, 160])).toEqual([])
  })
})

describe('onEdge (balloon-edit)', () => {
  const r = { left: 0, top: 0, right: 200, bottom: 80 }

  it('a press near the edge pulls a tail; in the middle it moves the balloon', () => {
    expect(onEdge(4, 40, r)).toBe(true)
    expect(onEdge(100, 76, r)).toBe(true)
    expect(onEdge(100, 40, r)).toBe(false)
    expect(onEdge(300, 40, r)).toBe(false)
  })
})

describe('cloudPath', () => {
  it('is a closed outline of outward arcs', () => {
    const d = cloudPath(400, 140)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect((d.match(/ A /g) || []).length).toBeGreaterThanOrEqual(8)
  })
})
