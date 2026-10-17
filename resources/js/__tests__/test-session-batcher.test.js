import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BEACON_MAX_BYTES, FLUSH_INTERVAL_MS, RRWEB_FLUSH_AT, createBatcher } from '../test-session/batcher.js'

const make = (post = vi.fn(async () => true), beacon = vi.fn(() => true)) => {
  let seq = 0
  const batcher = createBatcher({ post, beacon, nextSeq: () => seq++ })
  return { batcher, post, beacon }
}

describe('test-session batcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends the queue every 5 seconds, with the rrweb chunk numbered', async () => {
    const { batcher, post } = make()
    batcher.start()
    batcher.event({ t: 10, type: 'click' })
    batcher.rrweb({ type: 2 })
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toEqual({ events: [{ t: 10, type: 'click' }], rrweb: { seq: 0, events: [{ type: 2 }] } })

    batcher.event({ t: 20, type: 'route' })
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS)
    expect(post.mock.calls[1][0]).toEqual({ events: [{ t: 20, type: 'route' }], rrweb: null })
  })

  it('sends nothing when there is nothing queued', async () => {
    const { batcher, post } = make()
    batcher.start()
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS * 3)
    expect(post).not.toHaveBeenCalled()
  })

  it('flushes early when the rrweb queue gets big', async () => {
    const { batcher, post } = make()
    for (let i = 0; i < RRWEB_FLUSH_AT; i++) batcher.rrweb({ type: 3, i })
    await vi.advanceTimersByTimeAsync(0)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0].rrweb.events).toHaveLength(RRWEB_FLUSH_AT)
  })

  it('puts a failed batch back in front, so nothing is lost or reordered', async () => {
    const post = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
    const { batcher } = make(post)
    batcher.event({ t: 1, type: 'click' })
    await batcher.flush()
    batcher.event({ t: 2, type: 'click' })
    await batcher.flush()
    expect(post.mock.calls[1][0].events.map((e) => e.t)).toEqual([1, 2])
  })

  it('a flush during a post in flight waits and then sends the rest', async () => {
    let release
    const post = vi.fn().mockImplementationOnce(() => new Promise((r) => { release = () => r(true) })).mockResolvedValue(true)
    const { batcher } = make(post)
    batcher.event({ t: 1, type: 'click' })
    const first = batcher.flush()
    batcher.event({ t: 2, type: 'stop' })
    const second = batcher.flush()
    expect(post).toHaveBeenCalledTimes(1)
    release()
    await Promise.all([first, second])
    expect(post).toHaveBeenCalledTimes(2)
    expect(post.mock.calls[1][0].events).toEqual([{ t: 2, type: 'stop' }])
  })

  it('on page hide sends a small batch as a beacon and a big one by post', () => {
    const { batcher, post, beacon } = make()
    batcher.event({ t: 1, type: 'click' })
    batcher.flushOnHide()
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(JSON.parse(beacon.mock.calls[0][0]).events).toHaveLength(1)

    batcher.rrweb({ type: 2, data: 'x'.repeat(BEACON_MAX_BYTES) })
    batcher.flushOnHide()
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(batcher.pending()).toEqual({ events: 0, rrweb: 0 })
  })

  it('falls back to a post when the browser refuses the beacon', () => {
    const { batcher, post } = make(undefined, vi.fn(() => false))
    batcher.event({ t: 1, type: 'click' })
    batcher.flushOnHide()
    expect(post).toHaveBeenCalledTimes(1)
  })
})
