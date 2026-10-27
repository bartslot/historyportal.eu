// Static poses + pose guards for the standard body (Auto-Rig Pro deform rig, src/figures/export_wardrobe.py).
//
// RULES (Bart): a knee never bends backwards, an arm never passes through the body. So poses are never
// Euler offsets (their sign depends on how the rig rolls its bones): every limb is AIMED at a direction in
// the character's own frame, with forward taken from the feet. The guards then measure the result.
//
// All maths runs in RIG space (the rig node's own frame). The glTF loader puts a mirror (z * -1) above the
// rig in a left-handed scene; below the rig every bone is a proper rotation, so decompositions stay clean.
import { Matrix, Quaternion, Vector3, type TransformNode } from '@babylonjs/core'

export type Limb = 'armL' | 'armR' | 'legL' | 'legR'

// logical joint -> ARP deform bone. Thigh = thigh_twist (thigh_stretch hangs under it at identity).
export const ARP = {
  hips: 'root.x', spine: 'spine_01.x', spine1: 'spine_02.x', chest: 'spine_03.x', neck: 'neck.x', head: 'head.x',
  shoulderL: 'shoulder.l', armL: 'arm_stretch.l', armTwistL: 'c_arm_twist_offset.l', foreL: 'forearm_stretch.l', handL: 'hand.l',
  shoulderR: 'shoulder.r', armR: 'arm_stretch.r', armTwistR: 'c_arm_twist_offset.r', foreR: 'forearm_stretch.r', handR: 'hand.r',
  thighL: 'thigh_twist.l', shinL: 'leg_stretch.l', footL: 'foot.l', toeL: 'toes_01.l',
  thighR: 'thigh_twist.r', shinR: 'leg_stretch.r', footR: 'foot.r', toeR: 'toes_01.r',
  indexL1: 'index1.l', indexL2: 'c_index2.l', indexL3: 'c_index3.l',
  indexR1: 'index1.r', indexR2: 'c_index2.r', indexR3: 'c_index3.r',
  middleL1: 'middle1.l', middleL2: 'c_middle2.l', middleR1: 'middle1.r', middleR2: 'c_middle2.r',
  ringL1: 'ring1.l', ringL2: 'c_ring2.l', ringR1: 'ring1.r', ringR2: 'c_ring2.r',
  pinkyL1: 'pinky1.l', pinkyL2: 'c_pinky2.l', pinkyR1: 'pinky1.r', pinkyR2: 'c_pinky2.r',
} as const
export type Joint = keyof typeof ARP
export type Rig = { root: TransformNode; node: (j: Joint) => TransformNode }

export function rigOf(rigRoot: TransformNode): Rig {
  const byName = new Map(rigRoot.getDescendants(false).map((n) => [n.name, n as TransformNode]))
  const node = (j: Joint) => {
    const n = byName.get(ARP[j])
    if (!n) throw new Error(`rig has no bone ${ARP[j]}`)
    return n
  }
  return { root: rigRoot, node }
}

// ---------- rig-space helpers ----------
function refresh(rig: Rig) {
  rig.root.computeWorldMatrix(true)
  rig.root.getDescendants(false).forEach((n) => (n as TransformNode).computeWorldMatrix?.(true))
}
const toRig = (rig: Rig) => Matrix.Invert(rig.root.getWorldMatrix())
/** joint position in rig space */
export function pos(rig: Rig, j: Joint): Vector3 {
  return Vector3.TransformCoordinates(rig.node(j).getAbsolutePosition(), toRig(rig))
}
function rigRotation(rig: Rig, n: TransformNode): Matrix {
  const m = n.getWorldMatrix().multiply(toRig(rig))
  const q = new Quaternion()
  m.decompose(undefined, q)
  const r = new Matrix()
  q.toRotationMatrix(r)
  return r
}

export type Frame = { fwd: Vector3; up: Vector3; left: Vector3 }

/** the character's own frame in rig space: forward = heel->toe of both feet, left = toward the .l shoulder */
export function frameOf(rig: Rig): Frame {
  refresh(rig)
  const up = Vector3.TransformNormal(Vector3.Up(), toRig(rig)).normalize()
  const fwd = pos(rig, 'toeL').subtract(pos(rig, 'footL')).add(pos(rig, 'toeR').subtract(pos(rig, 'footR')))
  fwd.subtractInPlace(up.scale(Vector3.Dot(fwd, up))).normalize()
  const side = pos(rig, 'shoulderL').subtract(pos(rig, 'shoulderR'))
  side.subtractInPlace(up.scale(Vector3.Dot(side, up))).subtractInPlace(fwd.scale(Vector3.Dot(side, fwd))).normalize()
  return { fwd, up, left: side }
}

/** rotate `j` so the direction j -> child points along `dir` (rig space) */
export function aim(rig: Rig, j: Joint, child: Joint, dir: Vector3) {
  refresh(rig)
  const n = rig.node(j)
  const cur = pos(rig, child).subtract(pos(rig, j)).normalize()
  const want = dir.normalizeToNew()
  const axis = Vector3.Cross(cur, want)
  const s = axis.length()
  if (s < 1e-6) return
  axis.scaleInPlace(1 / s)
  const ang = Math.atan2(s, Vector3.Dot(cur, want))
  let d = Matrix.RotationAxis(axis, ang)
  if (Vector3.Dot(Vector3.TransformNormal(cur, d), want) < 0.999) d = Matrix.RotationAxis(axis, -ang) // handedness-proof
  const world = rigRotation(rig, n).multiply(d) // row vectors: apply the bone's rotation, then the delta
  const parent = n.parent ? rigRotation(rig, n.parent as TransformNode) : Matrix.Identity()
  const local = world.multiply(Matrix.Invert(parent))
  n.rotationQuaternion = Quaternion.FromRotationMatrix(local)
}

// ---------- guards ----------
export type Violation = { limb: Limb; kind: 'knee-backwards' | 'elbow-forwards' | 'arm-through-body' | 'hip-overextended'; value: number }

const KNEE_TOL = 0.01      // m: knee this far BEHIND the hip-ankle line = bent backwards
const ELBOW_TOL = 0.03     // m: elbow this far IN FRONT of the shoulder-wrist line = bent the wrong way
const ARM_CROSSING = -0.1  // upper arm pointing this far toward the other side = through the torso
const HIP_EXT = Math.cos((45 * Math.PI) / 180)

/** offset of the middle joint from the line a-c, in rig space */
function bulge(a: Vector3, b: Vector3, c: Vector3): Vector3 {
  const ac = c.subtract(a)
  const t = Vector3.Dot(b.subtract(a), ac) / Math.max(ac.lengthSquared(), 1e-9)
  return b.subtract(a.add(ac.scale(t)))
}

/** measure the current pose: every rule it breaks (empty = a human could stand like this) */
export function checkPose(rig: Rig, f: Frame = frameOf(rig)): Violation[] {
  refresh(rig)
  const out: Violation[] = []
  for (const s of ['L', 'R'] as const) {
    const hip = pos(rig, `thigh${s}`), knee = pos(rig, `shin${s}`), ankle = pos(rig, `foot${s}`)
    const k = Vector3.Dot(bulge(hip, knee, ankle), f.fwd)
    if (k < -KNEE_TOL) out.push({ limb: `leg${s}`, kind: 'knee-backwards', value: k })
    const thigh = knee.subtract(hip).normalize()
    if (Vector3.Dot(thigh, f.fwd) < -HIP_EXT) out.push({ limb: `leg${s}`, kind: 'hip-overextended', value: Vector3.Dot(thigh, f.fwd) })

    const sh = pos(rig, `arm${s}`), el = pos(rig, `fore${s}`), wr = pos(rig, `hand${s}`)
    const e = Vector3.Dot(bulge(sh, el, wr), f.fwd)
    if (e > ELBOW_TOL) out.push({ limb: `arm${s}`, kind: 'elbow-forwards', value: e })
    const outward = s === 'L' ? f.left : f.left.negate()
    const upper = el.subtract(sh).normalize()
    if (Vector3.Dot(upper, outward) < ARM_CROSSING) out.push({ limb: `arm${s}`, kind: 'arm-through-body', value: Vector3.Dot(upper, outward) })
  }
  return out
}

// ---------- static poses ----------
// a direction in the character's frame: [forward, up, outward] (outward = away from the body's midline)
export type Dir = [number, number, number]
export type LimbAim = { upper: Dir; lower: Dir }
export type StaticPose = { arms?: { L?: LimbAim; R?: LimbAim }; legs?: { L?: LimbAim; R?: LimbAim }; spine?: Dir; head?: Dir; pointWith?: 'L' | 'R'
  body?: Dir // the whole body tips so hips -> spine points here (lie); legs follow the hips
}

// Every number here is a knob (Teacher can change everything): the figure lab shows them live.
const HANG: LimbAim = { upper: [0.06, -1, 0.12], lower: [0.22, -1, 0.04] } // close to the body: no mannequin A-pose
export type StaticName = 'stand' | 'point' | 'kneel' | 'carry' | 'sit' | 'lie' | 'dig' | 'pull' | 'push' | 'climb' | 'row'
export const POSES: Record<StaticName, StaticPose> = {
  stand: { arms: { L: HANG, R: HANG } },
  // right arm out at the thing, a touch up; the left hangs
  point: { arms: { L: HANG, R: { upper: [1, 0.12, 0.35], lower: [1, 0.18, 0.12] } }, head: [1, -0.05, -0.12], pointWith: 'R' },
  // right knee down, left foot planted ahead, back straight. Cartoon legs: shin (0.41) ~ thigh (0.38), so for the
  // planted foot and the down knee to touch the same ground the front thigh runs level
  kneel: {
    arms: { L: { upper: [0.45, -1, 0.15], lower: [1, -0.3, -0.05] }, R: HANG },
    legs: { L: { upper: [1, 0.05, 0.1], lower: [0.08, -1, 0] }, R: { upper: [0.08, -1, 0.06], lower: [-1, -0.05, 0] } },
    spine: [0.1, 1, 0],
  },
  // a load held in both arms against the belly (a basket, a sheaf, a pot)
  carry: { arms: { L: { upper: [0.3, -1, 0.3], lower: [1, 0.12, -0.12] }, R: { upper: [0.3, -1, 0.3], lower: [1, 0.12, -0.12] } } },
  // on the ground (no seat asset needed): knees up, feet flat in front, hands resting on the knees
  sit: {
    spine: [0.12, 1, 0],
    arms: { L: { upper: [0.55, -1, 0.2], lower: [1, 0.1, -0.05] }, R: { upper: [0.55, -1, 0.2], lower: [1, 0.1, -0.05] } },
    legs: { L: { upper: [1, 0.55, 0.14], lower: [1, -0.62, 0.02] }, R: { upper: [1, 0.55, 0.14], lower: [1, -0.62, 0.02] } },
  },
  // on the back, head toward the camera side it faced, arms along the body
  lie: { body: [-1, 0, 0], arms: { L: { upper: [1, 0, 0.18], lower: [1, 0, 0.06] }, R: { upper: [1, 0, 0.18], lower: [1, 0, 0.06] } } },
  // bent over a spade: back forward, both hands low in front
  dig: {
    spine: [0.55, 1, 0],
    arms: { L: { upper: [0.6, -1, 0.1], lower: [0.7, -1, -0.15] }, R: { upper: [0.45, -1, 0.15], lower: [0.5, -1, -0.1] } },
    legs: { L: { upper: [0.35, -1, 0.06], lower: [0.05, -1, 0] }, R: { upper: [-0.1, -1, 0.06], lower: [-0.12, -1, 0] } },
  },
  // hauling a rope: leaning back, arms reaching forward, front foot braced
  pull: {
    spine: [-0.3, 1, 0],
    arms: { L: { upper: [1, -0.25, 0.08], lower: [1, -0.1, -0.05] }, R: { upper: [1, -0.4, 0.1], lower: [1, -0.15, -0.05] } },
    legs: { L: { upper: [0.4, -1, 0.06], lower: [0.3, -1, 0] }, R: { upper: [-0.2, -1, 0.06], lower: [-0.25, -1, 0] } },
  },
  // shoving a stone or a cart: leaning in, arms straight out, back leg driving
  push: {
    spine: [0.4, 1, 0],
    arms: { L: { upper: [1, 0.05, 0.15], lower: [1, 0.1, 0] }, R: { upper: [1, 0.05, 0.15], lower: [1, 0.1, 0] } },
    legs: { L: { upper: [0.3, -1, 0.06], lower: [0.05, -1, 0] }, R: { upper: [-0.35, -1, 0.06], lower: [-0.4, -1, 0] } },
  },
  // going up rigging or a ladder: hands high, one knee up
  climb: {
    arms: { L: { upper: [0.25, 1, 0.2], lower: [0.15, 1, 0] }, R: { upper: [0.3, 0.6, 0.2], lower: [0.2, 1, 0] } },
    legs: { L: { upper: [1, -0.25, 0.1], lower: [0.05, -1, 0] } },
  },
  // seated at an oar: the sit legs, leaning back, arms pulling in
  row: {
    spine: [-0.2, 1, 0],
    arms: { L: { upper: [0.6, -1, 0.25], lower: [1, 0.1, 0] }, R: { upper: [0.6, -1, 0.25], lower: [1, 0.1, 0] } },
    legs: { L: { upper: [1, -0.02, 0.12], lower: [0.1, -1, 0.02] }, R: { upper: [1, -0.02, 0.12], lower: [0.1, -1, 0.02] } },
  },
}

const FIST: Dir = [0.25, -1, -0.15] // folded fingers point down and in, under a palm-down pointing hand
const inFrame = (f: Frame, side: 'L' | 'R', [a, b, c]: Dir) =>
  f.fwd.scale(a).add(f.up.scale(b)).add((side === 'L' ? f.left : f.left.negate()).scale(c))

export type RestPose = Map<TransformNode, { q: Quaternion; p: Vector3 }>
export function captureRest(rig: Rig): RestPose {
  return new Map([rig.root, ...rig.root.getDescendants(false)].map((n) => {
    const t = n as TransformNode
    return [t, { q: (t.rotationQuaternion ?? Quaternion.FromEulerVector(t.rotation)).clone(), p: t.position.clone() }]
  }))
}
export function resetToRest(rest: RestPose) {
  rest.forEach(({ q, p }, n) => { n.rotationQuaternion = q.clone(); n.position.copyFrom(p) })
}

// what can touch the ground, and how far its surface lies below the joint (m): a lying back, a kneeling knee
const CONTACTS: [Joint, number][] = [['footL', 0], ['footR', 0], ['toeL', 0], ['toeR', 0], ['shinL', 0.05], ['shinR', 0.05],
  ['hips', 0.12], ['chest', 0.12], ['head', 0.1], ['handL', 0.03], ['handR', 0.03]]
/** lowest contact surface along up */
function lowest(rig: Rig, f: Frame): number {
  return Math.min(...CONTACTS.map(([j, pad]) => Vector3.Dot(pos(rig, j), f.up) - pad))
}

/**
 * Put the rig in a static pose (from rest). Returns the guard verdict: empty = passes; the vitest keeps it empty.
 */
export function applyPose(rig: Rig, rest: RestPose, pose: StaticPose): Violation[] {
  resetToRest(rest)
  const f = frameOf(rig)
  const ground = lowest(rig, f)
  if (pose.body) aim(rig, 'hips', 'chest', inFrame(f, 'L', pose.body)) // chest, not spine_01: that sits on the hip joint
  if (pose.spine) aim(rig, 'spine', 'neck', inFrame(f, 'L', pose.spine))
  if (pose.head) aim(rig, 'neck', 'head', inFrame(f, 'L', [pose.head[0] * 0.3, 1, pose.head[2] * 0.3]))
  for (const s of ['L', 'R'] as const) {
    const a = pose.arms?.[s]
    if (a) {
      aim(rig, `arm${s}`, `fore${s}`, inFrame(f, s, a.upper))
      rig.node(`armTwist${s}`).rotationQuaternion = rig.node(`arm${s}`).rotationQuaternion!.clone() // the twist sibling carries upper-arm skin
      aim(rig, `fore${s}`, `hand${s}`, inFrame(f, s, a.lower))
    }
    if (pose.pointWith === s && a) {
      // the index finger straight on along the forearm, the other three folded down: a point, not a flat hand
      aim(rig, `index${s}1`, `index${s}2`, inFrame(f, s, a.lower))
      aim(rig, `index${s}2`, `index${s}3`, inFrame(f, s, a.lower))
      for (const fg of ['middle', 'ring', 'pinky'] as const) aim(rig, `${fg}${s}1`, `${fg}${s}2`, inFrame(f, s, FIST))
    }
    const l = pose.legs?.[s]
    if (l) {
      aim(rig, `thigh${s}`, `shin${s}`, inFrame(f, s, l.upper))
      aim(rig, `shin${s}`, `foot${s}`, inFrame(f, s, l.lower))
    }
  }
  // drop the hips until the lowest contact touches the ground again (kneeling sinks, standing stays)
  refresh(rig)
  const drop = lowest(rig, f) - ground
  const hips = rig.node('hips')
  const parentRot = hips.parent ? rigRotation(rig, hips.parent as TransformNode) : Matrix.Identity()
  hips.position.subtractInPlace(Vector3.TransformNormal(f.up.scale(drop), Matrix.Invert(parentRot)))
  return checkPose(rig, f)
}
