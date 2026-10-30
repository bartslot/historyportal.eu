import { describe, expect, it } from 'vitest'
import { LessonDoc, getIn, setIn } from './edits'
import type { Lesson } from './types'

const lesson = (): Lesson => ({ id: 'l', scenes: [{ id: 's1', set: { layers: [{ depth: 'fg', x: 0.2 }] } }] })

describe('setIn', () => {
  it('replaces a deep value without touching the original', () => {
    const a = lesson()
    const b = setIn(a, ['scenes', 0, 'set', 'layers', 0, 'x'], 0.7)
    expect(getIn(b, ['scenes', 0, 'set', 'layers', 0, 'x'])).toBe(0.7)
    expect(getIn(a, ['scenes', 0, 'set', 'layers', 0, 'x'])).toBe(0.2)
    expect(Array.isArray(b.scenes)).toBe(true)
  })
  it('turns a bare-string value on the way into an object', () => {
    const a = setIn(lesson(), ['scenes', 0, 'set', 'layers', 0, 'motion'], 'sway')
    const b = setIn(a, ['scenes', 0, 'set', 'layers', 0, 'motion', 'amount'], 2)
    expect(getIn(b, ['scenes', 0, 'set', 'layers', 0, 'motion'])).toEqual({ amount: 2 })
  })
  it('creates missing objects on the way', () => {
    const b = setIn(lesson(), ['scenes', 0, 'set', 'layers', 0, 'motion', 'amount'], 2)
    expect(getIn(b, ['scenes', 0, 'set', 'layers', 0, 'motion'])).toEqual({ amount: 2 })
  })
})

describe('LessonDoc', () => {
  it('undoes and redoes every edit, in order', () => {
    const doc = new LessonDoc(lesson())
    const x = ['scenes', 0, 'set', 'layers', 0, 'x']
    doc.set(x, 0.5)
    doc.set(['scenes', 0, 'est_s'], 9) // another value between: the two x edits stay two steps
    doc.set(x, 0.9)
    doc.undo()
    expect(getIn(doc.lesson, x)).toBe(0.5)
    doc.undo()
    expect(getIn(doc.lesson, ['scenes', 0, 'est_s'])).toBeUndefined()
    doc.undo()
    expect(getIn(doc.lesson, x)).toBe(0.2)
    doc.redo()
    expect(getIn(doc.lesson, x)).toBe(0.5)
  })
  it('folds a slider drag into one undo step', () => {
    const doc = new LessonDoc(lesson())
    const x = ['scenes', 0, 'set', 'layers', 0, 'x']
    for (const v of [0.3, 0.4, 0.5, 0.6]) doc.set(x, v, 'Place')
    doc.undo()
    expect(getIn(doc.lesson, x)).toBe(0.2)
    doc.redo()
    expect(getIn(doc.lesson, x)).toBe(0.6)
  })
  it('records nothing when the value does not change', () => {
    const doc = new LessonDoc(lesson())
    doc.set(['scenes', 0, 'set', 'layers', 0, 'x'], 0.2)
    expect(doc.history.canUndo()).toBe(false)
  })
})
