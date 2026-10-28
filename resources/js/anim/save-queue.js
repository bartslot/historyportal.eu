/**
 * save-queue.js — a save that waits for a pause, and can be made to happen now.
 *
 * A live keyframe edit (a keystroke, a scrub step) schedules a save instead of sending one per
 * step. `flush` sends the pending save at once; `cancel` drops it. The timeline calls `flush`
 * before every server request, so an undo or a scene switch never overtakes an edit still waiting.
 */

/**
 * @param {() => void} save what to send
 * @param {number} pauseMs how long the teacher must stop before a scheduled save goes out
 */
export const createSaveQueue = (save, pauseMs) => {
  let timer = null

  const cancel = () => {
    clearTimeout(timer)
    timer = null
  }

  return {
    isPending: () => timer !== null,

    /** A later call replaces the pending one, so a burst of edits saves once. */
    schedule () {
      cancel()
      timer = setTimeout(() => {
        timer = null
        save()
      }, pauseMs)
    },

    /** Send the pending save now. A no-op when nothing waits. */
    flush () {
      if (timer === null) return
      cancel()
      save()
    },

    cancel,
  }
}

/**
 * A save queue that keeps the latest value PER KEY: moves of two items inside one pause both go
 * out, and only the newest move of each. `flush` sends every key's latest value at once.
 *
 * @param {(value: unknown) => void} send called once per key that has a pending value
 * @param {number} pauseMs
 */
export const createKeyedSaveQueue = (send, pauseMs) => {
  const pending = new Map()

  const queue = createSaveQueue(() => {
    const values = [...pending.values()]
    pending.clear()
    values.forEach((value) => send(value))
  }, pauseMs)

  return {
    schedule (key, value) {
      pending.set(key, value)
      queue.schedule()
    },
    flush: () => queue.flush(),
  }
}
