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
 * Inputs other than "words" (loudness, blow, rhythm...) arrive in later phases; until then every
 * moment plays as words. Tap is always there as the fallback.
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

/** How long a full meter stays on screen before the payoff, and a gust of the react layer. */
const FULL_HOLD_MS = 700
const GUST_MS = 1400

// ── Rules (pure) ─────────────────────────────────────────────────────────────────────────────

/** The moment as the engine reads it: lists are lists, numbers are clamped, nothing is trusted. */
export function readMoment (raw = {}) {
  const words = (v) => (Array.isArray(v) ? v : []).map(w => String(w ?? '').trim()).filter(Boolean)
  const right = words(raw.words?.right)
  const teams = Number(raw.teams) || 0
  return {
    enabled: raw.enabled !== false && right.length > 0,
    name: String(raw.name || ''),
    meterLabel: String(raw.meter_label || ''),
    prompt: String(raw.prompt || ''),
    right,
    wrong: words(raw.words?.wrong),
    goal: Math.max(1, Math.min(right.length || 1, Math.round(Number(raw.goal) || right.length || 1))),
    after: String(raw.after || ''),
    afterAudio: typeof raw.after_audio === 'string' && raw.after_audio.startsWith('/') && !raw.after_audio.startsWith('//') ? raw.after_audio : '',
    at: Number.isFinite(Number(raw.at)) && raw.at !== 'end' && raw.at !== null && raw.at !== '' ? Math.max(0, Number(raw.at)) : 'end',
    seconds: Math.max(0, Math.min(300, Number(raw.seconds) || 0)),
    teams: teams >= 2 ? clampTeams(teams) : 0,
    teamMeter: raw.team_meter === 'each' ? 'each' : 'shared',
    react: raw.react && typeof raw.react === 'object' ? raw.react : {},
    payoff: raw.payoff && typeof raw.payoff === 'object' ? raw.payoff : { type: 'none' },
  }
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
  }

  /**
   * @param {{ config: object, solo?: boolean, onReact?: (meter: number) => void,
   *           onDone?: (outcome: { skipped: boolean, winner: ?number, team: ?string }) => void }} opts
   */
  show ({ config, solo = false, onReact = null, onDone = null }) {
    this.cfg = readMoment(config || {})
    this._solo = solo
    this._onReact = onReact
    this._onDone = onDone
    this._buttons = wordButtons(this.cfg)
    const teams = solo ? 0 : this.cfg.teams
    this._names = teams ? teamNames(teams, [], (i) => t('Team :number', { number: i })) : []
    this.state = startState(this.cfg, teams)
    this._remaining = this.cfg.seconds
    this.host.style.pointerEvents = 'auto'
    this._render()
    this._startClock()
  }

  hide () {
    this._stopClock()
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

  _tap (word, node) {
    const meter = this.state.fills.length > 1 ? this.state.turn : 0
    const { state, result } = press(this.state, this.cfg, word)
    this.state = state
    if (result === 'wrong' && node) shake(node)
    if (result === 'right' || result === 'full') this._onReact?.(meter)
    if (result === 'full') this._fullTimer = setTimeout(() => this._finish(false), FULL_HOLD_MS)
    if (result !== 'used' && result !== 'done') this._render()
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

  // ── Frame: a card low over the panel, so the picture it is about stays in view ──
  _render () {
    const wrap = el('div', 'absolute inset-x-0 bottom-0 flex justify-center px-3 pb-28 sm:px-8')
    wrap.setAttribute('role', 'dialog')
    wrap.setAttribute('aria-label', this.cfg.name || this.cfg.meterLabel || t('Power meter'))
    const card = el('div', 'card w-full max-w-4xl border border-base-300 bg-base-100/95 text-base-content')
    const body = el('div', 'card-body gap-4 p-4 sm:p-6')

    const head = el('div', 'flex flex-wrap items-center justify-between gap-3')
    const clock = this.cfg.seconds ? el('span', 'font-mono text-2xl font-bold tabular-nums text-primary', this._clockText()) : null
    if (clock) { clock.dataset.momentClock = ''; clock.setAttribute('role', 'timer') }
    append(head, el('p', 'text-2xl font-bold leading-snug sm:text-3xl', this.cfg.prompt || this.cfg.name), clock)

    append(body, head, this._meters(), this._turns(), this._words(), this._foot())
    card.appendChild(body)
    wrap.appendChild(card)
    this.host.replaceChildren(wrap)
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
        el('span', 'w-12 shrink-0 text-right font-mono text-sm tabular-nums', `${this.state.fills[m]}/${this.cfg.goal}`))
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
    const grid = el('div', 'flex flex-wrap justify-center gap-3')
    for (const word of this._buttons) {
      const used = isUsed(this.state, word)
      const b = button(word.text, `btn-lg ${used ? 'btn-success' : 'btn-outline'} min-w-32 text-xl`, () => this._tap(word, b))
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
