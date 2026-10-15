/**
 * The cargo game's TEAM CARD on the pick screen (Bart's mockup, 2026-10-15): a header in the
 * team's colour with a ship, the team's name, its points and its status ("Klaar" or "Nog niet
 * bevestigd"), then EVERY optional item in the same place on every card: aboard in colour with a
 * check, the rest as faint ghosts. The ghosts live on the card only; the hold never shows them.
 *
 * Also here: the cost dots and the textual cargo list (the accessible equivalent of a hold).
 *
 * Every string is teacher text: textContent only. The markup strings below are our own icons.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { totalOf } from './cargo-run.js'

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }

const CHECK = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor" class="h-[70%] w-[70%]"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>'

// A three-masted ship, side on (outline): the header's mark.
export const SHIP_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="h-6 w-6 shrink-0"><path d="M2.5 15.5h19l-2.6 4H5.1l-2.6-4Z"/><path d="M7 15.5V4.5M12 15.5V3M17 15.5V5.5"/><path d="M7 5.5c2 1 2 4.5 0 6M12 4c2.4 1.2 2.4 5.6 0 7M17 6.5c1.6.9 1.6 3.6 0 4.5"/></svg>'

/** One square cargo tile: its picture (or its name). state: 'on' (checked), 'off' (a ghost), 'plain'. */
export function cargoTile (item, state = 'plain') {
  const tile = el('div', 'relative flex aspect-square items-center justify-center rounded-md bg-base-content/5 p-[6%]')
  if (item.image) {
    const img = el('img', 'pointer-events-none h-full w-full object-contain')
    img.src = item.image
    img.alt = ''
    img.draggable = false
    tile.appendChild(img)
  } else {
    tile.appendChild(el('span', 'line-clamp-3 text-center text-[0.65rem] font-semibold leading-tight', item.name))
  }
  if (state === 'off') tile.classList.add('opacity-25', 'grayscale')
  if (state === 'on') {
    const check = el('span', 'absolute bottom-[4%] right-[4%] flex aspect-square w-[34%] max-w-6 items-center justify-center rounded-full bg-success text-success-content')
    check.setAttribute('aria-hidden', 'true')
    check.innerHTML = CHECK
    tile.appendChild(check)
  }
  return tile
}

/** Cost as dots: filled = the cost, grey = the rest up to 3. A big cost shows as a number. */
export function costDots (cost) {
  const row = el('span', 'flex items-center justify-center gap-1')
  row.setAttribute('aria-hidden', 'true')
  if (cost > 5) { row.appendChild(el('span', 'badge badge-primary font-bold tabular-nums', cost)); return row }
  for (let i = 0; i < Math.max(3, cost); i++) {
    row.appendChild(el('span', `h-2.5 w-2.5 rounded-full ${i < cost ? 'bg-success' : 'bg-base-content/20'}`))
  }
  return row
}

/** The team's status in words (never colour alone): ready, or not yet confirmed. */
export const statusText = (state) => (state.confirmed ? t('Ready') : t('Not yet confirmed'))

/** The cargo aboard as a list: what a screen reader reads instead of the picture. */
export function cargoList (state, cat, className = 'sr-only') {
  const ul = el('ul', className)
  ul.dataset.cargoList = ''
  cat.items.filter(it => state.selected.includes(it.id)).forEach(it => ul.appendChild(el('li', '', `${it.name} (${it.cost})`)))
  return ul
}

/**
 * A team's card on the pick screen.
 *
 * @param {object} p
 * @param {string} p.name
 * @param {{head:string}} p.tone            the team's colour classes (team-colours.js)
 * @param {object} p.state                  its TeamCargo (cargo-run.js)
 * @param {object} p.cat                    the catalogue
 * @param {boolean} [p.active]
 * @param {string} [p.roles]                the roles line ("1 Kapitein · 2 ..."), or ''
 * @param {() => void} [p.onSelect]         make this team the active one
 * @param {(id:string) => void} [p.onItem]  an item aboard was tapped (take it out)
 */
export function teamCard ({ name, tone, state, cat, active = false, roles = '', onSelect = null, onItem = null }) {
  const load = totalOf(state.selected, cat)
  const card = el('section', `flex min-w-0 flex-col overflow-hidden rounded-box border-2 lp-sheet ${active ? 'border-base-content' : 'border-transparent'}`)
  card.dataset.teamCard = name
  if (active) card.dataset.active = ''

  const head = el(onSelect ? 'button' : 'div', `flex w-full items-center gap-2 px-3 py-1.5 text-left ${tone.head}`)
  if (onSelect) {
    head.type = 'button'
    head.setAttribute('aria-pressed', String(active))
    head.addEventListener('click', onSelect)
  }
  const ship = el('span', 'flex')
  ship.innerHTML = SHIP_ICON
  const who = el('span', 'flex min-w-0 flex-1 flex-col leading-tight')
  append(who, el('span', 'break-words text-base font-semibold', name), el('span', 'text-xs opacity-90', statusText(state)))
  append(head, ship, who, el('span', 'font-history text-3xl leading-none tabular-nums', `${load}`))
  head.setAttribute('aria-label', `${name}, ${t(':load of :capacity points loaded', { load, capacity: cat.budget })}, ${statusText(state)}`)
  if (state.confirmed) card.dataset.ready = ''

  const grid = el('div', 'grid gap-1 p-1.5')
  grid.style.gridTemplateColumns = `repeat(${Math.max(4, Math.ceil(cat.optional.length / 2))}, minmax(0, 1fr))`
  cat.optional.forEach(item => {
    const on = state.selected.includes(item.id)
    const tile = cargoTile(item, on ? 'on' : 'off')
    if (on && onItem && !state.locked) {
      const b = el('button', 'block w-full')
      b.type = 'button'
      b.dataset.cargoTile = item.id
      b.setAttribute('aria-label', t('Take out: :item', { item: item.name }))
      b.addEventListener('click', (e) => { e.stopPropagation(); onItem(item.id) })
      b.appendChild(tile)
      grid.appendChild(b)
    } else {
      tile.setAttribute('role', 'img')
      tile.setAttribute('aria-label', on ? item.name : `${item.name}, ${t('Not loaded')}`)
      grid.appendChild(tile)
    }
  })
  if (onSelect) grid.addEventListener('click', onSelect)
  append(card, head, roles ? el('p', 'px-2 pt-1 text-xs leading-snug', roles) : null, grid)
  return card
}
