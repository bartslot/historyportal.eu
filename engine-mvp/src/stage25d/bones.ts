// Bones on one flat picture, with the Rigby2D runtime (vendor/rigby2d): its tracer makes a mesh from the picture's alpha,
// its weights bind that mesh to a skeleton, its Pose bends it. The layer draws the bent vertices with its own shader.
import { generateMesh } from '../vendor/rigby2d/core/meshgen.js'
import { normalizeWeights } from '../vendor/rigby2d/core/meshgeom.js'
import { classify } from '../vendor/rigby2d/core/bodyparts.js'
import { makeBone, makeSlot, Skeleton } from '../vendor/rigby2d/core/model.js'
import { Pose } from '../vendor/rigby2d/core/pose.js'
import { transform } from '../vendor/rigby2d/core/math.js'
import type { Joint, PartMap, Puppet } from './types'
import { elbowIsRight, forwardOf, kneeInFront, kneeIsRight } from './pose-guard'

// fine enough to follow the gap between a hanging hand and the body: a coarse outline bridges it and they bend as one
const MESH = { points: 500, threshold: 24, expand: 1, smoothing: 1, interior: 'high' }

export interface BentPicture {
  width: number
  height: number
  uvs: number[]
  /** A figure of parts: where each vertex sits in the drawing at rest, as uv of the drawing (layer.ts restDrawing). */
  restUvs?: number[]
  triangles: number[]
  /** The vertices (picture px, flat x y) with these bones turned, degrees clockwise on screen. */
  bend(bones: Record<string, number>): number[]
}

/** Pixels a part reaches past its border on the map, so a joint has no slit when it turns a little. */
const PART_OVERLAP = 6

/** Which entry of `parts` each pixel is: the nearest colour on the map, -1 where the picture is see-through. */
export function labelPixels(map: { data: Uint8ClampedArray | Uint8Array }, alpha: { data: Uint8Array | Uint8ClampedArray }, parts: { colour: [number, number, number] }[]): Int8Array {
  const labels = new Int8Array(alpha.data.length).fill(-1)
  for (let i = 0; i < labels.length; i++) {
    if (alpha.data[i] === 0) continue
    let best = 0, bestD = Infinity
    parts.forEach((p, n) => {
      const d = (map.data[i * 4] - p.colour[0]) ** 2 + (map.data[i * 4 + 1] - p.colour[1]) ** 2 + (map.data[i * 4 + 2] - p.colour[2]) ** 2
      if (d < bestD) { bestD = d; best = n }
    })
    labels[i] = best
  }
  return labels
}

/**
 * A picture cut along its part map: one mesh per body part, each following only its own bones, drawn back to front.
 * Moving an arm cannot touch the waistcoat: they share no vertex. Inside a part the mesh still bends, at the elbow, say.
 */
export function bindParts(alpha: { width: number; height: number; data: Uint8Array | Uint8ClampedArray }, labels: Int8Array, parts: { part: string }[], joints: Joint[]): BentPicture | null {
  const { width: W, height: H } = alpha
  const sk = new Skeleton()
  const indexOf = new Map(joints.map((j, i) => [j.name, i + 1]))
  const from = (name: string | null | undefined) => joints.find((j) => j.name === name)?.from ?? [0, 0]
  for (const j of joints) {
    const base = from(j.parent)
    sk.bones.push(makeBone(j.name, j.parent ? indexOf.get(j.parent) ?? 0 : 0, transform(j.from[0] - base[0], j.from[1] - base[1], 0), Math.hypot(j.to[0] - j.from[0], j.to[1] - j.from[1])))
  }
  const partOfBone = bodyParts(joints)
  const atts: { name: string; uvs: number[]; triangles: number[]; weights: unknown[]; type: string; image: string; hull: number; color: number[] }[] = []
  parts.forEach((p, n) => {
    let mask = Uint8Array.from(labels, (l) => (l === n ? 255 : 0))
    for (let r = 0; r < PART_OVERLAP; r++) {   // grow over the neighbouring parts' paint, never over the air
      const next = mask.slice()
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] || labels[i] < 0) continue
        if ((i % W > 0 && mask[i - 1]) || (i % W < W - 1 && mask[i + 1]) || mask[i - W] || mask[i + W]) next[i] = 255
      }
      mask = next
    }
    const mesh = generateMesh({ width: W, height: H, data: mask }, { ...MESH, points: 220 })
    const bones = joints.filter((j) => partOfBone.get(j.name) === p.part).map((j) => ({ bone: indexOf.get(j.name), from: j.from, to: j.to }))
    if (!mesh || !bones.length) return
    const weights = weightsThroughShape(mesh.points, mesh.triangles, bones).map((list: { bone: number; weight: number }[], v: number) => list.map((w) => {
      const origin = joints[w.bone - 1].from
      return { ...w, x: mesh.points[v][0] - origin[0], y: mesh.points[v][1] - origin[1] }
    }))
    const att = { name: p.part, type: 'mesh', image: 'picture', uvs: mesh.uvs, triangles: mesh.triangles, hull: mesh.hull, weights, color: [1, 1, 1, 1] }
    sk.slots.push(makeSlot(p.part, 0, att))
    atts.push(att)
  })
  if (!atts.length) return null
  const pose = new Pose(sk)
  let offset = 0
  const triangles = atts.flatMap((a) => { const t = a.triangles.map((i) => i + offset); offset += a.uvs.length / 2; return t })
  return {
    width: W, height: H, uvs: atts.flatMap((a) => a.uvs), triangles,
    bend(bones) {
      pose.reset(sk)
      for (const [name, deg] of Object.entries(bones)) {
        const i = indexOf.get(name)
        if (i !== undefined && Number.isFinite(deg)) pose.local[i].rotation = deg
      }
      pose.updateWorld(sk)
      return atts.flatMap((a, i) => pose.worldVertices(sk, i, a))
    },
  }
}

/** A picture and its part map, read and bound. */
export async function bindMappedPicture(url: string, map: PartMap, joints: Joint[]): Promise<BentPicture | null> {
  const alpha = await alphaOf(url)
  const colours = await rgbaOf(map.src, alpha.width, alpha.height)
  return bindParts(alpha, labelPixels({ data: colours }, alpha, map.parts), map.parts, joints)
}

/** A picture's pixels at a given size. */
function rgbaOf(url: string, width: number, height: number): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => reject(new Error(`picture ${url} did not load`))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = width; c.height = height
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.imageSmoothingEnabled = false
      g.drawImage(img, 0, 0, width, height)
      resolve(g.getImageData(0, 0, width, height).data)
    }
    img.src = url
  })
}

/** A picture's alpha, bound to its joints (picture px); null when the picture has nothing solid. */
export function bindPicture(alpha: { width: number; height: number; data: Uint8Array | Uint8ClampedArray }, joints: Joint[]): BentPicture | null {
  const mesh = generateMesh(alpha, MESH)
  if (!mesh) return null
  const sk = new Skeleton()
  const indexOf = new Map(joints.map((j, i) => [j.name, i + 1]))
  const from = (name: string | null | undefined) => joints.find((j) => j.name === name)?.from ?? [0, 0]
  for (const j of joints) {
    const parent = j.parent ? indexOf.get(j.parent) ?? 0 : 0
    const base = from(j.parent)
    sk.bones.push(makeBone(j.name, parent, transform(j.from[0] - base[0], j.from[1] - base[1], 0), Math.hypot(j.to[0] - j.from[0], j.to[1] - j.from[1])))
  }
  const parts = bodyParts(joints)
  const segments = joints.map((j) => ({ bone: indexOf.get(j.name), from: j.from, to: j.to, part: parts.get(j.name) }))
  const weights = weightsThroughShape(mesh.points, mesh.triangles, segments).map((list: { bone: number; weight: number }[], v: number) => list.map((w) => {
    const origin = joints[w.bone - 1].from
    return { ...w, x: mesh.points[v][0] - origin[0], y: mesh.points[v][1] - origin[1] }
  }))
  const att = { name: 'picture', type: 'mesh', image: 'picture', uvs: mesh.uvs, triangles: mesh.triangles, hull: mesh.hull, weights, color: [1, 1, 1, 1] }
  sk.slots.push(makeSlot('picture', 0, att))
  const pose = new Pose(sk)
  return {
    width: alpha.width, height: alpha.height, uvs: mesh.uvs, triangles: mesh.triangles,
    bend(bones) {
      pose.reset(sk)
      for (const [name, deg] of Object.entries(bones)) {
        const i = indexOf.get(name)
        if (i !== undefined && Number.isFinite(deg)) pose.local[i].rotation = deg
      }
      pose.updateWorld(sk)
      return pose.worldVertices(sk, 0, att)
    },
  }
}

const onSegment = (p: number[], a: number[], b: number[]) => {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / Math.max(dx * dx + dy * dy, 1e-6)))
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t)
}

/** The bones that start a body part of their own, by Rigby's name detector: what hangs from them moves with them. */
const PART_STARTS = new Set(['upperarm', 'arm', 'thigh', 'leg', 'head', 'neck', 'tail', 'wing'])

/** Each bone's body part: an arm, a leg, the head, or the core (chest and pelvis). A child is in its parent's part. */
export function bodyParts(joints: Joint[]): Map<string, string> {
  const parts = new Map<string, string>()
  for (const j of joints) {
    const role = classify(j.name)?.role
    parts.set(j.name, PART_STARTS.has(role) ? j.name : (j.parent ? parts.get(j.parent) : null) ?? 'core')
  }
  return parts
}

/**
 * Each vertex belongs to ONE body part, the one whose bone is nearest, and follows only that part's bones (Bart 11-05:
 * moving an arm moves nothing else of the picture). Distance runs THROUGH the shape, along the mesh's edges: in a straight
 * line (Rigby's autoWeights) a hanging hand would claim the breeches beside it across the air between them.
 */
export function weightsThroughShape(points: number[][], triangles: number[], bones: { bone?: number; from: number[]; to: number[]; part?: string }[]) {
  const edges: [number, number][][] = points.map(() => [])
  for (let t = 0; t + 2 < triangles.length; t += 3) {
    for (const [a, b] of [[triangles[t], triangles[t + 1]], [triangles[t + 1], triangles[t + 2]], [triangles[t + 2], triangles[t]]]) {
      const d = Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1])
      edges[a].push([b, d]); edges[b].push([a, d])
    }
  }
  const through = bones.map((bone) => {
    // from every vertex: start at its straight distance to the bone, then relax along the edges (Bellman-Ford, the meshes are small)
    const straight = points.map((p) => onSegment(p, bone.from, bone.to))
    const reach = Math.min(...straight) + 1
    const dist = straight.map((d) => (d <= reach * 12 ? d : Infinity))
    for (let changed = true; changed;) {
      changed = false
      for (let v = 0; v < points.length; v++) {
        for (const [n, d] of edges[v]) if (dist[v] + d < dist[n] - 1e-6) { dist[n] = dist[v] + d; changed = true }
      }
    }
    return dist
  })
  return points.map((_, v) => {
    const nearest = through.reduce((best, d, i) => (d[v] < through[best][v] ? i : best), 0)
    const raw = bones.flatMap((b, i) => (b.part === bones[nearest].part ? [{ bone: b.bone, weight: 1 / Math.pow(through[i][v] + 1, 4) }] : []))
    const total = raw.reduce((sum, w) => sum + w.weight, 0)
    return normalizeWeights(raw.map((w) => ({ bone: w.bone, weight: w.weight / total })))
  })
}

/**
 * How far a joint may turn from the painted pose, degrees clockwise on screen for a figure facing right. An elbow only
 * folds towards the front of the body; an upper arm stays on its own side of it; head and chest turn a little.
 */
const JOINT_RANGE: [RegExp, number, number][] = [
  [/^forearm_/, -140, 5],
  [/^upperarm_n/, -10, 150],
  [/^upperarm_f/, -150, 10],
  // legs (a figure cut by rig_parts.py carries its own limits; these hold for one that does not): clockwise carries a
  // hanging limb back, so a knee folds positive and a thigh swings forward negative; toes come up negative
  [/^thigh_/, -80, 30],
  [/^shin_/, 0, 120],
  [/^foot_/, -30, 20],
]
const TURN_RANGE: Record<string, number> = { head: 25, chest: 12, braid: 25 }

/**
 * A bone's turn inside what the body can do. `range` is the puppet's own limit for it (Puppet.bones[].limit), in the same
 * terms as JOINT_RANGE. A bone not listed turns freely; a figure with no `facing` keeps its limbs free.
 */
export function limitBone(name: string, deg: number, facing?: 1 | -1, range?: readonly [number, number]): number {
  const turn = TURN_RANGE[name]
  if (!range && turn !== undefined) return Math.max(-turn, Math.min(turn, deg))
  if (!facing) return deg
  const [lo, hi] = range ?? JOINT_RANGE.find(([re]) => re.test(name))?.slice(1) as [number, number] ?? [-Infinity, Infinity]
  return Math.max(lo, Math.min(hi, deg * facing)) * facing
}

/** The figure a layer draws: its own, or its library asset's (an atlas named without a path lies beside the asset's file). */
export function puppetOf(asset: { puppet?: Puppet }, layer: { puppet?: Puppet }, base = ''): Puppet | null {
  const puppet = layer.puppet ?? asset.puppet
  if (!puppet) return null
  return /^(\/|https?:|data:)/.test(puppet.atlas) ? puppet : { ...puppet, atlas: base + puppet.atlas }
}

export interface BentPuppet extends BentPicture {
  /** These turns as the body allows them: a joint's own limits, and a near hand stays out of the body it is drawn behind. */
  safe(bones: Record<string, number>): Record<string, number>
  /** One turn held to its joint's limits (limitBone, with the figure's facing). */
  limit(name: string, deg: number): number
  /** The bones a teacher can turn, in the pose bend() last placed, in puppet px: `at` the joint it turns round, `tip` the
   *  point a handle grabs (the next joint along, or the middle of its part when nothing hangs off it). */
  joints(): { name: string; at: [number, number]; tip: [number, number] }[]
}

/** Where a rigid part stands now: the point p of the drawing carried by the turn and shift from its rest corners to these. */
function carried(quad: [number, number][], v: number[], [x, y]: [number, number]): [number, number] {
  const angle = Math.atan2(v[3] - v[1], v[2] - v[0]) - Math.atan2(quad[1][1] - quad[0][1], quad[1][0] - quad[0][0])
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const dx = x - quad[0][0], dy = y - quad[0][1]
  return [v[0] + cos * dx - sin * dy, v[1] + sin * dx + cos * dy]
}

const TIP_REACH = 1.6   // a last bone's handle: this far from its joint, in steps of joint-to-middle-of-its-part
const GUARD_STEP = 3      // degrees a forearm is taken back at a time until it is clear of the body
const ALONG_FOREARM = [0.25, 0.5, 0.75, 1]   // the points of a forearm, elbow to hand, that have to stay out of it

/** A puppet on the Rigby2D runtime: each part follows its own bone rigidly, turning under its rounded joint ends. */
export function bindPuppet(puppet: Puppet): BentPuppet {
  const sk = new Skeleton()
  const indexOf = new Map(puppet.bones.map((b, i) => [b.name, i + 1]))
  const from = (name: string | null) => puppet.bones.find((b) => b.name === name)?.from ?? [0, 0]
  for (const b of puppet.bones) {
    const base = from(b.parent)
    sk.bones.push(makeBone(b.name, b.parent ? indexOf.get(b.parent) ?? 0 : 0, transform(b.from[0] - base[0], b.from[1] - base[1], 0), 0))
  }
  const atts = puppet.parts.map((p, i) => {
    const origin = from(p.bone)
    const [u0, v0, u1, v1] = p.uv
    const att = {
      name: `part${i}`, type: 'mesh', image: 'atlas', uvs: [u0, v0, u1, v0, u1, v1, u0, v1], triangles: [0, 1, 2, 0, 2, 3], hull: 4, color: [1, 1, 1, 1],
      weights: p.quad.map(([x, y]) => [{ bone: indexOf.get(p.bone) ?? 0, weight: 1, x: x - origin[0], y: y - origin[1] }]),
    }
    sk.slots.push(makeSlot(att.name, 0, att))
    return att
  })
  const pose = new Pose(sk)
  const limits = new Map(puppet.bones.flatMap((b) => (b.limit ? [[b.name, b.limit] as const] : [])))
  const place = (bones: Record<string, number>) => {
    pose.reset(sk)
    for (const [name, deg] of Object.entries(bones)) {
      const i = indexOf.get(name)
      if (i !== undefined && Number.isFinite(deg)) pose.local[i].rotation = limitBone(name, deg, puppet.facing, limits.get(name))
    }
    pose.updateWorld(sk)
    guard()
  }
  /** Where a point of the drawing stands now, carried by the bone it belongs to. */
  const carriedBy = (name: string, [x, y]: readonly [number, number]): [number, number] => {
    const at = from(name)
    return pose.world[indexOf.get(name)!].apply([x - at[0], y - at[1]]) as [number, number]
  }
  const toOf = (name: string) => puppet.bones.find((b) => b.name === name)?.to
  /** A turn that breaks a posing rule (pose-guard.ts) is mirrored; still wrong, it is held at the drawing's own angle. */
  const fix = (bone: string, ok: () => boolean) => {
    const i = indexOf.get(bone)!
    if (ok()) return
    pose.local[i].rotation = -pose.local[i].rotation
    pose.updateWorld(sk)
    if (ok()) return
    pose.local[i].rotation = 0
    pose.updateWorld(sk)
  }
  // Which way the character faces, from its feet as drawn (a foot in a deep knee fold points back: it cannot say).
  // The hips never turn (puppet-pose movableBones), so this holds in every pose.
  const forward = (() => {
    const votes = ['foot_n', 'foot_f'].flatMap((foot) => {
      const toe = toOf(foot)
      return indexOf.has(foot) && toe ? [forwardOf(from(foot) as [number, number], toe)] : []
    }).filter((v) => v !== 0)
    return votes.length && votes.every((v) => v === votes[0]) ? votes[0] : puppet.facing ?? 0
  })()
  const guard = () => {
    if (!forward) return
    for (const side of ['n', 'f']) {
      const [thigh, shin, foot] = [`thigh_${side}`, `shin_${side}`, `foot_${side}`]
      if (indexOf.has(thigh) && indexOf.has(shin) && indexOf.has(foot)) {
        const hip = () => carriedBy(thigh, from(thigh)), knee = () => carriedBy(shin, from(shin)), ankle = () => carriedBy(foot, from(foot))
        fix(thigh, () => kneeInFront(hip(), knee(), forward))
        fix(shin, () => kneeIsRight(hip(), knee(), ankle(), forward))
      }
      const [upper, fore] = [`upperarm_${side}`, `forearm_${side}`]
      const hand = toOf(fore)
      if (indexOf.has(upper) && indexOf.has(fore) && hand) {
        fix(fore, () => elbowIsRight(carriedBy(upper, from(upper)), carriedBy(fore, from(fore)), carriedBy(fore, hand), forward))
      }
    }
  }
  // The near arm is drawn behind the chest (at rest its sleeve goes under the waistcoat), so a hand swung across the body
  // would vanish into it and come out on the other side. It stops at the chest's edge instead; over the legs it is in front.
  const foreAt = puppet.parts.findIndex((p) => p.bone === 'forearm_n')
  const bodyAt = puppet.parts.flatMap((p, i) => (p.bone === 'chest' && puppet.parts.indexOf(p) > foreAt ? [i] : []))
  const handOf = (() => {
    if (foreAt < 0) return null
    const q = puppet.parts[foreAt].quad, joint = from('forearm_n')
    const mids = q.map((p, i) => [(p[0] + q[(i + 1) % 4][0]) / 2, (p[1] + q[(i + 1) % 4][1]) / 2])
    const far = mids.reduce((best, m, i) => (Math.hypot(m[0] - joint[0], m[1] - joint[1]) > Math.hypot(mids[best][0] - joint[0], mids[best][1] - joint[1]) ? i : best), 0)
    return [far, (far + 1) % 4]
  })()
  const side = bodyAt.length ? Math.sign(from('forearm_n')[0] - (puppet.parts[bodyAt[0]].quad[0][0] + puppet.parts[bodyAt[0]].quad[1][0]) / 2) || 1 : 1
  /** How far the forearm stands outside each part of the body, along the side it hangs on; null where no point of it is level with that part. */
  const gaps = (): (number | null)[] => {
    const fore = pose.worldVertices(sk, foreAt, atts[foreAt]) as number[]
    const mid = (a: number, b: number) => [(fore[a * 2] + fore[b * 2]) / 2, (fore[a * 2 + 1] + fore[b * 2 + 1]) / 2]
    const hand = mid(handOf![0], handOf![1])
    const elbow = mid((handOf![0] + 2) % 4, (handOf![1] + 2) % 4)
    const along = ALONG_FOREARM.map((t) => [elbow[0] + (hand[0] - elbow[0]) * t, elbow[1] + (hand[1] - elbow[1]) * t])
    return bodyAt.map((i) => {
      const v = pose.worldVertices(sk, i, atts[i]) as number[]
      const xs = [v[0], v[2], v[4], v[6]], ys = [v[1], v[3], v[5], v[7]]
      const edge = side > 0 ? Math.max(...xs) : Math.min(...xs)
      const level = along.filter((p) => p[1] >= Math.min(...ys) && p[1] <= Math.max(...ys)).map((p) => (p[0] - edge) * side)
      return level.length ? Math.min(...level) : null
    })
  }
  // room the hand keeps: a quarter of its width, or what the drawing gives it where it already hangs close (a puffed-out breeches leg)
  const room = (() => {
    if (!handOf || !bodyAt.length) return []
    const wanted = Math.abs(puppet.parts[foreAt].quad[1][0] - puppet.parts[foreAt].quad[0][0]) / 4
    place({})
    // a figure drawn with its arm already in that part of the body: nothing to guard there
    return gaps().map((gap) => (gap === null ? wanted : gap < 0 ? -Infinity : Math.min(wanted, gap)))
  })()
  let last: number[] = []   // the vertices bend() placed last: the pose on screen, for joints()
  const handClear = (): boolean => gaps().every((gap, i) => gap === null || gap >= room[i])
  const safe = (bones: Record<string, number>): Record<string, number> => {
    if (!handOf || !bodyAt.length || !puppet.facing) return bones
    let deg = limitBone('forearm_n', bones.forearm_n ?? 0, puppet.facing, limits.get('forearm_n'))
    place({ ...bones, forearm_n: deg })
    while (!handClear() && deg !== 0) {
      deg = deg > 0 ? Math.max(0, deg - GUARD_STEP) : Math.min(0, deg + GUARD_STEP)
      place({ ...bones, forearm_n: deg })
    }
    return deg === (bones.forearm_n ?? 0) ? bones : { ...bones, forearm_n: deg }
  }
  return {
    width: puppet.width, height: puppet.height,
    uvs: atts.flatMap((a) => a.uvs),
    restUvs: puppet.parts.flatMap((p) => p.quad.flatMap(([x, y]) => [x / puppet.width, y / puppet.height])),
    triangles: atts.flatMap((a, i) => a.triangles.map((t) => t + i * 4)),   // in order: the first part is at the back
    safe,
    limit: (name, deg) => limitBone(name, deg, puppet.facing, limits.get(name)),
    bend(bones) {
      place(safe(bones))
      last = atts.flatMap((a, i) => pose.worldVertices(sk, i, a))
      return last
    },
    joints() {
      if (!last.length) this.bend({})
      const partOf = (name: string) => puppet.parts.findIndex((p) => p.bone === name)
      return puppet.bones.flatMap((b) => {
        const at = partOf(b.name)
        if (at < 0 || b.name === 'hips') return []   // the hips stay where they stand (puppet-pose movableBones)
        const quad = puppet.parts[at].quad, v = last.slice(at * 8, at * 8 + 8)
        const children = puppet.bones.filter((c) => c.parent === b.name && partOf(c.name) >= 0)
        const [[x0, y0], , [x1, y1]] = quad
        const mid: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2]
        // one bone hanging off it: the handle at that joint (an elbow); several (the upper body): the middle of its part;
        // none (a head, a forearm without a hand): out toward its far end, so it stays clear of the joint's other handles
        const reach: [number, number] = [
          Math.min(x1, Math.max(x0, b.from[0] + (mid[0] - b.from[0]) * TIP_REACH)),
          Math.min(y1, Math.max(y0, b.from[1] + (mid[1] - b.from[1]) * TIP_REACH)),
        ]
        const tip = children.length === 1 ? children[0].from : children.length ? mid : reach
        return [{ name: b.name, at: carried(quad, v, b.from), tip: carried(quad, v, tip) }]
      })
    },
  }
}

/** The alpha of a picture at a url, one byte per pixel. */
export function alphaOf(url: string): Promise<{ width: number; height: number; data: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => reject(new Error(`picture ${url} did not load`))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0)
      const rgba = g.getImageData(0, 0, c.width, c.height).data
      const data = new Uint8Array(c.width * c.height)
      for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3]
      resolve({ width: c.width, height: c.height, data })
    }
    img.src = url
  })
}
