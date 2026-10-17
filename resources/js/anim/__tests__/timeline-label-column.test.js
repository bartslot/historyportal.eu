import { describe, it, expect, beforeEach } from 'vitest'
import { labelColumn, LABEL_COL_KEY, LABEL_COL_MIN, LABEL_COL_MAX } from '../timeline-label-column.js'

/**
 * The Timeline's left column (property names + value fields) is as wide as the teacher drags it
 * (Bart, 2026-10-16: "would be nice to be able to change the size of the panels").
 */

const pointer = (clientX) => ({ clientX, pointerId: 1, currentTarget: { setPointerCapture () {} }, preventDefault () {} })

beforeEach(() => localStorage.clear())

describe('the label column', () => {
  it('starts at the stylesheet width until it is dragged', () => {
    expect(labelColumn().labelColW).toBeNull()
  })

  it('follows the grip, clamped, and remembers the width', () => {
    const c = labelColumn()
    c.$refs = { labels: { getBoundingClientRect: () => ({ width: 226 }) } }
    c.colStart(pointer(500))
    c.colMove(pointer(580))
    expect(c.labelColW).toBe(306)
    c.colMove(pointer(5000))
    expect(c.labelColW).toBe(LABEL_COL_MAX)
    c.colMove(pointer(0))
    expect(c.labelColW).toBe(LABEL_COL_MIN)
    c.colEnd()
    expect(localStorage.getItem(LABEL_COL_KEY)).toBe(String(LABEL_COL_MIN))
    expect(labelColumn().labelColW).toBe(LABEL_COL_MIN)
  })

  it('ignores a pointer that moves without a press', () => {
    const c = labelColumn()
    c.colMove(pointer(580))
    expect(c.labelColW).toBeNull()
  })

  it('arrow keys step it; Home puts the stylesheet width back', () => {
    const c = labelColumn()
    c.$refs = { labels: { getBoundingClientRect: () => ({ width: 226 }) } }
    c.colKey({ key: 'ArrowRight', preventDefault () {} })
    expect(c.labelColW).toBe(242)
    c.colKey({ key: 'Home', preventDefault () {} })
    expect(c.labelColW).toBeNull()
    expect(localStorage.getItem(LABEL_COL_KEY)).toBeNull()
  })
})
