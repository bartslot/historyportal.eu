/**
 * The budget game as a ship's hold (TeamGame, `presentation: 'hold'`): the pick screen and the
 * results. The rules stay TeamGame's (toggleItem, loadOf); this is only how they look.
 *
 * Team data goes through ONE accessor, `game.teamStore()` (names, colours, the active team, each
 * team's picks), so a shared class-teams store can replace it without touching this file.
 *
 * Pick (Bart's mockup, 10-15): a band of team cards (team-card.js; tap one = that team is active,
 * tap a loaded item = take it out), the weight bar, the ship at the active team's load, and the
 * cargo strip (pictures + cost dots; tap = load into the active team; a pointer may drag a card
 * onto the ship). The ship updates IN PLACE, never by a redraw, so it keeps rolling and its
 * draught eases to the new load.
 *
 * Results: the ship on top shows the chosen team's hold; below it a paper sheet with the same
 * team cards (and the real expedition's), and the legend of every item.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { toggleItem, loadOf } from './TeamGame.js'
import { createHoldStage, flyCargo, fadeIn, shake, nearlyFull } from './cargo-hold.js'
import { teamCard, cargoLegend, costDots, costOf, REAL_TONE } from './team-card.js'

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }

/** One team's cargo for the hold, fixed first, then the picks in the order they were loaded. */
export function cargoOf (picked, items = [], fixed = []) {
  return [
    ...fixed.map((f, i) => ({ key: `f${i}`, name: f.name, cost: costOf(f), image: f.image || '', fixed: true })),
    ...[...picked].filter(i => items[i]).map(i => ({ key: `i${i}`, name: items[i].name, cost: costOf(items[i]), image: items[i].image || '' })),
  ]
}

/** What the real expedition carried: the fixed items and every item marked `real`. */
export const realPicks = (items = []) => new Set(items.map((it, i) => (it?.real ? i : -1)).filter(i => i >= 0))

/** Tile columns on a team card: every item in two rows (at least four across). */
export const tileColumns = (count) => Math.max(4, Math.ceil(count / 2))

/** Team cards across: all side by side up to four, two rows beyond; one on a solo phone. */
export function bandColumns (teams) {
  if (teams <= 1) return 'grid-cols-1'
  if (teams <= 4) return ['', '', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-2 lg:grid-cols-4'][teams]
  return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}

export class HoldScreens {
  constructor (game) {
    this.game = game
    this.memory = new Map()    // team index -> where its cargo sits in the hold, kept across redraws
    this.ui = null
  }

  get store () { return this.game.teamStore() }

  _button (label, className, onClick) {
    const b = el('button', `btn ${className}`, label)
    b.type = 'button'
    b.addEventListener('click', onClick)
    return b
  }

  // ── Pick ──
  pick (body) {
    const { cfg, _solo: solo } = this.game
    const store = this.store
    const ui = { cards: new Map() }
    this.ui = ui

    ui.band = el('div', `grid grid-cols-1 gap-2 ${bandColumns(store.count())}`)
    body.appendChild(ui.band)

    // The weight bar: amber as it fills, the warning tint near full; a refused tap shakes it.
    ui.weight = el('div', 'flex items-center gap-3')
    ui.bar = el('progress', 'progress h-4 flex-1')
    ui.bar.max = cfg.capacity
    ui.count = el('span', 'w-24 text-right text-2xl font-bold tabular-nums')
    append(ui.weight, ui.bar, ui.count)
    body.appendChild(ui.weight)

    const wrap = el('div', 'relative')
    ui.stage = createHoldStage({
      hold: cfg.hold,
      memory: this.memory,
      className: 'h-[clamp(200px,34vh,560px)] w-full rounded-box',
      onPiece: (key) => this.toggle(Number(key.slice(1))),
      pieceLabel: (c) => (c.fixed ? `${c.name}, ${t('Always on board')}` : t('Take out: :item', { item: c.name })),
    })
    ui.stage.el.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('text/x-cargo')) e.preventDefault() })
    ui.stage.el.addEventListener('drop', (e) => {
      const i = Number(e.dataTransfer?.getData('text/x-cargo'))
      if (!Number.isInteger(i) || store.picked(store.active()).has(i)) return
      e.preventDefault()
      this.toggle(i, { dropped: true })
    })
    // The slot is always there, over the sky, so a warning never moves the hold under a tap.
    ui.warn = el('div', 'alert alert-warning invisible absolute inset-x-3 top-3 text-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2')
    append(wrap, ui.stage.el, ui.warn)
    body.appendChild(wrap)

    // The strip: pictures and cost dots only, so it reads from the back; the name (and the
    // card's question) on hover, focus or a long press.
    const strip = el('div', 'grid gap-2')
    strip.style.gridTemplateColumns = 'repeat(auto-fit, minmax(4.5rem, 1fr))'
    cfg.items.forEach((item, i) => {
      const card = el('button', 'card flex flex-col items-center gap-1 rounded-box border-2 p-1.5 lp-sheet transition-colors')
      card.type = 'button'
      card.dataset.cargoCard = String(i)
      card.dataset.tooltip = item.why ? `${item.name}: ${item.why}` : item.name
      card.setAttribute('aria-label', t(':item, costs :points points', { item: item.name, points: costOf(item) }))
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
      append(card, pic, costDots(costOf(item)))
      card.draggable = true
      card.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/x-cargo', String(i)) })
      card.addEventListener('click', () => this.toggle(i))
      strip.appendChild(card)
      ui.cards.set(i, card)
    })
    body.appendChild(strip)

    this.refresh()
    this.game._footer(body,
      solo ? null : this._button(t('Back'), 'btn-ghost', () => this.game._go('setup')),
      this._button(t('Reveal'), 'btn-primary btn-lg', () => this.game._go('budgetReveal')))
  }

  _band (active, onSelect, onItem) {
    const { items, fixed } = this.game.cfg
    const store = this.store
    const cols = tileColumns(fixed.length + items.length)
    return Array.from({ length: store.count() }, (_, i) => teamCard({
      name: store.name(i), tone: store.tone(i), picked: store.picked(i), items, fixed,
      load: loadOf(store.picked(i), items, fixed), active: i === active, cols,
      onSelect: onSelect ? () => onSelect(i) : null,
      onItem: onItem ? (index) => onItem(i, index) : null,
    }))
  }

  /** Bring the screen in line with the data, in place. @returns {string[]} keys new in the hold */
  refresh () {
    const ui = this.ui
    if (!ui) return []
    const { items, fixed, capacity } = this.game.cfg
    const store = this.store
    const active = store.active()
    const picked = store.picked(active)
    const load = loadOf(picked, items, fixed)

    ui.band.replaceChildren(...this._band(active,
      this.game._solo ? null : (i) => { if (i !== store.active()) { store.setActive(i); this.game._warning = ''; this.refresh() } },
      (team, index) => { store.setActive(team); this.toggle(index) }))
    ui.bar.value = Math.min(load, capacity)
    ui.bar.classList.toggle('progress-warning', nearlyFull(load, capacity))
    ui.bar.classList.toggle('progress-primary', !nearlyFull(load, capacity))
    ui.bar.setAttribute('aria-label', t(':load of :capacity points loaded', { load, capacity }))
    ui.count.textContent = `${load} / ${capacity}`
    const warning = this.game._warning
    ui.warn.textContent = warning || ' '
    ui.warn.classList.toggle('invisible', !warning)
    if (warning) ui.warn.setAttribute('role', 'alert'); else ui.warn.removeAttribute('role')
    ui.cards.forEach((card, i) => {
      const on = picked.has(i)
      card.setAttribute('aria-pressed', String(on))
      card.classList.toggle('border-primary', on)
      card.classList.toggle('border-transparent', !on)
      card.querySelector('[data-cargo-pic]')?.classList.toggle('opacity-25', on)
    })
    return ui.stage.update({ key: active, cargo: cargoOf(picked, items, fixed), capacity, load })
  }

  /** Load or unload item `index` for the active team, with the flight. */
  toggle (index, { dropped = false } = {}) {
    const { items, fixed, capacity } = this.game.cfg
    const store = this.store
    const active = store.active()
    const key = `i${index}`
    const ui = this.ui
    const cardPic = ui?.cards.get(index)?.querySelector('[data-cargo-pic]')
    const leaving = ui?.stage.piece(key)?.getBoundingClientRect()

    const result = toggleItem(store.picked(active), index, items, fixed, capacity)
    if (!result.ok) {
      this.game._warning = this.game._solo
        ? t('Too heavy: that would be :load of :capacity points. Leave something behind first.', { load: result.wouldBe, capacity })
        : t('Too heavy: :team would carry :load of :capacity points. Leave something behind first.', {
          team: store.name(active), load: result.wouldBe, capacity,
        })
      this.refresh()
      shake(ui?.weight)
      return
    }
    store.setPicked(active, result.picked)
    this.game._warning = ''
    const added = this.refresh()
    const src = items[index]?.image
    if (added.includes(key)) {
      const piece = ui.stage.piece(key)
      if (dropped || !src || !cardPic) { fadeIn(piece); return }
      piece.style.opacity = '0'
      const shown = () => { piece.style.opacity = '' }
      if (!flyCargo(src, cardPic.getBoundingClientRect(), piece.getBoundingClientRect(), { then: shown })) fadeIn(piece)
    } else if (leaving && src && cardPic) {
      flyCargo(src, leaving, cardPic.getBoundingClientRect(), { back: true })
    }
  }

  // ── Results: the chosen team's ship on top, the results sheet below (Bart's mockup, 10-15) ──
  reveal (body) {
    const game = this.game
    const { cfg } = game
    const { items, fixed, capacity, hold } = cfg
    const store = this.store
    const holds = Array.from({ length: store.count() }, (_, i) => ({ name: store.name(i), picked: store.picked(i), tone: store.tone(i) }))
    const real = realPicks(items)
    if (real.size) holds.push({ name: t('The real expedition'), picked: real, tone: REAL_TONE })

    const stage = createHoldStage({ hold, className: 'h-[clamp(200px,40vh,540px)] w-full rounded-box', pieceLabel: (c) => c.name })
    const band = el('div', `grid grid-cols-1 gap-3 ${bandColumns(holds.length)}`)
    const cols = tileColumns(fixed.length + items.length)
    const show = (n) => {
      const h = holds[n]
      const load = loadOf(h.picked, items, fixed)
      stage.update({ key: `r${n}`, cargo: cargoOf(h.picked, items, fixed), capacity, load })
      band.replaceChildren(...holds.map((x, i) => teamCard({
        ...x, items, fixed, load: loadOf(x.picked, items, fixed), active: i === n, cols, onSelect: () => show(i),
      })))
    }

    const sheet = el('section', 'lp-sheet grid gap-6 rounded-box p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto]')
    const results = el('div', 'flex min-w-0 flex-col gap-4')
    append(results,
      append(el('div', 'flex flex-col gap-1'),
        el('h3', 'font-history text-4xl leading-none sm:text-5xl', t('Results')),
        el('p', 'text-lg opacity-70', t('Who packed the best cargo?'))),
      band)
    append(sheet, results, cargoLegend(items, fixed))

    append(body, stage.el, sheet,
      cfg.reveal ? el('p', 'text-2xl leading-relaxed', cfg.reveal) : null,
      game._labelled(t('What later scenes need'), cfg.needs),
      cfg.followup ? el('p', 'text-xl font-semibold', cfg.followup) : null,
      cfg.source ? el('p', 'text-sm text-base-content/60', cfg.source) : null)
    show(0)
    game._footer(body,
      this._button(t('Back'), 'btn-ghost', () => game._go('load')),
      this._button(t('Continue the lesson'), 'btn-primary btn-lg', () => game._finish()))
  }
}
