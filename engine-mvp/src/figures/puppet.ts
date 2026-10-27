// SPIKE (PM 10-27): a painted puppet figure. The character is drawn in the library's own History Lines style
// (one Figma gpt-image-2.5 turnaround: front / 3/4 / side), cut out with alpha, and moved like a Spine mesh:
// a subdivided plane whose vertices follow 2D bones (body sway + bob, head, two arms, two feet), weighted by
// region, so nothing tears and no hidden part needs painting. The plane stands at its 3D depth and turns its
// face to the camera (yaw only); the view (3/4, mirrored 3/4, front) follows the figure's facing.
// Pose limits are the 2D guards: an arm only swings within its human range, measured in the figure's own frame.
import {
  Color3, Mesh, StandardMaterial, Texture, TransformNode, Vector3, VertexBuffer, VertexData, type Scene,
} from '@babylonjs/core'
import type { Placement, StageLike } from './figure'

type V2 = [number, number]
type View = { url: string; w: number; h: number; feet: V2; neck: V2; armN: [V2, V2]; armF: [V2, V2]; footN: V2; footF: V2 }
export type PuppetSpec = { height: number; views: Record<'34' | 'front', View> }

// the farmer woman: pixel landmarks in each cut-out (boer-vrouw_*.png, from the turnaround in BartsMedia puppet-spike/)
export const BOER_VROUW: PuppetSpec = {
  height: 1.62,
  views: {
    '34': { url: 'figures/puppets/boer-vrouw_34.png', w: 280, h: 864, feet: [140, 838], neck: [135, 140],
      armN: [[62, 222], [70, 470]], armF: [[214, 228], [250, 455]], footN: [88, 812], footF: [190, 795] },
    front: { url: 'figures/puppets/boer-vrouw_front.png', w: 295, h: 864, feet: [148, 830], neck: [155, 140],
      armN: [[62, 258], [36, 462]], armF: [[262, 258], [262, 462]], footN: [105, 812], footF: [205, 812] },
  },
}

// the guards in 2D: an arm swings forward at most ARM_FWD, back at most ARM_BACK (degrees, the figure's frame)
export const ARM_FWD = 100, ARM_BACK = 30
export const PUPPET = { sway: 1.2, bob: 0.012, armSwing: 14, step: 10, stride: 1.05 } // knobs: degrees, metres, px, Hz

export type PuppetPose = 'stand' | 'walk' | 'point' | 'carry'
export type Puppet = {
  root: TransformNode
  pose: PuppetPose
  setPose(p: PuppetPose): string[] // violations (empty = inside the human range)
  setExpression(e: string): void   // spike: one face per view (expression heads not generated yet)
  dispose(): void
}

const NX = 18, NY = 54

function capsuleWeight(p: V2, a: V2, b: V2, r: number) {
  const abx = b[0] - a[0], aby = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby)))
  const d = Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t)
  const s = Math.max(0, Math.min(1, (d - r) / 14))
  return (1 - s * s * (3 - 2 * s)) * (p[1] > a[1] - 10 ? 1 : 0)
}

function rot(p: V2, c: V2, deg: number): V2 {
  const a = (deg * Math.PI) / 180, s = Math.sin(a), co = Math.cos(a)
  const x = p[0] - c[0], y = p[1] - c[1]
  return [c[0] + x * co - y * s, c[1] + x * s + y * co]
}

export function armViolations(angles: { armN: number; armF: number }): string[] {
  return (['armN', 'armF'] as const).filter((k) => angles[k] > ARM_FWD || angles[k] < -ARM_BACK).map((k) => `${k} ${angles[k]} deg outside -${ARM_BACK}..${ARM_FWD}`)
}

export async function createPuppet(scene: Scene, spec: PuppetSpec, name = 'puppet'): Promise<Puppet> {
  const root = new TransformNode(name, scene)
  const yaw = new TransformNode(`${name}_yaw`, scene)
  yaw.parent = root
  const views = Object.fromEntries(Object.entries(spec.views).map(([k, v]) => [k, makeView(scene, spec, v, `${name}_${k}`, yaw)])) as Record<'34' | 'front', ReturnType<typeof makeView>>
  let current: '34' | 'front' = '34'
  let mirror = false
  const show = (v: '34' | 'front', m: boolean) => {
    current = v; mirror = m
    for (const [k, mv] of Object.entries(views)) mv.mesh.setEnabled(k === v)
    views[v].mesh.scaling.x = m ? -1 : 1
  }
  show('34', false)
  const state = { pose: 'stand' as PuppetPose, t: 0 }
  const tick = scene.onBeforeRenderObservable.add(() => {
    state.t += scene.getEngine().getDeltaTime() / 1000
    // face the camera, yaw only: a painted figure is a picture plane
    const cam = scene.activeCamera
    if (cam) {
      root.computeWorldMatrix(true)
      const p = root.getAbsolutePosition(), c = cam.globalPosition
      yaw.rotation.y = Math.atan2(p.x - c.x, p.z - c.z)
    }
    views[current].deform(pose(state.pose, state.t))
  })
  const puppet: Puppet = {
    root,
    pose: 'stand',
    setPose(p) {
      puppet.pose = state.pose = p
      return armViolations(pose(p, 0))
    },
    setExpression() {},
    dispose() {
      scene.onBeforeRenderObservable.remove(tick)
      root.dispose(false, true)
    },
  }
  ;(puppet as Puppet & { show: typeof show }).show = show
  return puppet
}

type Angles = { sway: number; bob: number; head: number; armN: number; armF: number; footN: V2; footF: V2 }
/** the bones for a pose at time t (s); arm angles positive = forward, in the figure's own frame */
function pose(p: PuppetPose, t: number): Angles {
  const breathe = Math.sin(t * 1.6)
  const base: Angles = { sway: PUPPET.sway * Math.sin(t * 0.7), bob: 0.002 * breathe, head: 1.2 * Math.sin(t * 0.5), armN: 2 + breathe, armF: 2 - breathe, footN: [0, 0], footF: [0, 0] }
  if (p === 'point') return { ...base, armN: 78 }
  if (p === 'carry') return { ...base, armN: 45, armF: 45 }
  if (p === 'walk') {
    const ph = t * Math.PI * 2 * PUPPET.stride
    return {
      ...base,
      bob: PUPPET.bob * Math.abs(Math.sin(ph)), sway: 1.5 * Math.sin(ph),
      armN: PUPPET.armSwing * Math.sin(ph), armF: -PUPPET.armSwing * Math.sin(ph),
      footN: [PUPPET.step * Math.sin(ph), -6 * Math.max(0, Math.cos(ph))],
      footF: [-PUPPET.step * Math.sin(ph), -6 * Math.max(0, -Math.cos(ph))],
    }
  }
  return base
}

function makeView(scene: Scene, spec: PuppetSpec, v: View, name: string, parent: TransformNode) {
  const px = spec.height / (v.feet[1] - 8) // metres per pixel (head top ~8 px)
  // rest grid, in pixels, plus the bone weights per vertex
  const rest: V2[] = [], wN: number[] = [], wF: number[] = [], wH: number[] = [], wFN: number[] = [], wFF: number[] = []
  const uvs: number[] = [], idx: number[] = []
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const p: V2 = [(i / NX) * v.w, (j / NY) * v.h]
    rest.push(p)
    uvs.push(i / NX, 1 - j / NY)
    wN.push(capsuleWeight(p, v.armN[0], v.armN[1], 30))
    wF.push(capsuleWeight(p, v.armF[0], v.armF[1], 30))
    wH.push(Math.max(0, Math.min(1, (v.neck[1] + 12 - p[1]) / 24)))
    const feetBand = Math.max(0, Math.min(1, (p[1] - (v.feet[1] - 70)) / 25))
    wFN.push(feetBand * (p[0] < (v.footN[0] + v.footF[0]) / 2 ? 1 : 0))
    wFF.push(feetBand * (p[0] >= (v.footN[0] + v.footF[0]) / 2 ? 1 : 0))
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    idx.push(a, c, b, b, c, d)
  }
  const mesh = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = new Float32Array(rest.length * 3)
  vd.indices = idx
  vd.uvs = uvs
  vd.normals = new Float32Array(rest.length * 3).fill(0)
  vd.applyToMesh(mesh, true)
  mesh.parent = parent
  mesh.isPickable = false
  mesh.metadata = { noGBuffer: true } // painted art: the stage's post ink must not outline the plane
  const mat = new StandardMaterial(name, scene)
  const tex = new Texture(v.url, scene, false, true)
  tex.hasAlpha = true
  mat.diffuseTexture = tex
  mat.emissiveColor = Color3.White()
  mat.disableLighting = true
  mat.useAlphaFromDiffuseTexture = true
  mat.backFaceCulling = false
  mesh.material = mat
  const pos = new Float32Array(rest.length * 3)
  const deform = (a: Angles) => {
    for (let k = 0; k < rest.length; k++) {
      let p = rest[k]
      // children first: arms, head, feet, then the body carries them
      const pn = rot(p, v.armN[0], -a.armN), pf = rot(p, v.armF[0], -a.armF), ph = rot(p, v.neck, a.head)
      p = [p[0] + (pn[0] - p[0]) * wN[k] + (pf[0] - p[0]) * wF[k] + (ph[0] - p[0]) * wH[k] + a.footN[0] * wFN[k] + a.footF[0] * wFF[k],
        p[1] + (pn[1] - p[1]) * wN[k] + (pf[1] - p[1]) * wF[k] + (ph[1] - p[1]) * wH[k] + a.footN[1] * wFN[k] + a.footF[1] * wFF[k]]
      const keepFeet = Math.max(wFN[k], wFF[k])
      const sw = rot(p, v.feet, a.sway * (1 - keepFeet)) // the body sways over planted feet
      pos[k * 3] = (sw[0] - v.feet[0]) * px
      pos[k * 3 + 1] = (v.feet[1] - sw[1]) * px + a.bob * (1 - keepFeet)
      pos[k * 3 + 2] = 0
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, pos)
  }
  deform({ sway: 0, bob: 0, head: 0, armN: 0, armF: 0, footN: [0, 0], footF: [0, 0] })
  mesh.refreshBoundingInfo()
  return { mesh, deform }
}

/** the same contract as placeFigure: stand on the stage, pick the view from the facing */
export function placePuppet(scene: Scene, p: Puppet, at: Placement, stage?: StageLike) {
  const g = stage ? stage.groundPoint(at.x, at.depth) : new Vector3((at.x - 0.5) * 10, 0, { bg: 70, mid: 22, fg: 7 }[at.depth])
  p.root.position.copyFrom(g)
  const show = (p as Puppet & { show: (v: '34' | 'front', m: boolean) => void }).show
  // the 3/4 art faces screen-right; left = the same art mirrored; front and back use the front view
  if (at.facing === 'left') show('34', true)
  else if (at.facing === 'right') show('34', false)
  else show('front', false)
  void scene
}
