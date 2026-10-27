import { describe, expect, it } from 'vitest'
import { direct } from '../director/direct'
import { LESSON, LIBRARY } from '../director/fixture'
import bank from './bank.json'
import { schedule, sceneStarts, SILENCE_GAIN, dbToGain } from './schedule'

const lesson = direct(LESSON, LIBRARY)
const ev = schedule(lesson)
const starts = sceneStarts(lesson)

describe('sound schedule', () => {
  it('starts the base bed at 0 and keeps it as one loop through the lesson', () => {
    const wind = ev.filter((e) => e.kind === 'bed-start' && e.id === 'heath-wind')
    expect(wind.length).toBe(1)
    expect(wind[0].t).toBe(0)
  })

  it('J-cut: the fire bed starts before its scene cuts in', () => {
    const fire = ev.find((e) => e.kind === 'bed-start' && e.id === 'camp-fire')!
    expect(fire.t).toBeLessThan(starts[3])
  })

  it('crossfades: a bed that leaves fades to 0 instead of stopping dead', () => {
    const fireOut = ev.filter((e) => e.kind === 'bed-gain' && e.id === 'camp-fire').at(-1)!
    expect(fireOut.kind === 'bed-gain' && fireOut.gain).toBe(0)
    expect(fireOut.kind === 'bed-gain' && fireOut.ramp).toBeGreaterThan(0.5)
  })

  it('ducks ambience under every narration and lifts it after', () => {
    const bus = ev.filter((e) => e.kind === 'amb-bus')
    expect(bus.filter((e) => e.kind === 'amb-bus' && e.why === 'unduck').length).toBe(lesson.scenes.length)
    const duck = bus.find((e) => e.kind === 'amb-bus' && e.why === 'duck')!
    expect(duck.kind === 'amb-bus' && duck.gain).toBeCloseTo(dbToGain(-12), 3)
  })

  it('drops to a near-silence before the turn and the peak', () => {
    const sil = ev.filter((e) => e.kind === 'amb-bus' && e.why === 'silence')
    expect(sil.map((e) => e.t)).toEqual([starts[4], starts[5]])
    sil.forEach((e) => expect(e.kind === 'amb-bus' && e.gain).toBe(SILENCE_GAIN))
  })

  it('fires SFX at their cue, and every id exists in the bank', () => {
    const ids = new Set([...bank.beds, ...bank.sfx].map((b) => b.id))
    ev.forEach((e) => { if ('id' in e) expect(ids.has(e.id)).toBe(true) })
    const whoosh = ev.find((e) => e.kind === 'sfx' && e.id === 'ink-whoosh')!
    expect(whoosh.t).toBeCloseTo(starts[5] + lesson.scenes[5].narration_at_s!, 2)
  })

  it('is sorted on the clock', () => {
    ev.slice(1).forEach((e, i) => expect(e.t).toBeGreaterThanOrEqual(ev[i].t))
  })
})
