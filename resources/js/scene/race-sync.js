/**
 * Short polling for the harbour race on team devices (no websockets: SiteGround shared hosting).
 * One request at a time per device; what a team gains is sent in chunks no larger than the server
 * accepts (a quarter of the meter), the rest waits for the next push; errors and 429s back off.
 * Used by the team phones (race-device.js) and the class screen (the player).
 */

/** The longest a client waits between two requests after errors, ms. */
export const MAX_DELAY_MS = 8000

/** The next wait: the base after a success, doubling (with a little jitter) after a failure. */
export function nextDelay (current, ok, base, rand = Math.random) {
  if (ok) return base
  return Math.min(MAX_DELAY_MS, Math.max(base, current) * 2 * (0.9 + 0.2 * rand()))
}

/** Split what is waiting to be sent into what may go now (at most `cap`) and what stays. */
export function takeChunk (pending, cap) {
  const send = Math.min(Math.max(0, pending), cap)
  return { send, rest: Math.max(0, pending - send) }
}

/** Which ship a team crews in a finished race, or null. */
export function crewOf (race, teamId) {
  const roles = race?.roles || {}
  return Object.keys(roles).find(ship => Number(roles[ship]) === Number(teamId)) ?? null
}

/** The finishers in the server's order (by time over the line), for the class screen's places. */
export function serverOrder (race) {
  return (race?.teams || [])
    .map((t, i) => ({ i, ms: t.finished_ms }))
    .filter(t => Number.isFinite(t.ms))
    .sort((a, b) => a.ms - b.ms || a.i - b.i)
    .map(t => t.i)
}

/** A random device id kept in this browser, for the per-device rate limit. Never sent anywhere else. */
export function deviceId (storage) {
  try {
    let id = storage?.getItem('lp:race-device')
    if (!id || !/^[A-Za-z0-9-]{16,40}$/.test(id)) {
      id = (globalThis.crypto?.randomUUID?.() || `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`)
      storage?.setItem('lp:race-device', id)
    }
    return id
  } catch (_) {
    return 'device-unknown-0000'
  }
}

/**
 * The race over HTTP: `poll()` reads the state on its own clock, `gain(steps)` queues what this
 * device earned and pushes it on the push clock. Calls onState(race) after every good answer and
 * onGone() when the race no longer exists (the class screen closed it).
 */
export class RaceClient {
  constructor ({ urls, teamId = null, pushMs = 1000, pollMs = 2000, cap = 1, device = 'device-unknown-0000', fetchFn = globalThis.fetch?.bind(globalThis), onState = () => {}, onGone = () => {} }) {
    Object.assign(this, { urls, teamId, pushMs, pollMs, cap, device, fetchFn, onState, onGone })
    this._pending = 0
    this._delay = pollMs
    this._timer = null
    this._busy = false
    this._stopped = false
  }

  start () { this._stopped = false; this._schedule(0) }

  stop () { this._stopped = true; clearTimeout(this._timer) }

  /** This device's gain, in meter steps; sent with the next push. */
  gain (steps) {
    if (steps > 0) this._pending += steps
  }

  async _tick () {
    if (this._stopped || this._busy) return
    this._busy = true
    let ok = false
    let base = this.pollMs
    try {
      const { send, rest } = takeChunk(this._pending, this.cap)
      const pushing = this.teamId && send > 0
      const res = pushing
        ? await this._request(this.urls.push, { method: 'POST', body: JSON.stringify({ team_id: this.teamId, delta: send }) })
        : await this._request(this.urls.state + (this.teamId ? `?team=${this.teamId}` : ''))
      if (res.status === 404) { this.stop(); this.onGone(); return }
      ok = res.ok
      if (ok) {
        if (pushing) { this._pending = rest; base = this.pushMs }
        this.onState(await res.json())
      }
    } catch (_) {
      ok = false
    } finally {
      this._busy = false
    }
    if (ok && this._pending > 0) base = this.pushMs
    this._delay = nextDelay(this._delay, ok, base)
    this._schedule(this._delay)
  }

  _schedule (ms) {
    clearTimeout(this._timer)
    if (!this._stopped) this._timer = setTimeout(() => this._tick(), ms)
  }

  _request (url, init = {}) {
    const token = globalThis.document?.querySelector('meta[name="csrf-token"]')?.content
    return this.fetchFn(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Race-Device': this.device,
        ...(token ? { 'X-CSRF-TOKEN': token } : {}),
      },
      credentials: 'same-origin',
    })
  }
}
