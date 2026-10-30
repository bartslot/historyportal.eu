/**
 * timeline-label-column.js — the Timeline's left column, as wide as the teacher drags it.
 *
 * Bart, 2026-10-16: "would be nice to be able to change the size of the panels". The column holds
 * the property names and their value fields; a long name or a colour field wants more room than
 * the stylesheet's default. Spread into animationTimeline(); the grip is an `.lp-grip` on the
 * column's right edge. Null width = the stylesheet's --timeline-label-col.
 *
 * Per teacher, not per lesson, so localStorage (as the script dock's height is).
 */

export const LABEL_COL_KEY = 'wizard.timeline.labelw'
export const LABEL_COL_MIN = 328
export const LABEL_COL_MAX = 520
const STEP = 16

const clamp = (w) => Math.round(Math.max(LABEL_COL_MIN, Math.min(LABEL_COL_MAX, w)))

const saved = () => {
  try {
    const w = parseFloat(localStorage.getItem(LABEL_COL_KEY))
    return Number.isFinite(w) ? clamp(w) : null
  } catch (_) { return null }
}

const store = (w) => {
  try {
    if (w === null) localStorage.removeItem(LABEL_COL_KEY)
    else localStorage.setItem(LABEL_COL_KEY, String(w))
  } catch (_) { /* private window: the width just lasts the session */ }
}

export const labelColumn = () => ({
  labelColW: saved(),
  colDrag: null,

  /** The width the column has now, drawn: the dragged one, or what the stylesheet gave it. */
  colWidth () { return this.labelColW ?? this.$refs?.labels?.getBoundingClientRect().width ?? LABEL_COL_MIN },

  // The shared <x-ui.resize-handle> reports the pointer (resize-start / -drag / -end, -step, -reset);
  // the column decides its own width. `pos` is the pointer's clientX.
  colStart (pos) { this.colDrag = { x: pos, w: this.colWidth() } },

  colMove (pos) {
    if (!this.colDrag) return
    this.labelColW = clamp(this.colDrag.w + pos - this.colDrag.x)
  },

  colEnd () {
    if (!this.colDrag) return
    this.colDrag = null
    store(this.labelColW)
  },

  colStep ({ dir, big }) {
    this.labelColW = clamp(this.colWidth() + dir * STEP * (big ? 4 : 1))
    store(this.labelColW)
  },

  colReset () {
    this.labelColW = null
    store(null)
  },
})
