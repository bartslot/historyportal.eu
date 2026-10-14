import { describe, expect, it } from 'vitest'
import { changeOp, History } from './history'

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
})
