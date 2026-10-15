/**
 * TeamGame — a class-screen team game (scene kind=game, game_type=team, config.team).
 *
 * Plays on the teacher's device on the projector. Teams of 3-4 decide aloud or on paper; the
 * TEACHER taps each team's choice in. No student devices, no scores, nothing stored: the reveal is
 * the learning. Three modes, one engine (the shape is App\Services\Lessons\TeamGameSpec):
 *
 *   budget   setup -> load (per team, capacity enforced) -> reveal + comparison
 *   choose   setup -> dossier (timer) -> votes (tally once every team is in) -> reveal
 *   discuss  question + prompts + evidence (timer) -> closing line
 *
 * SOLO (a pupil on their own phone or laptop): the same config, played by one. No team setup;
 * budget = their own load + the reveal, choose = their own choice + the real decision (no tally),
 * discuss = their own short answer, which stays in this page and is never stored or sent.
 *
 * Every string here is teacher, spec or LLM text = untrusted, so it goes through textContent
 * (el()), never innerHTML. Interface words come from t() (JsTranslations).
 *
 * The rules (capacity, tally, team names) are exported as pure functions; vitest covers them.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { formatClock } from './chapter-timeline.js'
import { readHold } from './cargo-hold.js'
import { HoldScreens } from './team-hold.js'
import { teamTone } from './team-colours.js'

export const TEAMS_MIN = 2
export const TEAMS_MAX = 8
const NAME_MAX = 24
const LETTERS = ['A', 'B', 'C', 'D']
const TIMED = ['load', 'dossier', 'vote', 'discuss']

// ── Pure rules ───────────────────────────────────────────────────────────────────────────────

/** A team count the engine accepts, whatever came in. */
export function clampTeams (n) {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(TEAMS_MAX, Math.max(TEAMS_MIN, v)) : 4
}

/** n team names: the teacher's where given, "Team 1".. otherwise. */
export function teamNames (n, names = [], label = (i) => `Team ${i}`) {
  return Array.from({ length: clampTeams(n) }, (_, i) => {
    const typed = String(names[i] ?? '').trim().slice(0, NAME_MAX)
    return typed || label(i + 1)
  })
}

const cost = (item) => Math.max(0, Math.round(Number(item?.cost) || 0))

/** Points the fixed items already take. */
export function fixedLoad (fixed = []) {
  return fixed.reduce((sum, item) => sum + cost(item), 0)
}

/** A team's load: the fixed items plus the item indices it picked. */
export function loadOf (picked, items = [], fixed = []) {
  return [...picked].reduce((sum, i) => sum + cost(items[i]), fixedLoad(fixed))
}

/**
 * Try to toggle item `index` for a team. Taking an item off always works; putting one on is
 * blocked when it would take the load over capacity.
 *
 * @returns {{ ok: boolean, picked: Set<number>, load: number, wouldBe: number }}
 *   `picked` is a NEW set (the input is never changed); on a block it is the old selection.
 */
export function toggleItem (picked, index, items, fixed, capacity) {
  const next = new Set(picked)
  const removing = next.delete(index)
  if (!removing) next.add(index)
  const wouldBe = loadOf(next, items, fixed)
  if (!removing && wouldBe > Number(capacity)) {
    return { ok: false, picked: new Set(picked), load: loadOf(picked, items, fixed), wouldBe }
  }
  return { ok: true, picked: next, load: wouldBe, wouldBe }
}

/** How many teams picked each item. */
export function itemPicks (selections, itemCount) {
  const counts = Array(itemCount).fill(0)
  selections.forEach(sel => sel.forEach(i => { if (i >= 0 && i < itemCount) counts[i]++ }))
  return counts
}

/** Votes per option; a team that has not voted is null and counts for nothing. */
export function tally (votes, optionCount) {
  const counts = Array(optionCount).fill(0)
  votes.forEach(v => { if (Number.isInteger(v) && v >= 0 && v < optionCount) counts[v]++ })
  return counts
}

/** Every team has voted. */
export function allVoted (votes) {
  return votes.length > 0 && votes.every(v => Number.isInteger(v))
}

/** An http(s) URL or a path on this site; anything else (javascript:, data:, //host) is ''. */
export function safeImage (url) {
  const s = typeof url === 'string' ? url.trim() : ''
  return /^https?:\/\/\S+$/i.test(s) || (s.startsWith('/') && !s.startsWith('//')) ? s : ''
}

/** The config as the engine reads it: every list a list, every number a number, every image safe. */
export function readConfig (raw = {}) {
  const list = (v) => (Array.isArray(v) ? v : [])
  const mode = ['budget', 'choose', 'discuss'].includes(raw.mode) ? raw.mode : 'budget'
  const cargo = (rows) => list(rows).map(i => ({ ...i, image: safeImage(i?.image) }))
  const holdRaw = raw.hold && typeof raw.hold === 'object' ? raw.hold : {}
  const hold = readHold({ ...holdRaw, ship: safeImage(holdRaw.ship), backdrop: safeImage(holdRaw.backdrop) })
  return {
    ...raw,
    mode,
    hold,
    // The ship's hold when there is a ship to draw and the teacher has not asked for the cards.
    presentation: mode === 'budget' && hold.ship && hold.zones.length && raw.presentation !== 'grid' ? 'hold' : 'grid',
    map: safeImage(raw.map),
    roles: list(raw.roles).filter(Boolean),
    teams: clampTeams(raw.teams ?? 4),
    minutes: Math.max(0, Math.min(30, Number(raw.minutes) || 0)),
    capacity: Math.max(1, Number(raw.capacity) || 1),
    fixed: cargo(raw.fixed),
    items: cargo(raw.items),
    cards: list(raw.cards),
    options: list(raw.options).slice(0, LETTERS.length).map(o => ({ ...o, image: safeImage(o?.image) })),
    prompts: list(raw.prompts).filter(Boolean),
    evidence: list(raw.evidence).map(e => ({ ...e, image: safeImage(e?.image) })).filter(e => e.image || e.caption),
    answer: Number.isInteger(raw.answer) ? raw.answer : null,
  }
}

// ── DOM ──────────────────────────────────────────────────────────────────────────────────────

function button (label, className, onClick) {
  const b = el('button', `btn ${className}`, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

function image (src, alt, className) {
  const img = el('img', className)
  img.src = src
  img.alt = alt || ''
  img.loading = 'lazy'
  return img
}

/** A paragraph only when there is something to say. */
function para (text, className) {
  return text ? el('p', className, text) : null
}

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }

export class TeamGame {
  constructor (host) {
    this.host = host
    this._timer = null
  }

  /** @param {{ config: object, onComplete?: () => void, solo?: boolean }} opts */
  show ({ config, onComplete = null, solo = false }) {
    this.cfg = readConfig(config || {})
    this._onComplete = onComplete
    this._solo = solo
    this._answer = ''
    this._teamCount = this.cfg.teams
    this._names = []
    this._selections = []   // budget: Set<number> per team
    this._votes = []        // choose: option index or null per team
    this._active = 0        // budget: the team being entered
    this._warning = ''
    this._remaining = this.cfg.minutes * 60
    this._running = false
    this._hold = new HoldScreens(this)
    this._phase = this.cfg.mode === 'discuss' ? 'discuss' : 'setup'
    if (this._phase === 'discuss') this._startClock()
    this.host.style.pointerEvents = 'auto'
    if (solo && this._phase === 'setup') return this._startSolo()
    this._render()
  }

  /** One player, no setup: straight to their own load or their own choice. */
  _startSolo () {
    this._names = [t('You')]
    this._selections = [new Set()]
    this._votes = [null]
    this._active = 0
    this._remaining = this.cfg.minutes * 60
    this._go(this.cfg.mode === 'budget' ? 'load' : 'dossier')
  }

  /**
   * The ONE accessor for team data (names, the team being entered, each team's picks). The hold
   * reads and writes teams only through this, so a shared class-teams store can replace it.
   */
  teamStore () {
    return {
      count: () => this._names.length,
      name: (i) => this._names[i] ?? '',
      tone: (i) => teamTone(i),
      active: () => this._active,
      setActive: (i) => { this._active = Math.max(0, Math.min(this._names.length - 1, i)) },
      picked: (i) => this._selections[i] ?? new Set(),
      setPicked: (i, picked) => { this._selections[i] = new Set(picked) },
    }
  }

  hide () {
    this._stopClock()
    if (!this.host) return
    this.host.replaceChildren()
    this.host.style.pointerEvents = 'none'
  }

  // ── Flow ──
  _go (phase) {
    this._phase = phase
    this._warning = ''
    if (TIMED.includes(phase)) this._startClock()
    this._render()
  }

  _finish () {
    const done = this._onComplete
    this.hide()
    done?.()
  }

  _startTeams () {
    this._names = teamNames(this._teamCount, this._names, (i) => t('Team :number', { number: i }))
    this._selections = this._names.map((_, i) => this._selections[i] || new Set())
    this._votes = this._names.map((_, i) => this._votes[i] ?? null)
    this._active = Math.min(this._active, this._names.length - 1)
    this._remaining = this.cfg.minutes * 60
    this._go(this.cfg.mode === 'budget' ? 'load' : 'dossier')
  }

  // ── Timer (teacher-run: pause, add a minute; time up never moves the class on by itself) ──
  _startClock () {
    if (!this.cfg.minutes || this._running) return
    this._running = true
    this._stopClock()
    this._timer = setInterval(() => {
      this._remaining = Math.max(0, this._remaining - 1)
      if (this._remaining === 0) { this._running = false; this._stopClock() }
      this._paintClock()
    }, 1000)
  }

  _stopClock () { if (this._timer) { clearInterval(this._timer); this._timer = null } }

  _pauseClock () {
    if (this._running) { this._running = false; this._stopClock() } else { this._startClock() }
    this._render()
  }

  _addMinute () {
    this._remaining += 60
    if (!this._running) this._startClock()
    this._render()
  }

  _paintClock () {
    const clock = this.host.querySelector('[data-team-clock]')
    if (!clock) return
    clock.textContent = this._clockText()
    // At zero the clock stops by itself, so its button must say Resume, not Pause. In place, not
    // a redraw: a redraw would scroll the class back to the top.
    const pause = this.host.querySelector('[data-team-pause]')
    if (pause) pause.textContent = this._running ? t('Pause') : t('Resume')
  }

  _clockText () { return this._remaining > 0 ? formatClock(this._remaining) : t('Time is up') }

  _clock () {
    if (!this.cfg.minutes) return null
    const wrap = el('div', 'flex items-center gap-2')
    const clock = el('span', 'font-mono text-3xl font-bold tabular-nums text-primary', this._clockText())
    clock.dataset.teamClock = ''
    clock.setAttribute('role', 'timer')
    wrap.appendChild(clock)
    const pause = button(this._running ? t('Pause') : t('Resume'), 'btn-sm btn-ghost', () => this._pauseClock())
    pause.dataset.teamPause = ''
    append(wrap,
      pause,
      button(t('+1 minute'), 'btn-sm btn-ghost', () => this._addMinute()))
    return wrap
  }

  // ── Frame ──
  _render () {
    const timed = TIMED.includes(this._phase)
    if (!timed && this._running) { this._running = false; this._stopClock() }
    // A redraw in the same phase keeps the scroll (a pupil's phone mid-list); a new phase starts on top.
    const old = this.host.querySelector('[data-team-scrim]')
    const keepScroll = old && this._drawnPhase === this._phase ? old.scrollTop : 0
    this._drawnPhase = this._phase
    const scrim = el('div', 'absolute inset-0 overflow-y-auto bg-base-100/95 text-base-content')
    scrim.dataset.teamScrim = ''
    scrim.setAttribute('role', 'dialog')
    scrim.setAttribute('aria-label', this.cfg.title || t('Team game'))
    // Clear of the player's chrome, which sits above this host: the edit pill on top, the deck below.
    const page = el('div', 'mx-auto flex min-h-full max-w-6xl flex-col gap-6 px-4 pb-32 pt-16 sm:px-8')
    const head = el('header', 'flex flex-wrap items-center justify-between gap-4 border-b border-base-300 pb-4')
    append(head, el('h2', 'text-3xl font-bold sm:text-4xl', this.cfg.title || t('Team game')), timed ? this._clock() : null)
    const body = el('main', 'flex flex-1 flex-col gap-6')
    this[`_${this._phase}`](body)
    append(page, head, body)
    scrim.appendChild(page)
    this.host.replaceChildren(scrim)
    if (keepScroll) scrim.scrollTop = keepScroll
  }

  _footer (body, ...buttons) {
    const bar = el('footer', 'mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-base-300 pt-4')
    append(bar, ...buttons)
    body.appendChild(bar)
  }

  // ── Setup: intro, roles, how many teams and their names ──
  _setup (body) {
    append(body,
      para(this.cfg.intro, 'text-2xl leading-relaxed'),
      para(this.cfg.rules, 'text-lg leading-relaxed text-base-content/80'))

    if (this.cfg.roles.length) {
      const roles = el('section', 'flex flex-col gap-2')
      roles.appendChild(el('h3', 'text-sm font-semibold uppercase tracking-wider text-base-content/60', t('Roles in each team')))
      const row = el('div', 'flex flex-wrap gap-2')
      this.cfg.roles.forEach(r => row.appendChild(el('span', 'badge badge-lg badge-outline', r)))
      roles.appendChild(row)
      body.appendChild(roles)
    }

    const teams = el('section', 'flex flex-col gap-3')
    const countRow = el('div', 'flex items-center gap-3')
    const count = el('span', 'w-10 text-center text-3xl font-bold tabular-nums', this._teamCount)
    count.setAttribute('aria-live', 'polite')
    append(countRow,
      el('h3', 'text-sm font-semibold uppercase tracking-wider text-base-content/60', t('Teams')),
      button('−', 'btn-circle btn-outline btn-sm', () => { this._teamCount = clampTeams(this._teamCount - 1); this._render() }),
      count,
      button('+', 'btn-circle btn-outline btn-sm', () => { this._teamCount = clampTeams(this._teamCount + 1); this._render() }))
    countRow.querySelectorAll('button')[0].setAttribute('aria-label', t('Fewer teams'))
    countRow.querySelectorAll('button')[1].setAttribute('aria-label', t('More teams'))
    teams.appendChild(countRow)

    const names = el('div', 'grid grid-cols-2 gap-2 sm:grid-cols-4')
    teamNames(this._teamCount, this._names, (i) => t('Team :number', { number: i })).forEach((name, i) => {
      const input = el('input', 'input input-bordered w-full')
      input.type = 'text'
      input.maxLength = NAME_MAX
      input.value = this._names[i] || ''
      input.placeholder = name
      input.setAttribute('aria-label', t('Team :number', { number: i + 1 }))
      input.addEventListener('input', () => { this._names[i] = input.value })
      names.appendChild(input)
    })
    teams.appendChild(names)
    body.appendChild(teams)

    this._footer(body, button(t('Start'), 'btn-primary btn-lg', () => this._startTeams()))
  }

  // ── Budget: teacher enters each team's load ──
  _load (body) {
    if (this.cfg.presentation === 'hold') return this._hold.pick(body)
    const { items, fixed, capacity } = this.cfg
    const picked = this._selections[this._active]
    const load = loadOf(picked, items, fixed)

    const tabs = el('div', `tabs tabs-box flex-wrap ${this._solo ? 'hidden' : ''}`)
    tabs.setAttribute('role', 'tablist')
    this._names.forEach((name, i) => {
      const tab = el('button', `tab gap-2 ${i === this._active ? 'tab-active' : ''}`)
      tab.type = 'button'
      tab.setAttribute('role', 'tab')
      tab.setAttribute('aria-selected', String(i === this._active))
      append(tab, el('span', '', name), el('span', 'badge badge-sm', `${loadOf(this._selections[i], items, fixed)}/${capacity}`))
      tab.addEventListener('click', () => { this._active = i; this._warning = ''; this._render() })
      tabs.appendChild(tab)
    })
    body.appendChild(tabs)

    const meter = el('div', 'flex flex-col gap-1')
    const bar = el('progress', `progress w-full ${load >= capacity ? 'progress-warning' : 'progress-primary'}`)
    bar.max = capacity
    bar.value = load
    append(meter,
      el('div', 'text-xl font-semibold', t(':load of :capacity points loaded', { load, capacity })),
      bar)
    body.appendChild(meter)

    // The slot is always there, so a warning never pushes the cards out from under the next tap.
    const warn = el('div', `alert alert-warning text-lg ${this._warning ? '' : 'invisible'}`, this._warning || ' ')
    if (this._warning) warn.setAttribute('role', 'alert')
    body.appendChild(warn)

    if (fixed.length) {
      const onBoard = el('section', 'flex flex-col gap-2')
      onBoard.appendChild(el('h3', 'text-sm font-semibold uppercase tracking-wider text-base-content/60', t('Always on board')))
      const row = el('div', 'flex flex-wrap gap-2')
      fixed.forEach(item => row.appendChild(el('span', 'badge badge-lg badge-neutral gap-2', `${item.name} · ${cost(item)}`)))
      onBoard.appendChild(row)
      body.appendChild(onBoard)
    }

    const grid = el('div', 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3')
    items.forEach((item, i) => {
      const on = picked.has(i)
      const card = el('button', `card border text-left transition-colors ${on ? 'border-primary bg-primary/15' : 'border-base-300 bg-base-200 hover:border-primary/60'}`)
      card.type = 'button'
      card.setAttribute('aria-pressed', String(on))
      const inner = el('div', 'card-body gap-1 p-4')
      const top = el('div', 'flex items-start justify-between gap-3')
      append(top, el('span', 'text-xl font-semibold', item.name), el('span', `badge badge-lg ${on ? 'badge-primary' : 'badge-outline'}`, cost(item)))
      append(inner, top, para(item.why, 'text-base text-base-content/75'))
      card.appendChild(inner)
      card.addEventListener('click', () => this._toggle(i))
      grid.appendChild(card)
    })
    body.appendChild(grid)

    this._footer(body,
      this._solo ? null : button(t('Back'), 'btn-ghost', () => this._go('setup')),
      button(t('Reveal'), 'btn-primary btn-lg', () => this._go('budgetReveal')))
  }

  _toggle (index) {
    if (this.cfg.presentation === 'hold') return this._hold.toggle(index)
    const { items, fixed, capacity } = this.cfg
    const result = toggleItem(this._selections[this._active], index, items, fixed, capacity)
    this._selections[this._active] = result.picked
    this._warning = result.ok ? '' : this._solo
      ? t('Too heavy: that would be :load of :capacity points. Leave something behind first.', { load: result.wouldBe, capacity })
      : t('Too heavy: :team would carry :load of :capacity points. Leave something behind first.', {
        team: this._names[this._active], load: result.wouldBe, capacity,
      })
    this._render()
  }

  _budgetReveal (body) {
    if (this.cfg.presentation === 'hold') return this._hold.reveal(body)
    const { items, fixed } = this.cfg
    append(body,
      para(this.cfg.reveal, 'text-2xl leading-relaxed'),
      this._labelled(t('What later scenes need'), this.cfg.needs))

    const wrap = el('div', 'overflow-x-auto rounded-box border border-base-300')
    const table = el('table', 'table table-zebra text-lg')
    const thead = el('thead')
    const hr = el('tr')
    const count = (text, tag = 'td', cls = 'text-center') => (this._solo ? null : el(tag, cls, text))
    append(hr, el('th', '', t('Cargo')), ...this._names.map(n => el('th', 'text-center', n)), count(t('Teams'), 'th'))
    thead.appendChild(hr)
    const tbody = el('tbody')
    fixed.forEach(item => {
      const tr = el('tr')
      append(tr, el('td', '', item.name), ...this._names.map(() => el('td', 'text-center', t('On board'))), count(this._names.length))
      tbody.appendChild(tr)
    })
    const picks = itemPicks(this._selections, items.length)
    items.forEach((item, i) => {
      const tr = el('tr')
      const cells = this._selections.map(sel => {
        const td = el('td', 'text-center', sel.has(i) ? '✓' : '')
        if (sel.has(i)) td.setAttribute('aria-label', t('Loaded'))
        return td
      })
      append(tr, el('td', '', item.name), ...cells, count(picks[i], 'td', 'text-center font-semibold'))
      tbody.appendChild(tr)
    })
    const tfoot = el('tfoot')
    const fr = el('tr')
    append(fr, el('th', '', t('Points')), ...this._selections.map(sel => el('th', 'text-center', loadOf(sel, items, fixed))), count('', 'th'))
    tfoot.appendChild(fr)
    append(table, thead, tbody, tfoot)
    wrap.appendChild(table)
    body.appendChild(wrap)

    append(body,
      para(this.cfg.followup, 'text-xl font-semibold'),
      para(this.cfg.source, 'text-sm text-base-content/60'))
    this._footer(body,
      button(t('Back'), 'btn-ghost', () => this._go('load')),
      button(t('Continue the lesson'), 'btn-primary btn-lg', () => this._finish()))
  }

  _labelled (label, text) {
    if (!text) return null
    const box = el('section', 'flex flex-col gap-1 border-l-2 border-primary pl-4')
    append(box, el('h3', 'text-sm font-semibold uppercase tracking-wider text-base-content/60', label), el('p', 'text-xl leading-relaxed', text))
    return box
  }

  // ── Choose: dossier + options, then each team's vote ──
  _dossier (body) {
    append(body, para(this.cfg.situation, 'text-2xl leading-relaxed'))
    if (this.cfg.cards.length) {
      const grid = el('div', 'grid grid-cols-1 gap-3 md:grid-cols-2')
      this.cfg.cards.forEach(card => {
        const c = el('article', 'card border border-base-300 bg-base-200')
        const inner = el('div', 'card-body gap-2 p-5')
        append(inner,
          el('h3', 'card-title text-xl', card.title),
          para(card.text, 'text-lg leading-relaxed'),
          card.but ? append(el('p', 'text-lg leading-relaxed text-base-content/80'), el('strong', 'text-primary', `${t('But')}: `), document.createTextNode(card.but)) : null)
        c.appendChild(inner)
        grid.appendChild(c)
      })
      body.appendChild(grid)
    }
    body.appendChild(this._optionList(null))
    append(body, para(this.cfg.question, 'text-2xl font-semibold'))
    this._footer(body,
      this._solo ? null : button(t('Back'), 'btn-ghost', () => this._go('setup')),
      button(this._solo ? t('Choose') : t('Teams choose'), 'btn-primary btn-lg', () => this._go('vote')))
  }

  /** The options, with the shared map and any per-option picture; `real` marks the real decision. */
  _optionList (real) {
    const section = el('section', 'flex flex-col gap-3')
    if (this.cfg.map) section.appendChild(image(this.cfg.map, t('Map of the options'), 'max-h-72 w-full rounded-box object-contain'))
    const grid = el('div', 'grid grid-cols-1 gap-3 md:grid-cols-3')
    this.cfg.options.forEach((o, i) => {
      const isReal = real === i
      const card = el('article', `card border ${isReal ? 'border-primary bg-primary/15' : 'border-base-300 bg-base-200'}`)
      const inner = el('div', 'card-body gap-2 p-4')
      const top = el('div', 'flex items-center gap-3')
      append(top, el('span', 'badge badge-lg badge-primary font-bold', LETTERS[i]), el('span', 'text-xl font-semibold', o.label && o.label !== LETTERS[i] ? o.label : ''))
      if (isReal) top.appendChild(el('span', 'badge badge-lg badge-outline ml-auto', t('Real decision')))
      append(inner, top, para(o.text, 'text-lg leading-relaxed'), o.image ? image(o.image, o.text, 'max-h-48 w-full rounded-box object-contain') : null)
      card.appendChild(inner)
      grid.appendChild(card)
    })
    section.appendChild(grid)
    return section
  }

  _vote (body) {
    const list = el('div', 'flex flex-col gap-2')
    this._names.forEach((name, ti) => {
      const row = el('div', 'flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 px-4 py-3')
      row.appendChild(el('span', 'text-xl font-semibold', name))
      const join = el('div', 'join')
      join.setAttribute('role', 'group')
      join.setAttribute('aria-label', name)
      this.cfg.options.forEach((_, oi) => {
        const on = this._votes[ti] === oi
        const b = button(LETTERS[oi], `join-item btn-lg ${on ? 'btn-primary' : 'btn-outline'}`, () => {
          this._votes = this._votes.map((v, i) => (i === ti ? (v === oi ? null : oi) : v))
          this._render()
        })
        b.setAttribute('aria-pressed', String(on))
        join.appendChild(b)
      })
      row.appendChild(join)
      list.appendChild(row)
    })
    body.appendChild(list)

    const done = allVoted(this._votes)
    if (done) {
      if (!this._solo) body.appendChild(this._tally())
    } else if (!this._solo) {
      const waiting = this._votes.filter(v => !Number.isInteger(v)).length
      body.appendChild(el('p', 'text-lg text-base-content/70', t('Teams still to choose: :count', { count: waiting })))
    }
    const reveal = button(t('Reveal'), 'btn-primary btn-lg', () => this._go('chooseReveal'))
    reveal.disabled = !done
    this._footer(body, button(t('Back'), 'btn-ghost', () => this._go('dossier')), reveal)
  }

  _tally () {
    const counts = tally(this._votes, this.cfg.options.length)
    const box = el('section', 'flex flex-col gap-2')
    counts.forEach((n, i) => {
      const row = el('div', 'flex items-center gap-3')
      const bar = el('progress', 'progress progress-primary flex-1')
      bar.max = this._votes.length
      bar.value = n
      append(row, el('span', 'badge badge-lg badge-primary font-bold', LETTERS[i]), bar, el('span', 'w-10 text-right text-xl font-semibold tabular-nums', n))
      box.appendChild(row)
    })
    return box
  }

  _chooseReveal (body) {
    const mine = this._solo && Number.isInteger(this._votes[0]) ? this._votes[0] : null
    append(body,
      this._optionList(this.cfg.answer),
      this._solo ? (mine === null ? null : el('p', 'text-xl font-semibold', `${t('Your choice')}: ${LETTERS[mine]}`)) : this._tally(),
      para(this.cfg.reveal, 'text-2xl leading-relaxed'),
      para(this.cfg.followup, 'text-xl font-semibold'),
      para(this.cfg.source, 'text-sm text-base-content/60'))
    this._footer(body,
      button(t('Back'), 'btn-ghost', () => this._go('vote')),
      button(t('Continue the lesson'), 'btn-primary btn-lg', () => this._finish()))
  }

  // ── Discuss: one question, prompts, evidence, then the closing line ──
  _discuss (body) {
    append(body, el('p', 'text-3xl font-semibold leading-snug', this.cfg.question))
    if (this.cfg.prompts.length) {
      const ol = el('ol', 'list-decimal space-y-2 pl-8 text-2xl leading-relaxed')
      this.cfg.prompts.forEach(p => ol.appendChild(el('li', '', p)))
      body.appendChild(ol)
    }
    if (this.cfg.evidence.length) {
      const grid = el('div', 'grid grid-cols-1 gap-4 sm:grid-cols-2')
      this.cfg.evidence.forEach(e => {
        const fig = el('figure', 'flex flex-col gap-2')
        append(fig, e.image ? image(e.image, e.caption, 'max-h-80 w-full rounded-box object-contain') : null, para(e.caption, 'text-lg text-base-content/80'))
        grid.appendChild(fig)
      })
      body.appendChild(grid)
    }
    if (this._solo) body.appendChild(this._ownAnswer())
    this._footer(body, button(t('Close the discussion'), 'btn-primary btn-lg', () => this._go('closing')))
  }

  /** A pupil's own short answer: kept in this page only, never stored or sent. */
  _ownAnswer () {
    const box = el('label', 'form-control flex flex-col gap-2')
    const area = el('textarea', 'textarea textarea-bordered w-full text-xl')
    area.rows = 3
    area.maxLength = 500
    area.value = this._answer
    area.addEventListener('input', () => { this._answer = area.value })
    append(box,
      el('span', 'text-sm font-semibold uppercase tracking-wider text-base-content/60', t('Your answer')),
      area,
      el('span', 'text-sm text-base-content/60', t('Only you see this answer. It is not sent anywhere.')))
    return box
  }

  _closing (body) {
    append(body, para(this.cfg.closing, 'text-3xl font-semibold leading-snug'))
    this._footer(body,
      button(t('Back'), 'btn-ghost', () => this._go('discuss')),
      button(t('Continue the lesson'), 'btn-primary btn-lg', () => this._finish()))
  }
}
