// director-lab.html: a 2D parallax stand-in for the 2.5D stage, so the director's proposal can be
// watched (and the sound graph inspected) before S1's stage plays it. Not the teacher UI.
//   ?lesson=<url>&library=<url>  a real lesson.json / library.json instead of the fixture
import { EASING } from '@hp/easing.js'
import { direct } from './direct'
import { audit } from './audit'
import { DEPTH_Z, visibleWidth } from './camera'
import { LESSON, LIBRARY } from './fixture'
import { sceneStarts } from '../sound/schedule'
import { LessonSound } from '../sound/player'
import { runIntro } from '../intro/mount'
import type { CamPose, Camera, Lesson, Library, Scene } from './types'

const q = new URLSearchParams(location.search)
const load = async <T,>(url: string | null, fallback: T): Promise<T> => (url ? (await fetch(url)).json() : fallback)
const lesson: Lesson = await load(q.get('lesson'), LESSON)
const library: Library = await load(q.get('library'), LIBRARY)
const directed = direct(lesson, library)
const starts = sceneStarts(directed)
const total = starts.at(-1)! + (directed.scenes.at(-1)!.dur_s ?? 0)

const canvas = document.getElementById('stage') as HTMLCanvasElement
const g = canvas.getContext('2d')!
const panel = document.getElementById('panel')!
const ease = (name: string) => (EASING as Record<string, (x: number) => number>)[name] ?? ((x: number) => x)
const mix = (a: number, b: number, u: number) => a + (b - a) * u

function poseAt(scene: Scene, t: number): CamPose {
  const shots = [scene.camera, ...(scene.camera_more ?? [])].filter(Boolean) as Camera[]
  const c = [...shots].reverse().find((s) => (s.at_s ?? 0) <= t) ?? shots[0]
  const u = ease(c.ease)(Math.min(1, Math.max(0, (t - (c.at_s ?? 0)) / c.dur_s)))
  const tx = mix(c.from.target?.x ?? c.from.x, c.to.target?.x ?? c.to.x, u)
  const ty = mix(c.from.target?.y ?? 1.2, c.to.target?.y ?? 1.2, u)
  return { x: mix(c.from.x, c.to.x, u), y: mix(c.from.y, c.to.y, u), z: mix(c.from.z, c.to.z, u), fov: mix(c.from.fov, c.to.fov, u), target: { x: tx, y: ty, z: 0 } }
}

const SHADE: Record<string, string> = { sky: '#cfd9df', bg: '#9fae9a', mid: '#7d8a63', fg: '#4f5a3a' }
const sample = (scene: Scene, target: string, prop: string, t: number, base: number) => {
  const tr = scene.motion?.find((m) => m.target === target && m.property === prop)
  if (!tr) return base
  const k = tr.keyframes
  const i = k.findIndex((x) => x.time > t)
  if (i <= 0) return i === 0 ? k[0].value : k.at(-1)!.value
  return mix(k[i - 1].value, k[i].value, ease(k[i - 1].easing ?? 'easeInOutCubic')((t - k[i - 1].time) / (k[i].time - k[i - 1].time)))
}

/** Project a point at scene x (0..1), height (m) and depth through the camera, into canvas pixels. */
function draw(scene: Scene, t: number) {
  const W = canvas.width, H = canvas.height
  const cam = poseAt(scene, t)
  const pan = (cam.target!.x - cam.x) * 0.15 // a pan reads as a sideways sweep in 2D
  const tilt = (cam.target!.y - 1.2) * 0.04
  g.fillStyle = SHADE.sky; g.fillRect(0, 0, W, H)
  const project = (xFrac: number, yM: number, z: number) => {
    const d = Math.max(0.5, z - cam.z)
    const vw = visibleWidth(d, cam.fov), vh = vw * 9 / 16
    const wx = (xFrac - 0.5) * visibleWidth(z)
    return { x: W / 2 + ((wx - cam.x) / vw - pan * (DEPTH_Z.mid / d)) * W, y: H / 2 + ((cam.y - yM) / vh + tilt * (DEPTH_Z.mid / d)) * H, s: H / vh }
  }
  const items = [
    ...scene.set.layers.map((l, i) => ({ z: DEPTH_Z[l.depth], kind: 'layer' as const, l, i })),
    ...(scene.figures ?? []).map((f, i) => ({ z: DEPTH_Z[f.depth ?? 'mid'] - 0.1, kind: 'fig' as const, f, i })),
  ].sort((a, b) => b.z - a.z)
  for (const it of items.filter((x) => x.z - cam.z > 0.3)) { // passed through: behind the camera
    if (it.kind === 'layer') {
      const { l, i } = it
      const x = sample(scene, `layer:${i}`, 'x', t, l.x ?? 0.5)
      const rot = sample(scene, `layer:${i}`, 'rot', t, 0)
      const p = project(x, 0, it.z)
      const h = (l.depth === 'bg' ? 25 : l.depth === 'mid' ? 4 : 5) * p.s, w = l.depth === 'bg' ? W * 3 : h * (l.depth === 'fg' ? 0.2 : 0.8)
      g.save(); g.translate(p.x, p.y); g.rotate((rot * Math.PI) / 180)
      g.fillStyle = SHADE[l.depth]; g.fillRect(-w / 2, -h, w, h)
      g.fillStyle = '#1c1418'; g.font = `${Math.max(11, h * 0.06)}px system-ui`; g.fillText(l.need ?? l.asset ?? '', -w / 2 + 6, -h + 18)
      g.restore()
    } else {
      const { f, i } = it
      const p = project(sample(scene, `figure:${i}`, 'x', t, f.x ?? 0.5), 0, it.z)
      const h = 1.75 * p.s, bob = sample(scene, `figure:${i}`, 'y', t, 0) * H
      g.fillStyle = '#1c1418'; g.fillRect(p.x - h * 0.12, p.y - h + bob, h * 0.24, h)
      g.font = '12px system-ui'; g.fillText(`${f.char} (${f.pose})`, p.x - 30, p.y - h - 6 + bob)
    }
  }
  const b = scene.balloons?.find((x) => t >= (x.at_s ?? 0) && t < (x.at_s ?? 0) + (x.dur_s ?? 0))
  if (b) { g.fillStyle = '#fff'; g.fillRect(W * 0.55, H * 0.08, W * 0.4, 48); g.fillStyle = '#1c1418'; g.font = '20px system-ui'; g.fillText(b.text, W * 0.57, H * 0.08 + 31) }
  const silent = scene.sound?.silence && t < scene.sound.silence.at_s + scene.sound.silence.dur_s
  g.fillStyle = '#1c1418cc'; g.fillRect(0, H - 34, W, 34); g.fillStyle = '#fff'; g.font = '14px system-ui'
  const c = [scene.camera, ...(scene.camera_more ?? [])].filter(Boolean).reverse().find((s) => (s!.at_s ?? 0) <= t)!
  g.fillText(`${scene.id} ${scene.beat}  ${c.move}${c.native ? ' (native)' : ''} ${c.ease}  t=${t.toFixed(1)}/${scene.dur_s}s${silent ? '  SILENCE' : ''}  ${scene.narration.slice(0, 80)}`, 12, H - 12)
}

let sound: LessonSound | null = null
let t0 = 0, playing = false, at = 0
function frame(now: number) {
  if (playing) at = Math.min(total, Math.max(0, (now - t0) / 1000)) // rAF time can trail performance.now()
  const i = Math.max(0, starts.filter((s) => s <= at).length - 1)
  draw(directed.scenes[i], at - starts[i])
  ;(document.getElementById('state') as HTMLElement).textContent = JSON.stringify(sound?.state() ?? { sound: 'not started' }, null, 1)
  requestAnimationFrame(frame)
}

const ensureSound = () => (sound ??= new LessonSound(new AudioContext()))
const play = (from = 0) => { ensureSound().play(directed, from); t0 = performance.now() - from * 1000; at = from; playing = true }
document.getElementById('play')!.onclick = () => play(0)
document.getElementById('pause')!.onclick = () => { playing = false; sound?.pause() }
document.getElementById('mute')!.onclick = (e) => { const s = ensureSound(); const m = !s.state().muted; s.setMuted(m); (e.target as HTMLElement).textContent = m ? 'Unmute' : 'Mute' }
document.getElementById('intro')!.onclick = () => {
  const s = ensureSound(); playing = false; at = 0
  // the painting = scene 1's frame 0, rendered by the stage itself: what S1's stage passes as `capture`
  const capture = () => { draw(directed.scenes[0], 0); return new Promise<string>((ok) => canvas.toBlob((b) => ok(URL.createObjectURL(b!)), 'image/webp', 0.92)) }
  runIntro({ host: document.getElementById('intro-host')!, stage: canvas, lesson: directed, library, sound: s, capture, onLessonStart: () => { t0 = performance.now(); playing = true } })
}

const problems = audit(directed)
panel.innerHTML = `<b>${directed.id}</b> ${total.toFixed(1)} s, audit: ${problems.length ? problems.join('; ') : 'all rules pass'}<table>${directed.scenes.map((s, i) =>
  `<tr><td>${s.id}</td><td>${s.beat}</td><td>${[s.camera, ...(s.camera_more ?? [])].map((c) => c!.move + (c!.native ? '*' : '')).join(' + ')}</td><td>${s.dur_s}s</td><td>${s.sound?.ambience.map((a) => a.id).join(' + ')}</td><td>${s.sound?.lead_in_s ? 'J' : ''}${s.sound?.tail_s ? 'L' : ''}${s.sound?.silence ? ' sil' : ''}</td><td><button data-i="${i}">play</button></td></tr>`).join('')}</table>`
panel.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((b) => { b.onclick = () => play(starts[+b.dataset.i!]) })

Object.assign(window, { __lab: { lesson: directed, problems, get sound() { return sound }, starts, LessonSound } })
requestAnimationFrame(frame)
