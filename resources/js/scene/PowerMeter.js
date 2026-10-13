/**
 * PowerMeter — a power-meter moment on a story panel (scene config.moment; the shape is
 * App\Services\Lessons\MomentSpec).
 *
 * The story is stuck (no wind, the anchor down, the bridge up). The panel stays on screen; over it
 * sit a meter, the instruction line and big word buttons. In CLASS mode the class shouts and the
 * teacher (or a pupil at the board) taps the word; in SOLO mode the pupil taps it. A right word fills
 * the meter one step and the world reacts (onReact); a wrong word gets a small kind shake and costs
 * nothing. A full meter, or Skip, hands back to the player (onDone), which plays the payoff and the
 * narrator's after line.
 *
 * Teams (class mode only, per team of 3-4, never per child): one shared meter the teams fill in turn,
 * or a meter per team (the teacher's choice, `team_meter`). The teacher can always tap another team
 * to give it the turn. No timer unless the teacher set one, and time up never moves the class on.
 *
 * Inputs: "words" (tap the word the class shouts), or sound through the microphone: "loudness"
 * (the class cheers), "blow" (blowing, told from talking by how broadband it is) and "silence" (keep
 * still for a few seconds). Sound is a group action: it fills one shared meter, never a team's or a
 * child's. The mic is asked for only when the moment opens, the room is measured first, and it is
 * all local (meter-inputs/mic.js). Tap and Skip always stay: no mic, no permission or a pupil who
 * cannot blow never blocks the lesson. Rhythm, pitch and motion come later and play as words.
 *
 * Every string is teacher or spec text = untrusted, so it goes through textContent (el()), never
 * innerHTML. Interface words come from t() (JsTranslations). The rules are pure functions; vitest
 * covers them.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { formatClock } from './chapter-timeline.js'
import { teamNames, clampTeams } from './TeamGame.js'
import { applyAmbient } from './ambient.js'
import { MIC_INPUTS, soundStep, registerSoundTuner } from './meter-inputs/sound.js'
import { placeCard } from './card-place.js'

/** How long a full meter stays on screen before the payoff, and a gust of the react layer. */
const FULL_HOLD_MS = 700
const GUST_MS = 1400

/** A silent line's reading time, as SceneDialogue::readingTime (a twelve-year-old reading it). */
const READ_WPS = 2.2
const MIN_READ_S = 1.8

// ── Rules (pure) ─────────────────────────────────────────────────────────────────────────────

/** A path on this site, or ''. A backslash counts as a slash to a browser, so it is refused too. */
export function sitePath (url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') ? url : ''
}

/** Steps a sound meter may have when it has no words to count (MomentSpec::RIGHT_MAX). */
const SOUND_GOAL_MAX = 8

/** The moment as the engine reads it: lists are lists, numbers are clamped, nothing is trusted. */
export function readMoment (raw = {}) {
  const words = (v) => (Array.isArray(v) ? v : []).map(w => String(w ?? '').trim()).filter(Boolean)
  const right = words(raw.words?.right)
  const teams = Number(raw.teams) || 0
  const input = MIC_INPUTS.includes(raw.input) ? raw.input : 'words'
  const options = raw.input_options && typeof raw.input_options === 'object' ? raw.input_options : {}
  const goalMax = input === 'words' ? (right.length || 1) : SOUND_GOAL_MAX
  return {
    enabled: raw.enabled !== false && (right.length > 0 || input !== 'words'),
    input,
    threshold: Math.max(0.05, Math.min(1, Number(options.threshold) || 0.4)),
    holdSeconds: Math.max(1, Math.min(30, Number(options.hold_seconds) || 5)),
    name: String(raw.name || ''),
    meterLabel: String(raw.meter_label || ''),
    prompt: String(raw.prompt || ''),
    right,
    wrong: words(raw.words?.wrong),
    goal: Math.max(1, Math.min(goalMax, Math.round(Number(raw.goal) || right.length || 4))),
    after: String(raw.after || ''),
    afterAudio: sitePath(raw.after_audio),
    at: Number.isFinite(Number(raw.at)) && raw.at !== 'end' && raw.at !== null && raw.at !== '' ? Math.max(0, Number(raw.at)) : 'end',
    seconds: Math.max(0, Math.min(300, Number(raw.seconds) || 0)),
    teams: teams >= 2 ? clampTeams(teams) : 0,
    teamMeter: raw.team_meter === 'each' ? 'each' : 'shared',
    react: raw.react && typeof raw.react === 'object' ? raw.react : {},
    payoff: raw.payoff && typeof raw.payoff === 'object' ? raw.payoff : { type: 'none' },
  }
}

/** How long a written line stays up when there is no recording of it. */
export function readingMs (text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length
  return Math.round(Math.max(MIN_READ_S, words / READ_WPS) * 1000)
}

/** Right and wrong words as buttons, shuffled once per play (rand is injectable for tests). */
export function wordButtons (cfg, rand = Math.random) {
  const list = [
    ...cfg.right.map((text, i) => ({ id: `r${i}`, text, right: true })),
    ...cfg.wrong.map((text, i) => ({ id: `w${i}`, text, right: false })),
  ]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** How many meters fill: one, or one per team when the teacher chose a meter per team. */
export function meterCount (cfg, teamCount) {
  return teamCount >= 2 && cfg.teamMeter === 'each' ? teamCount : 1
}

/** @returns {{ fills: number[], used: string[][], turn: number, teams: number, done: boolean, winner: ?number }} */
export function startState (cfg, teamCount = 0) {
  const meters = meterCount(cfg, teamCount)
  return { fills: Array(meters).fill(0), used: Array.from({ length: meters }, () => []), turn: 0, teams: teamCount, done: false, winner: null }
}

/**
 * A tap on a word. Returns the next state (never the same object changed) and what happened:
 * 'right' (the meter rose), 'full' (and that filled it), 'wrong' (a shake, no change but the turn),
 * 'used' (already counted for this meter) or 'done' (the moment is over).
 */
export function press (state, cfg, word) {
  if (state.done) return { state, result: 'done' }
  const meter = state.fills.length > 1 ? state.turn : 0
  const nextTurn = state.teams >= 2 ? (state.turn + 1) % state.teams : 0
  if (!word.right) return { state: { ...state, turn: nextTurn }, result: 'wrong' }
  if (state.used[meter].includes(word.id)) return { state, result: 'used' }

  const fills = state.fills.map((f, i) => (i === meter ? f + 1 : f))
  const used = state.used.map((u, i) => (i === meter ? [...u, word.id] : u))
  const full = fills[meter] >= cfg.goal
  return {
    state: { ...state, fills, used, turn: full ? state.turn : nextTurn, done: full, winner: full ? meter : null },
    result: full ? 'full' : 'right',
  }
}

/**
 * Sound fills the meter by an amount (fractions of a step). Returns the next state, how many whole
 * steps it crossed (each one a gust on the panel) and whether that filled it.
 */
export function push (state, cfg, amount) {
  if (state.done || !(amount > 0)) return { state, crossed: 0, full: false }
  const before = state.fills[0]
  const after = Math.min(cfg.goal, before + amount)
  const full = after >= cfg.goal
  return {
    state: { ...state, fills: [after, ...state.fills.slice(1)], done: full, winner: full ? 0 : null },
    crossed: Math.floor(after) - Math.floor(before),
    full,
  }
}

/** A noise during a silence moment: back to the last whole step below, never lower. */
export function knockBack (state) {
  if (state.done) return state
  return { ...state, fills: [Math.max(0, Math.ceil(state.fills[0]) - 1), ...state.fills.slice(1)] }
}

/** The teacher gives the turn to another team. */
export function giveTurn (state, team) {
  return state.teams >= 2 && team >= 0 && team < state.teams ? { ...state, turn: team } : state
}

/** 0..1 for one meter. */
export function level (state, cfg, meter = 0) {
  return Math.min(1, (state.fills[meter] ?? 0) / cfg.goal)
}

/** Whether a word button shows as counted, for the meter whose turn it is. */
export function isUsed (state, word) {
  const meter = state.fills.length > 1 ? state.turn : 0
  return state.used[meter].includes(word.id)
}

// ── World (the panel reacts) ─────────────────────────────────────────────────────────────────

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** The ambient wrapper of a figure layer in the player (ArtworkOverlay), by asset id. */
export function layerNode (root, assetId) {
  return assetId ? root?.querySelector(`[data-layer-id="art_${Number(assetId)}"]`) ?? null : null
}

/**
 * A gust: the layer's ambient motion (its own, or the moment's chosen mode) at the moment's amount
 * for a breath, then back to how it was. Returns a cancel function.
 */
export function gust (node, react) {
  const wrap = node?.querySelector('.art-ambient') ?? node
  if (!wrap || reducedMotion()) return () => {}
  const base = wrap.__ambLayer ?? {}
  const index = wrap.__ambIndex ?? 0
  applyAmbient(wrap, { ...base, ambient: react.ambient || base.ambient, ambient_amount: Number(react.amount) || 1.6 }, index)
  const timer = setTimeout(() => applyAmbient(wrap, base, index), GUST_MS)
  return () => { clearTimeout(timer); applyAmbient(wrap, base, index) }
}

/**
 * The move payoff: the layer travels from where it stands to (to_x, to_y), in stage %, and stays.
 * It uses the CSS `translate` property, so the camera's transform and everything drawn inside the
 * layer (waterline, reflection, contact shadow) go along unchanged. Resolves when it arrives.
 */
export function sail (node, stage, payoff) {
  if (!node || !stage) return Promise.resolve()
  const from = { x: parseFloat(node.style.left) || 50, y: parseFloat(node.style.top) || 50 }
  const dx = ((Number(payoff.to_x) - from.x) / 100) * stage.clientWidth
  const dy = ((Number(payoff.to_y ?? from.y) - from.y) / 100) * stage.clientHeight
  const end = `${Math.round(dx)}px ${Math.round(dy)}px`
  if (reducedMotion() || typeof node.animate !== 'function') {
    node.style.translate = end
    return Promise.resolve()
  }
  // On-screen motion from rest to rest: ease in and out (the `move` intent), never linear.
  const anim = node.animate([{ translate: '0px 0px' }, { translate: end }], {
    duration: Math.max(300, (Number(payoff.duration) || 4) * 1000), easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards',
  })
  return anim.finished.then(() => { node.style.translate = end }, () => {})
}

// ── DOM ──────────────────────────────────────────────────────────────────────────────────────

function button (label, className, onClick) {
  const b = el('button', `btn ${className}`, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }

function countEl (meter, text) {
  const n = el('span', 'w-12 shrink-0 text-right font-mono text-sm tabular-nums', text)
  n.dataset.meterCount = String(meter)
  return n
}

/** A small, kind "no": the button shakes; no sound, no red. */
function shake (node) {
  if (reducedMotion() || typeof node.animate !== 'function') return
  node.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '-3px' }, { translate: '0' }],
    { duration: 320, easing: 'ease-out' })
}

export class PowerMeter {
  constructor (host) {
    this.host = host
    this._timer = null
    this._fullTimer = null
    this._mic = null
  }

  /**
   * `avoid`: what the card should not cover on a wide screen, measured when it opens: rects in px
   * relative to the host, the reacting layer weighted most (card-place.js).
   * `listen`: the microphone (meter-inputs/mic.js listen()), injectable for tests.
   *
   * @param {{ config: object, solo?: boolean, avoid?: () => Array<{rect: object, weight?: number}>,
   *           listen?: Function, onReact?: (meter: number) => void,
   *           onDone?: (outcome: { skipped: boolean, winner: ?number, team: ?string }) => void }} opts
   */
  show ({ config, solo = false, avoid = () => [], listen = null, onReact = null, onDone = null }) {
    this.cfg = readMoment(config || {})
    this._solo = solo
    this._avoid = avoid
    this._spot = null
    this._onReact = onReact
    this._onDone = onDone
    this._buttons = wordButtons(this.cfg)
    // Sound is the whole class at once: one shared meter, no turns.
    const teams = solo || this.cfg.input !== 'words' ? 0 : this.cfg.teams
    this._names = teams ? teamNames(teams, [], (i) => t('Team :number', { number: i })) : []
    this.state = startState(this.cfg, teams)
    this._remaining = this.cfg.seconds
    this._micState = this.cfg.input === 'words' ? 'none' : 'asking'
    this._micLevel = 0
    this._knocked = false
    // Which opening this is: a mic granted for an earlier moment (its prompt answered late) must
    // neither feed this meter nor stay open.
    this._showId = (this._showId || 0) + 1
    this.host.style.pointerEvents = 'auto'
    this._render()
    this._startClock()
    if (this._micState === 'asking') this._startMic(listen)
  }

  hide () {
    this._stopClock()
    this._stopMic()
    clearTimeout(this._fullTimer)
    if (!this.host) return
    this.host.replaceChildren()
    this.host.style.pointerEvents = 'none'
  }

  /** Tap a word by its text (the board, a test, a later voice-free input); ignores unknown words. */
  tapWord (text) {
    const word = this._buttons.find(w => w.text === text)
    if (word) this._tap(word, this.host.querySelector(`[data-word="${word.id}"]`))
  }

  skip () { this._finish(true) }

  /** The narrator's after line, as a caption where the meter was (the panel stays in view). */
  say (text) {
    const wrap = el('div', 'absolute inset-x-0 bottom-0 flex justify-center px-3 pb-28 sm:px-8')
    const line = el('p', 'max-w-3xl rounded-box bg-base-100/95 px-6 py-4 text-center text-2xl font-semibold leading-snug text-base-content', text)
    line.setAttribute('role', 'status')
    wrap.appendChild(line)
    this.host.replaceChildren(wrap)
    this.host.style.pointerEvents = 'none'
  }

  _tap (word, node) {
    const meter = this.state.fills.length > 1 ? this.state.turn : 0
    const { state, result } = press(this.state, this.cfg, word)
    this.state = state
    if (result === 'wrong' && node) shake(node)
    if (result === 'right' || result === 'full') this._onReact?.(meter)
    if (result === 'full') this._fullTimer = setTimeout(() => this._finish(false), FULL_HOLD_MS)
    if (result !== 'used' && result !== 'done') this._render()
  }

  // ── Microphone (loudness, blow, silence) ──
  async _startMic (listen) {
    registerSoundTuner()
    const id = this._showId
    const current = () => this._showId === id && this._micState !== 'closed'
    try {
      const open = listen ?? (await import('./meter-inputs/mic.js')).listen
      const mic = await open({
        onCalibrated: () => { if (current()) { this._micState = 'on'; this._paint() } },
        onFrame: (frame) => { if (current()) this._hear(frame) },
      })
      if (!current()) { mic.stop(); return }
      this._mic = mic
    } catch (_) {
      // No mic, no permission, no Web Audio: the taps below carry the moment.
      if (current()) { this._micState = 'off'; this._render() }
    }
  }

  _stopMic () {
    this._mic?.stop()
    this._mic = null
    this._micState = 'closed'
  }

  _hear (frame) {
    if (this.state.done || this._micState !== 'on') return
    this._micLevel = frame.level
    const step = soundStep(this.cfg.input, frame, this.cfg, frame.dt)
    if (step.knock) {
      // One noise, one step back: a cough lasts many frames, and a quiet frame ends it.
      if (!this._knocked) {
        const back = knockBack(this.state)
        if (back.fills[0] !== this.state.fills[0]) shake(this.host.querySelector('[data-meter="0"]') ?? this.host)
        this.state = back
        this._knocked = true
      }
    } else {
      this._knocked = false
      this._fill(step.amount)
    }
    this._paint()
  }

  /** Sound or a fallback tap: fill the shared meter, a gust per whole step, finish when full. */
  _fill (amount) {
    const { state, crossed, full } = push(this.state, this.cfg, amount)
    this.state = state
    for (let i = 0; i < crossed; i++) this._onReact?.(0)
    if (full) {
      this._stopMic()
      this._fullTimer = setTimeout(() => this._finish(false), FULL_HOLD_MS)
      this._render()
    }
  }

  /** In place, many times a second: the meter and the live level, without rebuilding the card. */
  _paint () {
    const bar = this.host.querySelector('[data-meter="0"]')
    if (bar) bar.value = this.state.fills[0]
    const count = this.host.querySelector('[data-meter-count="0"]')
    if (count) count.textContent = `${Math.floor(this.state.fills[0])}/${this.cfg.goal}`
    const live = this.host.querySelector('[data-mic-level]')
    if (live) live.value = Math.round(this._micLevel * 100)
    const status = this.host.querySelector('[data-mic-status]')
    if (status) status.textContent = this._micStatusText()
  }

  _micStatusText () {
    if (this._micState === 'asking') return t('Listening to the room')
    if (this._micState === 'off') return t('No microphone. Tap instead.')
    return { loudness: t('Louder!'), blow: t('Blow!'), silence: t('Quiet now') }[this.cfg.input] ?? ''
  }

  _finish (skipped) {
    const done = this._onDone
    const winner = skipped ? null : this.state.winner
    const team = winner !== null && this.state.fills.length > 1 ? this._names[winner] : null
    this.hide()
    done?.({ skipped, winner, team })
  }

  // ── Timer (a teacher option; time up only says so) ──
  _startClock () {
    if (!this.cfg.seconds) return
    this._stopClock()
    this._timer = setInterval(() => {
      this._remaining = Math.max(0, this._remaining - 1)
      if (this._remaining === 0) this._stopClock()
      const clock = this.host.querySelector('[data-moment-clock]')
      if (clock) clock.textContent = this._clockText()
    }, 1000)
  }

  _stopClock () { if (this._timer) { clearInterval(this._timer); this._timer = null } }

  _clockText () { return this._remaining > 0 ? formatClock(this._remaining) : t('Time is up') }

  // ── Frame: a card over the panel where it hides the least of the picture it is about ──
  _render () {
    const wrap = el('div', 'pointer-events-none absolute inset-0 flex items-end justify-center px-3 pb-28 sm:px-8')
    wrap.setAttribute('role', 'dialog')
    wrap.setAttribute('aria-label', this.cfg.name || this.cfg.meterLabel || t('Power meter'))
    const card = el('div', 'card pointer-events-auto w-full max-w-xl border border-base-300 bg-base-100/95 text-base-content shadow-none')
    const body = el('div', 'card-body gap-3 p-4 sm:gap-4 sm:p-6')

    const head = el('div', 'flex flex-wrap items-center justify-between gap-3')
    const clock = this.cfg.seconds ? el('span', 'font-mono text-2xl font-bold tabular-nums text-primary', this._clockText()) : null
    if (clock) { clock.dataset.momentClock = ''; clock.setAttribute('role', 'timer') }
    append(head, el('p', 'text-lg font-bold leading-snug sm:text-2xl', this.cfg.prompt || this.cfg.name), clock)

    append(body, head, this._meters(), this._micRow(), this._turns(), this._words(), this._foot())
    card.appendChild(body)
    wrap.appendChild(card)
    this.host.replaceChildren(wrap)
    this._place(card)
  }

  /**
   * On a wide screen, put the card where it covers the least of the reacting layer and the figures
   * (measured once, when the moment opens); on a phone it stays along the bottom.
   */
  _place (card) {
    const w = this.host.clientWidth
    if (w < 640) return
    if (!this._spot) {
      let avoid = []
      try { avoid = this._avoid() || [] } catch (_) { /* nothing measured: bottom centre */ }
      // Not laid out yet (or no layout at all): the card's nominal size, max-w-xl by a typical height.
      const size = card.offsetWidth ? { w: card.offsetWidth, h: card.offsetHeight } : { w: 576, h: 320 }
      this._spot = placeCard({ w, h: this.host.clientHeight }, size, avoid)
    }
    card.style.position = 'absolute'
    card.style.left = `${this._spot.x}px`
    card.style.top = `${this._spot.y}px`
    card.dataset.spot = this._spot.name
  }

  /** The microphone's state, a live level and the promise that it only listens to loud and soft. */
  _micRow () {
    if (this._micState === 'none' || this._micState === 'closed') return null
    const row = el('div', 'flex flex-col gap-1')
    const top = el('div', 'flex items-center gap-3')
    const status = el('span', 'text-base font-semibold', this._micStatusText())
    status.dataset.micStatus = ''
    status.setAttribute('aria-live', 'polite')
    top.appendChild(status)
    if (this._micState !== 'off') {
      const live = el('progress', 'progress h-2 flex-1')
      live.max = 100
      live.value = Math.round(this._micLevel * 100)
      live.dataset.micLevel = ''
      live.setAttribute('aria-label', t('Sound level'))
      top.appendChild(live)
    }
    append(row, top, this._micState === 'off' ? null
      : el('span', 'text-xs text-base-content/60', t('The microphone only listens to loud and soft. Nothing is recorded.')))
    return row
  }

  _meters () {
    const box = el('div', 'flex flex-col gap-2')
    this.state.fills.forEach((_, m) => {
      const row = el('div', 'flex items-center gap-3')
      const label = this.state.fills.length > 1 ? this._names[m] : (this.cfg.meterLabel || t('Power meter'))
      const bar = el('progress', 'progress progress-primary h-5 flex-1')
      bar.max = this.cfg.goal
      bar.value = this.state.fills[m]
      bar.setAttribute('aria-label', label)
      bar.dataset.meter = String(m)
      append(row, el('span', 'w-32 shrink-0 truncate text-sm font-semibold uppercase tracking-wider text-base-content/70', label), bar,
        countEl(m, `${Math.floor(this.state.fills[m])}/${this.cfg.goal}`))
      box.appendChild(row)
    })
    return box
  }

  /** Whose turn it is; the teacher taps a team to give it the turn. */
  _turns () {
    if (this.state.teams < 2) return null
    const row = el('div', 'flex flex-wrap items-center gap-2')
    row.appendChild(el('span', 'text-sm text-base-content/70', t('Turn')))
    this._names.forEach((name, i) => {
      const chip = button(name, `btn-sm ${i === this.state.turn ? 'btn-primary' : 'btn-outline'}`, () => {
        this.state = giveTurn(this.state, i)
        this._render()
      })
      chip.setAttribute('aria-pressed', i === this.state.turn ? 'true' : 'false')
      row.appendChild(chip)
    })
    return row
  }

  _words () {
    // Keeping quiet is the whole point of a silence moment: taps are only the fallback for no mic.
    if (this.cfg.input === 'silence' && this._micState !== 'off') return null
    // A sound moment without words still has its tap: one step per tap.
    if (!this._buttons.length) {
      if (this.cfg.input === 'words') return null
      const tap = button(t('Tap to fill'), 'btn-outline sm:btn-lg', () => this._fill(1))
      tap.disabled = this.state.done
      const row = el('div', 'flex justify-center')
      row.appendChild(tap)
      return row
    }
    const grid = el('div', 'flex flex-wrap justify-center gap-2 sm:gap-3')
    for (const word of this._buttons) {
      const used = isUsed(this.state, word)
      const b = button(word.text, `sm:btn-lg ${used ? 'btn-success' : 'btn-outline'} min-w-24 text-base sm:min-w-28 sm:text-lg`, () => this._tap(word, b))
      b.dataset.word = word.id
      if (used) b.setAttribute('aria-disabled', 'true')
      if (this.state.done) b.disabled = true
      grid.appendChild(b)
    }
    return grid
  }

  _foot () {
    const bar = el('div', 'flex justify-end')
    bar.appendChild(button(t('Skip'), 'btn-ghost btn-sm', () => this.skip()))
    return bar
  }
}
