// The composition readback (clay-blockout Gate 1): what the AI gets back instead of a screenshot. Pure: boxes and a
// camera in, numbers and a short text out (~1-2 k tokens for a shot).
//
// Per piece: frame box (u0 v0 u1 v1, 0..1, v down), visible %, which frame edges cut it, facing, on its floor.
// Problems: refused overlaps (from the solver), floating, a subject out of frame, a figure too small, a subject
// hidden behind a nearer piece. Composition: horizon line, subjects left to right, each subject's eyes against the
// thirds grid. Gate 2: a figure's cut edges are per body part (head, hands, feet from its bones), and a subject's size
// in frame is reported, with "small" under the shot preset's own threshold.
import { corners, horizonV, project, type Box, type Cam, type Preset, type V3 } from './camera'
import type { Problem } from './solve'

export const PARTS = ['head', 'left hand', 'right hand', 'left foot', 'right foot'] as const
export type Part = (typeof PARTS)[number]
export type Item = {
  id: string; kit: string; box: Box; yaw: number; floorY: number; subject: boolean; figure: boolean
  parts?: Partial<Record<Part, V3>>            // a figure's body parts in the world (its bones), for per-part cuts
}
export type Framed = {
  id: string; kit: string
  frame: [number, number, number, number] | null
  visible: number
  cut: string[]
  facing: number
  onFloor: boolean
  depth: number
  size: number                                 // height in frame (unclipped), share of the frame height
}
export type Readback = {
  pieces: Framed[]
  horizon: number | null
  order: string[]
  thirds: { id: string; eyes: [number, number]; nearest: [number, number]; off: number }[]
  problems: string[]
  text: string
}

const FLOAT_M = 0.05                // a piece more than this above its floor is floating
const MIN_FIGURE = 0.15             // a figure smaller than this share of the frame height reads as a speck
// per preset: a subject smaller than this (its whole height, cut parts included) is too far for the shot
export const MIN_SUBJECT: Record<Preset, number> = {
  'wide': 0.12, 'three-quarter': 0.45, 'front': 0.5, 'profile': 0.45, 'medium': 0.75, 'close-up': 1.2,
  'over-shoulder': 0.3, 'low': 0.45, 'high': 0.3,
}
const ALLOWED_CUT: Part[] = ['left foot', 'right foot']   // feet may leave the frame (medium, close-up)
const OUT_OF_FRAME = 0.2            // a subject less visible than this is out of frame
const HIDDEN = 0.4                  // a nearer piece covering this share of a subject hides it
const MAX_LISTED = 40               // pieces listed by name: subjects first, then the largest in frame
const pct = (v: number) => Math.round(v * 100)
const f2 = (v: number) => Math.round(v * 100) / 100

const SIGHT_FRACTIONS = [0.2, 0.5, 0.8]   // 3 x 3 sight lines to a subject's upper half
const SIGHT_SHRINK_M = 0.02               // a box touching the line at its very edge does not block it

function shrink(b: Box, m: number): Box {
  return { min: [b.min[0] + m, b.min[1] + m, b.min[2] + m], max: [b.max[0] - m, b.max[1] - m, b.max[2] - m] }
}

/** Does the segment from a to b pass through the box (slab test)? */
export function segmentHitsBox(a: V3, b: V3, box: Box): boolean {
  let t0 = 0, t1 = 1
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i]
    if (Math.abs(d) < 1e-9) {
      if (a[i] < box.min[i] || a[i] > box.max[i]) return false
      continue
    }
    let ta = (box.min[i] - a[i]) / d
    let tb = (box.max[i] - a[i]) / d
    if (ta > tb) [ta, tb] = [tb, ta]
    t0 = Math.max(t0, ta)
    t1 = Math.min(t1, tb)
    if (t0 > t1) return false
  }
  return t1 > 0 && t0 < 1
}

function area(b: [number, number, number, number]) { return Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]) }

function frameOf(cam: Cam, box: Box): { full: [number, number, number, number]; depth: number } | null {
  const qs = corners(box).map((p) => project(cam, p))
  if (qs.every((q) => q.depth <= 0.05)) return null
  const front = qs.filter((q) => q.depth > 0.05)
  const us = front.map((q) => q.u)
  const vs = front.map((q) => q.v)
  return { full: [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)], depth: Math.min(...front.map((q) => q.depth)) }
}

export function readback(cam: Cam, items: Item[], solverProblems: Problem[] = [], preset?: Preset): Readback {
  const problems = solverProblems.map((p) => `${p.kind}: ${p.detail}`)
  const pieces: Framed[] = items.map((it) => {
    const fr = frameOf(cam, it.box)
    const onFloor = it.box.min[1] - it.floorY <= FLOAT_M
    if (!fr) return { id: it.id, kit: it.kit, frame: null, visible: 0, cut: ['behind camera'], facing: it.yaw, onFloor, depth: -1, size: 0 }
    const [u0, v0, u1, v1] = fr.full
    const clip: [number, number, number, number] = [Math.max(0, u0), Math.max(0, v0), Math.min(1, u1), Math.min(1, v1)]
    const full = area(fr.full)
    const visible = full > 0 ? area(clip) / full : 0
    // a figure: which body parts are out of frame (its box corners overstate: feet below a medium frame are framing)
    const cut = it.parts
      ? (Object.entries(it.parts) as [Part, V3][]).filter(([, p]) => { const q = project(cam, p); return q.depth <= 0.05 || q.u < 0 || q.u > 1 || q.v < 0 || q.v > 1 }).map(([n]) => n)
      : [u0 < 0 && 'left', u1 > 1 && 'right', v0 < 0 && 'top', v1 > 1 && 'bottom'].filter(Boolean) as string[]
    return { id: it.id, kit: it.kit, frame: clip.map(f2) as Framed['frame'], visible: f2(visible), cut, facing: Math.round(it.yaw), onFloor, depth: f2(fr.depth), size: f2(v1 - v0) }
  })
  const byId = new Map(pieces.map((p) => [p.id, p]))
  for (const it of items) {
    const p = byId.get(it.id)!
    if (it.kit !== 'marker' && !p.onFloor) problems.push(`floating: ${it.id} is ${f2(it.box.min[1] - it.floorY)} m above its floor`)
    if (it.subject && p.visible < OUT_OF_FRAME) problems.push(`out of frame: subject ${it.id} is ${pct(p.visible)} % visible`)
    const min = it.subject && preset ? MIN_SUBJECT[preset] : MIN_FIGURE
    if (it.figure && p.frame && p.visible > 0 && p.size < min) problems.push(`small: ${it.subject ? 'subject' : 'figure'} ${it.id} is ${pct(p.size)} % of the frame height${it.subject && preset ? ` (a ${preset} shot wants ${pct(min)} % or more: bring the camera closer)` : ''}`)
    if (it.subject && it.parts) {
      const lost = p.cut.filter((c) => !ALLOWED_CUT.includes(c as Part))
      if (lost.length) problems.push(`cut: ${lost.join(', ')} of subject ${it.id} out of frame`)
    }
  }
  // a subject hidden by a piece between it and the camera: sight lines from the camera to points on its upper half
  // (a rail across a figure's legs is framing), each tested against the other pieces' boxes. Box corners alone
  // were wrong: a wide wall BEHIND a man, seen at an angle, has corners nearer the camera than he is (Gate 2).
  for (const s of items.filter((i) => i.subject)) {
    if (!byId.get(s.id)!.frame) continue
    const b = s.box
    const zc = (b.min[2] + b.max[2]) / 2
    const lo = s.figure ? (b.min[1] + b.max[1]) / 2 : b.min[1]
    const pts: V3[] = []
    for (const fx of SIGHT_FRACTIONS) for (const fy of SIGHT_FRACTIONS) {
      pts.push([b.min[0] + (b.max[0] - b.min[0]) * fx, lo + (b.max[1] - lo) * fy, zc])
    }
    for (const o of items) {
      if (o.id === s.id || o.kit === 'marker') continue
      const blocked = pts.filter((p) => segmentHitsBox(cam.position, p, shrink(o.box, SIGHT_SHRINK_M))).length
      const share = blocked / pts.length
      if (share > HIDDEN) problems.push(`hidden: ${o.id} covers ${pct(share)} % of subject ${s.id}`)
    }
  }
  const subjects = items.filter((i) => i.subject && byId.get(i.id)!.frame)
  const order = [...subjects].sort((a, b) => {
    const fa = byId.get(a.id)!.frame!
    const fb = byId.get(b.id)!.frame!
    return (fa[0] + fa[2]) - (fb[0] + fb[2])
  }).map((s) => s.id)
  const thirds = subjects.map((s) => {
    const b = s.box
    const tall = b.max[1] - b.min[1]
    const eyeY = s.figure ? b.min[1] + tall * 0.93 : (b.min[1] + b.max[1]) / 2
    const q = project(cam, [(b.min[0] + b.max[0]) / 2, eyeY, (b.min[2] + b.max[2]) / 2])
    const pts: [number, number][] = [[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]]
    const near = pts.reduce((m, p) => (Math.hypot(p[0] - q.u, p[1] - q.v) < Math.hypot(m[0] - q.u, m[1] - q.v) ? p : m))
    return { id: s.id, eyes: [f2(q.u), f2(q.v)] as [number, number], nearest: [f2(near[0]), f2(near[1])] as [number, number], off: f2(Math.hypot(near[0] - q.u, near[1] - q.v)) }
  })
  const horizon = horizonV(cam)
  // a crowded set stays a short text: subjects, then the largest pieces in frame
  const subjectIds = new Set(items.filter((i) => i.subject).map((i) => i.id))
  const size = (p: Framed) => (p.frame ? area(p.frame) : 0)
  const listed = [...pieces].sort((a, b) => Number(subjectIds.has(b.id)) - Number(subjectIds.has(a.id)) || size(b) - size(a)).slice(0, MAX_LISTED)
  const listedIds = new Set(listed.map((p) => p.id))
  const unseen = pieces.filter((p) => !listedIds.has(p.id) && p.visible === 0).length
  const text = [
    `camera at [${cam.position.map(f2).join(', ')}] looking at [${cam.target.map(f2).join(', ')}], fov ${Math.round((cam.fovY * 180) / Math.PI)} deg`,
    `horizon: ${horizon === null ? 'not in frame' : `${pct(horizon)} % down`}`,
    `subjects left to right: ${order.join(', ') || 'none in frame'}`,
    ...thirds.map((t) => `  ${t.id}: size ${pct(byId.get(t.id)!.size)} % of the frame height, eyes at (${t.eyes.join(', ')}), nearest third (${t.nearest.map((v) => Math.round(v * 3) + '/3').join(', ')}) ${t.off} away`),
    'pieces (frame u0 v0 u1 v1 | visible | cut | facing | floor):',
    ...listed.map((p) => `  ${p.id} [${p.kit}] ${p.frame ? p.frame.join(' ') : '-'} | ${pct(p.visible)} % | ${p.cut.join('+') || '-'} | ${p.facing} deg | ${p.onFloor ? 'on floor' : 'FLOATING'}`),
    ...(pieces.length > listed.length ? [`  +${pieces.length - listed.length} more pieces (${pieces.length - listed.length - unseen} in frame, ${unseen} out of it)`] : []),
    problems.length ? 'problems:' : 'problems: none',
    ...problems.map((p) => '  ' + p),
  ].join('\n')
  return { pieces, horizon, order, thirds, problems, text }
}
