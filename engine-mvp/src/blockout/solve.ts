// Intent -> coordinates (clay-blockout Gate 1). The AI (or a teacher) states relations; this deterministic solver
// places the pieces. Pure: no Babylon, so it is tested on its own and runs the same in the page and in tests.
//
// World: metres, y up, +Z = forward at turn 0, a piece's own right = +X at turn 0 (Babylon, left-handed).
// yaw: degrees about +Y; a piece at yaw t faces (sin t, 0, cos t).
//
// Spec (one object of a blockout):
//   at: [x, z] | [x, y, z]                explicit spot (a teacher's hand edit always ends up here: it wins)
//   place: { near | behind | in_front | left_of | right_of: id, side?, gap?, offset? } | { between: [a, b] }
//          near + side front|back|left|right (default front) = against that side of the other piece, `gap` metres
//          apart (default 0.3); behind/in_front/left_of/right_of = near with that side, in the OTHER's own frame
//   on: id                                stand on top of that piece (its top anchor height); takes no floor cells
//   face: id | degrees                    turn to look at a piece or marker, or to a heading
//   turn: degrees                         extra turn after `face`
// Overlap: floor footprints are cells of CELL_M; a piece whose cells are taken is REFUSED (not placed, not pushed)
// and reported with the nearest free spot, the way the studio refuses a drop.
import { CELL_M, cellsCovered, overlaps, snapCentre, turnedFootprint } from '../placement/contract'
import { halfExtents, kitPiece, type KitPiece, type Pose } from './kit'

export type Side = 'front' | 'back' | 'left' | 'right'
export type Place =
  | { near?: string; behind?: string; in_front?: string; left_of?: string; right_of?: string; side?: Side; gap?: number; offset?: [number, number] }
  | { between: [string, string]; offset?: [number, number] }

export type Spec = {
  id: string
  kit: string
  pose?: Pose
  height_m?: number
  at?: [number, number] | [number, number, number]
  place?: Place
  on?: string
  face?: string | number
  turn?: number
}

export type Placed = { id: string; kit: string; x: number; y: number; z: number; yaw: number; height: number; pose?: Pose; onFloor: boolean }
export type Problem = { id: string; kind: 'overlap' | 'unknown-ref' | 'unknown-kit' | 'cycle' | 'no-spot'; detail: string; with?: string; free?: [number, number] }
export type Solved = { placed: Record<string, Placed>; problems: Problem[]; order: string[] }

const DEFAULT_GAP = 0.3
const SEARCH_RINGS = 12                 // free-spot search radius, in cells
const r1 = (v: number) => Math.round(v * 1000) / 1000

export const forward = (yawDeg: number): [number, number] => {
  const t = (yawDeg * Math.PI) / 180
  return [Math.sin(t), Math.cos(t)]
}
export const rightOf = (yawDeg: number): [number, number] => {
  const t = (yawDeg * Math.PI) / 180
  return [Math.cos(t), -Math.sin(t)]
}
/** Heading in degrees that faces from (x, z) towards (tx, tz). */
export const headingTo = (x: number, z: number, tx: number, tz: number) => r1((Math.atan2(tx - x, tz - z) * 180) / Math.PI)

function refsOf(s: Spec): string[] {
  const out: string[] = []
  const p = s.place as Record<string, unknown> | undefined
  if (p) {
    for (const k of ['near', 'behind', 'in_front', 'left_of', 'right_of']) if (typeof p[k] === 'string') out.push(p[k] as string)
    if (Array.isArray(p.between)) out.push(...(p.between as string[]))
  }
  if (s.on) out.push(s.on)
  return out
}

/** Dependency order: a piece after the pieces it is placed against (face targets may come later). */
function order(specs: Spec[], known: Set<string>, problems: Problem[]): Spec[] {
  const byId = new Map(specs.map((s) => [s.id, s]))
  const out: Spec[] = []
  const state = new Map<string, 'busy' | 'done'>()
  const visit = (s: Spec): boolean => {
    const st = state.get(s.id)
    if (st === 'done') return true
    if (st === 'busy') { problems.push({ id: s.id, kind: 'cycle', detail: `${s.id} is placed against itself through others` }); return false }
    state.set(s.id, 'busy')
    for (const r of refsOf(s)) {
      const dep = byId.get(r)
      if (dep && !visit(dep)) { state.set(s.id, 'done'); return false }
      if (!dep && !known.has(r)) problems.push({ id: s.id, kind: 'unknown-ref', detail: `${s.id} refers to "${r}", which is not in the scene` })
    }
    state.set(s.id, 'done')
    out.push(s)
    return true
  }
  specs.forEach(visit)
  return out
}

/** Distance from a piece's centre to its edge along the horizontal unit direction (ux, uz), at heading yaw. */
function reach(k: KitPiece, yaw: number, ux: number, uz: number, height: number): number {
  const s = k.size[1] ? height / k.size[1] : 1
  const [fx, fz] = forward(yaw)
  const [rx, rz] = rightOf(yaw)
  return Math.abs(ux * rx + uz * rz) * (k.size[0] * s) / 2 + Math.abs(ux * fx + uz * fz) * (k.size[2] * s) / 2
}

function spot(s: Spec, k: KitPiece, height: number, yaw: number, placed: Record<string, Placed>): [number, number] | null {
  if (s.at) return s.at.length === 3 ? [s.at[0], s.at[2]] : [s.at[0], s.at[1]]
  const p = s.place as Record<string, any> | undefined
  if (!p) {
    if (s.on && placed[s.on]) return [placed[s.on].x, placed[s.on].z]
    return [0, 0]
  }
  const off = (p.offset ?? [0, 0]) as [number, number]
  if (Array.isArray(p.between)) {
    const [a, b] = p.between.map((id: string) => placed[id])
    if (!a || !b) return null
    return [(a.x + b.x) / 2 + off[0], (a.z + b.z) / 2 + off[1]]
  }
  const rel = (['near', 'behind', 'in_front', 'left_of', 'right_of'] as const).find((r) => typeof p[r] === 'string')
  if (!rel) return [0, 0]
  const ref = placed[p[rel]]
  if (!ref) return null
  const side: Side = rel === 'near' ? (p.side ?? 'front') : ({ behind: 'back', in_front: 'front', left_of: 'left', right_of: 'right' } as const)[rel]
  const [fx, fz] = forward(ref.yaw)
  const [rx, rz] = rightOf(ref.yaw)
  const [ux, uz] = { front: [fx, fz], back: [-fx, -fz], right: [rx, rz], left: [-rx, -rz] }[side]
  const rk = kitPiece(ref.kit)
  const d = reach(rk, ref.yaw, ux, uz, ref.height) + reach(k, yaw, ux, uz, height) + (p.gap ?? DEFAULT_GAP)
  // offset in the reference's own frame: [to its right, to its front]
  return [ref.x + ux * d + rx * off[0] + fx * off[1], ref.z + uz * d + rz * off[0] + fz * off[1]]
}

function cells(k: KitPiece, x: number, z: number, yaw: number) {
  return k.footprint ? cellsCovered(x, z, turnedFootprint(k.footprint, yaw)) : null
}

function snapXZ(k: KitPiece, x: number, z: number, yaw: number): [number, number] {
  if (!k.footprint) return [r1(x), r1(z)]
  const [w, d] = turnedFootprint(k.footprint, yaw)
  return [r1(snapCentre(x, w)), r1(snapCentre(z, d))]
}

/** The nearest spot (ring by ring, in a fixed order) where the piece's cells are free. */
function freeSpot(k: KitPiece, x: number, z: number, yaw: number, taken: (c: Set<string>) => string | null): [number, number] | null {
  for (let ring = 1; ring <= SEARCH_RINGS; ring++) {
    for (let i = -ring; i <= ring; i++) {
      for (const [dx, dz] of [[i, -ring], [ring, i], [-i, ring], [-ring, -i]]) {
        const [sx, sz] = snapXZ(k, x + dx * CELL_M, z + dz * CELL_M, yaw)
        const c = cells(k, sx, sz, yaw)
        if (c && !taken(c)) return [sx, sz]
      }
    }
  }
  return null
}

/** Place `specs` (in any order) among `fixed` pieces already in the scene. Deterministic. */
export function solve(specs: Spec[], fixed: Record<string, Placed> = {}): Solved {
  const problems: Problem[] = []
  const placed: Record<string, Placed> = { ...fixed }
  const known = new Set(Object.keys(fixed))
  const kits = new Map<string, KitPiece>()
  for (const s of specs) {
    try { kits.set(s.id, kitPiece(s.kit)) } catch (e) { problems.push({ id: s.id, kind: 'unknown-kit', detail: (e as Error).message }) }
  }
  const valid = specs.filter((s) => kits.has(s.id))
  const ordered = order(valid, known, problems)
  const occupant = (c: Set<string>, self: string): string | null => {
    for (const o of Object.values(placed)) {
      if (o.id === self || !o.onFloor) continue
      const oc = cells(kitPiece(o.kit), o.x, o.z, o.yaw)
      if (oc && overlaps(c, oc)) return o.id
    }
    return null
  }
  const yawOf = (s: Spec, x: number, z: number): number => {
    let yaw = 0
    if (typeof s.face === 'number') yaw = s.face
    else if (typeof s.face === 'string' && placed[s.face]) yaw = headingTo(x, z, placed[s.face].x, placed[s.face].z)
    return r1(yaw + (s.turn ?? 0))
  }
  const later: Spec[] = []
  for (const s of ordered) {
    const k = kits.get(s.id)!
    const height = s.height_m ?? k.size[1]
    let yaw = yawOf(s, 0, 0)
    const first = spot(s, k, height, yaw, placed)
    if (!first) continue                                   // its reference was refused or unknown (reported)
    yaw = yawOf(s, first[0], first[1])
    const raw = spot(s, k, height, yaw, placed) ?? first
    const y = s.at && s.at.length === 3 ? s.at[1] : s.on && placed[s.on] ? r1(placed[s.on].y + placed[s.on].height) : 0
    const onFloor = !!k.footprint && !s.on
    const [x, z] = onFloor ? snapXZ(k, raw[0], raw[1], yaw) : [r1(raw[0]), r1(raw[1])]
    if (onFloor) {
      const c = cells(k, x, z, yaw)!
      const hit = occupant(c, s.id)
      if (hit) {
        const free = freeSpot(k, x, z, yaw, (cc) => occupant(cc, s.id))
        problems.push({
          id: s.id, kind: free ? 'overlap' : 'no-spot', with: hit, free: free ?? undefined,
          detail: `${s.id} would stand where ${hit} stands: not placed` + (free ? `; free nearby at [${free[0]}, ${free[1]}]` : ''),
        })
        continue
      }
    }
    placed[s.id] = { id: s.id, kit: s.kit, x, y, z, yaw, height: r1(height), pose: s.pose, onFloor }
    if (typeof s.face === 'string' && !placed[s.face]) later.push(s)
  }
  // faces towards pieces placed after them (a marker listed last)
  for (const s of later) {
    const p = placed[s.id]
    const t = placed[s.face as string]
    if (!t) { problems.push({ id: s.id, kind: 'unknown-ref', detail: `${s.id} faces "${s.face}", which is not in the scene` }); continue }
    placed[s.id] = { ...p, yaw: r1(headingTo(p.x, p.z, t.x, t.z) + (s.turn ?? 0)) }
  }
  return { placed, problems, order: ordered.map((s) => s.id).filter((id) => placed[id]) }
}

export { halfExtents }
