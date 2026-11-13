// Smart bones (Bart, 2026-11-13: "you have to adopt smart bones method, by morphing the parts"). A joint with a `band`
// does not turn its parts as rigid pieces: the parts on both sides of it become fine meshes, and each mesh point follows
// the parent and the child in a smooth blend across the band. Both parts take the same blend at the same place, so the
// seam between them can never open; a neck bends with the head, an elbow and a knee bend as skin, a sleeve stretches at
// the shoulder. Outside the band a part stays rigid (no rubber arm), and at rest nothing moves, so the figure is still
// its drawing. Pure functions: bones.ts bindPuppet turns these meshes into Rigby2D attachments.
import type { Puppet } from './types'

type Pt = readonly [number, number]
type Part = Puppet['parts'][number]

/** Puppet px per mesh cell in a part that bends: 3 to 5 screen px on a figure 300 to 600 px tall, so a crease is smooth;
 *  Ana at 20 px is about 4,000 points (14 px made 8,151 for no visible gain). */
export const BEND_CELL = 20

/** One bone's share of a mesh point. */
export interface Share { bone: string; weight: number }

export interface PartMesh {
  /** puppet px, flat in point order */
  points: [number, number][]
  /** atlas uv per point, flat [u, v, u, v, ...] */
  uvs: number[]
  triangles: number[]
  /** per point: the bones it follows and how much */
  weights: Share[][]
}

/** 0 to 1 with a soft start and end. */
export const smoothstep = (t: number): number => {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/** How much a point follows the child across a band: 0 a band's width on the parent's side of the pivot, 1 on the child's. */
export function childShare(q: Pt, pivot: Pt, into: Pt, band: number): number {
  const t = ((q[0] - pivot[0]) * into[0] + (q[1] - pivot[1]) * into[1]) / Math.max(band, 1e-6)
  return smoothstep((t + 1) / 2)
}

/** How much the band holds at a point: 1 within `reach` of the pivot, fading to 0 a quarter reach further. Without
 *  it a band is a strip across the whole body: a raised arm dragged the shawl and the far shoulder with it. */
export function nearJoint(q: Pt, pivot: Pt, reach: number): number {
  const d = Math.hypot(q[0] - pivot[0], q[1] - pivot[1])
  return 1 - smoothstep((d - reach) / Math.max(reach * REACH_FADE, 1e-6))
}

/** The fade past a joint's reach, as a share of it. */
export const REACH_FADE = 0.25

interface Band { child: string; parent: string; pivot: Pt; into: Pt; band: number; reach: number }

const unit = (a: Pt, b: Pt): Pt => {
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy)
  return n > 1e-6 ? [dx / n, dy / n] : [0, 1]
}

/** The bands that reach a part: its own bone's joint (with its parent), and every joint of a bone hanging from it. */
export function bandsOf(puppet: Puppet, part: Part): Band[] {
  const own = puppet.bones.find((b) => b.name === part.bone)
  const bandOf = (b: Puppet['bones'][number]): Band[] => (b.band && b.parent
    ? [{ child: b.name, parent: b.parent, pivot: b.from, into: unit(b.from, b.to ?? [b.from[0], b.from[1] + 1]), band: b.band, reach: b.reach ?? b.band * 2 }]
    : [])
  return [...(own ? bandOf(own) : []), ...puppet.bones.filter((b) => b.parent === part.bone).flatMap(bandOf)]
}

/** A part as a mesh: its four corners when no band reaches it, else a grid whose points blend across each band. */
export function partMesh(puppet: Puppet, part: Part): PartMesh {
  const [[x0, y0], , [x1, y1]] = part.quad
  const [u0, v0, u1, v1] = part.uv
  const bands = bandsOf(puppet, part)
  if (!bands.length) {   // a rigid part: its corners in the order bindPuppet has always used (top-left round to bottom-left)
    return {
      points: part.quad.map(([x, y]) => [x, y]), uvs: [u0, v0, u1, v0, u1, v1, u0, v1], triangles: [0, 1, 2, 0, 2, 3],
      weights: part.quad.map(() => [{ bone: part.bone, weight: 1 }]),
    }
  }
  const cols = Math.max(1, Math.ceil((x1 - x0) / BEND_CELL))
  const rows = Math.max(1, Math.ceil((y1 - y0) / BEND_CELL))
  const points: [number, number][] = []
  const uvs: number[] = []
  const weights: Share[][] = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const fx = c / cols, fy = r / rows
      const q: [number, number] = [x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy]
      points.push(q)
      uvs.push(u0 + (u1 - u0) * fx, v0 + (v1 - v0) * fy)
      let shares: Share[] = [{ bone: part.bone, weight: 1 }]
      for (const b of bands) {
        const share = childShare(q, b.pivot, b.into, b.band), near = nearJoint(q, b.pivot, b.reach)
        // the part's own joint hands the share near it to the parent; a child's joint hands it to the child. Both read
        // the same share at the same place, so at the seam (within reach) the two parts move as one
        const toChild = b.child === part.bone ? 1 - (1 - share) * near : share * near
        const [keep, give, other] = b.child === part.bone ? [toChild, 1 - toChild, b.parent] : [1 - toChild, toChild, b.child]
        shares = shares.flatMap((s) => (s.bone === part.bone ? [{ bone: s.bone, weight: s.weight * keep }, { bone: other, weight: s.weight * give }] : [s]))
      }
      weights.push(merged(shares))
    }
  }
  const triangles: number[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1
      triangles.push(a, b, e, a, e, d)
    }
  }
  return { points, uvs, triangles, weights }
}

/** One share per bone, none at zero. */
function merged(shares: Share[]): Share[] {
  const by = new Map<string, number>()
  for (const s of shares) by.set(s.bone, (by.get(s.bone) ?? 0) + s.weight)
  const kept = [...by].filter(([, w]) => w > 1e-4)
  const total = kept.reduce((sum, [, w]) => sum + w, 0)
  return kept.map(([bone, weight]) => ({ bone, weight: weight / total }))
}
