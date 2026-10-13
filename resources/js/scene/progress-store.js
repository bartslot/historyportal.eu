/**
 * Where a pupil playing on their own device got to, kept in THIS browser only (localStorage), so
 * they can stop and carry on later. Nothing leaves the device: no account, no server. A signed-in
 * pupil's progress on the server is a later step (the student progress API).
 *
 * Shape: { index, time, done: [scene ids whose power-meter moment has played] }. Anything else in
 * storage (another version, a hand edit, a full disk) reads as "no progress".
 */
const VERSION = 1

export const progressKey = (code) => `lp:progress:${code}`

/** @returns {{ index: number, time: number, done: number[] } | null} */
export function readProgress (storage, code) {
  try {
    const raw = JSON.parse(storage?.getItem(progressKey(code)) || 'null')
    if (!raw || raw.v !== VERSION || !Number.isInteger(raw.index) || raw.index < 0) return null
    return {
      index: raw.index,
      time: Number.isFinite(raw.time) && raw.time > 0 ? raw.time : 0,
      done: Array.isArray(raw.done) ? raw.done.filter(Number.isInteger) : [],
    }
  } catch (_) {
    return null
  }
}

export function saveProgress (storage, code, { index, time = 0, done = [] }) {
  try {
    storage?.setItem(progressKey(code), JSON.stringify({ v: VERSION, index, time: Math.round(time * 10) / 10, done: [...new Set(done)] }))
  } catch (_) { /* private mode or a full disk: carrying on matters more than remembering */ }
}

export function clearProgress (storage, code) {
  try { storage?.removeItem(progressKey(code)) } catch (_) { /* nothing to clear */ }
}

/** Worth offering "continue"? Only past the first few seconds. */
export const canResume = (p) => !!p && (p.index > 0 || p.time > 5)
