/**
 * De lading after the choosing (plan §6-§8): Resultaten (compare the ships), Laatste kans (one
 * exchange or keep) and Klaar voor vertrek? (lock and sail). Screens of HoldScreens (team-hold.js);
 * the rules are cargo-run.js. One primary action per screen; the teacher moves the class on.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { createHoldStage, flyCargo, fadeIn } from './cargo-hold.js'
import { cargoList, costDots, statusText, SHIP_ICON } from './team-card.js'
import {
  totalOf, missingPrompt, differing, pagesOfFour, previewExchange, exchangeCargo, keepCargo, resetExchange, lockDeparture,
} from './cargo-run.js'
import { shipCargo, button, opId } from './team-hold.js'

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }


/**
 * One team's ship, small: a quiet stage zoomed on the hull, the label in the team's colour (name +
 * "12/16"), its status in words and the cargo as a list for screen readers. Reused by the end-of-
 * lesson board later.
 */
export function teamShip (screens, { name, tone, state, onTap = null, big = false, status = true, whole = false }) {
  const { cat } = screens
  const load = totalOf(state.selected, cat)
  const fig = el(onTap ? 'button' : 'figure', 'flex min-w-0 flex-col gap-1 rounded-box border-2 border-transparent text-left')
  if (onTap) { fig.type = 'button'; fig.addEventListener('click', onTap) }
  fig.dataset.teamShip = name
  const stage = createHoldStage({
    // The comparison reads the cargo, so it zooms on the hull (the whole ship left the cargo at
    // ~15 px, unreadable from the back); the departure shows the whole ship sailing out.
    hold: screens.game.cfg.hold, zoomed: !whole, whole, stageAspect: whole ? 2 : big ? 2 : 2.5, quiet: !whole,
    className: `w-full rounded-box ${whole ? 'aspect-[2/1]' : big ? 'aspect-[2/1]' : 'aspect-[5/2]'}`,
  })
  stage.update({ key: name, cargo: shipCargo(state, cat), capacity: cat.budget, load })
  const label = el('span', `flex items-center gap-2 self-start rounded-full px-3 py-1 ${tone.head}`)
  const ship = el('span', 'flex')
  ship.innerHTML = SHIP_ICON
  append(label, ship, el('span', 'break-words font-semibold', name), el('span', 'font-bold tabular-nums', `${load}/${cat.budget}`))
  const cap = el('span', 'flex flex-wrap items-center gap-2')
  append(cap, label, status ? el('span', 'text-sm text-base-content/70', statusText(state)) : null)
  append(fig, stage.el, cap, cargoList(state, cat))
  fig.setAttribute('aria-label', status ? `${name}, ${load}/${cat.budget}, ${statusText(state)}` : `${name}, ${load}/${cat.budget}`)
  return { el: fig, stage }
}

function heading (title, line = '') {
  const box = el('div', 'flex flex-col gap-1')
  append(box, el('h3', 'font-history text-4xl leading-none sm:text-5xl', title), line ? el('p', 'text-xl text-base-content/80', line) : null)
  return box
}

// ── ④ Resultaten ──
export function compareScreen (screens, body) {
  const { game, cat } = screens
  const store = screens.store
  const snapshot = game._compareSnapshot ?? Array.from({ length: store.count() }, (_, i) => store.cargo(i))
  const view = screens.view
  const teams = snapshot.map((state, i) => ({ i, name: store.name(i), tone: store.tone(i), state }))

  body.appendChild(heading(t('Results')))
  const prompt0 = screens.rolePrompt('why')
  if (prompt0) body.appendChild(prompt0)
  const area = el('div', 'flex flex-col gap-3')
  body.appendChild(area)
  const draw = () => {
    area.replaceChildren()
    const pair = view.pair.length === 2 ? view.pair : null
    if (pair) {
      // Two ships, big, side by side; what only one of them has gets a flat amber outline.
      const [a, b] = pair.map(i => teams[i])
      const only = differing(a.state.selected, b.state.selected)
      const row = el('div', 'grid grid-cols-1 gap-4 md:grid-cols-2')
      ;[a, b].forEach(team => {
        const ship = teamShip(screens, { ...team, big: true, onTap: () => { view.pair = []; draw() } })
        ship.stage.highlight(only)
        const mine = cat.items.filter(it => only.has(it.id) && team.state.selected.includes(it.id)).map(it => it.name)
        if (mine.length) ship.el.appendChild(el('p', 'text-base', `${t('Only here')}: ${mine.join(', ')}`))
        row.appendChild(ship.el)
      })
      append(area, row, button(t('All ships'), 'btn-ghost self-start', () => { view.pair = []; draw() }))
      return
    }
    const pages = pagesOfFour(teams.length)
    const page = pages[Math.min(view.page, pages.length - 1)] ?? []
    const grid = el('div', `grid grid-cols-1 gap-4 ${page.length > 1 ? 'md:grid-cols-2' : ''}`)
    page.forEach(i => {
      const ship = teamShip(screens, {
        ...teams[i],
        onTap: game._solo ? null : () => {
          view.pair = view.pair.includes(i) ? view.pair.filter(x => x !== i) : [...view.pair, i].slice(-2)
          draw()
        },
      })
      if (view.pair.includes(i)) ship.el.classList.replace('border-transparent', 'border-primary')
      grid.appendChild(ship.el)
    })
    area.appendChild(grid)
    if (pages.length > 1) {
      const nav = el('div', 'join self-start')
      pages.forEach((_, p) => {
        const b = button(String(p + 1), `join-item btn-sm ${p === view.page ? 'btn-active' : ''}`, () => { view.page = p; view.pair = []; draw() })
        b.setAttribute('aria-label', t('Ships :from to :to', { from: p * 4 + 1, to: Math.min(teams.length, p * 4 + 4) }))
        nav.appendChild(b)
      })
      area.appendChild(nav)
    }
  }
  draw()
  screens._escape = () => { if (view.pair.length) { view.pair = []; draw() } }

  // "Wat zou jij nog meenemen?": what no confirmed team took, in catalogue order; a prompt, not an answer.
  const missing = missingPrompt(snapshot, cat)
  const prompt = el('section', 'flex flex-col gap-3 rounded-box lp-sheet p-4')
  prompt.appendChild(el('h4', 'text-2xl font-semibold', missing.length ? t('What would you still take?') : t('Which choice stands out to you?')))
  if (missing.length) {
    const row = el('div', 'grid grid-cols-3 gap-4 sm:max-w-xl')
    missing.forEach(id => {
      const it = cat.byId.get(id)
      const fig = el('figure', 'flex flex-col items-center gap-1')
      if (it.image) { const img = el('img', 'aspect-square w-full object-contain'); img.src = it.image; img.alt = ''; fig.appendChild(img) }
      fig.appendChild(el('figcaption', 'text-center text-base font-semibold', it.name))
      row.appendChild(fig)
    })
    prompt.appendChild(row)
  }
  if (game.cfg.followup) prompt.appendChild(el('p', 'text-base opacity-70', game.cfg.followup))
  body.appendChild(prompt)

  // "De echte lading" stays off until its claims are checked against the sources (PM 10-15): the
  // `real` marks are an inference from our own reveal text, not a verified answer for pupils.
  game._footer(body,
    button(t('Last chance'), 'btn-primary btn-lg', () => { view.team = 0; view.out = null; view.into = null; game._go('exchange') }))
}

// ── ⑤ Laatste kans ──
export function exchangeScreen (screens, body) {
  const { game, cat } = screens
  const store = screens.store
  const view = screens.view
  body.appendChild(heading(t('Last chance'), t('What would you still change?')))
  ;['risk', 'swap'].forEach(kind => { const p = screens.rolePrompt(kind); if (p) body.appendChild(p) })

  // The teams as chips in their colour, with where each stands; tap = work on that team.
  if (!game._solo) {
    const chips = el('div', 'flex flex-wrap gap-2')
    chips.setAttribute('role', 'tablist')
    for (let i = 0; i < store.count(); i++) {
      const s = store.cargo(i)
      const chip = el('button', `btn h-auto min-h-12 flex-col items-start gap-0 rounded-box border-2 py-1 shadow-none ${store.tone(i).head} ${i === view.team ? 'border-base-content' : 'border-transparent'}`)
      chip.type = 'button'
      chip.setAttribute('role', 'tab')
      chip.setAttribute('aria-selected', String(i === view.team))
      append(chip, el('span', 'font-semibold', store.name(i)), el('span', 'text-xs font-normal', exchangeStatus(s)))
      chip.addEventListener('click', () => { view.team = i; view.out = null; view.into = null; game._render() })
      chips.appendChild(chip)
    }
    body.appendChild(chips)
  }

  const i = Math.min(view.team, store.count() - 1)
  const state = store.cargo(i)
  const stage = createHoldStage({
    hold: game.cfg.hold, zoomed: true, stageAspect: 3.2, className: 'h-[clamp(220px,38vh,560px)] w-full rounded-box',
    onPiece: state.exchange.state === 'open' && state.confirmed ? (id) => { view.out = view.out === id ? null : id; game._render() } : null,
    pieceLabel: (c) => (c.fixed ? `${c.name}, ${t('Always on board')}` : t('Swap out: :item', { item: c.name })),
  })
  const load = totalOf(state.selected, cat)
  stage.update({ key: `x${i}`, cargo: shipCargo(state, cat), capacity: cat.budget, load })
  if (view.out) stage.highlight(new Set([view.out]))
  append(body, stage.el, cargoList(state, cat))

  const open = state.confirmed && state.exchange.state === 'open'
  const panel = el('div', 'flex flex-col gap-3')
  body.appendChild(panel)
  if (!state.confirmed) {
    panel.appendChild(el('p', 'text-xl', `${store.name(i)}: ${t('Not yet confirmed')}`))
  } else if (!open) {
    panel.appendChild(el('p', 'text-xl font-semibold', exchangeStatus(state)))
    panel.appendChild(button(t('Undo the swap'), 'btn-ghost btn-sm self-start', () => {
      const r = resetExchange(state)
      if (r.ok) { store.setCargo(i, r.state); store.save() }
      game._render()
    }))
  } else {
    // The absent items, to swap in; then the preview, then one confirm.
    const strip = el('div', 'grid gap-2')
    strip.style.gridTemplateColumns = 'repeat(auto-fit, minmax(4.5rem, 1fr))'
    cat.optional.filter(it => !state.selected.includes(it.id)).forEach(it => {
      const card = el('button', `flex flex-col items-center gap-1 rounded-box border-2 p-1.5 lp-sheet ${view.into === it.id ? 'border-primary' : 'border-transparent'}`)
      card.type = 'button'
      card.dataset.swapIn = it.id
      card.dataset.tooltip = it.name
      card.setAttribute('aria-pressed', String(view.into === it.id))
      card.setAttribute('aria-label', t(':item, costs :points points', { item: it.name, points: it.cost }))
      if (it.image) { const img = el('img', 'pointer-events-none aspect-square w-full object-contain'); img.src = it.image; img.alt = ''; card.appendChild(img) } else card.appendChild(el('span', 'text-sm font-semibold', it.name))
      card.appendChild(costDots(it.cost))
      card.addEventListener('click', () => { view.into = view.into === it.id ? null : it.id; game._render() })
      strip.appendChild(card)
    })
    panel.appendChild(strip)
    const row = el('div', 'flex flex-wrap items-center gap-3')
    const p = view.out && view.into ? previewExchange(state, view.out, view.into, cat) : null
    if (p) {
      const line = `− ${cat.byId.get(view.out).name} (${cat.byId.get(view.out).cost})  + ${cat.byId.get(view.into).name} (${cat.byId.get(view.into).cost})  → ${p.after}/${cat.budget}`
      row.appendChild(el('span', `text-xl font-semibold tabular-nums ${p.ok ? '' : 'text-error'}`, line))
      if (!p.ok) row.appendChild(el('span', 'text-lg', t('Not enough points. Take something out first.')))
    }
    row.appendChild(button(t('Keep as it is'), 'btn-outline', () => {
      const r = keepCargo(state, opId('keep'))
      if (r.ok) { store.setCargo(i, r.state); store.save() }
      view.out = null; view.into = null
      game._render()
    }))
    if (p?.ok) {
      row.appendChild(button(t('Swap'), 'btn-primary btn-lg', () => swap(screens, i, stage)))
    }
    panel.appendChild(row)
  }

  game._footer(body,
    button(t('Back'), 'btn-ghost', () => game._go('compare')),
    button(t('Ready to set sail?'), 'btn-primary btn-lg', () => game._go('depart')))
}

/** Apply the previewed swap once (a second tap is the same operation), with one small exchange. */
function swap (screens, i, stage) {
  const { game, cat, view } = screens
  const store = screens.store
  const out = view.out
  const into = view.into
  view.op ??= opId('swap')
  const from = stage.piece(out)?.getBoundingClientRect()
  const r = exchangeCargo(store.cargo(i), out, into, cat, view.op)
  if (!r.ok) { game._render(); return }
  store.setCargo(i, r.state)
  store.save()
  view.out = null; view.into = null; view.op = null
  // One small exchange in the hold: the old package lifts out, the new one fades into its own slot.
  const src = cat.byId.get(out)?.image
  if (from && src) flyCargo(src, from, { left: from.left, top: from.top - from.height, width: from.width, height: from.height }, { back: true })
  game._render()
  fadeIn(game.host.querySelector(`[data-hold-stage] [data-cargo="${into}"]:not([aria-hidden])`))
}

export function exchangeStatus (state) {
  if (!state.confirmed) return t('Not yet confirmed')
  if (state.exchange.state === 'swapped') return t('Swapped')
  if (state.exchange.state === 'kept') return t('Kept as it is')
  return t('Can still swap one thing')
}

// ── ⑥ Klaar voor vertrek? ──
export function departScreen (screens, body) {
  const { game, cat } = screens
  const store = screens.store
  const locked = !!store.locked()
  body.appendChild(heading(t('Ready to set sail?'), t('Your choices come back later in the story.')))
  const grid = el('div', `grid grid-cols-1 gap-4 ${store.count() > 1 ? 'md:grid-cols-2' : ''}`)
  const ships = []
  for (let i = 0; i < store.count(); i++) {
    const ship = teamShip(screens, { name: store.name(i), tone: store.tone(i), state: store.cargo(i), whole: true })
    if (locked) ship.stage.lock()
    ships.push(ship)
    grid.appendChild(ship.el)
  }
  body.appendChild(grid)

  const sailNow = button(t('Set sail'), 'btn-primary btn-lg', () => {
    const states = Array.from({ length: store.count() }, (_, i) => store.cargo(i))
    const teams = states.map((_, i) => ({ id: store.id(i), name: store.name(i) }))
    const { states: lockedStates, snapshots } = lockDeparture(states, teams, cat, { runId: store.runId() })
    lockedStates.forEach((s, i) => store.setCargo(i, s))
    store.lock(snapshots)
    back.remove()
    // Locked and gone together: the hatches shut, then the ships sail out one after another. The
    // teacher moves the lesson on (no auto-advance).
    ships.forEach((s, i) => { s.stage.lock(); setTimeout(() => s.stage.sailOut(SAIL_S), 600 + i * 150) })
    sailNow.replaceWith(button(t('Continue the lesson'), 'btn-primary btn-lg', () => game._finish()))
  })
  const back = button(t('Back'), 'btn-ghost', () => game._go('exchange'))
  game._footer(body,
    locked ? null : back,
    locked ? button(t('Continue the lesson'), 'btn-primary btn-lg', () => game._finish()) : sailNow)
}

/** How long a ship takes to sail out of frame, seconds. */
const SAIL_S = 6
