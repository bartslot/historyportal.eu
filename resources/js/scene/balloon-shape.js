/**
 * balloon-shape: the drawn parts of a comic balloon, as plain geometry (host px), so the player
 * and the editor draw them the same way and the rules can be tested without a DOM.
 *
 * Ligne claire (Hergé): a speech tail leaves the balloon on the side nearest the speaker, its root
 * narrow (a seventh of the balloon's height), and tapers to a point along ONE gentle bend, never
 * an S. It points at the mouth and stops short of it. A thought balloon is a cloud, and instead of
 * a tail a trail of three shrinking circles runs to the thinker's head.
 *
 * rect: the balloon's box {left, top, w, h}. tip: [x, y].
 */

/** The tail's root is this share of the balloon's height wide (Hergé: about 1/6 to 1/8). */
export const ROOT_SHARE = 1 / 7
/** How far the tail bows off the straight line, as a share of its length (signed: side). */
export const DEFAULT_BEND = 0.12
/** The largest bend the editor stores: more than this reads as a hook. */
export const MAX_BEND = 0.35
/** The fill starts this far inside the balloon, so its outline never shows across the root. */
const ROOT_TUCK = 4
/** Thought circles: radius as a share of the balloon's height, nearest the balloon first. */
export const TRAIL_SHARES = [0.14, 0.095, 0.06]
const TRAIL_MIN_R = [5, 3.5, 2.5]

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/**
 * Where a tail toward `tip` leaves the balloon: the edge the tip lies furthest beyond, at the point
 * nearest the tip, kept clear of the rounded corners (`radius`) by half the root width. Null when
 * the tip is inside the balloon (nothing to point at).
 *
 * @returns {{point: [number, number], normal: [number, number], along: [number, number]} | null}
 */
export function tailRoot (rect, tip, { radius = 0, half = 0 } = {}) {
  const { left, top, w, h } = rect
  const right = left + w
  const bottom = top + h
  const [x, y] = tip
  const dx = x < left ? left - x : x > right ? x - right : 0
  const dy = y < top ? top - y : y > bottom ? y - bottom : 0
  if (dx === 0 && dy === 0) return null
  const keep = radius + half
  const mid = (lo, hi) => (lo + keep <= hi - keep ? null : (lo + hi) / 2)
  if (dy >= dx) {
    const edgeY = y < top ? top : bottom
    const px = mid(left, right) ?? clamp(x, left + keep, right - keep)
    return { point: [px, edgeY], normal: [0, y < top ? -1 : 1], along: [1, 0] }
  }
  const edgeX = x < left ? left : right
  const py = mid(top, bottom) ?? clamp(y, top + keep, bottom - keep)
  return { point: [edgeX, py], normal: [x < left ? -1 : 1, 0], along: [0, 1] }
}

/** A point `gap` short of `target` on the line from `from`: where a tail toward a mouth stops. */
export function tipShortOf (from, target, gap) {
  const dx = target[0] - from[0]
  const dy = target[1] - from[1]
  const dist = Math.hypot(dx, dy)
  if (dist <= gap) return [...from]
  const reach = dist - gap
  return [from[0] + (dx / dist) * reach, from[1] + (dy / dist) * reach]
}

/** A point kept inside a view box {x0, y0, x1, y1}: a speaker off the panel gets a tail to its edge. */
export const clampToView = (p, view) => [clamp(p[0], view.x0, view.x1), clamp(p[1], view.y0, view.y1)]

/**
 * The speech tail: a curved wedge from a narrow root on the nearest edge to `tip`.
 *
 * @returns {null | {root: [number, number], a: [number, number], b: [number, number], ctrl: [number, number],
 *                   tip: [number, number], half: number, fill: string, ink: string}}
 */
export function tailShape (rect, tip, { bend = DEFAULT_BEND, radius = 0 } = {}) {
  const half = (rect.h * ROOT_SHARE) / 2
  const root = tailRoot(rect, tip, { radius, half })
  if (!root) return null
  const [rx, ry] = root.point
  const [tx, ty] = tip
  const [ax, ay] = root.along
  const [nx, ny] = root.normal
  const a = [rx - ax * half, ry - ay * half]
  const b = [rx + ax * half, ry + ay * half]
  // One bend: the middle of root → tip, pushed sideways by `bend` of the tail's length.
  const len = Math.hypot(tx - rx, ty - ry) || 1
  const px = -(ty - ry) / len
  const py = (tx - rx) / len
  const ctrl = [(rx + tx) / 2 + px * bend * len, (ry + ty) / 2 + py * bend * len]
  // Each side bends the same way (no S): its control point is the bend, nudged toward its own side.
  const ca = [ctrl[0] - ax * half / 2, ctrl[1] - ay * half / 2]
  const cb = [ctrl[0] + ax * half / 2, ctrl[1] + ay * half / 2]
  const f = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  const tuck = (p) => [p[0] - nx * ROOT_TUCK, p[1] - ny * ROOT_TUCK]
  const sides = `${f(a)} Q ${f(ca)} ${f(tip)} Q ${f(cb)} ${f(b)}`

  return {
    root: root.point,
    a,
    b,
    ctrl,
    tip: [tx, ty],
    half,
    // The fill reaches into the balloon and covers its outline at the root; the ink is only the
    // two sides, so no line runs across the join.
    fill: `M ${f(tuck(a))} L ${sides} L ${f(tuck(b))} Z`,
    ink: `M ${sides}`,
  }
}

/**
 * A thought balloon's trail: three circles from the balloon toward `tip`, each smaller than the
 * one before; the last sits on the tip (the editor drags it). Empty when the tip is inside.
 *
 * @returns {Array<{x: number, y: number, r: number}>}
 */
export function thoughtTrail (rect, tip) {
  const root = tailRoot(rect, tip)
  if (!root) return []
  const radii = TRAIL_SHARES.map((s, i) => Math.max(TRAIL_MIN_R[i], s * rect.h))
  const [rx, ry] = root.point
  const len = Math.hypot(tip[0] - rx, tip[1] - ry) || 1
  const ux = (tip[0] - rx) / len
  const uy = (tip[1] - ry) / len
  // The first circle stands just off the balloon; the middle one halfway to the last.
  const first = Math.min(len, radii[0] * 1.6)
  const at = [first, (first + len) / 2, len]

  return at.map((d, i) => ({ x: rx + ux * d, y: ry + uy * d, r: radii[i] }))
}

/**
 * The cloud outline of a thought balloon w x h: scallops around an ellipse, each a small arc that
 * bulges outward. Closed, starting at the top.
 */
export function cloudPath (w, h) {
  const bump = Math.max(8, Math.min(w, h) * 0.18)
  const rx = Math.max(1, w / 2 - bump * 0.45)
  const ry = Math.max(1, h / 2 - bump * 0.45)
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))
  const n = Math.max(8, Math.round(perimeter / (bump * 1.5)))
  const pts = Array.from({ length: n }, (_, i) => {
    const t = -Math.PI / 2 + (i / n) * Math.PI * 2
    return [w / 2 + rx * Math.cos(t), h / 2 + ry * Math.sin(t)]
  })
  const f = (v) => v.toFixed(2)
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`
  pts.forEach((_, i) => {
    const p = pts[(i + 1) % n]
    const q = pts[i]
    const r = Math.hypot(p[0] - q[0], p[1] - q[1]) * 0.62
    d += ` A ${f(r)} ${f(r)} 0 0 1 ${f(p[0])} ${f(p[1])}`
  })

  return `${d} Z`
}
