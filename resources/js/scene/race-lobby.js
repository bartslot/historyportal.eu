/**
 * The class screen's card for a harbour race on the teams' phones (HarbourRace on the server).
 *
 *   lobby    the race QR and code, the team names (the teacher's: pupils never type one), who has
 *            joined, and Start
 *   running  a bar per team from the server, its place once over the line, a quiet "no signal" dot
 *            for a team none of whose phones has been heard for a few seconds, and End the race
 *
 * Polling refreshes the bars and dots in place, so a name being typed is never interrupted. Every
 * string goes through textContent.
 */
import { t } from '../i18n.js'
import { el } from './dom.js'
import { placeOverlay } from './card-place.js'
import { serverOrder } from './race-sync.js'

/** HarbourRace::NAME_MAX, TEAMS_MIN, TEAMS_MAX on the server. */
const LIMITS = { NAME_MAX: 24, TEAMS_MIN: 2, TEAMS_MAX: 8 }

const button = (label, cls, onClick) => {
  const b = el('button', `btn shadow-none ${cls}`, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

export class RaceLobby {
  constructor (host) {
    this.host = host
    this._spot = null
  }

  /**
   * @param {{ race: object, joinUrl: string, drawQr: (canvas: HTMLCanvasElement, url: string) => void,
   *           avoid?: Function, onNames: (names: string[]) => void, onStart: () => void, onEnd: () => void }} opts
   */
  show (opts) {
    Object.assign(this, { _opts: opts, _race: opts.race, _phase: null })
    this.host.style.pointerEvents = 'auto'
    this._render()
  }

  /** A fresh state from the server: redraw on a phase change, otherwise refresh in place. */
  update (race) {
    const phase = race.state
    this._race = race
    if (phase !== this._phase || race.teams.length !== this._rows) return this._render()
    this._refresh()
  }

  hide () {
    this.host.replaceChildren()
    this.host.style.pointerEvents = 'none'
    this._spot = null
  }

  _render () {
    this._phase = this._race.state
    this._rows = this._race.teams.length
    const wrap = el('div', 'pointer-events-none absolute inset-0 flex items-end justify-center px-3 pb-28 sm:px-8')
    wrap.setAttribute('role', 'dialog')
    wrap.setAttribute('aria-label', t('Harbour race'))
    const card = el('div', 'card pointer-events-auto w-full max-w-xl border border-base-300 bg-base-100/95 text-base-content shadow-none')
    const body = el('div', 'card-body gap-3 p-4 sm:p-6')
    card.dataset.raceLobby = this._phase
    body.append(...(this._phase === 'lobby' ? this._lobby() : this._running()))
    card.appendChild(body)
    wrap.appendChild(card)
    this.host.replaceChildren(wrap)
    this._spot = placeOverlay(this.host, card, this._opts.avoid, this._spot)
    this._refresh()
  }

  _lobby () {
    const top = el('div', 'flex items-center gap-4')
    const canvas = el('canvas', 'h-28 w-28 shrink-0 rounded-box bg-white p-1')
    canvas.setAttribute('aria-label', t('Race QR code'))
    this._opts.drawQr(canvas, this._opts.joinUrl)
    const join = el('div', 'flex min-w-0 flex-col gap-1')
    join.append(
      el('p', 'text-lg font-bold leading-snug', t('Teams join on their phones')),
      el('p', 'truncate text-sm text-base-content/70', this._opts.joinUrl),
      el('p', 'font-mono text-3xl font-bold tracking-widest', this._race.code))
    top.append(canvas, join)

    const names = el('div', 'flex flex-col gap-2')
    this._race.teams.forEach((team, i) => {
      const row = el('label', 'flex items-center gap-2')
      const input = el('input', 'input input-sm flex-1')
      input.type = 'text'
      input.maxLength = LIMITS.NAME_MAX
      input.value = team.name
      input.setAttribute('aria-label', t('Team :number', { number: i + 1 }))
      input.dataset.teamName = String(i)
      input.addEventListener('change', () => this._opts.onNames(this._names()))
      row.append(this._dot(i), input)
      names.appendChild(row)
    })

    const foot = el('div', 'flex flex-wrap items-center justify-end gap-2')
    if (this._race.teams.length < LIMITS.TEAMS_MAX) {
      foot.appendChild(button(t('Add team'), 'btn-ghost btn-sm', () => this._opts.onNames([...this._names(), t('Team :number', { number: this._race.teams.length + 1 })])))
    }
    if (this._race.teams.length > LIMITS.TEAMS_MIN) {
      foot.appendChild(button(t('Remove team'), 'btn-ghost btn-sm', () => this._opts.onNames(this._names().slice(0, -1))))
    }
    foot.appendChild(button(t('Start the race'), 'btn-primary btn-sm', () => this._opts.onStart()))
    return [top, names, foot]
  }

  _running () {
    const rows = el('div', 'flex flex-col gap-2')
    this._race.teams.forEach((team, i) => {
      const row = el('div', 'flex items-center gap-3')
      const place = el('span', 'badge badge-sm w-6 shrink-0 badge-ghost', '')
      place.dataset.place = String(i)
      const bar = el('progress', 'progress progress-primary h-5 flex-1')
      bar.max = this._race.goal
      bar.dataset.raceBar = String(i)
      bar.setAttribute('aria-label', team.name)
      row.append(place, el('span', 'w-32 shrink-0 truncate text-sm font-semibold uppercase tracking-wider text-base-content/70', team.name), bar, this._dot(i))
      rows.appendChild(row)
    })
    const foot = el('div', 'flex justify-end')
    foot.appendChild(button(t('End the race'), 'btn-outline btn-sm', () => this._opts.onEnd()))
    return [el('p', 'text-lg font-bold', t('The teams are racing on their phones')), rows, foot]
  }

  /** Joined (filled), not joined yet (hollow), or joined but silent for a while (no signal). */
  _dot (i) {
    const dot = el('span', 'inline-block h-3 w-3 shrink-0 rounded-full border border-base-content/40')
    dot.dataset.signal = String(i)
    return dot
  }

  _refresh () {
    const order = serverOrder(this._race)
    this._race.teams.forEach((team, i) => {
      const dot = this.host.querySelector(`[data-signal="${i}"]`)
      if (dot) {
        const state = !team.joined ? 'waiting' : team.signal ? 'on' : 'lost'
        dot.className = `inline-block h-3 w-3 shrink-0 rounded-full ${state === 'on' ? 'bg-success' : state === 'lost' ? 'bg-warning' : 'border border-base-content/40'}`
        dot.dataset.state = state
        dot.setAttribute('data-tooltip', state === 'on' ? t('Joined') : state === 'lost' ? t('No signal') : t('Not joined yet'))
        dot.setAttribute('aria-label', dot.getAttribute('data-tooltip'))
      }
      const bar = this.host.querySelector(`[data-race-bar="${i}"]`)
      if (bar) bar.value = team.progress
      const place = this.host.querySelector(`[data-place="${i}"]`)
      if (place) {
        const p = order.indexOf(i)
        place.textContent = p === -1 ? '' : String(p + 1)
        place.className = `badge badge-sm w-6 shrink-0 ${p === -1 ? 'badge-ghost' : 'badge-primary'}`
      }
    })
  }

  _names () {
    return [...this.host.querySelectorAll('[data-team-name]')].map(input => input.value.trim()).filter(Boolean)
  }
}
