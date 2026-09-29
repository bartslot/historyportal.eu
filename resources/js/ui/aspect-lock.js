/**
 * aspect-lock.js — keeping a layer's width and height in proportion.
 *
 * The lock is the only genuinely new behaviour in the redesigned settings panel, and it has one
 * trap worth the whole module:
 *
 *   THE RATIO IS CAPTURED WHEN THE LOCK IS ENGAGED, NOT RECOMPUTED ON EVERY EDIT.
 *
 * A panel shows rounded numbers — 11.05 and 11.06 in the design — while the layer holds the full
 * precision. Recomputing `width / height` from what is on screen means every keystroke re-derives
 * the ratio from a rounded pair, and the error compounds: a square drifts out of square after a
 * dozen edits, silently, with every individual step looking correct. Capturing once at the moment
 * of locking means a 2:1 box is still exactly 2:1 after any number of edits.
 *
 * State is kept UNROUNDED. Rounding is a display concern and belongs to the field that renders it;
 * rounding here would put the compounding error straight back.
 */

/** A number we can divide by. Rejects '', null, NaN, Infinity and anything <= 0. */
const usable = (n) => Number.isFinite(n) && n > 0

/**
 * @param {object} init
 * @param {number} init.width   starting width
 * @param {number} init.height  starting height
 * @param {boolean} [init.locked] whether the lock starts engaged
 */
export function createAspectLock ({ width, height, locked = false } = {}) {
  const state = {
    width: Number(width),
    height: Number(height),
    locked: false,
    /** width / height, captured at the moment of locking. null when there is nothing to hold. */
    ratio: null,
  }

  /**
   * Capture the current proportion.
   *
   * A pair that cannot describe a proportion — a zero or an empty field — captures NOTHING rather
   * than a 0 or an Infinity. The lock then still reads as engaged but holds no ratio, so edits
   * pass through untouched instead of writing NaN into the layer and blanking it on the canvas.
   */
  const capture = () => {
    state.ratio = usable(state.width) && usable(state.height)
      ? state.width / state.height
      : null
  }

  const api = {
    get width () { return state.width },
    get height () { return state.height },
    get locked () { return state.locked },
    get ratio () { return state.ratio },

    /** Engage or release the lock. Engaging always re-captures, so unlock → edit → lock holds the NEW shape. */
    setLocked (next) {
      state.locked = !!next
      if (state.locked) capture()
      else state.ratio = null
      return api
    },

    toggle () {
      return api.setLocked(!state.locked)
    },

    /** Set the width. While locked with a held ratio, the height follows. */
    setWidth (value) {
      const w = Number(value)
      state.width = w
      if (state.locked && state.ratio !== null && usable(w)) {
        state.height = w / state.ratio
      }
      return api
    },

    /** Set the height. While locked with a held ratio, the width follows. */
    setHeight (value) {
      const h = Number(value)
      state.height = h
      if (state.locked && state.ratio !== null && usable(h)) {
        state.width = h * state.ratio
      }
      return api
    },
  }

  if (locked) api.setLocked(true)
  return api
}
