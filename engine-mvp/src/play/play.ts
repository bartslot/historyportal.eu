// play.html?lesson=<vault lesson>: one lesson, end to end.
//   lesson.json -> direct() -> S1's stage (playLesson, held on frame 0) -> the stage's own frame 0 becomes
//   the museum painting -> runIntro -> at the handoff the stage plays and LessonSound follows its clock.
// ?intro=0 skips the museum. The Start button is the gesture the browser wants before any sound.
// Interactions (src/interactions) hold the picture at their scene and run a card; the sound sync stands
// aside while a card is up. The page speaks the lesson's language.
import '../studio.css'
import { __, speakLocale } from '../i18n'
import { startInteractions, type Interactions } from '../interactions/mount'
import { direct } from '../director/direct'
import { audit } from '../director/audit'
import type { Lesson as DLesson, Library as DLibrary } from '../director/types'
import { playLesson, type Player } from '../stage25d/stage'
import { libraryUrlFor, loadLibrary } from '../stage25d/library'
import type { Lesson as SLesson } from '../stage25d/types'
import { LessonSound } from '../sound/player'
import { sceneStarts } from '../sound/schedule'
import { runIntro } from '../intro/mount'
import { lessonUrlOf, needsResync } from './route'

const q = new URLSearchParams(location.search)
const canvas = document.getElementById('stage') as HTMLCanvasElement
const startButton = document.getElementById('start') as HTMLButtonElement
const errorBox = document.getElementById('error')!

async function boot() {
  const url = lessonUrlOf(q.get('lesson'))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const lesson = (await res.json()) as DLesson
  await speakLocale(lesson.lang)
  const lib = await loadLibrary(libraryUrlFor({}, lesson))
  const directed = direct(lesson, lib as unknown as DLibrary)
  const problems = audit(directed)
  if (problems.length) console.warn(`play: director notes for ${lesson.id}`, problems)

  const player = await playLesson(directed as unknown as SLesson, undefined, canvas)
  player.pause()
  await player.seek(0, 0)
  const starts = sceneStarts(directed)
  const lessonTime = () => { const s = player.scene(); return starts[s.index] + s.t }

  let sound: LessonSound | null = null
  let cards: Interactions | null = null
  Object.assign(window, { __play: { lesson: directed, problems, player, starts, lessonTime, get sound() { return sound }, get cards() { return cards } } })
  startButton.querySelector('span')!.textContent = __('Start')
  startButton.hidden = false
  startButton.onclick = () => {
    startButton.hidden = true
    sound = new LessonSound(new AudioContext())
    cards = startInteractions(player, sound, directed, document.getElementById('cards')!)
    const go = () => { player.play(); followClock(player, sound!, directed, lessonTime, cards!.isOpen) }
    if (q.get('intro') === '0') { void sound.play(directed, 0); go(); return }
    void runIntro({
      host: document.getElementById('intro-host')!, stage: canvas, lesson: directed, library: lib as unknown as DLibrary,
      sound, capture: () => frameZero(player), onLessonStart: go,
    })
  }
}

/** The stage's own picture of scene 1 at t 0, read right after a render (no preserveDrawingBuffer needed). */
function frameZero(player: Player): Promise<string> {
  return new Promise((ok) => {
    player.stage.engine.onEndFrameObservable.addOnce(() => {
      canvas.toBlob((b) => ok(URL.createObjectURL(b!)), 'image/webp', 0.92)
    })
  })
}

/** Sound follows the picture: the stage's lesson clock leads; a drift (a slow scene build, a seek, a
 *  pause) re-places the sound graph at the stage's time. Only while the audio clock runs. */
function followClock(player: Player, sound: LessonSound, lesson: DLesson, lessonTime: () => number, cardOpen: () => boolean) {
  let lastFix = 0
  const tick = (now: number) => {
    if (cardOpen()) { lastFix = now; requestAnimationFrame(tick); return } // the card owns the sound (held beds)
    const ctxRunning = (sound.ctx as AudioContext).state === 'running'
    const playing = player.scene().playing
    if (!playing && ctxRunning) void sound.pause()
    if (playing && !ctxRunning) void sound.resume()
    if (playing && ctxRunning && now - lastFix > 1000 && needsResync(sound.state().time, lessonTime())) {
      lastFix = now
      void sound.play(lesson, lessonTime())
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

boot().catch((err) => {
  console.error(err)
  errorBox.textContent = 'De les kon niet laden. Laad de pagina opnieuw.'
})
