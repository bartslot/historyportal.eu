/**
 * The world follows the wind: while a power-meter moment fills, the reacting layer (the ship) gets
 * going with it instead of only at the payoff. Bart 2026-10-18: "the sails of the ships ... should
 * swell and the boats start to move."
 *
 * At wind level 0..1 the ship
 *   - drifts forward by `drift` (stage %, the moment's react.drift; towards where the payoff sails),
 *   - shows its sprite sheet further on (layer-frames.js 'wind': slack, half, full, billowing),
 *   - throws more bow wave and wake (the layer's `speed`, up to 1),
 *   - rolls harder (its ambient amount, up to the moment's react.amount).
 * Each rise is eased over WIND.tweenMs (the `move` intent); with reduced motion it is set at once.
 * At full the payoff (sail.js) sails on from where the drift left it. Nothing is saved.
 */
import { CURVE } from '../easing.js'

/** Dev-tuner values (registerWindTuner reads them from here). */
export const WIND = { tweenMs: 900 }

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0))
const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback)

/**
 * Pure: what the ship looks like at a wind level.
 * @param {number} level 0..1
 * @param {{ speed?: ?number, amount?: ?number, reactAmount?: number, drift?: number, dir?: number }} base
 */
export function windTargets (level, { speed = null, amount = null, reactAmount = 1.6, drift = 6, dir = 1 } = {}) {
  const l = clamp01(level)
  const s0 = num(speed, 0)
  const a0 = num(amount, 1)
  return {
    frame: l,
    speed: round(s0 + (1 - s0) * l),
    amount: round(a0 + (Math.max(a0, num(reactAmount, 1.6)) - a0) * l),
    driftPct: round(num(drift, 6) * l * (dir < 0 ? -1 : 1)),
  }
}

/** Pure: which way the payoff sails the layer (+1 right, -1 left), from where it stands. */
export function windDirection (layer, payoff) {
  if (!payoff || payoff.type !== 'move' || String(payoff.layer) !== String(layer?.asset_id)) return 1
  return Number(payoff.to_x) < num(layer?.x, 50) ? -1 : 1
}

const round = (n) => Math.round(n * 1000) / 1000
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

let tunerOff = null
function registerWindTuner () {
  if (tunerOff || typeof window === 'undefined' || !window.__tune?.register) return
  tunerOff = window.__tune.register('Power meter wind', [
    { key: 'tweenMs', label: 'wind rises over (ms)', min: 0, max: 3000, step: 50 },
  ].map(c => ({ ...c, value: WIND[c.key], apply: (v) => { WIND[c.key] = Number(v) } })), { tab: 'Lesson' }) ?? null
}

/**
 * @param {{ overlay: object, stage: HTMLElement, layerId: number, react?: object, payoff?: object,
 *           raf?: Function, now?: Function }} opts  overlay = the player's ArtworkOverlay
 */
export class WindWorld {
  constructor ({ overlay, stage, layerId, react = {}, payoff = {}, raf = (f) => requestAnimationFrame(f), now = () => performance.now() }) {
    this.overlay = overlay
    this.stage = stage
    this.layerId = layerId
    this.raf = raf
    this.now = now
    const layer = overlay?.layerData?.(layerId)
    this.base = layer
      ? {
          speed: layer.speed, amount: layer.ambient_amount, reactAmount: react.amount, drift: react.drift, dir: windDirection(layer, payoff),
          // A boat with foam (or a speed) gets a faster wake; on any other layer a speed would draw foam.
          wake: Number(layer.foam) > 0 || Number(layer.speed) > 0,
        }
      : null
    this.level = 0
    registerWindTuner()
  }

  get node () {
    return this.stage?.querySelector(`[data-layer-id="art_${Number(this.layerId)}"]`) ?? null
  }

  /** The wind rose (or fell) to `level`: ease the ship there. */
  set (level) {
    if (!this.base) return
    const from = this.level
    const to = clamp01(level)
    this.level = to
    const end = windTargets(to, this.base)
    // Wake and roll step with the meter; the drift and the sails glide.
    // Only a boat that has a wake gets a faster one: a speed on any other layer would draw foam.
    if (this.base.wake) this.overlay.setSpeed?.(this.layerId, end.speed)
    this.overlay.setLayerProp?.(this.layerId, 'ambient_amount', end.amount)
    const token = this._token = {}
    const ms = reducedMotion() ? 0 : WIND.tweenMs
    const t0 = this.now()
    const frame = () => {
      if (this._token !== token) return
      const p = ms > 0 ? Math.min(1, (this.now() - t0) / ms) : 1
      this._paint(from + (to - from) * CURVE.move(p))
      if (p < 1) this.raf(frame)
    }
    frame()
  }

  _paint (level) {
    const { frame, driftPct } = windTargets(level, this.base)
    this.overlay.setFrame?.(this.layerId, frame)
    const node = this.node
    if (node && this.stage) node.style.translate = `${Math.round((driftPct / 100) * this.stage.clientWidth)}px 0px`
  }

  /** The moment is over: stop easing (the payoff owns the ship from here). */
  stop () { this._token = null }
}
