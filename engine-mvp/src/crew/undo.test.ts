import { describe, expect, it } from 'vitest'
import { latestUndoable, type UndoEntry } from './store'

const e = (lesson: string, scene: string): UndoEntry => ({ lesson, scene, run: async () => {} })

describe('latestUndoable', () => {
  it('picks the newest entry of this lesson and scene', () => {
    expect(latestUndoable({ 1: e('l', 's'), 3: e('l', 's'), 5: e('l', 'other') }, 'l', 's')).toBe(3)
  })
  it('prefers the entry applied last (seq), not the highest index', () => {
    expect(latestUndoable({ 2: { ...e('l', 's'), seq: 2 }, 4: { ...e('l', 's'), seq: 1 } }, 'l', 's')).toBe(2)
  })
  it('is -1 when nothing can be undone here', () => {
    expect(latestUndoable({ 2: e('l', 'other') }, 'l', 's')).toBe(-1)
    expect(latestUndoable({}, 'l', 's')).toBe(-1)
  })
})
