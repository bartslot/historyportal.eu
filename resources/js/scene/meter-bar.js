/**
 * The meter as a slim bar along the top of the stage, for a word-stream moment (word-stream.js):
 * the picture stays free for the words and the ship. Label and short instruction on the left, a
 * slider-like track per meter (a thumb rides the fill), the count, the timer, whose turn it is and
 * Skip. Flat: no shadow, glow or ring; theme tokens only.
 *
 * The bar is built once (meterBar) and painted in place (paintBar), so the fill and the thumb glide
 * from step to step instead of jumping when the moment re-renders.
 */
import { el } from './dom.js'
import { EASE } from '../easing.js'

const GLIDE_MS = 700

/**
 * @param {{ label: string, names: string[], meters: number, goal: number, prompt: string,
 *           clock: ?HTMLElement, turns: ?HTMLElement, actions: HTMLElement }} o
 */
export function meterBar ({ label, names, meters, goal, prompt, clock, turns, actions }) {
  const bar = el('div', 'pointer-events-auto flex flex-col gap-1.5 border-y border-base-content/10 bg-base-100/90 px-4 pb-2.5 pt-3 text-base-content sm:px-8')
  bar.dataset.meterBar = ''
  const top = el('div', 'flex flex-wrap items-center gap-x-4 gap-y-1.5')
  // On a phone the label and Skip share the first row and the track takes the full width below.
  const tracks = el('div', 'order-last flex basis-full flex-col gap-1.5 sm:order-none sm:min-w-48 sm:flex-1 sm:basis-64')
  for (let m = 0; m < meters; m++) tracks.appendChild(track(meters > 1 ? names[m] : label, goal, m))
  const heading = el('span', 'shrink-0 font-history text-lg font-semibold uppercase tracking-[0.12em] text-base-content/80 sm:text-xl', label)
  const right = el('div', 'ml-auto flex shrink-0 items-center gap-2 sm:ml-0')
  if (clock) right.appendChild(clock)
  right.appendChild(actions)
  top.append(heading, tracks, right)
  bar.appendChild(top)
  const below = el('div', 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1')
  if (prompt) below.appendChild(el('p', 'text-sm leading-snug text-base-content/80 sm:text-base', prompt))
  if (turns) below.appendChild(turns)
  if (below.childNodes.length) bar.appendChild(below)
  return bar
}

function track (label, goal, m) {
  const row = el('div', 'flex items-center gap-3')
  const rail = el('div', 'relative h-2.5 flex-1 rounded-full bg-base-content/15')
  rail.setAttribute('role', 'meter')
  rail.setAttribute('aria-label', label)
  rail.setAttribute('aria-valuemin', '0')
  rail.setAttribute('aria-valuemax', String(goal))
  rail.setAttribute('aria-valuenow', '0')
  rail.dataset.barMeter = String(m)
  const fill = el('div', 'absolute inset-0 origin-left rounded-full bg-primary')
  fill.style.transform = 'scaleX(0)'
  fill.dataset.barFill = ''
  // A notch per step, so "two more words" can be read off the bar.
  for (let i = 1; i < goal; i++) {
    const notch = el('span', 'absolute inset-y-0 w-0.5 -translate-x-1/2 bg-base-100/70')
    notch.style.left = `${(i / goal) * 100}%`
    rail.appendChild(notch)
  }
  // The thumb rides on a full-width rail, moved with transform (compositor only).
  const ride = el('div', 'pointer-events-none absolute inset-0')
  ride.dataset.barRide = ''
  ride.style.transform = 'translateX(0%)'
  const thumb = el('span', 'absolute left-0 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-base-100 bg-primary')
  ride.appendChild(thumb)
  rail.prepend(fill)
  rail.appendChild(ride)
  const count = el('span', 'w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-base-content/80', `0/${goal}`)
  count.dataset.barCount = ''
  row.append(rail, count)
  return row
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Paint the fills in place: each glides to its share (the `move` intent), or jumps with reduced motion. */
export function paintBar (bar, fills, goal) {
  fills.forEach((f, m) => {
    const rail = bar?.querySelector(`[data-bar-meter="${m}"]`)
    if (!rail) return
    const share = Math.min(1, f / goal)
    if (rail.__share === share) return
    // The first paint places the fill; every later one glides.
    const ms = reducedMotion() || rail.__share === undefined ? 0 : GLIDE_MS
    rail.__share = share
    rail.setAttribute('aria-valuenow', String(Math.floor(f)))
    const count = rail.parentElement.querySelector('[data-bar-count]')
    if (count) count.textContent = `${Math.floor(f)}/${goal}`
    const fill = rail.querySelector('[data-bar-fill]')
    const ride = rail.querySelector('[data-bar-ride]')
    for (const [node, value] of [[fill, `scaleX(${share})`], [ride, `translateX(${share * 100}%)`]]) {
      node.style.transition = ms ? `transform ${ms}ms ${EASE.move}` : ''
      node.style.transform = value
    }
  })
}
