import { describe, expect, it, vi } from 'vitest'
import { Timeline } from './timeline'
import { breathe, HOUSE } from './layout'
import type { Scene } from './types'

const sc = (id: string, dur: number, interaction = false): Scene =>
  ({ id, set: { layers: [] }, dur_s: dur, ...(interaction ? { interaction: { type: 'quiz' } } : {}) })
const flush = () => new Promise((r) => setTimeout(r, 0))
async function make(scenes: Scene[]) {
  const builds: number[] = []
  const tl = new Timeline(() => scenes, async (i) => { builds.push(i) })
  await tl.enter(0)
  return { tl, builds }
}
async function run(tl: Timeline, seconds: number, dt = 0.1) {
  for (let s = 0; s < seconds - 1e-9; s += dt) { tl.tick(dt); await flush() }
}

describe('Timeline: interactions hold the picture', () => {
  it('holds at the end of a scene with an interaction, fires the hook once, and moves on only on resume', async () => {
    const { tl } = await make([sc('a', 2, true), sc('b', 3)])
    const hook = vi.fn()
    tl.onInteraction(hook)
    await run(tl, 2.05)
    expect(tl.mode).toBe('holding')
    expect(hook).toHaveBeenCalledTimes(1)
    expect(hook.mock.calls[0][0].id).toBe('a')
    await run(tl, 30)                                   // the class takes its time: still holding, hook not re-fired
    expect(tl.mode).toBe('holding')
    expect(tl.index).toBe(0)
    expect(tl.holdT).toBeGreaterThan(29)
    expect(hook).toHaveBeenCalledTimes(1)
    hook.mock.calls[0][1]()                             // the card resolves
    await flush()
    expect(tl.mode).toBe('playing')
    expect(tl.index).toBe(1)
    expect(tl.t).toBe(0)
  })
  it('runs straight through scenes without an interaction', async () => {
    const { tl } = await make([sc('a', 1), sc('b', 1)])
    await run(tl, 1.05)
    expect(tl.index).toBe(1)
  })
  it('a hold on the last scene ends the lesson on resume', async () => {
    const { tl } = await make([sc('a', 1, true)])
    let resume = () => {}
    tl.onInteraction((_, r) => { resume = r })
    await run(tl, 1.05)
    resume()
    expect(tl.mode).toBe('ended')
  })
  it('ignores a stale resume after the teacher seeks elsewhere', async () => {
    const { tl } = await make([sc('a', 1, true), sc('b', 1), sc('c', 5)])
    let resume = () => {}
    tl.onInteraction((_, r) => { resume = r })
    await run(tl, 1.05)
    await tl.seekToScene('c')
    resume()
    await flush()
    expect(tl.index).toBe(2)
    expect(tl.mode).toBe('playing')
  })
})

describe('Timeline: pause, resume, seek', () => {
  it('pause stops the picture, resume continues from the same point', async () => {
    const { tl } = await make([sc('a', 10)])
    await run(tl, 2)
    tl.pause()
    await run(tl, 5)
    expect(tl.t).toBeCloseTo(2)
    tl.resume()
    await run(tl, 1)
    expect(tl.t).toBeCloseTo(3)
  })
  it('seekToScene goes to that scene at 0 and clears a hold; an unknown id rejects', async () => {
    const { tl, builds } = await make([sc('a', 1, true), sc('b', 4), sc('c', 4)])
    await run(tl, 1.05)
    expect(tl.mode).toBe('holding')
    await tl.seekToScene('c')
    expect([tl.index, tl.t, tl.mode]).toEqual([2, 0, 'playing'])
    expect(builds).toContain(2)
    await expect(tl.seekToScene('nope')).rejects.toThrow('no scene nope')
  })
  it('a paused seek stays paused', async () => {
    const { tl } = await make([sc('a', 4), sc('b', 4)])
    tl.pause()
    await tl.seekToScene('b')
    await run(tl, 2)
    expect([tl.index, tl.t, tl.mode]).toEqual([1, 0, 'paused'])
  })
  it('resume at the end starts the lesson over', async () => {
    const { tl } = await make([sc('a', 1)])
    await run(tl, 1.05)
    expect(tl.mode).toBe('ended')
    tl.resume()
    await flush()
    expect([tl.index, tl.t, tl.mode]).toEqual([0, 0, 'playing'])
  })
})

describe('Timeline: the lesson clock (sound sync)', () => {
  it('is scene starts + t, and stands still while paused and while holding', async () => {
    const { tl } = await make([sc('a', 3, true), sc('b', 4), sc('c', 5)])
    await run(tl, 1)
    expect(tl.clock()).toBeCloseTo(1)
    tl.pause(); await run(tl, 10); tl.resume()
    expect(tl.clock()).toBeCloseTo(1)
    await run(tl, 2.05)                                 // into the hold at 3 s
    expect(tl.mode).toBe('holding')
    await run(tl, 60)
    expect(tl.clock()).toBeCloseTo(3)                    // a minute of quiz is not lesson time
    expect(tl.duration()).toBe(12)
  })
  it('jumps with a seek: scene c starts at 7 s', async () => {
    const { tl } = await make([sc('a', 3), sc('b', 4), sc('c', 5)])
    await tl.seekToScene('c')
    expect(tl.clock()).toBe(7)
  })
})

describe('breathe (the held frame)', () => {
  it('starts exactly on the end pose and stays within the drift amount', () => {
    expect(breathe(HOUSE, 0)).toEqual(HOUSE)
    for (let t = 0; t < 30; t += 0.37) {
      const b = breathe(HOUSE, t, { breath_m: 0.1, breath_s: 5 })
      expect(Math.abs(b.x - HOUSE.x)).toBeLessThanOrEqual(0.1 + 1e-9)
      expect(Math.abs(b.y - HOUSE.y)).toBeLessThanOrEqual(0.05 + 1e-9)
    }
  })
  it('a drift of 0 holds still (teacher can switch it off)', () => {
    expect(breathe(HOUSE, 12, { breath_m: 0 })).toEqual(HOUSE)
  })
})
