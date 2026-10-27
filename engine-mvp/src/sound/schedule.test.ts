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

  it('L-cut: beds that leave ring on past the cut by tail_s', () => {
    const scenes = lesson.scenes.map((x, i) => (i === 4 ? { ...x, sound: { ...x.sound!, lead_in_s: 0, tail_s: 1 } } : x))
    const fireOut = schedule({ ...lesson, scenes }).filter((e) => e.kind === 'bed-gain' && e.id === 'camp-fire').at(-1)!
    expect(fireOut.t).toBeGreaterThan(starts[4] - 0.75) // fade starts after the cut minus half a crossfade + tail
  })

  it('ends a bed at its last scene even without dur_s', () => {
    const scenes = lesson.scenes.map(({ dur_s, ...x }) => x)
    const wind = schedule({ ...lesson, scenes }).find((e) => e.kind === 'bed-start' && e.id === 'heath-wind')!
    expect(wind.kind === 'bed-start' && wind.stop).toBeGreaterThan(40)
  })

  it('plays the narrator\'s line at narration_at_s, after a silence too, and only where there is a file', () => {
    const withVoice = { ...lesson, scenes: lesson.scenes.map((x, i) => (i === 4 ? { ...x, tts_url: 'lessons/vault/x/audio/sc05.m4a' } : x)) }
    const voices = schedule(withVoice).filter((e) => e.kind === 'voice')
    expect(voices).toEqual([{ t: starts[4] + lesson.scenes[4].narration_at_s!, kind: 'voice', url: 'lessons/vault/x/audio/sc05.m4a' }])
    expect(lesson.scenes[4].narration_at_s).toBeGreaterThan(0) // sc05 waits out its silence
  })

  it('is sorted on the clock', () => {
    ev.slice(1).forEach((e, i) => expect(e.t).toBeGreaterThanOrEqual(ev[i].t))
  })
})
