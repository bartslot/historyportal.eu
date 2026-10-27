// Figure lab: the lesson figures on paper, every pose and expression one click away, and the guard verdict.
// Dev page (figure-lab.html). ?char=boer-man,boer-vrouw&pose=carry&expr=happy&view=side|front|three
import { ArcRotateCamera, Color4, DirectionalLight, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core'
import { createFigure, faceHeading, FACE, FACING_TURN_DEG, type Figure } from '../figures/figure'
import { TOON } from '../figures/toon'
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

const VIEWS: Record<string, number> = { front: -Math.PI / 2, three: -Math.PI / 2 - 0.6, side: 0, back: Math.PI / 2 }
const figs: Figure[] = []
const msg = document.getElementById('msg')!
const ui = document.getElementById('ui')!

function verdict() {
  return figs.map((f) => {
    const v = f.setPose(f.pose)
    return `${Object.keys(RECIPES).find((k) => RECIPES[k] === f.recipe)}: ${f.pose} ${v.length ? 'FAIL ' + v.map((x) => `${x.limb} ${x.kind}`).join(', ') : 'guards ok'}`
  }).join(' | ')
}
function setPose(p: Pose) { figs.forEach((f) => f.setPose(p)); msg.textContent = verdict() }
function setExpr(e: Expression) { figs.forEach((f) => f.setExpression(e)) }
function view(name: string) {
  camera.alpha = VIEWS[name] ?? VIEWS.front
  camera.beta = Math.PI / 2 - 0.04
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

async function main() {
  for (const [i, c] of chars.entries()) {
    const f = await createFigure(scene, recipeFor(c), c)
    f.root.position.x = (i - (chars.length - 1) / 2) * 1.1
    faceHeading(f, Math.PI) // facing the camera (front view looks down +z)
    figs.push(f)
  }
  const poses = row('pose'); (['stand', 'walk', 'point', 'kneel', 'carry'] as Pose[]).forEach((p) => button(p, () => setPose(p), poses))
  const exprs = row('expression'); (['neutral', 'happy', 'worried', 'surprised'] as Expression[]).forEach((e) => button(e, () => setExpr(e), exprs))
  const views = row('view'); Object.keys(VIEWS).forEach((v) => button(v, () => view(v), views))
  slider('ink weight', 0, 0.6, 0.01, () => TOON.inkEdge, (v) => (TOON.inkEdge = v))
  slider('shade step', -0.5, 0.8, 0.01, () => TOON.step, (v) => (TOON.step = v))
  slider('face size', 1.5, 4, 0.05, () => FACE.scale, (v) => (FACE.scale = v))
  slider('3/4 turn', 0, 90, 1, () => FACING_TURN_DEG, () => {})
  setPose((q.get('pose') as Pose) ?? 'stand')
  setExpr((q.get('expr') as Expression) ?? 'neutral')
  view(q.get('view') ?? 'front')
  Object.assign(window, { __lab: { scene, camera, figs, setPose, setExpr, view, ready: true } })
}
main().catch((e) => { msg.textContent = String(e?.stack ?? e); throw e })
engine.runRenderLoop(() => scene.render())
addEventListener('resize', () => engine.resize())
