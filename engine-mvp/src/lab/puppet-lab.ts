// Puppet lab: the four painted characters on paper; every pose, view, face, hat and garment colour one click away,
// the motion knobs on sliders, and the guards' verdict. Dev page (puppet-lab.html).
// ?char=boer-vrouw,boer-man&pose=kneel&view=side&expr=happy&mirror=1
import { Color4, Engine, FreeCamera, Scene, Vector3 } from '@babylonjs/core'
import { EMOTION_NAMES, LIFE } from '../figures/face'
import {
  CHARACTERS, POSE_NAMES, PUPPET, VIEWS, createPuppet, type Garment, type Puppet, type PuppetPose, type View,
} from '../figures/puppet'

const q = new URLSearchParams(location.search)
const chars = (q.get('char') ?? Object.keys(CHARACTERS).join(',')).split(',')
const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
const scene = new Scene(engine)
scene.clearColor = new Color4(0.937, 0.914, 0.863, 1)
const camera = new FreeCamera('cam', new Vector3(0, 0.95, -6.2), scene)
camera.setTarget(new Vector3(0, 0.9, 0))
camera.fov = 0.42
camera.attachControl(canvas, true)

const msg = document.getElementById('msg')!
const ui = document.getElementById('ui')!
const puppets: Puppet[] = []
const state = { pose: (q.get('pose') ?? 'stand') as PuppetPose, view: (q.get('view') ?? '34') as View, mirror: q.get('mirror') === '1' }

function verdict(found: string[][]) {
  msg.textContent = puppets.map((p, i) => `${p.character.id}: ${state.pose} ${found[i].length ? 'FAIL ' + found[i].join('; ') : 'guards ok'}`).join(' | ')
}
function apply() {
  const found = puppets.map((p) => { const v = p.setPose(state.pose); p.setView(state.view, state.mirror); return v })
  verdict(found)
}
function row(title: string) {
  const r = document.createElement('div')
  r.className = 'row'
  const t = document.createElement('b')
  t.textContent = title
  t.style.width = '100%'
  r.append(t)
  ui.append(r)
  return r
}
function button(label: string, on: () => void, r: HTMLElement) {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = on
  r.append(b)
}
function slider(label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void) {
  const l = document.createElement('label')
  const out = document.createElement('span')
  const i = document.createElement('input')
  Object.assign(i, { type: 'range', min, max, step, value: String(get()) })
  out.textContent = String(get())
  i.oninput = () => { set(+i.value); out.textContent = i.value; apply() }
  l.append(label, out, i)
  ui.append(l)
}

async function main() {
  for (const [i, id] of chars.entries()) {
    const p = await createPuppet(scene, id)
    p.root.position.x = (i - (chars.length - 1) / 2) * 1.05
    p.setExpression(q.get('expr') ?? 'neutral')
    puppets.push(p)
  }
  const poses = row('pose')
  for (const p of POSE_NAMES) button(p, () => { state.pose = p; apply() }, poses)
  const views = row('view')
  for (const v of VIEWS) button(v === '34' ? '3/4' : v, () => { state.view = v; apply() }, views)
  button('mirror', () => { state.mirror = !state.mirror; apply() }, views)
  const faces = row('emotion')
  for (const e of EMOTION_NAMES) button(e, () => puppets.forEach((p) => p.setEmotion(e)), faces)
  let talking = false
  button('talk', () => { talking = !talking; puppets.forEach((p) => p.setTalking(talking)) }, faces)
  const hats = row('hat')
  button('on', () => puppets.forEach((p) => p.setHat(true)), hats)
  button('off', () => puppets.forEach((p) => p.setHat(false)), hats)
  // garment colours: the teacher can change the colour of clothes (Bart)
  const dyes = row('clothes colour')
  const garments = [...new Set(puppets.flatMap((p) => p.garments()))] as Garment[]
  for (const g of garments) {
    const l = document.createElement('label')
    const c = document.createElement('input')
    c.type = 'color'
    c.value = '#3b5f8a'
    c.oninput = () => puppets.forEach((p) => p.setDye(g, c.value))
    const reset = document.createElement('button')
    reset.textContent = 'x'
    reset.onclick = () => puppets.forEach((p) => p.setDye(g, null))
    l.append(g, c, reset)
    l.style.gridTemplateColumns = '1fr 44px 24px'
    dyes.append(l)
  }
  row('face life')
  slider('life on', 0, 1, 1, () => LIFE.on, (v) => (LIFE.on = v))
  slider('blink min s', 0.5, 6, 0.1, () => LIFE.blinkMin, (v) => (LIFE.blinkMin = v))
  slider('blink max s', 1, 10, 0.1, () => LIFE.blinkMax, (v) => (LIFE.blinkMax = v))
  slider('eye darts px', 0, 4, 0.1, () => LIFE.saccadePx, (v) => (LIFE.saccadePx = v))
  slider('breath amp', 0, 0.03, 0.001, () => LIFE.breathAmp, (v) => (LIFE.breathAmp = v))
  slider('breath Hz', 0.1, 0.6, 0.01, () => LIFE.breathHz, (v) => (LIFE.breathHz = v))
  slider('weight shift deg', 0, 4, 0.1, () => LIFE.shiftDeg, (v) => (LIFE.shiftDeg = v))
  slider('head tilt deg', 0, 5, 0.1, () => LIFE.tiltDeg, (v) => (LIFE.tiltDeg = v))
  slider('emotion ease ms', 100, 400, 10, () => LIFE.emoMs, (v) => (LIFE.emoMs = v))
  slider('face stroke px', 0.8, 3, 0.05, () => LIFE.strokePx, (v) => (LIFE.strokePx = v))
  slider('emotes on', 0, 1, 1, () => LIFE.emotes, (v) => (LIFE.emotes = v))
  row('motion')
  slider('walk hip swing', 0, 40, 1, () => PUPPET.walkHip, (v) => (PUPPET.walkHip = v))
  slider('walk knee lift', 0, 80, 1, () => PUPPET.walkKnee, (v) => (PUPPET.walkKnee = v))
  slider('walk arm swing', 0, 40, 1, () => PUPPET.walkArm, (v) => (PUPPET.walkArm = v))
  slider('walk elbow', 0, 60, 1, () => PUPPET.walkElbow, (v) => (PUPPET.walkElbow = v))
  slider('steps / s', 0.3, 2, 0.05, () => PUPPET.stride, (v) => (PUPPET.stride = v))
  slider('breathing', 0, 5, 0.1, () => PUPPET.breathe, (v) => (PUPPET.breathe = v))
  slider('front: limb toward camera', 0.05, 0.6, 0.01, () => PUPPET.minForeshorten, (v) => (PUPPET.minForeshorten = v))
  slider('front: leg toward camera', 0.02, 0.6, 0.01, () => PUPPET.minForeshortenLeg, (v) => (PUPPET.minForeshortenLeg = v))
  slider('contour px (1080p)', 0, 4, 0.1, () => PUPPET.inkPx, (v) => (PUPPET.inkPx = v))
  slider('saturation', 0.4, 1.3, 0.01, () => PUPPET.saturation, (v) => (PUPPET.saturation = v))
  slider('value', 0.7, 1.3, 0.01, () => PUPPET.value, (v) => (PUPPET.value = v))
  slider('cool', 0, 1, 0.01, () => PUPPET.cool, (v) => (PUPPET.cool = v))
  slider('contact shadow', 0, 2, 0.05, () => PUPPET.contactShadow, (v) => (PUPPET.contactShadow = v))
  slider('cast shadow', 0, 1, 0.05, () => PUPPET.castShadow, (v) => (PUPPET.castShadow = v))
  slider('cast length (heights)', 0.2, 2, 0.05, () => PUPPET.castLength, (v) => (PUPPET.castLength = v))
  slider('head into shoulders m', 0, 0.15, 0.005, () => PUPPET.headSink, (v) => (PUPPET.headSink = v))
  slider('skirt on lap', 0.1, 1, 0.05, () => PUPPET.lapThickness, (v) => (PUPPET.lapThickness = v))
  slider('layer gap m', 0, 0.02, 0.001, () => PUPPET.zStep, (v) => (PUPPET.zStep = v))
  apply()
  ;(window as unknown as Record<string, unknown>).__lab = { scene, puppets, state, apply, camera, LIFE }
}

main().catch((e) => { msg.textContent = String(e); throw e })
engine.runRenderLoop(() => scene.render())
addEventListener('resize', () => engine.resize())
