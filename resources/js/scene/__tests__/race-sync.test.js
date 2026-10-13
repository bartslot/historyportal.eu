import { describe, it, expect, vi, afterEach } from 'vitest'
import { nextDelay, takeChunk, crewOf, serverOrder, deviceId, RaceClient, MAX_DELAY_MS } from '../race-sync.js'

afterEach(() => vi.useRealTimers())

describe('race sync rules', () => {
  it('backs off after a failure and returns to the base after a success', () => {
    expect(nextDelay(1000, true, 1000)).toBe(1000)
    expect(nextDelay(1000, false, 1000, () => 0.5)).toBe(2000)
    expect(nextDelay(6000, false, 1000, () => 0.5)).toBe(MAX_DELAY_MS)
  })

  it('never sends more than the server accepts; the rest waits', () => {
    expect(takeChunk(2.5, 1)).toEqual({ send: 1, rest: 1.5 })
    expect(takeChunk(0.4, 1)).toEqual({ send: 0.4, rest: 0 })
  })

  it('reads a team\'s ship and the finish order from the server', () => {
    const race = { roles: { heemskerck: 7, zeehaen: 5 }, teams: [{ finished_ms: 9000 }, { finished_ms: null }, { finished_ms: 4000 }] }
    expect(crewOf(race, 5)).toBe('zeehaen')
    expect(crewOf(race, 6)).toBe(null)
    expect(serverOrder(race)).toEqual([2, 0])
  })

  it('keeps one random device id per browser', () => {
    const data = new Map()
    const s = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }
    const id = deviceId(s)
    expect(id).toMatch(/^[A-Za-z0-9-]{16,40}$/)
    expect(deviceId(s)).toBe(id)
  })
})

describe('RaceClient', () => {
  const urls = { state: '/race/ABCD/state', push: '/race/ABCD/push' }
  const reply = (status, body = {}) => Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) })

  it('pushes a gain in server-sized chunks, then reads', async () => {
    vi.useFakeTimers()
    const calls = []
    const fetchFn = vi.fn((url, init) => {
      const delta = init?.body ? JSON.parse(init.body).delta : null
      calls.push([url, delta])
      return reply(200, { state: 'running', accepted: delta ?? 0 })
    })
    const client = new RaceClient({ urls, teamId: 3, token: 'tok', cap: 1, fetchFn, pushMs: 1000, pollMs: 2000 })
    client.gain(2.5)
    client.start()
    for (let i = 0; i < 4; i++) await vi.advanceTimersByTimeAsync(1000)
    expect(calls.slice(0, 3)).toEqual([[urls.push, 1], [urls.push, 1], [urls.push, 0.5]])
    expect(calls[3][0]).toBe(`${urls.state}?team=3`)
    expect(fetchFn.mock.calls[0][1].headers['X-Race-Device']).toBeTruthy()
    expect(fetchFn.mock.calls[0][1].headers['X-Race-Token']).toBe('tok')
    client.stop()
  })

  it('keeps what the server did not accept, and drops a chunk it refuses outright', async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn()
      .mockReturnValueOnce(reply(200, { accepted: 0.25 }))     // the team may only gain so fast
      .mockReturnValueOnce(reply(403))                          // not this team's token
      .mockImplementation(() => reply(200, {}))
    const client = new RaceClient({ urls, teamId: 1, token: 'x', cap: 1, fetchFn, pushMs: 1000, pollMs: 1000 })
    client.gain(1)
    client.start()
    await vi.advanceTimersByTimeAsync(10)
    expect(client._pending).toBeCloseTo(0.75)
    await vi.advanceTimersByTimeAsync(1100)
    expect(client._pending).toBe(0)
    client.stop()
  })

  it('keeps an unsent gain through an error and backs off', async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn().mockReturnValueOnce(reply(429)).mockImplementation(() => reply(200, { accepted: 1 }))
    const client = new RaceClient({ urls, teamId: 1, cap: 1, fetchFn, pushMs: 1000, pollMs: 1000 })
    client.gain(1)
    client.start()
    await vi.advanceTimersByTimeAsync(10)
    expect(client._pending).toBe(1)
    expect(client._delay).toBeGreaterThanOrEqual(1800)
    await vi.advanceTimersByTimeAsync(2500)
    expect(client._pending).toBe(0)
    client.stop()
  })

  it('stops and says so when the race is gone', async () => {
    vi.useFakeTimers()
    const onGone = vi.fn()
    const client = new RaceClient({ urls, fetchFn: () => reply(404), onGone })
    client.start()
    await vi.advanceTimersByTimeAsync(10)
    expect(onGone).toHaveBeenCalledOnce()
  })
})
