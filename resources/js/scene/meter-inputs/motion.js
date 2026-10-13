/**
 * A pupil's own phone as a power-meter input (own-device mode only): shake it (rowing, hauling a
 * rope) or tilt it and hold (steering). Pure steps over the readings, and a thin adapter over the
 * browser's motion events. Nothing leaves the device; the readings are gone the next frame.
 *
 * iOS asks permission for motion, and only from a tap (DeviceMotionEvent.requestPermission): the
 * meter shows a button for that when the moment opens. Other phones need no permission. A device
 * without a sensor (a laptop) never sends a reading, and after a moment the taps take over.
 */

export const MOTION = {
  shakeMs2: 14,      // linear acceleration (m/s²) that counts as a shake
  shakeGapS: 0.25,   // one shake swings back and forth: rises sooner than this are the same shake
  tiltDeg: 25,       // left/right tilt that counts as steering
  silentMs: 2500,    // no reading at all by then: no sensor
}

export const shakeStart = () => ({ t: 0, last: null, lastMag: 0 })

/**
 * A shake is a rise through the threshold, at most one per gap. Every shake fills goal / count.
 *
 * @returns {{ state: object, amount: number, shake: boolean }}
 */
export function shakeStep (state, { accel, dt }, { beats = 8, goal = 4 }) {
  const t = state.t + dt
  const since = state.last === null ? Infinity : t - state.last
  const shake = accel >= MOTION.shakeMs2 && state.lastMag < MOTION.shakeMs2 && since >= MOTION.shakeGapS
  return {
    state: { t, last: shake ? t : state.last, lastMag: accel },
    amount: shake ? goal / Math.max(1, beats) : 0,
    shake,
  }
}

/** Tilt and hold: fills while the phone leans past the angle, the whole meter over holdSeconds. */
export function tiltStep ({ tilt, dt }, { holdSeconds = 5, goal = 4 }) {
  return Math.abs(tilt) >= MOTION.tiltDeg ? (goal / Math.max(1, holdSeconds)) * dt : 0
}

/** Magnitude of the phone's own movement, gravity left out where the browser can. */
export function accelOf (e) {
  const a = e.acceleration
  if (a && Number.isFinite(a.x)) return Math.hypot(a.x, a.y, a.z)
  const g = e.accelerationIncludingGravity
  return g && Number.isFinite(g.x) ? Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81) : 0
}

/**
 * Whether an event carries a reading. A desktop browser without a sensor still fires one event with
 * every value null; that is no sensor, not a phone held still.
 */
export function hasReading (e, gesture = 'shake') {
  if (gesture === 'tilt') return Number.isFinite(e?.gamma)
  return Number.isFinite(e?.acceleration?.x) || Number.isFinite(e?.accelerationIncludingGravity?.x)
}

/** iOS: motion needs a permission that only a tap may ask for. */
export const needsMotionPermission = () => typeof window !== 'undefined'
  && typeof window.DeviceMotionEvent?.requestPermission === 'function'

/** Call from a tap. Resolves true when motion may be read. */
export async function requestMotionPermission () {
  if (!needsMotionPermission()) return true
  try { return (await window.DeviceMotionEvent.requestPermission()) === 'granted' } catch (_) { return false }
}

/**
 * Readings until stop(): { accel, tilt, dt } per event. Rejects when no reading arrives (no sensor).
 *
 * @returns {Promise<{ stop: () => void }>}
 */
export function listenMotion ({ gesture = 'shake', onFrame }) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return reject(new Error('no-motion'))
    const event = gesture === 'tilt' ? 'deviceorientation' : 'devicemotion'
    let last = null
    let started = false
    const handler = (e) => {
      if (!hasReading(e, gesture)) return
      const now = performance.now()
      const dt = last === null ? 0 : (now - last) / 1000
      last = now
      if (!started) { started = true; clearTimeout(silent); resolve({ stop }) }
      onFrame(gesture === 'tilt' ? { tilt: Number(e.gamma) || 0, accel: 0, dt } : { accel: accelOf(e), tilt: 0, dt })
    }
    const stop = () => { clearTimeout(silent); window.removeEventListener(event, handler) }
    const silent = setTimeout(() => { stop(); reject(new Error('no-motion')) }, MOTION.silentMs)
    window.addEventListener(event, handler)
  })
}
