import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSaveQueue, createKeyedSaveQueue } from '../save-queue.js'

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

describe('a keyed save queue sends each key once, with its latest value', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps the moves of two items inside one pause, and the newest move of each', () => {
    const send = vi.fn()
    const queue = createKeyedSaveQueue(send, PAUSE_MS)

    queue.schedule('dante', { cell: [5, 9.5] })
    queue.schedule('beatrice_1', { cell: [7, 9.5] })
    queue.schedule('dante', { cell: [7, 9.5] })
    vi.advanceTimersByTime(PAUSE_MS)

    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith({ cell: [7, 9.5] })
    expect(send).toHaveBeenCalledWith({ cell: [7, 9.5] })
  })

  it('flush sends every pending key now', () => {
    const send = vi.fn()
    const queue = createKeyedSaveQueue(send, PAUSE_MS)
    queue.schedule('a', 1)
    queue.schedule('b', 2)
    queue.flush()
    expect(send.mock.calls.map(([v]) => v)).toEqual([1, 2])
  })
})
