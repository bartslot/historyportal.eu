// Face lab: one actor, close up, with every anime-look number on a slider. Dev page (face-lab.html).
import {
  ArcRotateCamera, Axis, Color4, DirectionalLight, Engine, ImportMeshAsync, Quaternion, Scene, Vector3,
  type AbstractMesh, type MorphTarget,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { animeShadows, applyAnimeLook, readMToon, DEFAULTS, type AnimeHandle, type AnimeSettings } from '../engine/anime-look'
import { animeCastShadows } from '../engine/anime-cast'

const MODEL = new URLSearchParams(location.search).get('model') ?? 'assets/models/anime-sample.vrm'
const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
const scene = new Scene(engine)
scene.clearColor = new Color4(0.937, 0.914, 0.863, 1)
const key = new DirectionalLight('key', new Vector3(0, -0.5, -1), scene) // the one light the cel step reads
key.position = new Vector3(0, 3, 3)
const camera = new ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2, 0.6, new Vector3(0, 1.4, 0), scene)
camera.fov = 0.5
camera.minZ = 0.01
camera.wheelDeltaPercentage = 0.01
camera.attachControl(canvas, true)

const VIEWS: Record<string, [number, number, number, number]> = { // alpha, beta, radius, target y
  face: [Math.PI / 2, Math.PI / 2, 0.55, 1.4],
  three_quarter: [Math.PI / 2 + 0.6, Math.PI / 2 - 0.05, 0.55, 1.4],
  profile: [Math.PI / 2 + 1.45, Math.PI / 2, 0.55, 1.4],
  bust: [Math.PI / 2 + 0.35, Math.PI / 2 - 0.05, 1.3, 1.25],
  full: [Math.PI / 2 + 0.35, Math.PI / 2 - 0.05, 3.6, 0.85],
}
function view(name: string, headY: number) {
  const [a, b, r, y] = VIEWS[name]
  camera.target = new Vector3(0, name === 'full' ? y : headY - (1.4 - y), 0) // first: setting a target keeps the old position
  camera.alpha = a; camera.beta = b; camera.radius = r
}

const settings: AnimeSettings = { ...DEFAULTS }
let lightYaw = -25, lightPitch = 30
function aimLight() {
  const y = (lightYaw * Math.PI) / 180, p = (lightPitch * Math.PI) / 180
  // direction the light travels: from the front (the face looks along +z) toward -z, tilted down
  key.direction = new Vector3(-Math.sin(y) * Math.cos(p), -Math.sin(p), -Math.cos(y) * Math.cos(p)).normalize()
}
aimLight()

const msg = document.getElementById('msg')!
async function main() {
  const mtoon = await readMToon(MODEL)
  const result = await ImportMeshAsync(MODEL, scene, { pluginExtension: '.glb' })
  result.animationGroups.forEach((g) => g.stop())
  const look = applyAnimeLook(result.meshes, scene, mtoon, settings)
  animeShadows(key, [...result.meshes, ...look.hulls])
  animeCastShadows(look, result.meshes, key, camera, scene)
  const headY = headHeight(result.meshes)
  view('face', headY)
  const arms = armPose()
  arms(70)
  buildUi(look, headY, morphs(result.meshes), arms)
  msg.textContent = `${result.meshes.length} meshes, ${look.hulls.length} ink hulls, mtoon materials: ${mtoon.size}`
  Object.assign(window, { __lab: { scene, camera, settings, look, view: (n: string) => view(n, headY) } })
}

// VRM rests in a T-pose; lower both upper arms (degrees) so the bust is not a scarecrow
let armDeg = 70
function armPose() {
  // the sleeve hangs on VRoid's aim/twist helpers, siblings of the arm that VRM constraints would
  // aim at it; Babylon does not run VRM constraints, so they turn with the arm by hand
  const NAMES = ['J_Bip_?_UpperArm', 'J_Aim_?_TopsUpperArm', 'J_Aim_?_Shoulder']
  const bones = (['L', 'R'] as const).flatMap((side) => NAMES.map((n) => {
    const node = scene.getTransformNodeByName(n.replace('?', side))
    return node ? { node, rest: (node.rotationQuaternion ?? Quaternion.Identity()).clone(), sign: side === 'L' ? -1 : 1 } : null
  })).filter((b) => b !== null)
  return (deg: number) => {
    armDeg = deg
    bones.forEach((b) => { b.node.rotationQuaternion = Quaternion.RotationAxis(Axis.Z, (b.sign * deg * Math.PI) / 180).multiply(b.rest) })
  }
}

function headHeight(meshes: AbstractMesh[]) {
  const face = meshes.find((m) => m.material?.name.startsWith('Face_00_SKIN')) ?? meshes.find((m) => /face/i.test(m.name))
  if (!face) return 1.4
  face.computeWorldMatrix(true)
  const b = face.getBoundingInfo().boundingBox
  return (b.minimumWorld.y + b.maximumWorld.y) / 2
}

function morphs(meshes: AbstractMesh[]): MorphTarget[] {
  const out: MorphTarget[] = []
  meshes.forEach((m) => {
    const mgr = m.morphTargetManager
    if (mgr) for (let i = 0; i < mgr.numTargets; i++) out.push(mgr.getTarget(i))
  })
  return out
}

function buildUi(look: AnimeHandle, headY: number, targets: MorphTarget[], arms: (deg: number) => void) {
  const ui = document.getElementById('ui')!
  const slider = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void) => {
    const l = document.createElement('label')
    const out = document.createElement('output')
    const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: String(get()) })
    out.textContent = String(get())
    input.oninput = () => { set(Number(input.value)); out.textContent = input.value }
    input.dataset.key = label
    l.append(label, out, input)
    ui.append(l)
  }
  slider('Ink width px', 0, 6, 0.1, () => settings.outlinePx, (v) => { settings.outlinePx = v })
  slider('Toony +', -0.9, 0.09, 0.01, () => settings.toonyBoost, (v) => { settings.toonyBoost = v })
  slider('Shade shift +', -1, 1, 0.01, () => settings.shiftBoost, (v) => { settings.shiftBoost = v })
  slider('Shade colour', 0, 1, 0.01, () => settings.shadeMix, (v) => { settings.shadeMix = v })
  slider('Rim', 0, 1, 0.01, () => settings.rim, (v) => { settings.rim = v })
  slider('Cast shadow px', 0, 40, 0.5, () => settings.castPx, (v) => { settings.castPx = v })
  slider('Cast strength', 0, 1, 0.01, () => settings.castStrength, (v) => { settings.castStrength = v })
  slider('Face sphere', 0, 1, 0.01, () => settings.faceSphere, (v) => look.setFaceSphere(v))
  slider('Arms down', 0, 85, 1, () => armDeg, arms)
  slider('Light yaw', -90, 90, 1, () => lightYaw, (v) => { lightYaw = v; aimLight() })
  slider('Light pitch', -30, 80, 1, () => lightPitch, (v) => { lightPitch = v; aimLight() })
  // expressions: the model's own blend shapes (blink, smile...), if it has any
  const expr = targets.filter((t) => /blink|joy|fun|angry|sorrow|surprised|a$|i$|u$|e$|o$/i.test(t.name)).slice(0, 12)
  expr.forEach((t) => slider(t.name.replace(/^.*Fcl_/, ''), 0, 1, 0.01, () => t.influence, (v) => { t.influence = v }))
  const row = document.createElement('div')
  row.className = 'row'
  Object.keys(VIEWS).forEach((name) => {
    const b = Object.assign(document.createElement('button'), { textContent: name.replace('_', ' ') })
    b.onclick = () => view(name, headY)
    row.append(b)
  })
  let on = true
  const ink = Object.assign(document.createElement('button'), { textContent: 'ink on/off' })
  ink.onclick = () => { on = !on; look.setOutline(on) }
  row.append(ink)
  ui.append(row)
}

main().catch((err) => { msg.textContent = 'Could not load: ' + (err instanceof Error ? err.message : String(err)); throw err })
engine.runRenderLoop(() => scene.render())
addEventListener('resize', () => engine.resize())
