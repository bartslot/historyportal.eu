/**
 * De lading as a ship's hold (TeamGame, `presentation: 'hold'`): the mission and the pick screen.
 * The compare, last-chance and departure screens are team-hold-compare.js. The rules are
 * cargo-run.js; this is only how they look and what a tap asks of them.
 *
 * Team data goes through ONE accessor, `game.teamStore()` (ids, names, colours, the active team,
 * each team's cargo, saving the run), so a shared class-teams store can replace it.
 *
 * Pick (Bart's mockup, 10-15): a band of team cards (tap = that team is active, tap a loaded item =
 * take it out), the weight bar, the big ship with the active team's hold, and the cargo strip
 * (pictures + cost dots; tap = load into the active team; a pointer may drag a card onto the ship).
 * The ship updates IN PLACE, never by a redraw, so it keeps rolling and its draught can ease.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { createHoldStage, flyCargo, fadeIn, shake, nearlyFull } from './cargo-hold.js'
import { teamCard, costDots, cargoList } from './team-card.js'
import { catalogueOf, totalOf, toggleCargo, confirmCargo, reopenCargo, REFUSED } from './cargo-run.js'
import { compareScreen, exchangeScreen, departScreen } from './team-hold-compare.js'
import { rolesFor, numberWith, roleLine, PROMPT_ROLE } from './team-roles.js'

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }

/** A team's cargo for the hold: what is aboard, in catalogue order (fixed first). */
export const shipCargo = (state, cat) =>
  cat.items.filter(it => state.selected.includes(it.id)).map(it => ({ key: it.id, name: it.name, image: it.image, fixed: it.fixed, cost: it.cost }))

/** Team cards across: all side by side up to four, two rows beyond; one on a solo phone. */
export function bandColumns (teams) {
  if (teams <= 1) return 'grid-cols-1'
  if (teams <= 4) return ['', '', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-2 lg:grid-cols-4'][teams]
  return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}

/** "12/16 geladen · 4 punten over": the counter, in words. */
export const loadLine = (load, budget) =>
  `${t(':load of :capacity points loaded', { load, capacity: budget })} · ${t(':points points left', { points: Math.max(0, budget - load) })}`

export function button (label, className, onClick) {
  const b = el('button', `btn shadow-none ${className}`, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

let opSeq = 0
/** An operation id: a retried tap carries the same one and is applied once. */
export const opId = (what) => `${what}-${Date.now().toString(36)}-${(++opSeq).toString(36)}`

export class HoldScreens {
  constructor (game) {
    this.game = game
    this.cat = catalogueOf(game.cfg)
    this.ui = null
    this.view = { page: 0, pair: [], team: 0, out: null, into: null, confirming: false }
  }

  get store () { return this.game.teamStore() }

  /** Team i's roles at this interaction, or null when roles are off (or solo: no numbers). */
  roles (i) {
    const store = this.store
    if (!store.rolesOn() || this.game._solo) return null
    return rolesFor(this.game.cfg.roles, store.size(i), store.interaction())
  }

  /** "1 Kapitein · 2 Bootsman · 3 Verkenner · 4 Stuurman" for team i, or ''. */
  roleLine (i) { const a = this.roles(i); return a ? roleLine(a) : '' }

  /**
   * A quiet prompt naming the number and role that acts now ("Nummer 2, Bootsman: past het
   * nog?"), per team only where teams of three differ, with "Volgende beurt" for the teacher.
   * Solo: the question alone, no numbers.
   * @param {'fit'|'ready'|'why'|'swap'|'risk'} kind
   */
  rolePrompt (kind) {
    const store = this.store
    const role = this.game.cfg.roles[PROMPT_ROLE[kind]]
    if (!store.rolesOn() || !role) return null
    const ask = {
      fit: [t('Does it still fit?'), (n, r) => t('Number :n, :role: does it still fit?', { n, role: r })],
      ready: [t('Are you ready?'), (n, r) => t('Number :n, :role: are you ready?', { n, role: r })],
      why: [t('Why did you choose this?'), (n, r) => t('Number :n, :role: why did you choose this?', { n, role: r })],
      swap: [t('Swap or keep as it is?'), (n, r) => t('Number :n, :role: swap or keep as it is?', { n, role: r })],
      risk: [t('What could go wrong?'), (n, r) => t('Number :n, :role: what could go wrong?', { n, role: r })],
    }[kind]
    const box = el('div', 'flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-base-content/80')
    box.dataset.rolePrompt = kind
    if (this.game._solo) {
      box.appendChild(el('p', '', ask[0]))
      return box
    }
    const lines = new Map()
    for (let i = 0; i < store.count(); i++) {
      const n = numberWith(this.roles(i), role)
      if (!lines.has(n)) lines.set(n, [])
      lines.get(n).push(store.name(i))
    }
    const many = lines.size > 1
    for (const [n, teams] of lines) box.appendChild(el('p', '', `${many ? `${teams.join(', ')}: ` : ''}${ask[1](n, role)}`))
    return box
  }

  /** The teacher's "Volgende beurt": every role moves on by one. */
  _nextTurn () {
    if (!this.store.rolesOn() || this.game._solo) return null
    return button(t('Next turn'), 'btn-ghost btn-sm', () => { this.store.nextTurn(); this.game._render() })
  }

  /** The weight bar: amber as it fills, the warning tint near full; `shake` on a refusal. */
  _weight () {
    const wrap = el('div', 'flex flex-wrap items-center gap-x-4 gap-y-1')
    const bar = el('progress', 'progress h-4 min-w-40 flex-1')
    bar.max = this.cat.budget
    const count = el('span', 'text-lg font-semibold tabular-nums')
    count.setAttribute('aria-live', 'polite')
    append(wrap, bar, count)
    return { wrap, bar, count }
  }

  _paintWeight (w, load) {
    w.bar.value = Math.min(load, this.cat.budget)
    w.bar.classList.toggle('progress-warning', nearlyFull(load, this.cat.budget))
    w.bar.classList.toggle('progress-primary', !nearlyFull(load, this.cat.budget))
    w.count.textContent = loadLine(load, this.cat.budget)
  }

  _stage (opts = {}) {
    return createHoldStage({ hold: this.game.cfg.hold, ...opts })
  }

  // ── ① Mission ──
  mission (body) {
    const { cfg, _solo: solo } = this.game
    const stage = this._stage({ whole: true, stageAspect: 2.4, className: 'h-[clamp(200px,44vh,600px)] w-full rounded-box' })
    const fixedOnly = { selected: [...this.cat.fixedIds] }
    stage.update({ key: 'mission', cargo: shipCargo(fixedOnly, this.cat), capacity: this.cat.budget, load: totalOf(fixedOnly.selected, this.cat) })
    const w = this._weight()
    this._paintWeight(w, totalOf(fixedOnly.selected, this.cat))
    append(body,
      el('p', 'text-2xl font-semibold leading-snug sm:text-3xl', cfg.mission || cfg.intro || ''),
      stage.el, w.wrap,
      cfg.rules ? el('p', 'text-sm text-base-content/70', cfg.rules) : null,
      !solo && this.store.rolesOn() ? el('p', 'text-lg', t('Choose within your team who is 1, 2, 3 and 4.')) : null,
      solo ? null : this.game._teamControls())
    this.game._footer(body, button(t('Start'), 'btn-primary btn-lg', () => (solo ? this.game._go('load') : this.game._startTeams())))
  }

  // ── ②③ Choose and load ──
  pick (body) {
    const { cfg, _solo: solo } = this.game
    const store = this.store
    const ui = { cards: new Map() }
    this.ui = ui

    ui.band = el('div', `grid grid-cols-1 gap-2 ${bandColumns(store.count())}`)
    // The roles line once for the class when every team has the same; on a card only where it differs.
    const lines = Array.from({ length: store.count() }, (_, i) => this.roleLine(i))
    this.view.sharedRoles = lines.every(l => l === lines[0]) ? lines[0] : ''
    // One line over the band: who holds which role (when every team has the same), and the prompt.
    ui.roleRow = el('div', 'flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1')
    append(ui.roleRow, this.view.sharedRoles ? el('p', 'text-sm text-base-content/80', this.view.sharedRoles) : el('span'), this.rolePrompt('fit'))
    append(body, ui.roleRow, ui.band)

    ui.weight = this._weight()
    ui.ready = el('span', 'badge badge-lg badge-outline tabular-nums')
    if (!solo) ui.weight.wrap.appendChild(ui.ready)
    body.appendChild(ui.weight.wrap)

    const wrap = el('div', 'relative')
    ui.stage = this._stage({
      zoomed: true, stageAspect: 3.2,
      className: 'h-[clamp(190px,27vh,560px)] w-full rounded-box',
      onPiece: (id) => this.toggle(id),
      pieceLabel: (c) => (c.fixed ? `${c.name}, ${t('Always on board')}` : t('Take out: :item', { item: c.name })),
    })
    ui.stage.el.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('text/x-cargo')) e.preventDefault() })
    ui.stage.el.addEventListener('drop', (e) => {
      const id = e.dataTransfer?.getData('text/x-cargo')
      if (!id || store.cargo(store.active()).selected.includes(id)) return
      e.preventDefault()
      this.toggle(id, { dropped: true })
    })
    // The slot is always there, over the sky, so a message never moves the hold under a tap.
    ui.warn = el('div', 'alert alert-warning invisible absolute inset-x-3 top-3 text-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2')
    ui.list = el('div')
    append(wrap, ui.stage.el, ui.warn, ui.list)
    body.appendChild(wrap)

    // The strip: pictures and cost dots only, so it reads from the back; the name (and the card's
    // question) on hover, focus or a long press, and in its accessible name.
    const strip = el('div', 'grid gap-2')
    strip.style.gridTemplateColumns = 'repeat(auto-fit, minmax(4.5rem, 1fr))'
    this.cat.optional.forEach(item => {
      const card = el('button', 'flex flex-col items-center gap-1 rounded-box border-2 p-1.5 lp-sheet transition-colors')
      card.type = 'button'
      card.dataset.cargoCard = item.id
      card.dataset.tooltip = item.why ? `${item.name}: ${item.why}` : item.name
      card.setAttribute('aria-label', t(':item, costs :points points', { item: item.name, points: item.cost }))
      const pic = el('div', 'pointer-events-none flex aspect-square w-full items-center justify-center transition-opacity')
      pic.dataset.cargoPic = ''
      if (item.image) {
        const img = el('img', 'h-full w-full object-contain')
        img.src = item.image
        img.alt = ''
        img.draggable = false
        pic.appendChild(img)
      } else {
        pic.appendChild(el('span', 'line-clamp-3 text-center text-sm font-semibold leading-tight', item.name))
      }
      append(card, pic, costDots(item.cost))
      card.draggable = true
      card.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/x-cargo', item.id) })
      card.addEventListener('click', () => this.toggle(item.id))
      strip.appendChild(card)
      ui.cards.set(item.id, card)
    })
    body.appendChild(strip)

    // One primary action: "Klaar" for the active team. Under budget it asks first.
    ui.confirm = el('div', 'flex flex-wrap items-center justify-end gap-3')
    this.refresh()
    this.game._footer(body,
      this._nextTurn(),
      button(t('To the results'), 'btn-ghost', () => this.openCompare()),
      this.rolePrompt('ready'),
      ui.confirm)
  }

  /** Bring the pick screen in line with the data, in place. @returns {string[]} ids new in the hold */
  refresh () {
    const ui = this.ui
    if (!ui) return []
    const store = this.store
    const active = store.active()
    const state = store.cargo(active)
    const load = totalOf(state.selected, this.cat)

    ui.band.replaceChildren(...Array.from({ length: store.count() }, (_, i) => teamCard({
      name: store.name(i), tone: store.tone(i), state: store.cargo(i), cat: this.cat, active: i === active, roles: this.view.sharedRoles ? '' : this.roleLine(i),
      onSelect: this.game._solo ? null : () => { if (i !== store.active()) { store.setActive(i); this.game._warning = ''; this.view.confirming = false; this.refresh() } },
      onItem: (id) => { store.setActive(i); this.toggle(id) },
    })))
    this._paintWeight(ui.weight, load)
    const ready = Array.from({ length: store.count() }, (_, i) => store.cargo(i).confirmed).filter(Boolean).length
    ui.ready.textContent = t(':count of :total ready', { count: ready, total: store.count() })
    const warning = this.game._warning
    ui.warn.textContent = warning || ' '
    ui.warn.classList.toggle('invisible', !warning)
    if (warning) ui.warn.setAttribute('role', 'alert'); else ui.warn.removeAttribute('role')
    ui.cards.forEach((card, id) => {
      const on = state.selected.includes(id)
      card.setAttribute('aria-pressed', String(on))
      card.classList.toggle('border-primary', on)
      card.classList.toggle('border-transparent', !on)
      card.querySelector('[data-cargo-pic]')?.classList.toggle('opacity-25', on)
    })
    ui.list.replaceChildren(cargoList(state, this.cat))
    ui.confirm.replaceChildren(...this._confirmControls(active, state, load))
    return ui.stage.update({ key: active, cargo: shipCargo(state, this.cat), capacity: this.cat.budget, load })
  }

  /** "Klaar" / "Je hebt nog punten over. Toch klaar?" / the teacher's reopen. */
  _confirmControls (active, state, load) {
    const store = this.store
    const set = (r) => { if (r.ok) { store.setCargo(active, r.state); store.save() } this.view.confirming = false; this.refresh() }
    if (state.confirmed) {
      return [el('span', 'text-lg font-semibold', t('Ready')),
        button(t('Reopen'), 'btn-outline', () => set(reopenCargo(store.cargo(active))))]
    }
    if (this.view.confirming) {
      return [el('span', 'text-lg', t('You still have points left. Ready anyway?')),
        button(t('Back'), 'btn-ghost', () => { this.view.confirming = false; this.refresh() }),
        button(t('Ready anyway'), 'btn-primary btn-lg', () => set(confirmCargo(store.cargo(active), opId('confirm'))))]
    }
    return [button(t('Ready'), 'btn-primary btn-lg', () => {
      if (load < this.cat.budget) { this.view.confirming = true; this.refresh() } else set(confirmCargo(store.cargo(active), opId('confirm')))
    })]
  }

  /** Load or unload item `id` for the active team, with the flight. */
  toggle (id, { dropped = false } = {}) {
    const store = this.store
    const active = store.active()
    const ui = this.ui
    const item = this.cat.byId.get(id)
    const cardPic = ui?.cards.get(id)?.querySelector('[data-cargo-pic]')
    const leaving = ui?.stage.piece(id)?.getBoundingClientRect()

    const result = toggleCargo(store.cargo(active), id, this.cat, opId('toggle'))
    if (!result.ok) {
      this.game._warning = result.reason === REFUSED.budget ? t('Not enough points. Take something out first.') : ''
      this.refresh()
      if (result.reason === REFUSED.budget) shake(ui?.weight.wrap)
      return
    }
    store.setCargo(active, result.state)
    store.save()
    this.game._warning = ''
    this.view.confirming = false
    const added = this.refresh()
    const src = item?.image
    if (added.includes(id)) {
      const piece = ui.stage.piece(id)
      if (dropped || !src || !cardPic) { fadeIn(piece); return }
      piece.style.opacity = '0'
      const shown = () => { piece.style.opacity = '' }
      if (!flyCargo(src, cardPic.getBoundingClientRect(), piece.getBoundingClientRect(), { then: shown })) fadeIn(piece)
    } else if (leaving && src && cardPic) {
      flyCargo(src, leaving, cardPic.getBoundingClientRect(), { back: true })
    }
  }

  /** Open Resultaten: the comparison is a snapshot taken now (plan §6). */
  openCompare () {
    const store = this.store
    this.game._compareSnapshot = Array.from({ length: store.count() }, (_, i) => store.cargo(i))
    this.view = { ...this.view, page: 0, pair: [] }
    store.save()
    this.game._go('compare')
  }

  compare (body) { compareScreen(this, body) }
  exchange (body) { exchangeScreen(this, body) }
  depart (body) { departScreen(this, body) }
}
