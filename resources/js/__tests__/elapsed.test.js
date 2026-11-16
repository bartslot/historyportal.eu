import { describe, it, expect, vi, afterEach } from 'vitest'
import { elapsed, elapsedLabel } from '../ui/elapsed.js'

/** A generation shows how long it has been running (Bart 11-16: "we need a timer for the generations"). */
describe('the generation timer', () => {
  afterEach(() => vi.useRealTimers())

  it('reads minutes and seconds', () => {
    expect(elapsedLabel(0)).toBe('0:00')
    expect(elapsedLabel(7)).toBe('0:07')
    expect(elapsedLabel(75)).toBe('1:15')
  })

  it('counts while the generation runs and starts again from zero the next time', () => {
    vi.useFakeTimers()
    const t = elapsed()

    t.sync(true)
    vi.advanceTimersByTime(12_000)
    expect(t.label).toBe('0:12')

    t.sync(true)   // still the same run: keeps counting, not restarted
    vi.advanceTimersByTime(3_000)
    expect(t.label).toBe('0:15')

    t.sync(false)
    expect(t.running).toBe(false)
    t.sync(true)
    expect(t.label).toBe('0:00')
    t.destroy()
  })
})
