import { describe, it, expect } from 'vitest'
import {
  tailRoot, tailShape, thoughtTrail, thoughtRoot, tipShortOf, clampToView, cloudPath, ROOT_SHARE, TRAIL_SHARES,
  outlinePoint, outlineT, bendFromPoint, curveMid, MAX_BEND, TAIL_MAX_LEAN_DEG, rubberInView } from '../balloon-shape.js'
import { onEdge } from '../balloon-edit.js'

const rect = { left: 100, top: 100, w: 400, h: 140 }
const onOutline = (p, r = rect) => {
  const onX = p[0] === r.left || p[0] === r.left + r.w
  const onY = p[1] === r.top || p[1] === r.top + r.h
  const inX = p[0] >= r.left && p[0] <= r.left + r.w
  const inY = p[1] >= r.top && p[1] <= r.top + r.h
  return (onX && inY) || (onY && inX)
}

describe('a pinned tail root (outline position)', () => {
  it('always lands on the outline, wherever along it', () => {
    for (let t = 0; t < 1; t += 0.037) expect(onOutline(outlinePoint(rect, t).point)).toBe(true)
  })

  it('runs clockwise from the top-left corner', () => {
    expect(outlinePoint(rect, 0.1).point[1]).toBe(100)            // top edge
    expect(outlinePoint(rect, 0.4).point[0]).toBe(500)            // right edge
    expect(outlinePoint(rect, 0.6).point[1]).toBe(240)            // bottom edge
    expect(outlinePoint(rect, 0.95).point[0]).toBe(100)           // left edge
  })

  it('projects a dragged point onto the nearest edge and back to the same spot', () => {
    const [x, y] = outlinePoint(rect, outlineT(rect, [260, 300])).point   // well below the bottom edge
    expect(x).toBeCloseTo(260, 1)
    expect(y).toBe(240)
    const near = outlinePoint(rect, outlineT(rect, [300, 110])).point   // inside, near the top
    expect(near[0]).toBeCloseTo(300, 1)
    expect(near[1]).toBe(100)
  })

  it('keeps clear of the rounded corners', () => {
    expect(outlinePoint(rect, 0, { radius: 30, half: 10 }).point).toEqual([140, 100])
  })

  it('stays where it was pinned while the tip moves; auto snaps to the nearest edge', () => {
    const pinned = outlineT(rect, [500, 170])     // right edge
    // both inside the angle a tail may lean (tips further out from that edge)
    const a = tailShape(rect, [640, 300], { root: pinned })
    const b = tailShape(rect, [700, 200], { root: pinned })
    expect(a.root).toEqual(b.root)
    expect(a.root[0]).toBe(500)
    expect(tailShape(rect, [300, 500]).root[1]).toBe(240)   // auto: the bottom edge, below the tip's way
  })

  it('a thought trail leaves from the pinned spot too', () => {
    const pin = outlineT(rect, [100, 170])        // the left edge
    const trail = thoughtTrail(rect, [300, 500], pin)
    // It leaves the CLOUD in the pinned direction (the cloud lies inside the box), and its first
    // circle touches it (Bart 2026-10-16: "always on the edge/stroke of the balloon").
    const from = thoughtRoot(rect, [300, 500], pin)
    const box = outlinePoint(rect, pin).point
    const centre = [rect.left + rect.w / 2, rect.top + rect.h / 2]
    const dir = (p) => Math.atan2(p[1] - centre[1], p[0] - centre[0])
    expect(dir(from)).toBeCloseTo(dir(box), 6)
    expect(Math.hypot(trail[0].x - from[0], trail[0].y - from[1])).toBeCloseTo(trail[0].r, 6)
  })
})

describe('the bend handle', () => {
  it('sits on the curve\'s middle, and dragging it there gives the same bend back', () => {
    const t = tailShape(rect, [200, 460], { bend: 0.2 })
    expect(t.mid).toEqual(curveMid(t.root, t.ctrl, t.tip))
    expect(bendFromPoint(t.root, t.tip, t.mid)).toBeCloseTo(0.2, 3)
  })

  it('bends either way and never past the limit', () => {
    const root = [300, 240]
    const tip = [300, 440]
    expect(bendFromPoint(root, tip, [260, 340])).toBeGreaterThan(0)
    expect(bendFromPoint(root, tip, [340, 340])).toBeLessThan(0)
    expect(Math.abs(bendFromPoint(root, tip, [0, 340]))).toBe(MAX_BEND)
  })
})
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

describe('a tail keeps out of the bubble', () => {
  const rect = { left: 100, top: 100, w: 300, h: 100 }
  const lean = (shape) => {
    // its start: from the root toward the control point; the bubble's bottom edge has normal (0, 1)
    const dx = shape.ctrl[0] - shape.root[0]
    const dy = shape.ctrl[1] - shape.root[1]
    return (Math.acos(dy / Math.hypot(dx, dy)) * 180) / Math.PI
  }

  it('a root pinned far along the edge slides toward the tip: the tail never runs flat along the bubble', () => {
    // root at the bottom's left end (t = (w + h + w - small) / per), tip off to the right and just below
    const t = (300 + 100 + 280) / 800
    const shape = tailShape(rect, [430, 240], { bend: 0, root: t })
    expect(shape.root[1]).toBe(200)
    expect(lean(shape)).toBeLessThanOrEqual(TAIL_MAX_LEAN_DEG + 0.01)
    expect(shape.root[0]).toBeGreaterThan(300)
  })

  it('a tail that cannot reach from that edge leaves from the one nearest the tip', () => {
    const t = (300 + 100 + 280) / 800
    const shape = tailShape(rect, [520, 190], { bend: 0, root: t })
    expect(shape.root[0]).toBe(400)   // the right edge
  })

  it('a root behind the tip, on the far side of the bubble, moves to the near side', () => {
    const top = 150 / 800
    expect(tailShape(rect, [250, 320], { bend: 0, root: top }).root[1]).toBe(200)
  })

  it('a strong bend that would push its start past the limit eases off, one that stays inside is kept', () => {
    const t = (300 + 100 + 150) / 800   // the middle of the bottom
    const steep = tailShape(rect, [330, 300], { bend: 0.35, root: t })
    expect(lean(steep)).toBeLessThanOrEqual(TAIL_MAX_LEAN_DEG + 0.01)
    const gentle = tailShape(rect, [250, 320], { bend: 0.1, root: t })
    expect(gentle.ctrl[0]).not.toBeCloseTo(gentle.root[0] + (gentle.tip[0] - gentle.root[0]) / 2)   // still bent
  })
})

describe('rubberInView', () => {
  const view = { x0: 0, y0: 0, x1: 400, y1: 300 }

  it('leaves a point alone away from the edges', () => {
    expect(rubberInView([200, 100], view, 28)).toEqual({ at: [200, 100], rest: [200, 100] })
  })

  it('stops the margin from an edge, stretches a little past it, rests on the margin', () => {
    const { at, rest } = rubberInView([392, 100], view, 28)
    expect(rest).toEqual([372, 100])
    expect(at[0]).toBeCloseTo(377)
    expect(rubberInView([500, 100], view, 28).at[0]).toBeLessThanOrEqual(400)
  })

  it('a view smaller than two margins rests in its middle', () => {
    expect(rubberInView([5, 10], { x0: 0, y0: 0, x1: 40, y1: 40 }, 28).rest).toEqual([20, 20])
  })
})

