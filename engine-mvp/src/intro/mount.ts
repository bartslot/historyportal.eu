// Runs the museum intro (the Three.js prototype, built into public/intro/) over the studio stage and
// grows scene 1 out of the painting. See docs/intro-handoff.md.
//
//   1. the painting = scene 1's first frame: the stage's own capture when it gives one, else a 2D
//      composite of scene 1's library layers (paintingLayout)
//   2. the intro plays in an iframe; the museum room bed plays on our graph
//   3. at the dive it freezes and posts the painting's screen rect
//   4. the stage appears inside that rect (0.4 s), scene 1's beds start under it (J-cut), then the rect
//      opens to the full screen (1.3 s, EASE.move) and the lesson clock starts; the iframe goes
import type { Lesson, Library } from '../director/types'
import type { LessonSound } from '../sound/player'
import { INTRO_BED, introPlan, type IntroPlan } from './handoff'

const HANDOFF_TIMEOUT_MS = 25000

export type IntroOptions = {
  host: HTMLElement // covers the stage; the iframe goes in here
  stage: HTMLElement // the studio canvas (or its wrapper), shown through the painting
  lesson: Lesson
  library: Library | null
  sound?: LessonSound
  introUrl?: string
  /** The stage's render of scene 1 at its first camera pose, as an image URL. */
  capture?: () => Promise<string>
  /** Called when lesson time 0 starts: start the stage's timeline here. */
  onLessonStart: () => void
}

/** Scene 1's layers drawn onto a canvas: the painting when the stage has no capture yet. */
export async function composePainting(plan: IntroPlan, width = 1920): Promise<string> {
  const c = document.createElement('canvas')
  c.width = width; c.height = Math.round(width / plan.aspect)
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, c.height)
  sky.addColorStop(0, '#cfd9df'); sky.addColorStop(0.55, '#efe6d2'); sky.addColorStop(1, '#c9b48a')
  g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height)
  for (const l of plan.painting.layers) {
    const img = new Image(); img.src = l.src
    try { await img.decode() } catch { continue } // a missing asset leaves a gap, never an error
    g.drawImage(img, l.x * c.width, l.y * c.height, l.w * c.width, l.h * c.height)
  }
  return await new Promise((ok) => c.toBlob((b) => ok(URL.createObjectURL(b!)), 'image/webp', 0.9))
}

type Rect = { x: number; y: number; w: number; h: number }
const inset = (r: Rect) => `inset(${r.y * 100}% ${(1 - r.x - r.w) * 100}% ${(1 - r.y - r.h) * 100}% ${r.x * 100}%)`

function waitForHandoff(frame: HTMLIFrameElement): Promise<Rect | null> {
  return new Promise((resolve) => {
    const done = (r: Rect | null) => { removeEventListener('message', on); clearTimeout(timer); resolve(r) }
    const on = (e: MessageEvent) => {
      if (e.source === frame.contentWindow && e.origin === location.origin && e.data?.type === 'hp-intro:handoff') done(e.data.rect)
    }
    const timer = setTimeout(() => done(null), HANDOFF_TIMEOUT_MS) // intro broke: go straight to the lesson
    addEventListener('message', on)
  })
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function runIntro(o: IntroOptions): Promise<void> {
  const plan = introPlan(o.lesson, o.library)
  const painting = o.capture ? await o.capture() : await composePainting(plan)
  const q = new URLSearchParams({ handoff: '1', aspect: String(plan.aspect), painting, lang: o.lesson.lang })
  const frame = document.createElement('iframe')
  frame.src = `${o.introUrl ?? '/intro/index.html'}?${q}`
  frame.title = 'intro'
  Object.assign(frame.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', border: '0' })
  o.host.appendChild(frame)
  Object.assign(o.stage.style, { opacity: '0', clipPath: inset({ x: 0.5, y: 0.5, w: 0, h: 0 }) })
  o.sound?.bedOn(INTRO_BED)

  const rect = await waitForHandoff(frame)
  const from = rect ?? { x: 0, y: 0, w: 1, h: 1 }
  o.stage.style.clipPath = inset(from)
  o.sound?.play(o.lesson, -plan.preroll_s) // scene 1's place is heard before we go in
  o.sound?.bedOff(INTRO_BED, plan.preroll_s + plan.grow_s)
  await o.stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: plan.fade_in_s * 1000, easing: 'cubic-bezier(0.333, 1, 0.667, 1)', fill: 'forwards' }).finished
  await wait(Math.max(0, plan.preroll_s - plan.fade_in_s) * 1000)
  o.onLessonStart()
  await o.stage.animate([{ clipPath: inset(from) }, { clipPath: inset({ x: 0, y: 0, w: 1, h: 1 }) }], { duration: plan.grow_s * 1000, easing: plan.grow_ease, fill: 'forwards' }).finished
  Object.assign(o.stage.style, { opacity: '1', clipPath: 'none' })
  o.stage.getAnimations().forEach((a) => a.cancel())
  frame.remove()
  if (painting.startsWith('blob:')) URL.revokeObjectURL(painting)
}
