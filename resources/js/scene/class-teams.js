/**
 * The per-run class state the cargo game writes and later scenes read (plan §8, §12): the run of
 * a game in this browser tab, and the locked departure snapshots. The ONE place for it, so the
 * shared class-teams store (educational-storytelling/class-teams-and-consequences.md) can replace
 * it without the game changing.
 *
 * Kept in memory and in sessionStorage (a reload resumes the same teams, phase, confirmations,
 * locked load and exchange allowance). Team names only, no pupil data. Every storage access is
 * guarded: a private window or blocked storage just means no resume.
 */
const memory = new Map()
const PREFIX = 'hp:cargo-run:'

const storage = () => { try { return window.sessionStorage } catch (_) { return null } }

/** The saved run of game `key`, or null. */
export function loadRun (key) {
  if (memory.has(key)) return memory.get(key)
  try {
    const raw = storage()?.getItem(PREFIX + key)
    const run = raw ? JSON.parse(raw) : null
    if (run && typeof run === 'object') { memory.set(key, run); return run }
  } catch (_) { /* unreadable: start fresh */ }
  return null
}

/** Save the run of game `key` (a plain JSON-safe object). */
export function saveRun (key, run) {
  memory.set(key, run)
  try { storage()?.setItem(PREFIX + key, JSON.stringify(run)) } catch (_) { /* no resume, still playable */ }
}

/** Forget a run: a new attempt (a teacher's full reset). */
export function clearRun (key) {
  memory.delete(key)
  try { storage()?.removeItem(PREFIX + key) } catch (_) { /* nothing to clear */ }
}

/** The locked departure snapshots of game `key` (what later scenes check), or null before departure. */
export function lockedCargo (key) {
  return loadRun(key)?.snapshots ?? null
}
