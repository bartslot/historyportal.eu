import { describe, it, expect, vi } from 'vitest'
import { whenStageReady } from '../stage-hold.js'

describe('a stage scene\'s voice waits for its set', () => {
  it('starts as soon as the stage is shown', async () => {
    await expect(whenStageReady(Promise.resolve())).resolves.toBe('ready')
  })
  it('a stage that fails to load does not hold it', async () => {
    await expect(whenStageReady(Promise.reject(new Error('webgl')))).resolves.toBe('failed')
  })
  it('a stage that never comes up holds it only until the timeout', async () => {
    vi.useFakeTimers()
    const waiting = whenStageReady(new Promise(() => {}), 8000)
    vi.advanceTimersByTime(8000)
    await expect(waiting).resolves.toBe('timeout')
    vi.useRealTimers()
  })
  it('a scene with no stage does not wait', async () => {
    await expect(whenStageReady(null)).resolves.toBe('none')
  })
})
