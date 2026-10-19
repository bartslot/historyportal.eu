/**
 * PredictMoment — "what will happen?" (scene kind=game, game_type=predict, config.predict).
 *
 * The narrator asks a cause-and-effect question at a turning point; the class answers in its own
 * words BEFORE the story shows what happened; a debrief after the next scene asks WHY. Three ways to
 * answer (plan §0b), one engine:
 *
 *   paper   the board shows the question and a writing clock; children write on paper. Stores nothing.
 *   board   the teacher types the class's (or a team's) answer on the board. Stored; the WHY is graded.
 *   solo    a pupil on their own device (?play=solo) types their own. Stored; the WHY is graded.
 *
 * The prediction is never graded: it only gets "you thought X, this happened". The WHY gets 1-2
 * sentences of feedback from the server (JEV grades, a small model writes), polled until it is there,
 * or "saved, your teacher will look at it". The config's rubric never reaches the browser.
 *
 * Every string from the lesson or a child is untrusted: textContent only (el()). Interface words go
 * through t() (App\Support\JsTranslations). The rules are exported pure functions; vitest covers them.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { formatClock } from './chapter-timeline.js'

export const ANSWER_MAX = 200
export const TEAMS_MAX = 8
/** "Devices in class?" on the board: no devices (paper, the teacher may type) or own devices. */
export const DEVICE_MODES = ['paper', 'solo']
const POLL_MS = 2000
const POLL_FOR_MS = 45000

// ── Pure rules ───────────────────────────────────────────────────────────────────────────────

/** The moment as the engine reads it, whatever came in. */
export function readPredict (raw = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const seconds = Math.round(Number(raw.seconds))
  return {
    question: str(raw.question),
    outcome: str(raw.outcome),
    debrief: str(raw.debrief),
    mode: raw.mode === 'typed' ? 'typed' : 'paper',
    seconds: Number.isFinite(seconds) ? Math.min(600, Math.max(0, seconds)) : 60,
  }
}

/** An answer worth sending: something typed, at most ANSWER_MAX characters. */
export function canSend (text) {
  const s = String(text ?? '').trim()
  return s.length > 0 && s.length <= ANSWER_MAX
}

/** This browser's run token (one pupil session), kept for the lesson; a fresh one when there is none. */
export function predictSession (storage, lessonCode) {
  const key = `lp_predict_session:${lessonCode}`
  try {
    const saved = storage?.getItem(key)
    if (saved && /^[A-Za-z0-9-]{16,64}$/.test(saved)) return saved
  } catch { /* private mode */ }
  const fresh = (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`)
  try { storage?.setItem(key, fresh) } catch { /* private mode */ }
  return fresh
}

/** Who answers on the board: the whole class, or Team 1..n. */
export function answererFor (choice) {
  const n = Math.round(Number(choice))
  return Number.isFinite(n) && n >= 1 && n <= TEAMS_MAX
    ? { answerer: 'team', label: t('Team :number', { number: n }) }
    : { answerer: 'class', label: t('Whole class') }
}

/** POST one answer. Resolves to the stored row ({ id, status }) or throws. */
export async function sendAnswer (url, payload, fetchImpl = fetch) {
  const csrf = (typeof document !== 'undefined' && document.querySelector('meta[name="csrf-token"]')?.content) || ''
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Ask until the feedback is there (graded, flagged or failed), or give up after `forMs`.
 * @returns {Promise<{ status: string, feedback: string|null }>}
 */
export async function pollFeedback (url, session, { fetchImpl = fetch, everyMs = POLL_MS, forMs = POLL_FOR_MS, sleep = (ms) => new Promise(r => setTimeout(r, ms)), alive = () => true } = {}) {
  const until = Date.now() + forMs
  while (alive()) {
    try {
      const res = await fetchImpl(`${url}?session=${encodeURIComponent(session)}`, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const row = await res.json()
        if (row.feedback) return { status: row.status, feedback: row.feedback }
      }
    } catch { /* offline for a moment: try again */ }
    if (Date.now() + everyMs > until) break
    await sleep(everyMs)
  }
  return { status: 'timeout', feedback: null }
}

// ── DOM ──────────────────────────────────────────────────────────────────────────────────────

function button (label, className, onClick) {
  const b = el('button', `btn ${className}`, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }
const kicker = (text) => el('p', 'text-sm font-semibold uppercase tracking-wider text-base-content/60', text)

export class PredictMoment {
  /**
   * @param {HTMLElement} host  #lesson-game-overlay
   * @param {{ storeUrl?: string, session: string, solo?: boolean, devices?: string, classroomId?: number|null,
   *           classCode?: string, nickname?: string, fetchImpl?: Function, pollOpts?: object }} opts
   */
  constructor (host, opts) {
    this.host = host
    this.opts = opts
    this._clock = null
    this._epoch = 0
  }

  get _solo () { return !!this.opts.solo }
  /** The board types answers unless the class said every child has their own device. */
  get _boardTypes () { return !this._solo && this.opts.devices !== 'solo' && !!this.opts.storeUrl }

  /** Step 1: the question, before the story shows what happened. onDone(predictions). */
  ask ({ sceneId, config, onDone }) {
    this._start(sceneId, config, onDone, 'predict')
  }

  /** Step 2, after the consequence: what you thought next to what happened, then WHY. */
  debrief ({ sceneId, config, predictions = [], onDone }) {
    this._predictions = predictions
    this._start(sceneId, config, onDone, 'why')
  }

  hide () {
    this._epoch++
    this._stopClock()
    if (!this.host) return
    this.host.replaceChildren()
    this.host.style.pointerEvents = 'none'
  }

  _start (sceneId, config, onDone, phase) {
    this.hide()
    this.cfg = readPredict(config)
    this._sceneId = sceneId
    this._onDone = onDone
    this._phase = phase
    this._saved = []            // [{ label, text, id, feedback }]
    this._typing = phase === 'predict' ? this.cfg.mode === 'typed' : true
    this._remaining = this.cfg.seconds
    this.host.style.pointerEvents = 'auto'
    if (!this._solo && this._remaining > 0) this._startClock()
    this._render()
  }

  _finish () {
    const done = this._onDone
    const saved = this._saved.map(({ label, text }) => ({ label, text }))
    this.hide()
    done?.(saved)
  }

  // ── Clock: writing time on the board; it only nudges, nothing stops at zero ──
  _startClock () {
    this._stopClock()
    this._clock = setInterval(() => {
      this._remaining = Math.max(0, this._remaining - 1)
      const node = this.host.querySelector('[data-predict-clock]')
      if (node) node.textContent = this._remaining > 0 ? formatClock(this._remaining) : t('Time is up')
      if (this._remaining <= 0) this._stopClock()
    }, 1000)
  }

  _stopClock () { clearInterval(this._clock); this._clock = null }

  // ── Frame ──
  _render () {
    const scrim = el('div', 'absolute inset-0 overflow-y-auto bg-base-100/95 text-base-content')
    scrim.dataset.predictScrim = this._phase
    scrim.setAttribute('role', 'dialog')
    scrim.setAttribute('aria-label', this._phase === 'why' ? t('Why did it happen?') : t('What will happen?'))
    const page = el('div', 'mx-auto flex min-h-full max-w-4xl flex-col gap-5 px-4 pb-6 pt-16 sm:gap-6 sm:px-8')
    const head = el('header', 'flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3')
    head.appendChild(kicker(this._phase === 'why' ? t('Why did it happen?') : t('What will happen?')))
    if (!this._solo && this.cfg.seconds > 0) {
      const clock = el('span', 'text-2xl font-bold tabular-nums sm:text-3xl', this._remaining > 0 ? formatClock(this._remaining) : t('Time is up'))
      clock.dataset.predictClock = ''
      clock.setAttribute('aria-live', 'off')
      head.appendChild(clock)
    }
    const body = el('main', 'flex flex-1 flex-col gap-5')
    if (this._phase === 'why') this._comparison(body)
    body.appendChild(el('p', 'text-2xl font-semibold leading-snug sm:text-4xl', this._phase === 'why' ? this.cfg.debrief : this.cfg.question))
    if (this._solo) this._soloAnswer(body)
    else this._boardAnswers(body)
    append(page, head, body)
    scrim.appendChild(page)
    this.host.replaceChildren(scrim)
  }

  _footer (body, ...buttons) {
    const bar = el('footer', 'mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-base-300 pt-4')
    append(bar, ...buttons)
    body.appendChild(bar)
  }

  /** "You thought X" next to "What happened". No grade: a prediction is never wrong. */
  _comparison (body) {
    const card = el('section', 'grid gap-3 sm:grid-cols-2')
    card.dataset.predictCompare = ''
    this._predictions.forEach(p => {
      const box = el('div', 'rounded-box border border-base-300 bg-base-200 p-4')
      append(box, kicker(this._solo ? t('You thought') : t(':name thought', { name: p.label })), el('p', 'mt-1 text-lg leading-relaxed sm:text-xl', p.text))
      card.appendChild(box)
    })
    if (this.cfg.outcome) {
      const box = el('div', 'rounded-box border border-primary/50 bg-base-200 p-4')
      append(box, kicker(t('What happened')), el('p', 'mt-1 text-lg leading-relaxed sm:text-xl', this.cfg.outcome))
      card.appendChild(box)
    }
    if (card.childElementCount) body.appendChild(card)
  }

  // ── Solo: the pupil's own answer ──
  _soloAnswer (body) {
    const mine = this._saved[0]
    if (mine) {
      if (this._phase === 'why') body.appendChild(this._feedbackCard(mine))
      else body.appendChild(el('p', 'text-lg text-base-content/70', t('Your prediction is saved.')))
      this._footer(body, button(this._phase === 'why' ? t('Continue the lesson') : t('Show what happened'), 'btn-primary btn-lg', () => this._finish()))
      return
    }
    const { area, field } = this._textBox(t('Your answer'))
    const send = button(this._phase === 'why' ? t('Send my answer') : t('Save my prediction'), 'btn-primary btn-lg', () => this._send(area.value, { answerer: 'pupil', label: this.opts.nickname || null }))
    send.disabled = true
    send.dataset.predictSend = ''
    area.addEventListener('input', () => { send.disabled = !canSend(area.value) })
    body.appendChild(field)
    this._error(body)
    this._footer(body, button(t('Skip'), 'btn-ghost', () => this._finish()), send)
  }

  // ── Board: paper, or the teacher types the class's / a team's answer ──
  _boardAnswers (body) {
    if (this.opts.devices === 'solo') {
      body.appendChild(el('p', 'text-lg text-base-content/70', t('Everyone answers on their own device.')))
    } else if (!this._typing || !this._boardTypes) {
      body.appendChild(el('p', 'text-lg text-base-content/70', t('Write your answer on paper.')))
    }
    if (this._saved.length) {
      const list = el('section', 'flex flex-col gap-3')
      this._saved.forEach(a => list.appendChild(this._phase === 'why' ? this._feedbackCard(a) : this._savedLine(a)))
      body.appendChild(list)
    }
    if (this._typing && this._boardTypes) {
      const { area, field } = this._textBox(t('The class\'s answer'))
      const who = el('select', 'select select-bordered w-full sm:w-auto')
      who.setAttribute('aria-label', t('Who answers'))
      const opt = (value, label) => { const o = el('option', '', label); o.value = value; who.appendChild(o) }
      opt('0', t('Whole class'))
      for (let i = 1; i <= TEAMS_MAX; i++) opt(String(i), t('Team :number', { number: i }))
      const save = button(t('Save answer'), 'btn-outline', () => this._send(area.value, answererFor(who.value)))
      save.disabled = true
      save.dataset.predictSave = ''
      area.addEventListener('input', () => { save.disabled = !canSend(area.value) })
      const row = el('div', 'flex flex-wrap items-center gap-3')
      append(row, who, save)
      append(body, field, row)
      this._error(body)
    }
    const typeToggle = this._boardTypes && !this._typing
      ? button(t('Type the class\'s answer'), 'btn-ghost', () => { this._typing = true; this._render() })
      : null
    if (typeToggle) typeToggle.dataset.predictType = ''
    this._footer(body, typeToggle,
      button(this._phase === 'why' ? t('Continue the lesson') : t('Show what happened'), 'btn-primary btn-lg', () => this._finish()))
  }

  _textBox (label) {
    const field = el('label', 'flex flex-col gap-2')
    const area = el('textarea', 'textarea textarea-bordered w-full text-lg sm:text-xl')
    area.rows = 3
    area.maxLength = ANSWER_MAX
    area.dataset.predictText = ''
    const count = el('span', 'self-end text-sm tabular-nums text-base-content/60', `0/${ANSWER_MAX}`)
    area.addEventListener('input', () => { count.textContent = `${area.value.length}/${ANSWER_MAX}` })
    append(field, kicker(label), area, count)
    return { area, field }
  }

  _error (body) {
    const err = el('p', 'text-sm text-error', this._errorText || '')
    err.setAttribute('role', 'status')
    body.appendChild(err)
    this._errorText = ''
  }

  _savedLine (a) {
    const line = el('div', 'rounded-box border border-base-300 bg-base-200 p-3')
    append(line, kicker(a.label || t('You')), el('p', 'mt-1 text-lg leading-relaxed', a.text))
    return line
  }

  /** The WHY with its feedback; while the server grades, "Reading your answer…". */
  _feedbackCard (a) {
    const card = el('div', 'rounded-box border border-base-300 bg-base-200 p-4')
    card.dataset.predictFeedback = a.feedback ? 'ready' : 'waiting'
    append(card,
      this._solo ? null : kicker(a.label),
      el('p', 'text-lg leading-relaxed text-base-content/80', a.text),
      a.feedback
        ? el('p', 'mt-3 border-l-2 border-primary pl-3 text-lg leading-relaxed sm:text-xl', a.feedback)
        : el('p', 'mt-3 text-base text-base-content/60', t('Reading your answer…')))
    return card
  }

  async _send (raw, who) {
    const text = String(raw ?? '').trim()
    if (!canSend(text)) return
    const epoch = this._epoch
    const payload = {
      scene_id: this._sceneId, phase: this._phase, text, session: this.opts.session,
      answerer: who.answerer, label: who.label || null,
      class_code: this.opts.classCode || null, classroom_id: this.opts.classroomId ?? null,
    }
    let row
    try {
      row = await sendAnswer(this.opts.storeUrl, payload, this.opts.fetchImpl)
    } catch {
      if (epoch !== this._epoch) return
      this._errorText = t('We could not save it. You can go on.')
      return this._render()
    }
    if (epoch !== this._epoch) return
    // One answer per answerer: a corrected one replaces its line.
    const entry = { label: who.label, text, id: row.id, feedback: null }
    this._saved = [...this._saved.filter(a => a.label !== who.label), entry]
    if (!this._solo) this._typing = this._phase === 'why'
    this._render()
    if (this._phase !== 'why') return
    const result = await pollFeedback(`${this.opts.storeUrl}/${row.id}`, this.opts.session, {
      fetchImpl: this.opts.fetchImpl, alive: () => epoch === this._epoch, ...(this.opts.pollOpts || {}),
    })
    if (epoch !== this._epoch) return
    this._saved = this._saved.map(a => (a === entry ? { ...a, feedback: result.feedback || t('Saved. Your teacher will look at it.') } : a))
    this._render()
  }
}

/**
 * "Devices in class?" at the start of a lesson on the board. Remembered per class (the server) or,
 * without a class, in this browser. onChoose({ mode, classroomId }) runs inside the click, so the
 * lesson can still go fullscreen and unlock audio on that gesture.
 */
export function askDevices (host, { classrooms = [], remembered = null, onChoose }) {
  let classroomId = classrooms[0]?.id ?? null
  const modeFor = (id) => classrooms.find(c => c.id === id)?.devices_mode || remembered || 'paper'
  let mode = modeFor(classroomId)
  const dialog = el('dialog', 'modal modal-bottom sm:modal-middle')
  dialog.dataset.devicesDialog = ''
  const box = el('div', 'modal-box flex flex-col gap-4')
  const close = button('✕', 'btn-sm btn-circle btn-ghost absolute right-3 top-3', () => dialog.close())
  close.setAttribute('aria-label', t('Close'))
  const options = el('div', 'grid gap-2')
  const draw = () => {
    options.replaceChildren(...DEVICE_MODES.map(m => {
      const b = button(m === 'paper' ? t('No devices') : t('Own devices'), `h-auto justify-start py-3 text-left ${m === mode ? 'btn-primary' : 'btn-outline'}`, () => { mode = m; draw() })
      b.dataset.devicesMode = m
      b.setAttribute('aria-pressed', String(m === mode))
      b.appendChild(el('span', 'block w-full text-sm font-normal opacity-80', m === 'paper'
        ? t('Children write on paper. You can type the class\'s answer.')
        : t('Every child plays on their own device.')))
      b.classList.add('flex-col', 'items-start')
      return b
    }))
  }
  append(box, close, el('h2', 'text-xl font-bold', t('Devices in class?')))
  if (classrooms.length > 1) {
    const pick = el('select', 'select select-bordered w-full')
    pick.setAttribute('aria-label', t('Class'))
    classrooms.forEach(c => { const o = el('option', '', c.name); o.value = String(c.id); pick.appendChild(o) })
    pick.addEventListener('change', () => { classroomId = Number(pick.value); mode = modeFor(classroomId); draw() })
    box.appendChild(pick)
  }
  draw()
  const start = button(t('Start'), 'btn-primary btn-lg', () => { dialog.close(); onChoose({ mode, classroomId }) })
  start.dataset.devicesStart = ''
  const actions = el('div', 'modal-action')
  actions.appendChild(start)
  append(box, options, actions)
  const backdrop = el('form', 'modal-backdrop')
  backdrop.method = 'dialog'
  backdrop.appendChild(el('button', '', t('Close')))
  append(dialog, box, backdrop)
  dialog.addEventListener('close', () => dialog.remove())
  host.appendChild(dialog)
  dialog.showModal?.()
  return dialog
}
