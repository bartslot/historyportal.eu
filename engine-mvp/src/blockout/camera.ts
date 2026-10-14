// Camera presets (clay-blockout Gate 1): a shot is a preset + its subjects; the camera is computed from the
// subjects' boxes, the lens and the horizon line. Pure (no Babylon): the page and the tests use the same maths.
//
// horizon: where the horizon line sits, as a fraction DOWN from the top of the frame. Default 2/3: the lower third
// (the Tintin rule). The camera's tilt follows from it and the lens: tan(tilt up) = (2h - 1) tan(fovY / 2).
// Projection convention: u 0..1 left to right, v 0..1 top to bottom (screen), depth in metres along the view.
import { forward, rightOf } from './solve'

export type V3 = [number, number, number]
export type Box = { min: V3; max: V3 }
export type Subject = { id: string; box: Box; yaw: number }
export const PRESETS = ['wide', 'three-quarter', 'front', 'profile', 'medium', 'close-up', 'over-shoulder', 'low', 'high'] as const
export type Preset = (typeof PRESETS)[number]
// az: overrides the preset's angle around the subjects; align: where across the frame the subjects sit
export type Align = 'center' | 'left-third' | 'right-third'
export type Shot = { shot: Preset; subjects: string[]; lens_mm?: number; horizon?: number; az?: number; align?: Align }
export type Cam = { position: V3; target: V3; fovY: number; aspect: number }

export const LOWER_THIRD = 2 / 3
const DEFAULT_LENS_MM = 35
const MARGIN = 0.04                 // keep framed points this far inside the edges (fraction of the frame)

// az: degrees around the subjects from straight in front (+ = to their right); eye: camera height above the
// subjects' floor; fill: how much of the frame height the framed part may take; from: the framed part starts at this
// fraction of the subjects' height (0 = feet, 0.5 = knees up); horizonRule: tilt from the horizon line
type Spec = { az: number; eye: number | 'eyes'; fill: number; from: number; horizonRule: boolean }
const SPECS: Record<Exclude<Preset, 'over-shoulder'>, Spec> = {
  'wide': { az: 25, eye: 1.6, fill: 0.35, from: 0, horizonRule: true },
  'three-quarter': { az: 35, eye: 1.4, fill: 0.7, from: 0, horizonRule: true },
  'front': { az: 0, eye: 1.5, fill: 0.75, from: 0, horizonRule: true },
  'profile': { az: 90, eye: 1.5, fill: 0.7, from: 0, horizonRule: true },
  'medium': { az: 20, eye: 1.5, fill: 0.85, from: 0.45, horizonRule: true },
  'close-up': { az: 15, eye: 'eyes', fill: 0.9, from: 0.72, horizonRule: true },
  'low': { az: 25, eye: 0.5, fill: 0.7, from: 0, horizonRule: true },
  'high': { az: 25, eye: 4.5, fill: 0.6, from: 0, horizonRule: false },
}

export const fovFromLens = (mm: number) => 2 * Math.atan(24 / (2 * mm))      // full-frame, vertical

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

/** The camera's axes (Babylon, left-handed: right = up x forward). */
export function axes(cam: Cam) {
  const f = norm(sub(cam.target, cam.position))
  const r = norm(cross([0, 1, 0], f))
  return { f, r, u: cross(f, r) }
}

export function project(cam: Cam, p: V3): { u: number; v: number; depth: number } {
  const { f, r, u } = axes(cam)
  const d = sub(p, cam.position)
  const depth = dot(d, f)
  const t = Math.tan(cam.fovY / 2)
  const x = dot(d, r) / (depth * t * cam.aspect)
  const y = dot(d, u) / (depth * t)
  return { u: 0.5 + x / 2, v: 0.5 - y / 2, depth }
}

/** Where the horizon line is in the frame (fraction down from the top), or null when the camera looks straight down. */
export function horizonV(cam: Cam): number | null {
  const { f, u } = axes(cam)
  const h = norm([f[0], 0, f[2]])
  const depth = dot(h, f)
  if (depth <= 1e-6) return null
  return 0.5 - dot(h, u) / (depth * Math.tan(cam.fovY / 2)) / 2
}

export const corners = (b: Box): V3[] => {
  const out: V3[] = []
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) out.push([x, y, z])
  return out
}

function union(bs: Box[]): Box {
  return {
    min: [0, 1, 2].map((i) => Math.min(...bs.map((b) => b.min[i]))) as V3,
    max: [0, 1, 2].map((i) => Math.max(...bs.map((b) => b.max[i]))) as V3,
  }
}

const FACING_CANCELS = 0.3          // below this the subjects face each other (a conversation): no common front

function meanFacing(ss: Subject[]): [number, number] {
  let x = 0
  let z = 0
  for (const s of ss) { const [fx, fz] = forward(s.yaw); x += fx; z += fz }
  const l = Math.hypot(x, z)
  if (l / ss.length >= FACING_CANCELS) return [x / l, z / l]
  // facing each other: look across the line between them, from the studio's default side (-z)
  const c = (s: Subject, i: 0 | 2) => (s.box.min[i] + s.box.max[i]) / 2
  const a = ss[0], b = ss[ss.length - 1]
  let px = -(c(b, 2) - c(a, 2)), pz = c(b, 0) - c(a, 0)
  const pl = Math.hypot(px, pz) || 1
  px /= pl; pz /= pl
  return pz > 0 ? [-px, -pz] : [px, pz]       // the camera stands on the -z side: subjects' "front" points to -z
}

function fits(cam: Cam, pts: V3[], fill: number): boolean {
  let top = 1, bottom = 0
  for (const p of pts) {
    const q = project(cam, p)
    if (q.depth <= 0.1 || q.u < MARGIN || q.u > 1 - MARGIN || q.v < MARGIN || q.v > 1 - MARGIN) return false
    top = Math.min(top, q.v)
    bottom = Math.max(bottom, q.v)
  }
  return bottom - top <= fill
}

/** The camera for a shot. Subjects must be the shot's subjects, in its order. */
export function frame(shot: Shot, subjects: Subject[], aspect = 16 / 9): Cam {
  if (!subjects.length) throw new Error('a shot needs at least one subject')
  const fovY = fovFromLens(shot.lens_mm ?? DEFAULT_LENS_MM)
  if (shot.shot === 'over-shoulder') return overShoulder(subjects, fovY, aspect)
  const spec = SPECS[shot.shot]
  const ss = shot.shot === 'close-up' ? subjects.slice(0, 1) : subjects
  const all = union(ss.map((s) => s.box))
  const floor = all.min[1]
  const tall = all.max[1] - floor
  const part: Box = { min: [all.min[0], floor + tall * spec.from, all.min[2]], max: all.max }
  const pts = corners(part)
  const cx = (all.min[0] + all.max[0]) / 2
  const cz = (all.min[2] + all.max[2]) / 2
  // from the subjects' front, turned `az` degrees towards their right
  const [fx, fz] = meanFacing(ss)
  const a = ((shot.az ?? spec.az) * Math.PI) / 180
  const [rx, rz] = rightOf((Math.atan2(fx, fz) * 180) / Math.PI)
  const dx = fx * Math.cos(a) + rx * Math.sin(a)
  const dz = fz * Math.cos(a) + rz * Math.sin(a)
  const eye = floor + (spec.eye === 'eyes' ? tall * 0.93 : spec.eye)
  const h = shot.horizon ?? LOWER_THIRD
  // subjects on a third: turn the view sideways (left-handed: a positive turn about +Y looks to the right)
  const uWant = shot.align === 'left-third' ? 1 / 3 : shot.align === 'right-third' ? 2 / 3 : 0.5
  const side = Math.atan((1 - 2 * uWant) * Math.tan(fovY / 2) * aspect)
  const at = (dist: number): Cam => {
    const pos: V3 = [cx + dx * dist, eye, cz + dz * dist]
    const lx = -dx * Math.cos(side) + -dz * Math.sin(side)
    const lz = -dz * Math.cos(side) - -dx * Math.sin(side)
    const look = norm([lx, 0, lz])
    let tilt: number
    if (spec.horizonRule) tilt = Math.atan((2 * h - 1) * Math.tan(fovY / 2))
    else tilt = Math.atan2(floor + tall / 2 - eye, dist)                      // high angle: aim at the subjects
    const dir: V3 = [look[0] * Math.cos(tilt), Math.sin(tilt), look[2] * Math.cos(tilt)]
    return { position: pos, target: [pos[0] + dir[0] * 10, pos[1] + dir[1] * 10, pos[2] + dir[2] * 10], fovY, aspect }
  }
  // the nearest distance at which the framed part fits inside the frame and within `fill` of its height
  let lo = 0.3, hi = 400
  if (!fits(at(hi), pts, spec.fill)) return at(hi)
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (fits(at(mid), pts, spec.fill)) hi = mid; else lo = mid
  }
  return at(hi)
}

/** Over the first subject's right shoulder at the second (or along the first's gaze when alone). */
function overShoulder(ss: Subject[], fovY: number, aspect: number): Cam {
  const a = ss[0]
  const [fx, fz] = forward(a.yaw)
  const [rx, rz] = rightOf(a.yaw)
  const ax = (a.box.min[0] + a.box.max[0]) / 2
  const az = (a.box.min[2] + a.box.max[2]) / 2
  const tall = a.box.max[1] - a.box.min[1]
  const pos: V3 = [ax - fx * 0.9 + rx * 0.35, a.box.min[1] + tall * 0.88, az - fz * 0.9 + rz * 0.35]
  const b = ss[1]
  const target: V3 = b
    ? [(b.box.min[0] + b.box.max[0]) / 2, b.box.min[1] + (b.box.max[1] - b.box.min[1]) * 0.8, (b.box.min[2] + b.box.max[2]) / 2]
    : [ax + fx * 10, pos[1], az + fz * 10]
  return { position: pos, target, fovY, aspect }
}

export { union, norm }
