import { describe, expect, it } from 'vitest'
import { START, reconcile, step, type Sim } from './typewriter'

const run = (sim: Sim, text: string, ms: number, dt = 33) => { for (let t = 0; t < ms; t += dt) sim = step(sim, text, dt); return sim }
const TEXT = 'Welcome to the studio. What age is your class? Tell me more about it.'

describe('typewriter step', () => {
  it('types at roughly 45 chars per second', () => {
    const s = run(START, 'word '.repeat(16), 1000)
    expect(s.shown).toBeGreaterThan(35)
    expect(s.shown).toBeLessThan(70)
  })
  it('ends chunks at a space or punctuation', () => {
    const s = step({ ...START, frac: 0 }, 'hello wonderful world', 33 * 4)
    expect('hello wonderful world'[s.shown - 1]).toMatch(/[\s.,]/)
  })
  it('pauses after a sentence end', () => {
    let s = START
    for (let i = 0; i < 40 && !/[.?!]/.test(TEXT[s.shown - 1] ?? ''); i++) s = step(s, TEXT, 33)
    expect(s.pause).toBeGreaterThan(0)
    const held = step(s, TEXT, 33)
    expect(held.shown).toBe(s.shown)
  })
  it('keeps typing on when the target grows, never restarting', () => {
    const a = run(START, TEXT, 500)
    const grown = TEXT + ' And one more sentence.'
    const b = reconcile(a, TEXT, grown)
    expect(b.shown).toBe(a.shown)
    expect(step(b, grown, 100).shown).toBeGreaterThanOrEqual(a.shown)
  })
  it('catches up so it never lags more than about 2 seconds', () => {
    const long = 'word '.repeat(400)
    const s = run(START, long, 4000)
    expect(long.length - s.shown).toBeLessThan(long.length / 2 + 100)
    expect(run(START, long, 12000).shown).toBe(long.length)
  })
  it('jumps back to the common prefix when the text changes', () => {
    const s = reconcile({ shown: 30, frac: 0.5, pause: 100 }, 'abcdefghij'.repeat(5), 'abcdefghij' + 'abcdXXXX')
    expect(s.shown).toBe(14)
    expect(s.pause).toBe(0)
  })
  it('finishes exactly at the end and stays there', () => {
    const s = run(START, 'Hi there.', 5000)
    expect(s.shown).toBe(9)
    expect(step(s, 'Hi there.', 100)).toBe(s)
  })
})
