/**
 * The harbour race on the panel: the panel's own ship once per lane (race.js raceLanes), each a real
 * ArtworkOverlay layer, so every lane keeps its blend-into-scene, foam and ambient motion; a ship
 * moves with its meter by the CSS `translate` (as the P1 payoff), and ArtworkOverlay.setSpeed drives
 * its bow wave while it gains. A flat team chip rides under each ship. No new rendering engine.
 */
import { el } from './dom.js'
import { raceLanes, laneX } from './race.js'

/** Team colours from the theme's own tokens (DaisyUI), never raw Tailwind colours. */
const COLOURS = ['badge-secondary', 'badge-accent', 'badge-info', 'badge-success', 'badge-warning', 'badge-neutral', 'badge-ghost', 'badge-primary']

/** A ship gaining ground: on-screen motion that settles, so it decelerates into place. */
const GAIN = 'translate 700ms cubic-bezier(0.22, 1, 0.36, 1)'

/** How long a burst of speed shows in the bow wave before it calms. */
const CALM_MS = 900

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export class RaceStage {
  /** @param {{ overlay: object, host: HTMLElement }} parts  the player's ArtworkOverlay and its host */
  constructor ({ overlay, host }) {
    this.overlay = overlay
    this.host = host
    this._chips = null
    this._levels = []
    this._calm = []
  }

  /**
   * @param {{ layers: object[], ship: object, lanes: number, startX: number, finishX: number, names: string[] }} race
   */
  open ({ layers, ship, lanes, startX, finishX, names }) {
    this._startX = startX
    this._finishX = finishX
    this._lanes = raceLanes(ship, lanes, { startX })
    // The lanes take the ship's place in the stack: a figure painted in front of it stays in front.
    const at = layers.findIndex(l => String(l.asset_id) === String(ship.asset_id))
    this.overlay.setLayers([...layers.slice(0, at), ...this._lanes, ...layers.slice(at + 1)])

    this._chips = el('div', 'pointer-events-none absolute')
    this._chips.dataset.raceChips = ''
    Object.assign(this._chips.style, {
      left: `${this.host.offsetLeft}px`, top: `${this.host.offsetTop}px`,
      width: `${this.host.offsetWidth}px`, height: `${this.host.offsetHeight}px`, zIndex: '31',
    })
    this._lanes.forEach((lane, i) => {
      const chip = el('span', `badge badge-sm absolute whitespace-nowrap ${COLOURS[i % COLOURS.length]}`, names[i] ?? '')
      chip.dataset.raceChip = String(i)
      Object.assign(chip.style, { left: `${startX}%`, top: `${lane.y + lane.height / 2 + 1}%`, transform: 'translateX(-50%)' })
      this._chips.appendChild(chip)
    })
    this.host.parentElement?.appendChild(this._chips)
    this._levels = this._lanes.map(() => 0)
  }

  /**
   * What the card must keep clear of (px, relative to `origin`): the water the race is sailed on,
   * full width, and most of all the finish, where the class watches who comes in first.
   */
  band (origin) {
    if (!this._lanes?.length) return []
    const o = origin.getBoundingClientRect()
    const h = this.host.getBoundingClientRect()
    const top = Math.min(...this._lanes.map(l => l.y - l.height / 2))
    const bottom = Math.max(...this._lanes.map(l => l.y + l.height / 2))
    const y = h.top - o.top + (top / 100) * h.height
    const height = ((bottom - top) / 100) * h.height
    const finish = this._finishX
    return [
      { rect: { x: h.left - o.left, y, w: h.width, h: height }, weight: 3 },
      { rect: { x: h.left - o.left + ((finish - 15) / 100) * h.width, y, w: 0.3 * h.width, h: height }, weight: 6 },
    ]
  }

  /** The ship of a lane, for a gust. */
  node (lane) {
    const id = this._lanes?.[lane]?.asset_id
    return id === undefined ? null : this.host.querySelector(`[data-layer-id="art_${id}"]`)
  }

  /** Every lane's meter level 0..1: ships and chips move, and a ship that gained shows its bow wave. */
  update (levels) {
    if (!this._lanes) return
    levels.forEach((level, i) => {
      if (i >= this._lanes.length) return
      const gained = level - (this._levels[i] ?? 0)
      this._levels[i] = level
      this._place(i, laneX(level, this._startX, this._finishX), GAIN)
      if (gained > 0) this._speed(i, Math.min(1, gained * 6))
    })
  }

  /** After the finish: a chip names the ship its team will crew. */
  label (lane, text) {
    const chip = this._chips?.querySelector(`[data-race-chip="${lane}"]`)
    if (chip) chip.textContent = text
  }

  /** The payoff: history has both ships sail, so every lane sails out to `toX` over `seconds`. */
  sailOut (toX, seconds) {
    if (!this._lanes) return Promise.resolve()
    const curve = `translate ${Math.max(0.3, seconds)}s cubic-bezier(0.45, 0, 0.25, 1)`
    this._lanes.forEach((_, i) => { this._place(i, toX, curve); this._speed(i, 1, seconds * 1000) })
    return new Promise(resolve => setTimeout(resolve, reducedMotion() ? 0 : seconds * 1000))
  }

  close () {
    this._calm.forEach(clearTimeout)
    this._calm = []
    this._chips?.remove()
    this._chips = null
    this._lanes = null
  }

  _place (lane, x, transition) {
    const dx = ((x - this._startX) / 100) * this.host.clientWidth
    const motion = reducedMotion() ? 'none' : transition
    for (const node of [this.node(lane), this._chips?.querySelector(`[data-race-chip="${lane}"]`)]) {
      if (!node) continue
      node.style.transition = motion
      node.style.translate = `${Math.round(dx)}px 0px`
    }
  }

  _speed (lane, speed, holdMs = CALM_MS) {
    const id = this._lanes?.[lane]?.asset_id
    if (id === undefined || reducedMotion()) return
    this.overlay.setSpeed(id, speed)
    clearTimeout(this._calm[lane])
    this._calm[lane] = setTimeout(() => this.overlay.setSpeed(id, 0), holdMs)
  }
}
