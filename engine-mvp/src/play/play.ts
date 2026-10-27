// play.html?lesson=<vault lesson id or path>: one lesson, end to end (default: hunebedden).
//   lesson.json -> direct() -> S1's stage (playLesson, held on frame 0) -> the stage's own frame 0 becomes
//   the museum painting -> runIntro -> at the handoff the stage plays; LessonSound (ambience, sfx and the
//   narrator's recorded lines) follows the stage's lesson clock.
// Interactions hold the picture and open a card (src/interactions). Balloons are timed silent layers;
// captions of the narrator are opt-in (a toggle, off by default). ?intro=0 skips the museum. The Start
// button is the gesture the browser wants before any sound. The page speaks the lesson's language.
import '../studio.css'
import { __, speakLocale } from '../i18n'
import { direct } from '../director/direct'
import { audit } from '../director/audit'
import type { Lesson as DLesson, Library as DLibrary } from '../director/types'
import { playLesson, type Player } from '../stage25d/stage'
import { libraryUrlFor, loadLibrary } from '../stage25d/library'
import type { Lesson as SLesson } from '../stage25d/types'
import { LessonSound } from '../sound/player'
import { runIntro } from '../intro/mount'
import { startInteractions, type Interactions } from '../interactions/mount'
import { lessonUrlOf, syncAction, voiceUrl } from './route'
import { drawStory, storyAt } from './story'

const q = new URLSearchParams(location.search)
const canvas = document.getElementById('stage') as HTMLCanvasElement
const startButton = document.getElementById('start') as HTMLButtonElement
const captionsButton = document.getElementById('captions') as HTMLButtonElement
const storyHost = document.getElementById('story')!
const errorBox = document.getElementById('error')!
const CAPTIONS_KEY = 'play.captions' // a viewer convenience, remembered in this browser only

async function boot() {
  const url = lessonUrlOf(q.get('lesson'))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const raw = (await res.json()) as DLesson
  await speakLocale(raw.lang)
  // the narrator's recorded line per scene (S4: scene.tts_file, relative to the lesson folder)
  const lesson: DLesson = { ...raw, scenes: raw.scenes.map((s) => ({ ...s, tts_url: voiceUrl(url, s.tts_file) })) }
  const lib = await loadLibrary(libraryUrlFor({}, lesson))
  const directed = direct(lesson, lib as unknown as DLibrary)
  const problems = audit(directed)
  if (problems.length) console.warn(`play: director notes for ${lesson.id}`, problems)

  const player = await playLesson(directed as unknown as SLesson, undefined, canvas)
  player.pause()
  await player.seek(0, 0)

  let sound: LessonSound | null = null
  let cards: Interactions | null = null
  let captions = false
  try { captions = localStorage.getItem(CAPTIONS_KEY) === '1' } catch { /* private window: off */ }
  const showCaptions = () => {
    captionsButton.setAttribute('aria-pressed', String(captions))
    captionsButton.textContent = __('Captions')
  }
  captionsButton.onclick = () => {
    captions = !captions
    try { localStorage.setItem(CAPTIONS_KEY, captions ? '1' : '0') } catch { /* this visit only */ }
    showCaptions()
  }
  showCaptions()
  Object.assign(window, { __play: { lesson: directed, problems, player, get sound() { return sound }, get cards() { return cards } } })

  startButton.querySelector('span')!.textContent = __('Start')
  startButton.hidden = false
  startButton.onclick = () => {
    startButton.hidden = true
    captionsButton.hidden = false
    sound = new LessonSound(new AudioContext())
    cards = startInteractions(player, sound, directed, document.getElementById('cards')!)
    follow(player, sound, directed, cards, () => captions)
    const go = () => player.resume()
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

/** Every frame: the sound follows the stage's lesson clock (syncAction), and the story layer shows the
 *  balloons (and the caption, when on) of the scene on screen, hidden while a card is up. */
function follow(player: Player, sound: LessonSound, lesson: DLesson, cards: Interactions, captionsOn: () => boolean) {
  let lastFix = 0
  const tick = (now: number) => {
    const { index, t, mode } = player.scene()
    const ctxRunning = (sound.ctx as AudioContext).state === 'running'
    const action = syncAction({ mode, cardOpen: cards.isOpen(), ctxRunning, soundTime: sound.state().time, clock: player.clock(), msSinceFix: now - lastFix })
    if (action === 'suspend') void sound.pause()
    if (action === 'resume') void sound.resume()
    if (action === 'resync') { lastFix = now; void sound.play(lesson, player.clock()) }
    const frame = cards.isOpen() ? null : storyAt(lesson.scenes[index], t)
    drawStory(storyHost, frame && { ...frame, caption: captionsOn() ? frame.caption : null })
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

boot().catch((err) => {
  console.error(err)
  errorBox.textContent = __('The lesson could not load. Reload the page to try again.')
})
