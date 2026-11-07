/**
 * history.js — undo and redo for a mode of the picture editor whose state is plain data (Frames, Bones): every step is a
 * whole new value, nothing is changed in place.
 */
const DEPTH = 100

export function createHistory (initial) {
  let past = []
  let future = []
  let now = initial
  return {
    get now () { return now },
    get canUndo () { return past.length > 0 },
    get canRedo () { return future.length > 0 },
    /** Differs from what it started with: an undo all the way back is no work to lose. */
    get dirty () { return JSON.stringify(now) !== JSON.stringify(initial) },
    push (next) {
      if (JSON.stringify(next) === JSON.stringify(now)) return false
      past = [...past, now].slice(-DEPTH)
      future = []
      now = next
      return true
    },
    /** A drag or slider going on: this value replaces the last one, so one gesture is one undo. */
    replace (next) { now = next },
    undo () {
      if (!past.length) return false
      future = [now, ...future]
      now = past.at(-1)
      past = past.slice(0, -1)
      return true
    },
    redo () {
      if (!future.length) return false
      past = [...past, now]
      now = future[0]
      future = future.slice(1)
      return true
    },
  }
}
