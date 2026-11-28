/**
 * art-groups.js — groups of picture layers on a flat scene, and pivot points (Bart 2026-11-28: "I want to move a
 * group and animate the group. I also would like to set pivot points.").
 *
 * A group lives on its shot (`shot.groups[]`), a layer joins with `group: <id>`. The group is a parent transform
 * over its layers, the way the 2.5D stage composes a grouped layer (engine-mvp stage25d/layout.ts inGroup, a
 * Babylon TransformNode parent): its own place, size, turn and fade, about its pivot.
 *
 *   { id: 'g1', name?, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, pivot_x, pivot_y }
 *
 * x / y are how far the group has moved from where it was made, in % of the stage (so a fresh group is 0, 0 and
 * nothing jumps); pivot_x / pivot_y are the point it turns and grows about, in % of the stage where the group was
 * made. On screen the pivot stands at pivot + (x, y).
 *
 * A layer's own pivot (`pivot_x`, `pivot_y`, 0..1 across its box, unset = its middle) is the point it turns about.
 * Its x / y stay its middle, so everything that reads a layer's centre (resize, fit, blend into the scene) is
 * untouched; only the turn moves.
 *
 * Pure maths: px in, px out, so the editor and the player put a layer in the same place. Rotation in degrees,
 * clockwise on screen (CSS rotate()).
 */

/** The values a group's row takes: its panel, its canvas box and its timeline keys. */
export const GROUP_FIELDS = ['x', 'y', 'scale', 'rotation', 'opacity']

const rad = (deg) => (Number(deg) || 0) * Math.PI / 180
const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback)

/** A group as the overlay uses it: every value there, neutral where unset. */
export const normalizeGroup = (g) => ({
  id: String(g?.id ?? ''),
  name: typeof g?.name === 'string' ? g.name : '',
  x: num(g?.x, 0),
  y: num(g?.y, 0),
  scale: Math.max(0.05, num(g?.scale, 1)),
  rotation: num(g?.rotation, 0),
  opacity: Math.min(1, Math.max(0, num(g?.opacity, 1))),
  pivot_x: num(g?.pivot_x, 50),
  pivot_y: num(g?.pivot_y, 50),
})

/** Turn a vector by deg (clockwise on screen) and grow it by s. */
const turn = ([vx, vy], deg, s = 1) => {
  const a = rad(deg)
  const c = Math.cos(a) * s
  const n = Math.sin(a) * s
  return [vx * c - vy * n, vx * n + vy * c]
}

/**
 * A member layer as its group shows it: its middle, size, turn and fade on screen.
 *
 * @param {{x:number,y:number,scale:number,rotation?:number,opacity?:number}} layer  its own values (x, y in % of the stage)
 * @param {object|null} group  normalizeGroup(); null = the layer as it is
 * @param {number} w  stage width, px
 * @param {number} h  stage height, px
 */
export const composeMember = (layer, group, w, h) => {
  const own = { x: layer.x, y: layer.y, scale: layer.scale ?? 1, rotation: layer.rotation || 0, opacity: layer.opacity ?? 1 }
  if (!group) return own
  const W = w || 1600
  const H = h || 900
  const v = [((own.x - group.pivot_x) / 100) * W, ((own.y - group.pivot_y) / 100) * H]
  const [dx, dy] = turn(v, group.rotation, group.scale)
  return {
    x: group.pivot_x + group.x + (dx / W) * 100,
    y: group.pivot_y + group.y + (dy / H) * 100,
    scale: own.scale * group.scale,
    rotation: own.rotation + group.rotation,
    opacity: own.opacity * group.opacity,
  }
}

/**
 * The other way: a layer's own values for a place on screen inside its group (a member dragged, resized or turned on
 * the canvas). `shown` is what composeMember gives; any of its fields may be missing.
 */
export const releaseMember = (shown, group, w, h) => {
  if (!group) return { ...shown }
  const W = w || 1600
  const H = h || 900
  const out = {}
  if (Number.isFinite(shown.x) && Number.isFinite(shown.y)) {
    const v = [((shown.x - group.pivot_x - group.x) / 100) * W, ((shown.y - group.pivot_y - group.y) / 100) * H]
    const [dx, dy] = turn(v, -group.rotation, 1 / group.scale)
    out.x = group.pivot_x + (dx / W) * 100
    out.y = group.pivot_y + (dy / H) * 100
  }
  if (Number.isFinite(shown.scale)) out.scale = shown.scale / group.scale
  if (Number.isFinite(shown.rotation)) out.rotation = shown.rotation - group.rotation
  if (Number.isFinite(shown.opacity)) out.opacity = group.opacity > 0 ? shown.opacity / group.opacity : shown.opacity
  return out
}

/** A move on screen (% of the stage) as a move of a member's own x / y. */
export const localDelta = (dxPct, dyPct, group, w, h) => {
  if (!group) return [dxPct, dyPct]
  const W = w || 1600
  const H = h || 900
  const [dx, dy] = turn([(dxPct / 100) * W, (dyPct / 100) * H], -group.rotation, 1 / group.scale)
  return [(dx / W) * 100, (dy / H) * 100]
}

/** Where a group's pivot stands on screen, % of the stage. */
export const groupPivotAt = (group) => [group.pivot_x + group.x, group.pivot_y + group.y]

/**
 * The group's pivot moved to Q on screen (% of the stage), without its layers moving: the new pivot and the move that
 * keeps every layer where it is (with s R the group's size and turn, P the pivot, t its move:
 * P' = P + (sR)^-1 (Q - t - P), t' = t + (I - sR)(P - P')).
 */
export const moveGroupPivot = (group, qx, qy, w, h) => {
  const W = w || 1600
  const H = h || 900
  const px = (v) => [(v[0] / 100) * W, (v[1] / 100) * H]
  const pct = (v) => [(v[0] / W) * 100, (v[1] / H) * 100]
  const P = px([group.pivot_x, group.pivot_y])
  const t = px([group.x, group.y])
  const Q = px([qx, qy])
  const [ex, ey] = turn([Q[0] - t[0] - P[0], Q[1] - t[1] - P[1]], -group.rotation, 1 / group.scale)
  const P2 = [P[0] + ex, P[1] + ey]
  const d = [P[0] - P2[0], P[1] - P2[1]]
  const sd = turn(d, group.rotation, group.scale)
  const t2 = [t[0] + d[0] - sd[0], t[1] + d[1] - sd[1]]
  const [pivot_x, pivot_y] = pct(P2)
  const [x, y] = pct(t2)
  return { pivot_x, pivot_y, x, y }
}

/** A layer's pivot, 0..1 across its box (unset = its middle). */
export const layerPivot = (layer) => [num(layer?.pivot_x, 0.5), num(layer?.pivot_y, 0.5)]

/**
 * The node's CSS transform: centred on its x / y, turned about its pivot, mirrored about its middle. dx / dy are extra
 * px (parallax, the shot camera). The mirror comes last, so a flipped picture keeps its place and its pivot.
 */
export const layerTransform = (layer, rotation, dx = 0, dy = 0) => {
  const [pxF, pyF] = layerPivot(layer)
  const ox = Math.round((pxF - 0.5) * 10000) / 100
  const oy = Math.round((pyF - 0.5) * 10000) / 100
  const pivoted = ox !== 0 || oy !== 0
  const spin = rotation ? (pivoted ? ` translate(${ox}%, ${oy}%) rotate(${rotation}deg) translate(${-ox}%, ${-oy}%)` : ` rotate(${rotation}deg)`) : ''
  const sx = layer.flip_x ? -1 : 1
  const sy = layer.flip_y ? -1 : 1
  const mirror = (sx === 1 && sy === 1) ? '' : ` scale(${sx}, ${sy})`
  return `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))${spin}${mirror}`
}

/**
 * A layer's pivot moved to Q on screen without the picture moving. The layer stands with its middle at c (px), its box
 * bw x bh (px, before turning) and turned by deg; its pivot sits at c + o on screen, o = (p - 0.5) * box. Moving it to
 * o2 keeps the picture still when the middle goes to c + (I - R)(o - o2), and c2 + o2 = Q gives o2 = R^-1 (Q - c - o + R o).
 *
 * @returns {{pivot_x:number, pivot_y:number, cx:number, cy:number}} the new pivot (0..1) and middle (px)
 */
export const moveLayerPivot = ({ cx, cy, bw, bh, rotation, pivot }, qx, qy) => {
  const o = [(pivot[0] - 0.5) * bw, (pivot[1] - 0.5) * bh]
  const ro = turn(o, rotation)
  const [o2x, o2y] = turn([qx - cx - o[0] + ro[0], qy - cy - o[1] + ro[1]], -rotation)
  const d = [o[0] - o2x, o[1] - o2y]
  const rd = turn(d, rotation)
  return {
    pivot_x: bw ? 0.5 + o2x / bw : 0.5,
    pivot_y: bh ? 0.5 + o2y / bh : 0.5,
    cx: cx + d[0] - rd[0],
    cy: cy + d[1] - rd[1],
  }
}

/** Where a layer's pivot stands on screen, px: its middle plus the pivot's offset in its box (the turn keeps it there). */
export const layerPivotAt = ({ cx, cy, bw, bh, pivot }) => [cx + (pivot[0] - 0.5) * bw, cy + (pivot[1] - 0.5) * bh]

/**
 * A layer's values when its group is taken apart: what the group showed, as its own (Ungroup leaves every layer where
 * the group put it).
 */
export const bakeMember = (layer, group, w, h) => {
  const shown = composeMember(layer, group, w, h)
  const r2 = (n, d = 100) => Math.round(n * d) / d
  return {
    x: r2(shown.x),
    y: r2(shown.y),
    scale: r2(shown.scale, 1000),
    rotation: r2(((shown.rotation + 540) % 360) - 180, 10),
    opacity: r2(shown.opacity, 1000),
  }
}
