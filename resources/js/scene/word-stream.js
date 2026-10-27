/**
 * The word stream: a power-meter moment's words appear ONE at a time over the picture, each for a
 * short while (the teacher's `input_options.word_seconds`), then fade. Right and wrong are mixed; a
 * right word nobody ticked comes back later, until the meter is full. A tick on a right word fills
 * the meter (PowerMeter.press); a wrong one only gets the kind shake.
 *
 * Bart 2026-10-18: "words, one by one that appear on the screen, and are limited visible. they have
 * to be ticked to make the wind move faster."
 *
 * The rules are pure (streamTick / streamTicked, with the clock and rand passed in); WordStream is
 * the DOM around them. Every word is teacher text: textContent only.
 */
import { el } from './dom.js'
import { EASE } from '../easing.js'

/** Seconds a word stays up: MomentSpec OPTIONS word_seconds. */
export const WORD_SECONDS = { min: 1, max: 6, fallback: 2.5 }

/**
 * Timing and travel the dev tuner reads and writes (registerStreamTuner): never restated there.
 * gapS: the breath between two words. reducedFactor: with reduced motion a word stays this much
 * longer and does not fly. flyPct: how far a word drifts with the wind while up (stage width %).
 */
export const STREAM = { gapS: 0.5, reducedFactor: 1.6, flyPct: 4, enterMs: 260, exitMs: 220 }

/** Where words may appear, in stage %: over the sea, below the meter bar, above the deck. */
const BAND = { y: [30, 68], left: [10, 40], right: [60, 90] }
const TRIES = 8

/** The teacher's seconds per word, clamped; reduced motion keeps each word up longer. */
export function wordSeconds (raw, reduced = false) {
  const n = Number(raw)
  const s = Number.isFinite(n) && n > 0 ? Math.min(WORD_SECONDS.max, Math.max(WORD_SECONDS.min, n)) : WORD_SECONDS.fallback
  return reduced ? s * STREAM.reducedFactor : s
}

/** @returns {{ deck: object[], current: ?object, nextAt: number, last: ?string, side: number }} */
export function streamStart (now = 0) {
  return { deck: [], current: null, nextAt: now, last: null, side: 0 }
}

/** Words still worth showing: every wrong word, and the right words not counted yet; shuffled. */
export function freshDeck (words, isUsed, rand, last = null) {
  const deck = words.filter(w => !w.right || !isUsed(w))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  // Never the same word twice in a row across a reshuffle.
  if (deck.length > 1 && deck[0].id === last) deck.push(deck.shift())
  return deck
}

/** Is a word worth showing again? Stop once no right word is left to find. */
const needsRight = (words, isUsed) => words.some(w => w.right && !isUsed(w))

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** A spot for the next word: alternate sides, keep clear of the boxes to avoid (stage %). */
export function placeWord (side, rand, avoid = []) {
  const xs = side === 0 ? BAND.left : BAND.right
  let spot = null
  for (let i = 0; i < TRIES; i++) {
    spot = { x: xs[0] + rand() * (xs[1] - xs[0]), y: BAND.y[0] + rand() * (BAND.y[1] - BAND.y[0]) }
    // A word is about 16% wide and 8% tall around its centre.
    const box = { x: spot.x - 8, y: spot.y - 4, w: 16, h: 8 }
    if (!avoid.some(a => overlaps(box, a))) break
  }
  return spot
}

/**
 * One step of the stream at `now` (ms). Returns the next state, the word to show (or null), whether
 * the word that was up should go, and how many ms until something happens next (null: nothing will,
 * the stream has run out).
 *
 * @param {{ now: number, words: object[], isUsed: (w: object) => boolean, seconds: number, rand?: () => number, avoid?: object[] }} io
 */
export function streamTick (state, { now, words, isUsed, seconds, rand = Math.random, avoid = [] }) {
  let s = state
  let hide = false
  if (s.current && now >= s.current.until) {
    s = { ...s, current: null, nextAt: now + STREAM.gapS * 1000 }
    hide = true
  }
  if (s.current) return { state: s, show: null, hide, wait: s.current.until - now }
  if (!needsRight(words, isUsed)) return { state: s, show: null, hide, wait: null }
  if (now < s.nextAt) return { state: s, show: null, hide, wait: s.nextAt - now }

  let deck = s.deck.filter(w => !w.right || !isUsed(w))
  if (!deck.length) deck = freshDeck(words, isUsed, rand, s.last)
  const [word, ...rest] = deck
  const spot = placeWord(s.side, rand, avoid)
  const current = { word, until: now + seconds * 1000, ...spot }
  return {
    state: { ...s, deck: rest, current, last: word.id, side: 1 - s.side },
    show: current,
    hide,
    wait: seconds * 1000,
  }
}

/** A right word was ticked: it goes at once and the next one follows after the gap. */
export function streamTicked (state, now) {
  return { ...state, current: null, nextAt: now + STREAM.gapS * 1000 }
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

let tunerOff = null

/** Bart's dev panel (Test tools, Settings): the stream's timing, read from STREAM itself. */
export function registerStreamTuner () {
  if (tunerOff || typeof window === 'undefined' || !window.__tune?.register) return
  tunerOff = window.__tune.register('Power meter word stream', [
    { key: 'gapS', label: 'gap between words (s)', min: 0, max: 3, step: 0.1 },
    { key: 'reducedFactor', label: 'reduced motion: longer by', min: 1, max: 3, step: 0.1 },
    { key: 'flyPct', label: 'word drifts (stage %)', min: 0, max: 15, step: 0.5 },
    { key: 'enterMs', label: 'word appears (ms)', min: 80, max: 800, step: 20 },
    { key: 'exitMs', label: 'word fades (ms)', min: 80, max: 800, step: 20 },
  ].map(c => ({ ...c, value: STREAM[c.key], apply: (v) => { STREAM[c.key] = Number(v) } })), { tab: 'Lesson' }) ?? null
}

/**
 * The DOM: one word button at a time in `layer` (a full-stage, click-through element). `onPick(word,
 * node)` hands a tick to the meter and returns its result ('right' | 'full' | 'wrong' | ...).
 * `avoid()`: boxes in stage % to keep words off (the reacting ship). Clock, rand and timers are
 * injectable for tests. The default timers are wrapped: a browser's setTimeout called as a method
 * of this object throws "Illegal invocation" (jsdom does not, so only a real browser shows it).
 */
export class WordStream {
  constructor (layer, { words, isUsed, onPick, seconds, avoid = () => [], rand = Math.random, now = () => performance.now(), setTimer = (f, ms) => setTimeout(f, ms), clearTimer = (id) => clearTimeout(id) }) {
    Object.assign(this, { layer, words, isUsed, onPick, avoid, rand, now, setTimer, clearTimer })
    this.reduced = reducedMotion()
    this.seconds = wordSeconds(seconds, this.reduced)
    this.state = streamStart(now())
    this.node = null
    this.timer = null
    this.live = el('p', 'sr-only')
    this.live.setAttribute('aria-live', 'polite')
    layer.appendChild(this.live)
  }

  start () { registerStreamTuner(); this._step() }

  stop () {
    this.clearTimer(this.timer)
    this.timer = null
    this.stopped = true
    this.node?.remove()
    this.node = null
  }

  _step () {
    if (this.stopped) return
    this.clearTimer(this.timer)
    const { state, show, hide, wait } = streamTick(this.state, {
      now: this.now(), words: this.words, isUsed: this.isUsed, seconds: this.seconds, rand: this.rand, avoid: this.avoid(),
    })
    this.state = state
    const hadFocus = !!this.node && this.node === document.activeElement
    if (hide) this._leave(this.node)
    if (show) this._show(show, hadFocus)
    if (wait !== null) this.timer = this.setTimer(() => this._step(), Math.max(16, wait))
  }

  _show (spot, focus) {
    const b = el('button', 'btn shadow-none pointer-events-auto absolute h-auto min-h-0 rounded-full border-2 border-base-content/20 bg-base-100/90 px-5 py-2 font-history text-[clamp(1.5rem,4.2vw,3rem)] font-semibold leading-tight text-base-content hover:border-primary focus-visible:border-primary', spot.word.text)
    b.type = 'button'
    b.dataset.streamWord = spot.word.id
    b.style.left = `${spot.x}%`
    b.style.top = `${spot.y}%`
    // Centred with `transform`, not Tailwind's translate classes: those set the `translate`
    // property, which the drift and the shake animate, and an animation would undo the centring.
    b.style.transform = 'translate(-50%, -50%)'
    b.addEventListener('click', () => this._pick(spot.word, b))
    this.layer.appendChild(b)
    this._keepInside(b, spot)
    this.node = b
    this.live.textContent = spot.word.text
    // A keyboard player keeps the focus on the word that is up.
    if (focus) b.focus({ preventScroll: true })
    if (this.reduced || typeof b.animate !== 'function') return
    b.animate([{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration: STREAM.enterMs, easing: EASE.enter })
    // The word rides the wind while it is up: a small drift, decelerating, never linear.
    const fly = `${(spot.x < 50 ? 1 : -1) * STREAM.flyPct * 0.5}vw`
    b.animate([{ translate: '0 0' }, { translate: `${fly} -0.6vw` }], { duration: this.seconds * 1000, easing: EASE.enter, fill: 'forwards' })
  }

  /** On a narrow stage a long word near the edge would be cut off: keep it, and its drift, inside. */
  _keepInside (b, spot) {
    const stage = this.layer.clientWidth
    const half = b.offsetWidth / 2 + (STREAM.flyPct / 100) * stage
    if (!stage || !b.offsetWidth) return
    const x = Math.min(stage - half - 8, Math.max(half + 8, (spot.x / 100) * stage))
    b.style.left = `${Math.round(x)}px`
  }

  /** The word goes: a short fade (a ticked right word rises as it goes). */
  _leave (node, ticked = false) {
    if (!node) return
    if (node === this.node) this.node = null
    node.disabled = true
    if (this.reduced || typeof node.animate !== 'function') { node.remove(); return }
    const frames = ticked
      ? [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 1.12 }]
      : [{ opacity: 1 }, { opacity: 0 }]
    node.animate(frames, { duration: STREAM.exitMs, easing: EASE.exit, fill: 'forwards' }).finished
      .then(() => node.remove(), () => node.remove())
  }

  _pick (word, node) {
    if (this.stopped || node.disabled) return
    const result = this.onPick(word, node)
    if (result !== 'right' && result !== 'full' && result !== 'finished') return
    node.classList.add('btn-primary', 'border-primary')
    this.state = streamTicked(this.state, this.now())
    this._leave(node, true)
    this._step()
  }
}
