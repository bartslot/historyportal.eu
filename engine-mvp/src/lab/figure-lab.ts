// Figure lab: the lesson figures on paper, every pose and expression one click away, and the guard verdict.
// Dev page (figure-lab.html). ?char=boer-man,boer-vrouw&pose=carry&expr=happy&view=side|front|three
import { ArcRotateCamera, Color4, DirectionalLight, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core'
import { createFigure, faceHeading, FACE, FACING, SKIN, type Figure } from '../figures/figure'
import { TOON } from '../figures/toon'
import '../globals' // the look chain reads Babylon from window.BABYLON
import '../engine/look-shaders.js'
import { createLookChain, PRESETS } from '../engine/look-chain.js'
import { STAGE_LOOK } from '../stage25d/stage'
import { checkPose } from '../figures/pose'
import { STRIDE } from '../figures/clips'
import { RECIPES, recipeFor, type Expression, type Pose } from '../figures/recipes'

const q = new URLSearchParams(location.search)
const chars = (q.get('char') ?? 'boer-man,boer-vrouw,voc-schipper').split(',')
const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
const scene = new Scene(engine)
scene.clearColor = new Color4(0.937, 0.914, 0.863, 1)
const key = new DirectionalLight('key', new Vector3(-0.5, -0.6, 0.6).normalize(), scene) // from upper left, front
key.intensity = 1.6
new HemisphericLight('fill', new Vector3(0, 1, 0), scene).intensity = 0.15
const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2 - 0.04, 6, new Vector3(0, 0.8, 0), scene)
camera.fov = 0.45
camera.minZ = 0.05
camera.wheelDeltaPercentage = 0.01
camera.attachControl(canvas, true)

const VIEWS: Record<string, number> = { face: -Math.PI / 2, front: -Math.PI / 2, three: -Math.PI / 2 - 0.6, side: 0, back: Math.PI / 2 }
const figs: Figure[] = []
const msg = document.getElementById('msg')!
const ui = document.getElementById('ui')!

function verdict() {
  return figs.map((f) => {
    const v = f.setPose(f.pose)
    const name = Object.keys(RECIPES).find((k) => RECIPES[k] === f.recipe)
    // a clip is not one pose: its verdict comes from walkAudit() over every frame (check F10)
    if (f.pose === 'walk') return `${name}: walk (frame guards: __lab.walkAudit())`
    return `${name}: ${f.pose} ${v.length ? 'FAIL ' + v.map((x) => `${x.limb} ${x.kind}`).join(', ') : 'guards ok'}`
  }).join(' | ')
}
function setPose(p: Pose) { figs.forEach((f) => f.setPose(p)); msg.textContent = verdict() }
function setExpr(e: Expression) { figs.forEach((f) => f.setExpression(e)) }
function view(name: string) {
  const face = name === 'face'
  camera.alpha = VIEWS[name] ?? VIEWS.front
  camera.beta = Math.PI / 2 - 0.04
  camera.radius = face ? 0.8 : chars.length > 1 ? 6 : 4.5
  camera.target = new Vector3(face ? figs[0]?.root.position.x ?? 0 : 0, face ? 1.6 : 0.8, 0)
}
function button(label: string, on: () => void, row: HTMLElement) {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = on
  row.append(b)
}
function row(title: string) {
  const r = document.createElement('div')
  r.className = 'row'
  r.title = title
  ui.append(r)
  return r
}
function slider(label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void) {
  const l = document.createElement('label')
  const out = document.createElement('span')
  const i = document.createElement('input')
  Object.assign(i, { type: 'range', min, max, step, value: String(get()) })
  out.textContent = String(get())
  i.oninput = () => { set(Number(i.value)); out.textContent = i.value }
  l.append(label, out, i)
  ui.append(l)
}

/** step the walk clip frame by frame and run the pose guards on every frame */
function walkAudit() {
  return figs.map((f) => {
    const g = f.clip
    if (!g) return 'no clip'
    const bad: string[] = []
    let low = Infinity, high = -Infinity
    for (let fr = g.from; fr <= g.to; fr += 1) {
      g.goToFrame(fr)
      scene.render()
      checkPose(f.rig).forEach((v) => bad.push(`${fr}:${v.limb}:${v.kind}:${v.value.toFixed(3)}`))
      const foot = Math.min(f.rig.node('toeL').getAbsolutePosition().y, f.rig.node('toeR').getAbsolutePosition().y)
      low = Math.min(low, foot); high = Math.max(high, foot)
    }
    return `${Math.round(g.to - g.from + 1)} frames, ${bad.length} violations ${bad.slice(0, 6).join(' ')}; lower toe y ${low.toFixed(3)}..${high.toFixed(3)}`
  }).join(' | ')
}

async function main() {
  for (const [i, c] of chars.entries()) {
    const r = recipeFor(c)
    const f = await createFigure(scene, q.get('hair') ? { ...r, hair: q.get('hair') as typeof r.hair } : r, c)
    f.root.position.x = (i - (chars.length - 1) / 2) * 1.1
    faceHeading(f, Math.PI) // facing the camera (front view looks down +z)
    figs.push(f)
  }
  const poses = row('pose'); (['stand', 'walk', 'point', 'kneel', 'carry'] as Pose[]).forEach((p) => button(p, () => setPose(p), poses))
  const exprs = row('expression'); (['neutral', 'happy', 'worried', 'surprised'] as Expression[]).forEach((e) => button(e, () => setExpr(e), exprs))
  const views = row('view'); Object.keys(VIEWS).forEach((v) => button(v, () => view(v), views))
  // every look value on a slider (Teacher can change everything; the PM's dev-panel rule)
  slider('contour px far (1080p)', 0.5, 4, 0.1, () => TOON.inkPxMin, (v) => (TOON.inkPxMin = v))
  slider('contour px near', 0.5, 6, 0.1, () => TOON.inkPxMax, (v) => (TOON.inkPxMax = v))
  slider('contour px x distance', 2, 60, 1, () => TOON.inkPxAt, (v) => (TOON.inkPxAt = v))
  slider('fold lines', 0, 0.6, 0.01, () => TOON.inkEdge, (v) => (TOON.inkEdge = v))
  slider('contour wobble', 0, 1, 0.01, () => TOON.inkWobble, (v) => (TOON.inkWobble = v))
  slider('contour wobble rhythm', 1, 30, 0.5, () => TOON.inkWobbleScale, (v) => (TOON.inkWobbleScale = v))
  slider('wash (pigment)', 0, 0.3, 0.005, () => TOON.wash, (v) => (TOON.wash = v))
  slider('wash blotch / m', 1, 20, 0.5, () => TOON.washScale, (v) => (TOON.washScale = v))
  slider('wet edge', 0, 1, 0.01, () => TOON.wetEdge, (v) => (TOON.wetEdge = v))
  slider('seam lines', 0, 1, 0.05, () => TOON.seamInk, (v) => (TOON.seamInk = v))
  slider('etching (deep shade)', 0, 1, 0.01, () => TOON.hatch, (v) => (TOON.hatch = v))
  slider('etching depth', 0, 0.8, 0.01, () => TOON.hatchDeep, (v) => (TOON.hatchDeep = v))
  slider('etching lines / m', 10, 150, 1, () => TOON.hatchScale, (v) => (TOON.hatchScale = v))
  slider('shade threshold', -0.5, 0.8, 0.01, () => TOON.step, (v) => (TOON.step = v))
  slider('shade darkness', 0.4, 0.95, 0.01, () => TOON.shadeMul, (v) => (TOON.shadeMul = v))
  slider('shade coolness', 0, 0.1, 0.005, () => TOON.shadeCool.b, (v) => { TOON.shadeCool.b = v; TOON.shadeCool.r = -v * 0.6 })
  slider('paper in the lights', 0, 0.4, 0.01, () => TOON.paperLift, (v) => (TOON.paperLift = v))
  slider('light from (deg)', -90, 90, 1, () => Math.round((Math.atan2(TOON.light.x, -TOON.light.z) * 180) / Math.PI), (v) => {
    const a = (v * Math.PI) / 180
    TOON.light.copyFrom(new Vector3(Math.sin(a) * 0.8, 0.55, -Math.cos(a) * 0.8).normalize())
  })
  slider('skin shade threshold', -1, 0.5, 0.01, () => SKIN.step, (v) => (SKIN.step = v)) // new figures
  slider('face size', 1.5, 4, 0.05, () => FACE.scale, (v) => (FACE.scale = v))
  slider('walk stride (next load)', 0.5, 1, 0.01, () => STRIDE.scale, (v) => (STRIDE.scale = v))
  slider('3/4 turn (deg)', 0, 90, 1, () => FACING.turnDeg, (v) => (FACING.turnDeg = v))
  setPose((q.get('pose') as Pose) ?? 'stand')
  // ?poses=point,carry,stand: one pose per figure (the review shot)
  q.get('poses')?.split(',').forEach((p, i) => figs[i]?.setPose(p as Pose))
  if (q.get('ui') === '0') ui.style.display = 'none'
  setExpr((q.get('expr') as Expression) ?? 'neutral')
  view(q.get('view') ?? 'front')
  Object.assign(window, { __lab: { scene, camera, figs, setPose, setExpr, view, walkAudit, createFigure, recipeFor, TOON, ready: true } })
}
main().catch((e) => { msg.textContent = String(e?.stack ?? e); throw e })
// ?look=stage: the 2.5D stage's own storybook post chain over the figures, as a lesson will show them;
// ?look=<preset name>: any look-chain preset (e.g. Natural colour) for comparisons
const lookName = q.get('look')
if (lookName) {
  const look: Record<string, number | string> = lookName === 'stage' ? STAGE_LOOK : (PRESETS as Record<string, Record<string, number | string>>)[lookName] ?? STAGE_LOOK
  createLookChain(scene, camera, { num: (k: string) => Number(look[k] ?? 0), inkColor: () => String(look.inkColor ?? 'pencil'), texture: () => null })
}
engine.runRenderLoop(() => scene.render())
addEventListener('resize', () => engine.resize())
