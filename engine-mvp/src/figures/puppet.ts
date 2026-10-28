// Painted puppet figures (PM 10-27: the default route). Each character is a set of PARTS SHEETS (Figma gpt-image in
// the History Lines style, one per view: 3/4, side, front) cut by cut_parts.py into parts with automatic landmarks
// (public/figures/puppets/<id>/<view>/parts.json). A puppet is those parts moved by 2D bones in the figure's own
// frame (x = forward, y = up, metres): the vertices are computed here, so what the guards measure IS what is drawn.
//   side / 3/4: limbs turn in the picture plane;  front: a forward swing foreshortens the limb (cos of the angle)
// The figure stands at its 3D depth and turns its face to the camera (yaw only); facing left = the art mirrored.
// Garments re-colour per dye region (the masks from cut_parts.py) and keep their ink and wash: target x luminance.
import {
  Effect, Mesh, ShaderMaterial, Texture, TransformNode, Vector3, VertexBuffer, VertexData, type Scene,
} from '@babylonjs/core'
import type { Placement, StageLike } from './figure'
import { STAIN_DEFAULT, stainSize } from '../stage25d/ground'
import { makeStain } from '../stage25d/ground-gl'
import type { Asset, Library } from '../stage25d/types'

type P2 = [number, number]
type Part = {
  w: number; h: number; pivot: P2; end?: P2; crown?: P2; neck?: P2; waist?: P2
  hip_n?: P2; hip_f?: P2; shoulder_n?: P2; shoulder_f?: P2; m_per_px: number; dye?: string[]
}
export type View = '34' | 'side' | 'front'
export type Sheet = { view: View; kind: string; parts: Record<string, Part> }
export type PuppetPose = 'stand' | 'walk' | 'point' | 'carry' | 'kneel' | 'sit'
export type Expression = 'neutral' | 'happy' | 'worried' | 'surprised'
export type Garment = 'top' | 'accent' | 'skirt' | 'sleeves' | 'breeches' | 'legs' | 'shoes' | 'hat'
export type Character = { id: string; height: number; hat: boolean; step?: number } // step: stride share (a long skirt: short steps)

export const CHARACTERS: Record<string, Character> = {
  'boer-vrouw': { id: 'boer-vrouw', height: 1.62, hat: false, step: 0.5 },
  'boer-man': { id: 'boer-man', height: 1.72, hat: true },
  'voc-matroos': { id: 'voc-matroos', height: 1.70, hat: true },
  'voc-kapitein': { id: 'voc-kapitein', height: 1.74, hat: true },
}
export const VIEWS: View[] = ['34', 'side', 'front']
// face-on, these poses foreshorten into a standing figure (a point becomes a hand on the chest): they show in 3/4
export const FRONT_POSES: PuppetPose[] = ['stand', 'walk']
export const POSE_NAMES: PuppetPose[] = ['stand', 'walk', 'point', 'carry', 'kneel', 'sit']
// the lesson's eight expressions onto the four drawn heads
export const EXPRESSION_OF: Record<string, Expression> = {
  neutral: 'neutral', happy: 'happy', proud: 'happy', worried: 'worried', sad: 'worried', tired: 'worried',
  angry: 'worried', surprised: 'surprised',
}
// garment -> [slot, dye channel]: R is the whole garment, G/B its accents (cut_parts.py)
const GARMENTS: Record<Garment, [string, number][]> = {
  top: [['torso', 0]], accent: [['torso', 1]], skirt: [['skirt', 0]], sleeves: [['upper_arm', 0], ['forearm', 0]],
  breeches: [['thigh', 0]], legs: [['shin', 0]], shoes: [['foot', 0], ['foot_far', 0]], hat: [['hat', 0]],
}

// the guards, in the figure's own 2D frame (degrees)
export const LIMITS = { armFwd: 150, armBack: 40, elbowMax: 150, hipFwd: 125, hipBack: 35, kneeMax: 150 }
// look + motion knobs (dev panel): degrees, metres, Hz
export const PUPPET = {
  walkHip: 24, walkKnee: 48, walkArm: 18, walkElbow: 14, stride: 0.95, bob: 0.012, breathe: 1.5, idleRate: 0.45,
  zStep: 0.004, // metres between part layers, toward the camera
  seat: 0.11, // m from the hip joints down to the buttocks
  seatHeight: 0.43, // m, a seat's top (for a 1.70 m figure)
  minForeshorten: 0.3, // front view: an arm pointing at the camera still shows this share
  minForeshortenLeg: 0.12, // ...a leg (a seated figure's thighs nearly vanish, so it reads low, not short)
  lapThickness: 0.4, // a skirt over seated thighs keeps this share of its hanging depth
}

export type Angles = {
  lean: number; head: number
  sN: number; eN: number; sF: number; eF: number // shoulder (forward +), elbow (forward bend +)
  hN: number; kN: number; hF: number; kF: number // hip (forward +), knee (a real knee bends back: <= 0)
  aN: number; aF: number                         // ankle, added to the shin's angle (toes up +)
  handN: 'open' | 'grip' | 'point'; handF: 'open' | 'grip' | 'point'
}
// contrapposto: the weight on the far leg, the near knee eased forward, the body leaning a touch back over it
const STAND: Angles = { lean: -1.5, head: 2, sN: 5, eN: 12, sF: -4, eF: 10, hN: 7, kN: -14, hF: -3, kF: -1, aN: 7, aF: 4, handN: 'open', handF: 'open' }
// a pose = its angles at time t (s); exported so a test can break one and see the guards catch it
export const POSES: Record<PuppetPose, (t: number, c?: Character, seated?: boolean) => Angles> = {
  stand: (t) => {
    const shift = Math.sin(t * PUPPET.idleRate) // a slow weight shift: the free knee eases and settles
    return { ...STAND, lean: STAND.lean + 0.8 * shift, head: STAND.head + 1.5 * Math.sin(t * 0.5),
      hN: STAND.hN + 2 * shift, kN: STAND.kN - 4 * shift, sN: STAND.sN + PUPPET.breathe * Math.sin(t * 1.6) }
  },
  point: (t) => ({ ...POSES.stand(t), sN: 82, eN: 6, handN: 'point', head: 4 }),
  carry: (t) => ({ ...POSES.stand(t), sN: 28, eN: 62, sF: 28, eF: 62, handN: 'grip', handF: 'grip', lean: -3 }),
  kneel: () => ({ ...STAND, lean: 4, head: 6, hF: 88, kF: -88, aF: 0, hN: -4, kN: -100, aN: -40, sN: 18, eN: 40, sF: 10, eF: 30 }),
  // on a seat (placePuppet gives one from the stage's library), else on the ground: hips down, knees up a little
  sit: (_t, _c, seated) => seated
    ? { ...STAND, lean: -3, head: 4, hN: 88, kN: -84, aN: -4, hF: 84, kF: -82, aF: -2, sN: 24, eN: 58, sF: 20, eF: 60 }
    : { ...STAND, lean: -6, head: 4, hN: 100, kN: -28, aN: -72, hF: 94, kF: -20, aF: -74, sN: 34, eN: 30, sF: 28, eF: 34 },
  walk: (t, c) => {
    const ph = t * Math.PI * 2 * PUPPET.stride
    const step = c?.step ?? 1
    const leg = (p: number) => ({ h: PUPPET.walkHip * step * Math.sin(p), k: -PUPPET.walkKnee * step * Math.max(0, Math.sin(p + 1.2)) ** 2 - 4 })
    const n = leg(ph), f = leg(ph + Math.PI)
    return {
      ...STAND, lean: 3, head: -2,
      hN: n.h, kN: n.k, hF: f.h, kF: f.k, aN: -0.3 * (n.h + n.k), aF: -0.3 * (f.h + f.k),
      sN: -PUPPET.walkArm * Math.sin(ph), eN: PUPPET.walkElbow, sF: PUPPET.walkArm * Math.sin(ph), eF: PUPPET.walkElbow,
    }
  },
}

// ---- 2D maths: x forward, y up; angles from straight down, positive toward +x ----
const R = Math.PI / 180
const rot = (v: P2, deg: number): P2 => { const c = Math.cos(deg * R), s = Math.sin(deg * R); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c] }
const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]]
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]]
const cross = (a: P2, b: P2) => a[0] * b[1] - a[1] * b[0]
// degrees from a to b, + = counter-clockwise (a hanging limb swinging forward)
const angleBetween = (a: P2, b: P2) => Math.atan2(cross(a, b), a[0] * b[0] + a[1] * b[1]) / R

// a part placed: image pixel -> figure metres
type Place = { at: P2; deg: number; sy: number; s: number; pivot: P2 }
const local = (pl: Place, px: P2): P2 => [(px[0] - pl.pivot[0]) * pl.s, -(px[1] - pl.pivot[1]) * pl.s * pl.sy]
const toFig = (pl: Place, px: P2): P2 => add(pl.at, rot(local(pl, px), pl.deg))

export type Joints = Record<'hip' | 'neck' | 'shoulderN' | 'shoulderF' | 'elbowN' | 'elbowF' | 'wristN' | 'wristF' | 'hipN' | 'hipF' | 'kneeN' | 'kneeF' | 'ankleN' | 'ankleF', P2>
type Rig = { places: Record<string, Place>; joints: Joints; drape: { waist: P2; knee: P2 } }

/** forward kinematics: every part's placement for these angles, standing on y = 0 */
export function solve(sheet: Sheet, height: number, a: Angles, seatTop = 0): Rig {
  const P = sheet.parts, front = sheet.view === 'front', k = height / 1.7
  const sc = (slot: string) => P[slot].m_per_px * k
  const places: Record<string, Place> = {}
  const T = P.torso
  // rigid limb: front = drawn as hanging, foreshortened; side/3-4 = turned so its drawn axis points at angle A
  const limb = (slot: string, at: P2, A: number): Place => {
    const p = P[slot]
    if (front) {
      // a limb swung toward or away from the camera shortens; only an arm raised past level points up (a leg
      // swung back is hidden behind the body, it never folds up over itself)
      const c = Math.cos(A * R), up = c < 0 && /arm/.test(slot)
      const min = /arm/.test(slot) ? PUPPET.minForeshorten : PUPPET.minForeshortenLeg
      return { at, deg: 0, sy: (up ? -1 : 1) * Math.max(Math.abs(c), min), s: sc(slot), pivot: p.pivot }
    }
    const axis = p.end ? sub([p.end[0], -p.end[1]], [p.pivot[0], -p.pivot[1]]) : ([0, -1] as P2)
    const drawn = Math.atan2(axis[0], -axis[1]) / R
    return { at, deg: A - drawn, sy: 1, s: sc(slot), pivot: p.pivot }
  }
  const hip: P2 = [0, 0]
  places.torso = front ? { at: hip, deg: 0, sy: Math.cos(a.lean * R), s: sc('torso'), pivot: T.pivot } : { at: hip, deg: -a.lean, sy: 1, s: sc('torso'), pivot: T.pivot }
  const tor = places.torso
  const neck = toFig(tor, T.neck!), waist = toFig(tor, T.waist!)
  const legRoot = { ...tor, deg: 0, sy: 1 } // the hips do not lean with the body
  const hipN = toFig(legRoot, T.hip_n!), hipF = toFig(legRoot, T.hip_f!)
  const shoulderN = toFig(tor, T.shoulder_n!), shoulderF = toFig(tor, T.shoulder_f!)
  const head = P.head_neutral
  places.head = { at: neck, deg: front ? 0 : -(a.lean + a.head), sy: 1, s: sc('head_neutral'), pivot: head.pivot }
  if (P.hat) places.hat = { at: toFig(places.head, head.crown!), deg: places.head.deg, sy: 1, s: sc('hat'), pivot: P.hat.pivot }
  const arm = (side: 'N' | 'F', sh: P2, s: number, e: number) => {
    const A1 = a.lean + s, A2 = A1 + e
    const up = limb('upper_arm', sh, A1)
    const elbow = toFig(up, P.upper_arm.end!)
    const fore = limb('forearm', elbow, A2)
    const wrist = toFig(fore, P.forearm.end!)
    const hand = limb('hand_open', wrist, A2)
    places[`upper_arm_${side}`] = up; places[`forearm_${side}`] = fore; places[`hand_${side}`] = hand
    return { elbow, wrist }
  }
  const leg = (side: 'N' | 'F', hp: P2, h: number, kn: number, an: number) => {
    const th = limb('thigh', hp, h)
    const knee = toFig(th, P.thigh.end!)
    const sh = limb('shin', knee, h + kn)
    const ankle = toFig(sh, P.shin.end!)
    const footSlot = side === 'F' && P.foot_far ? 'foot_far' : 'foot'
    const ft: Place = front ? { at: ankle, deg: 0, sy: 1, s: sc(footSlot), pivot: P[footSlot].pivot }
      : { at: ankle, deg: h + kn + an, sy: 1, s: sc(footSlot), pivot: P[footSlot].pivot }
    places[`thigh_${side}`] = th; places[`shin_${side}`] = sh; places[`foot_${side}`] = ft
    return { knee, ankle, sole: [toFig(ft, [0, P[footSlot].h - 6]), toFig(ft, [P[footSlot].w, P[footSlot].h - 6])] as P2[] }
  }
  const aN = arm('N', shoulderN, a.sN, a.eN), aF = arm('F', shoulderF, a.sF, a.eF)
  const lN = leg('N', hipN, a.hN, a.kN, a.aN), lF = leg('F', hipF, a.hF, a.kF, a.aF)
  // stand on the ground: the lowest sole or knee touches y = 0
  const kneeCap = 0.05 * k, seat = PUPPET.seat * k // a seated figure rests on its buttocks, below the hip joints
  const low = Math.min(...lN.sole.map((p) => p[1]), ...lF.sole.map((p) => p[1]), lN.knee[1] - kneeCap, lF.knee[1] - kneeCap, hip[1] - seat - seatTop * k)
  const lift = (p: P2): P2 => [p[0], p[1] - low]
  for (const pl of Object.values(places)) pl.at = lift(pl.at)
  if (P.skirt) places.skirt = { at: lift(waist), deg: 0, sy: 1, s: sc('skirt'), pivot: P.skirt.pivot }
  const joints: Joints = {
    hip: lift(hip), neck: lift(neck), shoulderN: lift(shoulderN), shoulderF: lift(shoulderF),
    elbowN: lift(aN.elbow), elbowF: lift(aF.elbow), wristN: lift(aN.wrist), wristF: lift(aF.wrist),
    hipN: lift(hipN), hipF: lift(hipF), kneeN: lift(lN.knee), kneeF: lift(lF.knee), ankleN: lift(lN.ankle), ankleF: lift(lF.ankle),
  }
  return { places, joints, drape: { waist: lift(waist), knee: lift([(lN.knee[0] + lF.knee[0]) / 2, (lN.knee[1] + lF.knee[1]) / 2]) } }
}

/** the guards, measured on the solved joints (not on the numbers asked for): knees bend back, elbows forward,
 *  shoulders and hips stay in their human range */
// tol: degrees of drawing noise allowed; the front view hangs parts as drawn, so only a fold-over counts there
export const GUARD_TOL: Record<View, number> = { '34': 3, side: 3, front: 15 }
export function violations(j: Joints, tol = 3): string[] {
  const out: string[] = []
  const torsoDown = sub(j.hip, j.neck)
  for (const s of ['N', 'F'] as const) {
    const upper = sub(j[`elbow${s}`], j[`shoulder${s}`]), fore = sub(j[`wrist${s}`], j[`elbow${s}`])
    const thigh = sub(j[`knee${s}`], j[`hip${s}`]), shin = sub(j[`ankle${s}`], j[`knee${s}`])
    const elbow = angleBetween(upper, fore), knee = angleBetween(thigh, shin)
    const shoulder = angleBetween(torsoDown, upper), hipA = angleBetween([0, -1], thigh)
    if (elbow < -tol) out.push(`elbow${s} bends backwards (${elbow.toFixed(0)} deg)`)
    if (elbow > LIMITS.elbowMax) out.push(`elbow${s} folded past ${LIMITS.elbowMax} deg`)
    if (knee > tol) out.push(`knee${s} bends backwards (${knee.toFixed(0)} deg)`)
    if (knee < -LIMITS.kneeMax) out.push(`knee${s} folded past ${LIMITS.kneeMax} deg`)
    if (shoulder > LIMITS.armFwd || shoulder < -LIMITS.armBack) out.push(`shoulder${s} ${shoulder.toFixed(0)} deg outside -${LIMITS.armBack}..${LIMITS.armFwd}`)
    if (hipA > LIMITS.hipFwd || hipA < -LIMITS.hipBack) out.push(`hip${s} ${hipA.toFixed(0)} deg outside -${LIMITS.hipBack}..${LIMITS.hipFwd}`)
  }
  return out
}

// ---- rendering ----
Effect.ShadersStore.puppetVertexShader = `precision highp float;
attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`
// dye: the garment takes the target colour at the paint's own luminance, so ink, wash and paper texture stay
Effect.ShadersStore.puppetFragmentShader = `precision highp float;
varying vec2 vUV; uniform sampler2D art; uniform sampler2D dye; uniform float hasDye;
uniform vec3 target0; uniform vec3 target1; uniform vec3 target2; uniform vec3 refL; uniform vec3 dyeOn;
vec3 dyed(vec3 t, float l, float r) { return clamp(t * min(l / max(r, 0.02), 2.0), 0.0, 1.0); }
void main() {
  vec4 c = texture2D(art, vUV);
  if (c.a < 0.5) discard;
  if (hasDye > 0.5) {
    vec3 m = texture2D(dye, vUV).rgb * dyeOn;
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.rgb = mix(c.rgb, dyed(target0, l, refL.x), m.r);
    c.rgb = mix(c.rgb, dyed(target1, l, refL.y), m.g);
    c.rgb = mix(c.rgb, dyed(target2, l, refL.z), m.b);
  }
  gl_FragColor = vec4(c.rgb, 1.0);
}`

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
const luma = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

type PartMesh = { mesh: Mesh; mat: ShaderMaterial; slot: string; rest: P2[]; pos: Float32Array; dyeOn: number[] }
const SKIRT_NY = 16

function partMesh(scene: Scene, base: string, view: View, slot: string, p: Part, name: string, parent: TransformNode): PartMesh {
  const ny = slot === 'skirt' ? SKIRT_NY : 1, nx = slot === 'skirt' ? 4 : 1
  const rest: P2[] = [], uvs: number[] = [], idx: number[] = []
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { rest.push([(i / nx) * p.w, (j / ny) * p.h]); uvs.push(i / nx, 1 - j / ny) }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, c = a + nx + 1; idx.push(a, c, a + 1, a + 1, c, c + 1) }
  const mesh = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = new Float32Array(rest.length * 3)
  vd.indices = idx
  vd.uvs = uvs
  vd.applyToMesh(mesh, true)
  mesh.parent = parent
  mesh.isPickable = false
  mesh.alwaysSelectAsActiveMesh = true // vertices move every frame: no stale bounding box culling
  mesh.metadata = { noGBuffer: true } // painted art: the stage's post ink must not outline it again
  const mat = new ShaderMaterial(name, scene, 'puppet', {
    attributes: ['position', 'uv'], samplers: ['art', 'dye'],
    uniforms: ['worldViewProjection', 'hasDye', 'target0', 'target1', 'target2', 'refL', 'dyeOn'],
  })
  mat.backFaceCulling = false
  mat.setTexture('art', new Texture(`${base}/${view}/${slot}.webp`, scene, false, true))
  const regions = p.dye ?? []
  mat.setFloat('hasDye', regions.length ? 1 : 0)
  if (regions.length) mat.setTexture('dye', new Texture(`${base}/${view}/${slot}_dye.webp`, scene, false, true, Texture.BILINEAR_SAMPLINGMODE))
  const refs = [0, 1, 2].map((i) => luma(hex(regions[i] ?? '#808080')))
  mat.setVector3('refL', new Vector3(refs[0], refs[1], refs[2]))
  mat.setVector3('dyeOn', Vector3.Zero())
  for (const i of [0, 1, 2]) mat.setVector3(`target${i}`, new Vector3(...hex(regions[i] ?? '#808080')))
  mesh.material = mat
  return { mesh, mat, slot, rest, pos: new Float32Array(rest.length * 3), dyeOn: [0, 0, 0] }
}

// back to front; z steps toward the camera
const ORDER: Record<'turned' | 'front', string[]> = {
// (a child lies under its parent: its end disc hides under the parent's cut end, cut_parts.py joint_ends)
  turned: ['hand_F', 'forearm_F', 'upper_arm_F', 'foot_F', 'shin_F', 'thigh_F', 'foot_N', 'shin_N', 'thigh_N', 'skirt', 'torso', 'head', 'hat', 'hand_N', 'forearm_N', 'upper_arm_N'],
  front: ['foot_F', 'shin_F', 'thigh_F', 'foot_N', 'shin_N', 'thigh_N', 'skirt', 'torso', 'hand_F', 'forearm_F', 'upper_arm_F', 'hand_N', 'forearm_N', 'upper_arm_N', 'head', 'hat'],
}
const shapesOf = (key: string): string[] =>
  key === 'head' ? ['head_neutral', 'head_happy', 'head_worried', 'head_surprised']
    : key.startsWith('hand_') ? ['hand_open', 'hand_grip', 'hand_point'] : [sheetSlot(key, STAND, 'neutral')]
const sheetSlot = (key: string, a: Angles, expr: Expression): string => {
  if (key === 'head') return `head_${expr}`
  if (key.startsWith('hand_')) return `hand_${key.endsWith('N') ? a.handN : a.handF}`
  if (key === 'foot_F') return 'foot_far'
  if (key === 'foot_N') return 'foot'
  return key.replace(/_[NF]$/, '')
}

export type Puppet = {
  root: TransformNode
  character: Character
  pose: PuppetPose
  view: View
  setPose(p: PuppetPose): string[]          // the guards' findings (empty = a human pose); also warned
  setExpression(e: string): void
  setView(v: View, mirror?: boolean): void
  setHat(on: boolean): void
  setSeat(seat: Seat | null): void          // something to sit on (a sit without one is on the ground)
  setDye(g: Garment, color: string | null): void  // null = the painted colour
  garments(): Garment[]
  joints(): Joints                          // the solved 2D joints right now (figure frame)
  dispose(): void
}

export type Seat = { url: string; aspect: number } // a library asset's image and its width / height

export type PuppetOptions = {
  base?: string                                      // where the cut parts live (default figures/puppets/<id>)
  loadSheet?: (url: string) => Promise<Sheet>        // default fetch; a test passes a file reader
  warn?: (msg: string) => void                       // default console.warn; never silence it in a test
  log?: (msg: string) => void                        // default console.info (a view fallback)
}

export async function createPuppet(scene: Scene, id: string, opts: PuppetOptions = {}): Promise<Puppet> {
  const character = CHARACTERS[id]
  if (!character) throw new Error(`no puppet character "${id}"`)
  const base = opts.base ?? `figures/puppets/${id}`
  const load = opts.loadSheet ?? (async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json() as Promise<Sheet> })
  const warn = opts.warn ?? ((m: string) => console.warn(m))
  const log = opts.log ?? ((m: string) => console.info(m))
  const sheets = Object.fromEntries(await Promise.all(VIEWS.map(async (v) => [v, await load(`${base}/${v}/parts.json`)] as const))) as Record<View, Sheet>
  const root = new TransformNode(id, scene)
  const yaw = new TransformNode(`${id}_yaw`, scene)
  yaw.parent = root
  const flip = new TransformNode(`${id}_flip`, scene) // scaling.x = -1 mirrors the art for facing left
  flip.parent = yaw
  // one mesh per layer and drawn shape: the near and the far arm are two meshes of the same art
  const meshes = Object.fromEntries(VIEWS.map((v) => {
    const parts = sheets[v].parts
    const set: Record<string, PartMesh> = {}
    for (const key of ORDER[v === 'front' ? 'front' : 'turned']) {
      for (const slot of shapesOf(key)) {
        if (parts[slot]) set[`${key}:${slot}`] = partMesh(scene, base, v, slot, parts[slot], `${id}_${v}_${key}_${slot}`, flip)
      }
    }
    return [v, set]
  })) as Record<View, Record<string, PartMesh>>
  const state = { pose: 'stand' as PuppetPose, t: 0, view: '34' as View, expr: 'neutral' as Expression, hat: character.hat, last: [] as string[], dist: 10, want: '34' as View, seat: null as null | { mesh: Mesh; aspect: number } }
  // the view drawn: the one asked for, unless face-on would hide the pose
  const shownView = () => (state.want === 'front' && !FRONT_POSES.includes(state.pose) ? '34' : state.want)
  const seated = () => state.pose === 'sit' && !!state.seat

  const draw = () => {
    state.view = puppet.view = shownView()
    const sheet = sheets[state.view]
    const a = POSES[state.pose](state.t, character, seated())
    const rig = solve(sheet, character.height, a, seated() ? PUPPET.seatHeight : 0)
    if (state.seat) placeSeat(state.seat, rig, character.height)
    const order = ORDER[state.view === 'front' ? 'front' : 'turned']
    const shown = new Set<PartMesh>()
    order.forEach((key, layer) => {
      const slot = sheetSlot(key, a, state.expr)
      const pm = meshes[state.view][`${key}:${slot}`]
      const pl = rig.places[key]
      if (!pm || !pl || (key === 'hat' && !state.hat)) return
      shown.add(pm)
      const z = -layer * PUPPET.zStep * Math.max(1, state.dist / 10) // far away the depth buffer is coarser
      const part = sheet.parts[slot]
      const own: Place = { ...pl, pivot: part.pivot } // each hand shape hangs from its own wrist point
      for (let i = 0; i < pm.rest.length; i++) {
        const q = slot === 'skirt' ? drape(own, part, pm.rest[i], rig.drape) : toFig(own, pm.rest[i])
        pm.pos[i * 3] = q[0]; pm.pos[i * 3 + 1] = q[1]; pm.pos[i * 3 + 2] = z
      }
      pm.mesh.updateVerticesData(VertexBuffer.PositionKind, pm.pos)
    })
    for (const v of VIEWS) for (const pm of Object.values(meshes[v])) pm.mesh.setEnabled(shown.has(pm))
    state.seat?.mesh.setEnabled(seated())
    return rig
  }

  const tick = scene.onBeforeRenderObservable.add(() => {
    state.t += scene.getEngine().getDeltaTime() / 1000
    const cam = scene.activeCamera
    if (cam) { // face the camera, yaw only: a painted figure is a picture plane
      root.computeWorldMatrix(true)
      const p = root.getAbsolutePosition(), c = cam.globalPosition
      yaw.rotation.y = Math.atan2(p.x - c.x, p.z - c.z)
      state.dist = Vector3.Distance(p, c)
    }
    draw()
  })

  const puppet: Puppet = {
    root, character, pose: 'stand', view: '34',
    setPose(p) {
      puppet.pose = state.pose = p
      // check the whole cycle of a moving pose, not one frame
      const found = new Set<string>()
      // every view on its own sheet (what each view draws), over a whole cycle of a moving pose
      for (const t of p === 'walk' ? Array.from({ length: 24 }, (_, i) => i / 24 / PUPPET.stride) : [0]) {
        for (const v of VIEWS) for (const x of violations(solve(sheets[v], character.height, POSES[p](t, character, seated()), seated() ? PUPPET.seatHeight : 0).joints, GUARD_TOL[v])) found.add(`${v}: ${x}`)
      }
      state.last = [...found]
      if (state.want === 'front' && !FRONT_POSES.includes(p)) log(`puppet ${id} ${p}: face-on would hide the pose, shown in 3/4`)
      for (const v of state.last) warn(`puppet ${id} ${p}: ${v}`)
      draw()
      return state.last
    },
    setExpression(e) { state.expr = EXPRESSION_OF[e] ?? 'neutral'; draw() },
    setView(v, mirror = false) {
      state.want = v
      flip.scaling.x = mirror ? -1 : 1
      if (v === 'front' && !FRONT_POSES.includes(state.pose)) log(`puppet ${id} ${state.pose}: face-on would hide the pose, shown in 3/4`)
      draw()
    },
    setSeat(seat) {
      state.seat?.mesh.dispose(false, true)
      state.seat = seat ? { mesh: seatMesh(scene, seat.url, `${id}_seat`, flip), aspect: seat.aspect } : null
      draw()
    },
    setHat(on) { state.hat = on && !!sheets['34'].parts.hat; draw() },
    setDye(g, color) {
      for (const v of VIEWS) for (const [slot, ch] of GARMENTS[g]) for (const pm of Object.values(meshes[v]).filter((m) => m.slot === slot)) {
        const regions = sheets[v].parts[slot]?.dye
        if (!regions || ch >= regions.length) continue
        pm.dyeOn = pm.dyeOn.map((on, i) => (i === ch ? (color ? 1 : 0) : on))
        pm.mat.setVector3('dyeOn', Vector3.FromArray(pm.dyeOn))
        if (color) pm.mat.setVector3(`target${ch}`, new Vector3(...hex(color)))
      }
    },
    garments() {
      const p = sheets['34'].parts
      return (Object.keys(GARMENTS) as Garment[]).filter((g) => GARMENTS[g].some(([slot, ch]) => (p[slot]?.dye?.length ?? 0) > ch))
    },
    joints() { return solve(sheets[state.view], character.height, POSES[state.pose](state.t, character, seated()), seated() ? PUPPET.seatHeight : 0).joints },
    dispose() { scene.onBeforeRenderObservable.remove(tick); root.dispose(false, true) },
  }
  puppet.setPose('stand')
  return puppet
}

/** a skirt: its front half lies over the lap (waist -> knees -> down), its back half hangs straight from the waist,
 *  so a kneeling or seated figure keeps its back leg covered; below the ground the hem lies on it, trailing back */
function drape(pl: Place, p: Part, px: P2, d: { waist: P2; knee: P2 }): P2 {
  const s = pl.s
  const along = (px[1] - p.pivot[1]) * s, across = (px[0] - p.pivot[0]) * s
  const hanging: P2 = add(d.waist, [across, -along])
  const seg = sub(d.knee, d.waist)
  const l1 = Math.hypot(seg[0], seg[1])
  let lap: P2
  if (along <= l1 && l1 > 1e-6) {
    const dir: P2 = [seg[0] / l1, seg[1] / l1]
    // lying over the thighs the cloth is as thick as a lap, not as deep as the hanging skirt is wide
    const thick = across * (PUPPET.lapThickness + (1 - PUPPET.lapThickness) * Math.abs(dir[1]))
    lap = add(add(d.waist, [dir[0] * along, dir[1] * along]), [-dir[1] * thick, dir[0] * thick])
  } else lap = add(d.knee, [across, -(along - l1)])
  const half = (p.w * s) / 2
  const front = Math.min(1, Math.max(0, (across / half + 0.5))) // 0 at the back edge's half, 1 from the middle forward
  const q: P2 = [hanging[0] + (lap[0] - hanging[0]) * front, hanging[1] + (lap[1] - hanging[1]) * front]
  return q[1] >= 0 ? q : [q[0] + q[1], 0]
}

function seatMesh(scene: Scene, url: string, name: string, parent: TransformNode): Mesh {
  const mesh = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = new Float32Array(12)
  vd.indices = [0, 2, 1, 1, 2, 3]
  vd.uvs = [0, 1, 1, 1, 0, 0, 1, 0]
  vd.applyToMesh(mesh, true)
  mesh.parent = parent
  mesh.isPickable = false
  mesh.alwaysSelectAsActiveMesh = true
  mesh.metadata = { noGBuffer: true }
  const mat = new ShaderMaterial(name, scene, 'puppet', { attributes: ['position', 'uv'], samplers: ['art', 'dye'], uniforms: ['worldViewProjection', 'hasDye', 'target0', 'target1', 'target2', 'refL', 'dyeOn'] })
  mat.backFaceCulling = false
  mat.setTexture('art', new Texture(url, scene, false, true))
  mat.setFloat('hasDye', 0)
  mesh.material = mat
  return mesh
}

/** the seat under the buttocks: its top at the seat height, behind every part */
function placeSeat(seat: { mesh: Mesh; aspect: number }, rig: Rig, height: number) {
  const k = height / 1.7, h = PUPPET.seatHeight * k, w = h * seat.aspect, x = rig.joints.hip[0] - 0.06 * k, z = PUPPET.zStep
  seat.mesh.updateVerticesData(VertexBuffer.PositionKind, new Float32Array([x - w / 2, h, z, x + w / 2, h, z, x - w / 2, 0, z, x + w / 2, 0, z]))
}

const SEATS = /\b(stool|bench|chest|barrel|crate|stump|stumps|log|boulders?|rock|stones?)\b/
/** something to sit on from a library: a low prop or rock (a seat is drawn in the same style as the scene) */
export function seatFrom(lib: Library & { base: string }): Seat | null {
  const a = lib.assets.find((x) => (x.layer === 'fg' || x.layer === 'prop') && !x.tileable_x && x.height_m <= 1.2 && SEATS.test([x.id, ...(x.tags ?? [])].join(' ')))
  return a ? { url: lib.base + a.file, aspect: a.w / a.h } : null
}

const stains = new WeakMap<Puppet, ReturnType<typeof makeStain>>()

/** the same contract as placeFigure: stand on the stage; the facing picks the view (left = mirrored art) */
// `behind` (m, default 0) moves the figure back from its layer's plane, so it can stand behind a same-depth layer
export function placePuppet(p: Puppet, at: Placement & { view?: '34' | 'side'; behind?: number }, stage?: StageLike & { lib?: Library & { base: string } }) {
  const g = stage ? stage.groundPoint(at.x, at.depth) : new Vector3((at.x - 0.5) * 10, 0, { bg: 70, mid: 22, fg: 7 }[at.depth])
  p.root.position.copyFrom(g)
  p.root.position.z += at.behind ?? 0
  if (stage?.lib) p.setSeat(seatFrom(stage.lib))
  // the stage's contact stain, as under a boulder: the figure stands on the painted ground, not over it
  if (stage && !stains.has(p)) {
    const k = p.character.height / 1.7
    const sz = stainSize({} as Asset, 0.6 * k, p.character.height, Math.max(1, p.root.position.z))
    const stain = makeStain(p.root, sz.w, sz.d, p.root.getScene())
    stain.setOpacity(STAIN_DEFAULT)
    stains.set(p, stain)
  }
  if (at.facing === 'left' || at.facing === 'right') p.setView(at.view ?? '34', at.facing === 'left')
  else p.setView('front')
}
