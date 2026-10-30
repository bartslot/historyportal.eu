import { describe, expect, it } from 'vitest'
import { changeOp, History, valueOp } from './history'

type P = { x: number }

function world() {
  const state: Record<string, P | undefined> = { rail: { x: 0 }, tasman: { x: 0 } }
  const set = (id: string, s: P | undefined) => { if (s) state[id] = { ...s }; else delete state[id] }
  return { state, set }
}

describe('History', () => {
  it('undoing the AI\'s change keeps the teacher\'s edit made before it', () => {
    const { state, set } = world()
    const h = new History()
    // the teacher drags the rail; then the AI moves Tasman
    const t = changeOp('move rail', 'teacher', { rail: { x: 0 } }, { rail: { x: 2 } }, set)
    t.redo(); h.push(t)
    const a = changeOp('place tasman near rail', 'ai', { tasman: { x: 0 } }, { tasman: { x: 2.25 } }, set)
    a.redo(); h.push(a)
    expect(h.undo()!.by).toBe('ai')
    expect(state.rail!.x).toBe(2)          // the teacher's edit stays
    expect(state.tasman!.x).toBe(0)
    h.redo()
    expect(state.tasman!.x).toBe(2.25)
  })

  it('undoes an added piece by removing it, and a new op clears redo', () => {
    const { state, set } = world()
    const h = new History()
    const add = changeOp('add crate', 'ai', {}, { crate: { x: 1 } }, set)
    add.redo(); h.push(add)
    h.undo()
    expect(state.crate).toBeUndefined()
    expect(h.canRedo()).toBe(true)
    const t = changeOp('move rail', 'teacher', { rail: { x: 0 } }, { rail: { x: 1 } }, set)
    t.redo(); h.push(t)
    expect(h.canRedo()).toBe(false)
    expect(h.list().map((o) => o.label)).toEqual(['move rail'])
  })

  it('keeps at most `limit` ops', () => {
    const h = new History(3)
    const noop = (label: string) => ({ label, by: 'ai' as const, ids: [], undo() {}, redo() {} })
    ;['a', 'b', 'c', 'd'].forEach((l) => h.push(noop(l)))
    expect(h.list().map((o) => o.label)).toEqual(['b', 'c', 'd'])
  })
  it('an AI answer is one step: undo takes the whole group back, the teacher\'s earlier edit stays', () => {
    const { state, set } = world()
    const h = new History()
    const t = changeOp('move rail', 'teacher', { rail: { x: 0 } }, { rail: { x: 2 } }, set); t.redo(); h.push(t)
    h.begin('AI answer', 'ai')
    const a1 = changeOp('place tasman', 'ai', { tasman: { x: 0 } }, { tasman: { x: 1 } }, set); a1.redo(); h.push(a1)
    const a2 = changeOp('place visscher', 'ai', {}, { visscher: { x: 3 } }, set); a2.redo(); h.push(a2)
    h.end()
    expect(h.list().map((o) => o.label)).toEqual(['move rail', 'AI answer'])
    expect(h.list()[1].children!.map((c) => c.label)).toEqual(['place tasman', 'place visscher'])
    h.undo()
    expect(state.tasman!.x).toBe(0)
    expect(state.visscher).toBeUndefined()
    expect(state.rail!.x).toBe(2)
    h.redo()
    expect(state.visscher!.x).toBe(3)
  })

  it('undoOne takes an AI answer back op by op', () => {
    const { state, set } = world()
    const h = new History()
    h.begin('AI answer', 'ai')
    const a1 = changeOp('place tasman', 'ai', { tasman: { x: 0 } }, { tasman: { x: 1 } }, set); a1.redo(); h.push(a1)
    const a2 = changeOp('place visscher', 'ai', {}, { visscher: { x: 3 } }, set); a2.redo(); h.push(a2)
    h.end()
    expect(h.undoOne()!.label).toBe('place visscher')
    expect(state.visscher).toBeUndefined()
    expect(state.tasman!.x).toBe(1)
    expect(h.list().map((o) => o.label)).toEqual(['place tasman'])
    expect(h.undoOne()!.label).toBe('place tasman')
    expect(state.tasman!.x).toBe(0)
  })

  it('nested and empty groups: one step for the outer answer, none when nothing changed', () => {
    const h = new History()
    let v = 0
    h.begin('outer', 'ai'); h.begin('inner', 'ai')
    const op = valueOp('frame', 'ai', 0, 1, (x: number) => { v = x }); op.redo(); h.push(op)
    h.end(); h.end()
    expect(h.list().map((o) => o.label)).toEqual(['frame'])     // a group of one is that op
    h.begin('nothing', 'ai')
    expect(h.end()).toBeNull()
    expect(h.list()).toHaveLength(1)
    h.undo()
    expect(v).toBe(0)
  })
})
