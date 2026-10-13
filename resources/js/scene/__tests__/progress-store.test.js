import { describe, it, expect } from 'vitest'
import { readProgress, saveProgress, clearProgress, canResume, progressKey } from '../progress-store.js'

const memory = () => {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data }
}

describe('progress on the pupil\'s own device', () => {
  it('saves and reads back where they got to', () => {
    const s = memory()
    saveProgress(s, 'ABC', { index: 7, time: 12.345, done: [5, 5, 6] })
    expect(readProgress(s, 'ABC')).toEqual({ index: 7, time: 12.3, done: [5, 6] })
    expect(readProgress(s, 'OTHER')).toBeNull()
  })

  it('reads junk, an old version or a missing store as no progress', () => {
    const s = memory()
    s.setItem(progressKey('A'), '{not json')
    expect(readProgress(s, 'A')).toBeNull()
    s.setItem(progressKey('A'), JSON.stringify({ v: 0, index: 3 }))
    expect(readProgress(s, 'A')).toBeNull()
    s.setItem(progressKey('A'), JSON.stringify({ v: 1, index: -1 }))
    expect(readProgress(s, 'A')).toBeNull()
    expect(readProgress(null, 'A')).toBeNull()
    expect(readProgress({ getItem: () => { throw new Error('denied') } }, 'A')).toBeNull()
  })

  it('never throws when storage is full or blocked', () => {
    expect(() => saveProgress({ setItem: () => { throw new Error('quota') } }, 'A', { index: 1 })).not.toThrow()
    expect(() => clearProgress({ removeItem: () => { throw new Error('x') } }, 'A')).not.toThrow()
  })

  it('offers to continue only past the very start', () => {
    expect(canResume(null)).toBe(false)
    expect(canResume({ index: 0, time: 3, done: [] })).toBe(false)
    expect(canResume({ index: 0, time: 30, done: [] })).toBe(true)
    expect(canResume({ index: 2, time: 0, done: [] })).toBe(true)
  })
})
