import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSaveQueue } from '../save-queue.js'

const PAUSE_MS = 400

describe('a live save waits for a pause, then saves once', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends one save after a burst of edits, once the pause has passed', () => {
    const save = vi.fn()
    const queue = createSaveQueue(save, PAUSE_MS)

    queue.schedule()
    vi.advanceTimersByTime(300)
    queue.schedule()
    vi.advanceTimersByTime(300)
    expect(save).not.toHaveBeenCalled()

    vi.advanceTimersByTime(PAUSE_MS)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flush sends the pending save at once, and does not send it again when the timer would have fired', () => {
    const save = vi.fn()
    const queue = createSaveQueue(save, PAUSE_MS)

    queue.schedule()
    queue.flush()
    expect(save).toHaveBeenCalledTimes(1)
    expect(queue.isPending()).toBe(false)

    vi.advanceTimersByTime(PAUSE_MS)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flush does nothing when no save is waiting', () => {
    const save = vi.fn()
    createSaveQueue(save, PAUSE_MS).flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('cancel drops the pending save', () => {
    const save = vi.fn()
    const queue = createSaveQueue(save, PAUSE_MS)

    queue.schedule()
    queue.cancel()
    vi.advanceTimersByTime(PAUSE_MS)
    expect(save).not.toHaveBeenCalled()
  })
})
