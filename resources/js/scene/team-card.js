/**
 * The cargo game's TEAM CARD (Bart's mockups, 2026-10-15): a header in the team's colour with a
 * ship and the points loaded, then EVERY item of the game in the same place on every card, loaded
 * ones in colour with a check, the rest as faint ghosts, so the class sees empty space and missed
 * choices at a glance and compares teams square by square.
 *
 * One component for the pick screen's team band, the results sheet and (later) the end-of-lesson
 * board. Also here: a cargo picture tile, the cost dots and the "Available cargo" legend.
 *
 * Every string is teacher text: textContent only. The markup strings below are our own icons.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'

const append = (parent, ...children) => { children.forEach(c => c && parent.appendChild(c)); return parent }
export const costOf = (item) => Math.max(0, Math.round(Number(item?.cost) || 0))

const CHECK = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor" class="h-[70%] w-[70%]"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>'

// A three-masted ship, side on (outline): the header's mark.
const SHIP_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="h-7 w-7 shrink-0"><path d="M2.5 15.5h19l-2.6 4H5.1l-2.6-4Z"/><path d="M7 15.5V4.5M12 15.5V3M17 15.5V5.5"/><path d="M7 5.5c2 1 2 4.5 0 6M12 4c2.4 1.2 2.4 5.6 0 7M17 6.5c1.6.9 1.6 3.6 0 4.5"/></svg>'

/** The real expedition's colours: ink on paper, apart from every team colour. */
export const REAL_TONE = { head: 'bg-base-content text-base-100', soft: 'bg-base-content/10' }

function picture (src) {
  const img = el('img', 'pointer-events-none h-full w-full object-contain')
  img.src = src
  img.alt = ''
  img.draggable = false
  return img
}

/**
 * One square cargo tile: its picture (or its name when it has none).
 * state: 'on' (in colour, checked), 'off' (a faint ghost), 'plain' (the legend).
 */
export function cargoTile (item, state = 'plain') {
  const tile = el('div', 'relative flex aspect-square items-center justify-center rounded-md bg-base-content/5 p-[6%]')
  tile.appendChild(item.image ? picture(item.image) : el('span', 'line-clamp-3 text-center text-[0.65rem] font-semibold leading-tight', item.name))
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
  if (cost > 5) { row.appendChild(el('span', 'badge badge-primary font-bold tabular-nums', cost)); return row }
  for (let i = 0; i < Math.max(3, cost); i++) {
    row.appendChild(el('span', `h-2.5 w-2.5 rounded-full ${i < cost ? 'bg-success' : 'bg-base-content/20'}`))
  }
  row.setAttribute('aria-hidden', 'true')
  return row
}

/**
 * A team's card.
 *
 * @param {object} p
 * @param {string} p.name
 * @param {{head:string, soft:string}} p.tone   the team's colour classes (team-colours.js)
 * @param {Set<number>} p.picked                 indices into items
 * @param {object[]} p.items
 * @param {object[]} p.fixed
 * @param {number} p.load
 * @param {boolean} [p.active]                   the team being entered / shown
 * @param {(index:number) => void} [p.onItem]    a loaded item was tapped (unload)
 * @param {() => void} [p.onSelect]              the card was tapped (make it active / show it)
 * @param {number} [p.cols]                      tile columns (all items in rows of this many)
 */
export function teamCard ({ name, tone, picked, items, fixed, load, active = false, onItem = null, onSelect = null, cols = 8 }) {
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
  append(head, ship,
    el('span', 'min-w-0 flex-1 truncate text-base font-semibold', name),
    el('span', 'font-history text-3xl leading-none tabular-nums', load))
  head.setAttribute('aria-label', `${name}, ${t(':points points', { points: load })}`)

  const grid = el('div', 'grid gap-1 p-1.5')
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`
  fixed.forEach(f => grid.appendChild(labelled(cargoTile(f, 'on'), f.name)))
  items.forEach((item, i) => {
    const on = picked.has(i)
    const tile = cargoTile(item, on ? 'on' : 'off')
    if (on && onItem) {
      const b = el('button', 'block w-full')
      b.type = 'button'
      b.dataset.cargoTile = String(i)
      b.setAttribute('aria-label', t('Take out: :item', { item: item.name }))
      b.addEventListener('click', (e) => { e.stopPropagation(); onItem(i) })
      b.appendChild(tile)
      grid.appendChild(b)
    } else {
      grid.appendChild(labelled(tile, item.name, on))
    }
  })
  if (onSelect) grid.addEventListener('click', onSelect)
  append(card, head, grid)
  return card
}

function labelled (tile, name, on = true) {
  tile.setAttribute('role', 'img')
  tile.setAttribute('aria-label', on ? name : `${name}, ${t('Not loaded')}`)
  return tile
}

/** "Available cargo": every item, its picture and its name. */
export function cargoLegend (items, fixed) {
  const box = el('aside', 'flex flex-col gap-3 lg:w-[22rem]')
  box.appendChild(el('h4', 'font-history text-2xl', t('Available cargo')))
  const grid = el('div', 'grid grid-cols-4 gap-2')
  ;[...fixed, ...items].forEach(item => {
    const cell = el('div', 'flex flex-col items-center gap-1')
    append(cell, cargoTile(item), el('span', 'line-clamp-2 text-center text-xs leading-tight', item.name))
    grid.appendChild(cell)
  })
  box.appendChild(grid)
  return box
}
