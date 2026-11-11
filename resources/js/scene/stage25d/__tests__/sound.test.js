import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { schedule } from '@stage25d/sound/schedule'
import { LessonSound } from '@stage25d/sound/player'
import { soundWindow, onNarrationClock, hasStageSound, createStageSound } from '../sound.js'

const stage = (id, sound, extra = {}) => ({ id, kind: 'stage25d', duration_seconds: 8, config: { stage25d: { id: `s${id}`, sound, dur_s: 8, ...extra } } })
const plan = (over = {}) => ({ ambience: [{ id: 'heath-wind', gain: 0.55 }], lead_in_s: 0, tail_s: 0, silence: null, sfx: [], duck_db: -12, ...over })

const QUEUE = [
  stage(1, plan()),
  stage(2, plan({ ambience: [{ id: 'heath-wind', gain: 0.5 }, { id: 'camp-fire', gain: 0.5 }], sfx: [{ id: 'wood-knock', at_s: 2.4 }, { id: 'wood-knock', at_s: 0.5 }] }), { narration_at_s: 1 }),
  { id: 3, kind: 'map', config: {} },
  stage(4, null),
]

describe('the window a stage scene plays', () => {
  it('knows which scenes have something to hear', () => {
    expect(QUEUE.map(hasStageSound)).toEqual([true, true, false, false])
  })

  it('puts a scene on its narration clock: sfx before the first word fire on it, after it keep their gap', () => {
    const s = onNarrationClock(QUEUE[1], 6)
    expect(s.narration_at_s).toBe(0)
    expect(s.dur_s).toBe(6)
    expect(s.sound.sfx.map((x) => x.at_s)).toEqual([1.4, 0])
  })

  it('starts at the cut after the scene heard before, and keeps the last scene\'s beds looping', () => {
    const { lesson, from } = soundWindow(QUEUE, 1, 0, 6)
    expect(lesson.scenes.map((s) => s.id)).toEqual(['1', '2'])
    expect(from).toBe(lesson.scenes[0].dur_s)
    expect(lesson.scenes[1].dur_s).toBeGreaterThan(600) // a map follows: leave() ends it, not the window
    expect(lesson.scenes[1].tts_s).toBe(6)              // the duck still lifts when the narrator stops
  })

  it('fires the sfx at their times from the narration start, and ducks the beds under the narrator', () => {
    const { lesson, from } = soundWindow(QUEUE, 1, 0, 6)
    const ev = schedule(lesson)
    expect(ev.filter((e) => e.kind === 'sfx').map((e) => +(e.t - from).toFixed(3))).toEqual([0, 1.4])
    const duck = ev.find((e) => e.kind === 'amb-bus' && e.why === 'duck' && e.t >= from)
    expect(duck.t).toBe(from)
    expect(duck.gain).toBeCloseTo(10 ** (-12 / 20), 4)
  })

  it('leaves the next scene\'s sfx and duck to its own window (its start is a guess): no sfx heard twice', () => {
    const { lesson } = soundWindow(QUEUE, 0, null, 8)
    expect(lesson.scenes.map((s) => s.id)).toEqual(['1', '2'])
    const ev = schedule(lesson)
    expect(ev.filter((e) => e.kind === 'sfx')).toEqual([])
    expect(ev.filter((e) => e.kind === 'amb-bus' && e.why === 'duck' && e.t > 0).every((e) => e.gain === 1)).toBe(true)
  })

  it('crossfades: a bed the next scene drops fades out, the one it adds comes in before the cut (J-cut)', () => {
    const q = [QUEUE[0], stage(2, plan({ ambience: [{ id: 'camp-fire', gain: 0.5 }], lead_in_s: 1 }))]
    const { lesson } = soundWindow(q, 0, null, 8)
    const ev = schedule(lesson)
    const cut = lesson.scenes[0].dur_s
    expect(ev.find((e) => e.kind === 'bed-start' && e.id === 'camp-fire').t).toBeLessThan(cut)
    const windOut = ev.filter((e) => e.kind === 'bed-gain' && e.id === 'heath-wind').at(-1)
    expect(windOut.gain).toBe(0)
  })
})

// ── the controller, against a fake engine ──────────────────────────────────────────────────────────────────────
const fakeEngine = () => {
  const gain = () => ({ value: 1, setTargetAtTime: vi.fn(function (v) { this.value = v }), cancelScheduledValues: vi.fn() })
  return {
    ctx: { currentTime: 0, close: vi.fn(() => Promise.resolve()) },
    master: { gain: gain() }, ambience: { gain: gain() },
    preload: vi.fn(() => Promise.resolve()), play: vi.fn(() => Promise.resolve()),
    hold: vi.fn(), release: vi.fn(), stop: vi.fn(),
    pause: vi.fn(() => Promise.resolve()), resume: vi.fn(() => Promise.resolve()),
    state: vi.fn(() => ({ held: [] })),
  }
}
class Ctx {}

describe('the page\'s stage sound', () => {
  let eng, ss
  beforeEach(() => { eng = fakeEngine(); ss = createStageSound({ make: () => eng, AudioCtx: Ctx }) })

  it('does nothing before the click unlocks it', async () => {
    await ss.play(QUEUE, 0)
    ss.hold(QUEUE); ss.leave(); ss.pause(); ss.setLevel(0.3); ss.destroy()
    expect(ss.engine).toBe(null)
  })

  it('makes one engine on unlock, at the deck\'s level', () => {
    ss.unlock(0.4)
    ss.unlock(1)
    expect(ss.engine).toBe(eng)
    expect(eng.master.gain.value).toBe(0.4)
  })

  it('plays the scene\'s window from where the narration is, after its files are loaded', async () => {
    ss.unlock()
    await ss.play(QUEUE, 0, () => 0, 8)
    await ss.play(QUEUE, 1, () => 0.25, 6)
    expect(eng.preload).toHaveBeenCalledTimes(3) // two windows + the warm-up of scene 2's sfx
    const [lesson, from] = eng.play.mock.calls[1]
    expect(lesson.scenes.map((s) => s.id)).toEqual(['1', '2'])
    expect(from).toBeCloseTo(lesson.scenes[0].dur_s + 0.25, 5)
  })

  it('loads the next scene\'s sfx ahead, so an early cue is not lost to the fetch', async () => {
    ss.unlock()
    await ss.play(QUEUE, 0, () => 0, 8)
    const warmed = eng.preload.mock.calls.at(-1)[0].scenes[0].sound.sfx.map((x) => x.id)
    expect(warmed).toEqual(['wood-knock', 'wood-knock'])
  })

  it('a scene left while its files load does not start', async () => {
    ss.unlock()
    let done
    eng.preload.mockImplementationOnce(() => new Promise((r) => { done = r }))
    const p = ss.play(QUEUE, 0)
    ss.leave()
    done(); await p
    expect(eng.play).not.toHaveBeenCalled()
  })

  it('a stage scene without a plan fades out what was playing', async () => {
    ss.unlock()
    await ss.play(QUEUE, 3)
    expect(eng.play).not.toHaveBeenCalled()
    expect(eng.ambience.gain.setTargetAtTime).toHaveBeenCalledWith(0, 0, 0.5)
  })

  it('keeps the last scene\'s beds low under a card, once', async () => {
    ss.unlock()
    await ss.play(QUEUE, 1, () => 0, 6)
    ss.hold(QUEUE)
    expect(eng.hold).toHaveBeenCalledWith(QUEUE[1].config.stage25d.sound.ambience, -12)
    eng.state.mockReturnValue({ held: ['heath-wind'] })
    ss.hold(QUEUE)
    expect(eng.hold).toHaveBeenCalledTimes(1)
  })

  it('pauses and resumes with the lesson, follows mute and volume', () => {
    ss.unlock()
    ss.pause(); ss.resume()
    expect(eng.pause).toHaveBeenCalled()
    expect(eng.resume).toHaveBeenCalled()
    ss.setLevel(0)
    expect(eng.master.gain.value).toBe(0)
    ss.setLevel(0.7)
    expect(eng.master.gain.value).toBe(0.7)
  })

  it('fades out on leave and stops for good on destroy', () => {
    vi.useFakeTimers()
    ss.unlock()
    ss.leave(1)
    expect(eng.release).toHaveBeenCalledWith(1)
    vi.advanceTimersByTime(2000)
    expect(eng.stop).toHaveBeenCalled()
    ss.destroy()
    expect(eng.ctx.close).toHaveBeenCalled()
    expect(ss.engine).toBe(null)
    vi.useRealTimers()
  })
})

// ── the real engine on a fake AudioContext: what it fetches and when it starts it ─────────────────────────────
class FakeParam {
  value = 1
  setTargetAtTime (v) { this.value = v } setValueAtTime (v) { this.value = v } cancelScheduledValues () {}
}
class FakeAudioContext {
  currentTime = 10
  state = 'running'
  destination = {}
  started = []
  createGain () { return { gain: new FakeParam(), connect () {} } }
  createBufferSource () {
    const ctx = this
    return { connect () {}, start (at, off = 0) { ctx.started.push({ at, off, buf: this.buffer.name }) }, stop () {} }
  }
  decodeAudioData (b) { return Promise.resolve({ duration: 30, name: b.name }) }
  suspend () { this.state = 'suspended'; return Promise.resolve() }
  resume () { this.state = 'running'; return Promise.resolve() }
  close () { return Promise.resolve() }
}

describe('the engine behind it', () => {
  const fetched = []
  beforeEach(() => {
    globalThis.AudioContext = FakeAudioContext
    globalThis.fetch = vi.fn((url) => { fetched.push(url); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({ name: url.split('/').pop() }) }) })
  })
  afterEach(() => { delete globalThis.AudioContext; fetched.length = 0 })

  it('fetches the beds and sfx from /sound/bank/ and starts them on the narration clock', async () => {
    const ss = createStageSound({ make: (ctx) => new LessonSound(ctx) })
    ss.unlock(1)
    await ss.play(QUEUE, 1, () => 0, 6)
    expect(fetched.sort()).toEqual(['/sound/bank/beds/camp-fire.m4a', '/sound/bank/beds/heath-wind.m4a', '/sound/bank/sfx/wood-knock.m4a'])
    const t0 = ss.engine.ctx.currentTime + 0.05
    const knocks = ss.engine.ctx.started.filter((s) => s.buf === 'wood-knock.m4a').map((s) => +(s.at - t0).toFixed(3))
    expect(knocks).toEqual([0, 1.4])
    ss.setLevel(0)
    expect(ss.engine.master.gain.value).toBe(0)
    await ss.engine.pause()
    expect(ss.engine.ctx.state).toBe('suspended')
    ss.destroy()
  })
})
