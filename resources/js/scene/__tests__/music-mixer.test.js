import { describe, it, expect, beforeEach } from 'vitest'
import { MusicMixer, resolveSceneMusic, hasSceneMusic } from '../music-mixer.js'

/**
 * The per-scene mix. A track that stays across scenes must not restart (a class hears that as a
 * glitch on every slide), a track that leaves must fade rather than cut, and mute must mean silence.
 */

class FakeParam {
  constructor (v = 1) { this.value = v; this.events = [] }
  cancelScheduledValues () { this.events = [] }
  setValueAtTime (v, t) { this.value = v; this.events.push(['set', v, t]) }
  linearRampToValueAtTime (v, t) { this.events.push(['ramp', v, t]); this.target = v }
  setTargetAtTime (v) { this.target = v }
}

class FakeNode {
  constructor () { this.gain = new FakeParam(); this.out = [] }
  connect (n) { this.out.push(n); return n }
  disconnect () {}
}

class FakeSource extends FakeNode {
  constructor (ctx) { super(); ctx.sources.push(this); this.started = null; this.stopAt = null }
  start (when, offset) { this.started = offset; this.when = when }
  stop (t) { this.stopAt = t ?? 0 }
}

class FakeCtx {
  static last = null
  constructor () { this.currentTime = 0; this.sources = []; this.destination = new FakeNode(); this.state = 'running'; FakeCtx.last = this }
  createGain () { return new FakeNode() }
  createBufferSource () { return new FakeSource(this) }
  decodeAudioData () { return Promise.resolve({ duration: 120 }) }
  suspend () { this.state = 'suspended'; return Promise.resolve() }
  resume () { this.state = 'running'; return Promise.resolve() }
  close () { this.state = 'closed' }
}

const TRACKS = { 1: { url: '/one.mp3' }, 2: { url: '/two.mp3' } }
const fetched = []
const fetchFn = url => { fetched.push(url); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }) }
const flush = () => new Promise(r => setTimeout(r, 0))
const layer = (id, extra = {}) => ({ track_id: id, volume: 0.6, offset: 0, loop: true, loop_start: 0, loop_end: null, fade_in: 1, fade_out: 1, ...extra })
const mix = (...layers) => ({ layers, crossfade: 2, duck: 0.3 })

let m
beforeEach(() => {
  fetched.length = 0
  m = new MusicMixer(TRACKS, { volume: 0.5, AudioContextCtor: FakeCtx, fetchFn })
})

describe('MusicMixer', () => {
  it('starts a track at its offset with its loop points', async () => {
    m.enterScene(mix(layer(1, { offset: 7, loop_start: 4, loop_end: 60 })))
    await flush()
    const [src] = FakeCtx.last.sources
    expect(src.started).toBe(7)
    expect([src.loop, src.loopStart, src.loopEnd]).toEqual([true, 4, 60])
  })

  it('keeps a track that stays playing and only glides its volume', async () => {
    m.enterScene(mix(layer(1)))
    await flush()
    m.enterScene(mix(layer(1, { volume: 0.2 })))
    await flush()
    const ctx = FakeCtx.last
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.sources[0].stopAt).toBeNull()
    expect(m._voices.get('1').gain.gain.target).toBe(0.2)
  })

  it('crossfades: the leaving track fades out and stops, the new one fades in', async () => {
    m.enterScene(mix(layer(1)))
    await flush()
    m.enterScene(mix(layer(2)))
    await flush()
    const [one, two] = FakeCtx.last.sources
    expect(one.stopAt).toBeGreaterThanOrEqual(2)
    expect(two.started).toBe(0)
    expect(fetched).toEqual(['/one.mp3', '/two.mp3'])
  })

  it('a scene with no mix of its own carries the one before it', () => {
    const scenes = [{ music: mix(layer(1)) }, { music: null }, { music: { layers: [] } }, { music: null }]
    expect(resolveSceneMusic(scenes, 1)).toBe(scenes[0].music)
    expect(resolveSceneMusic(scenes, 3)).toBe(scenes[2].music)
    expect(resolveSceneMusic([{}, {}], 1)).toBeNull()
    expect(hasSceneMusic(scenes)).toBe(true)
    expect(hasSceneMusic([{ music: { layers: [] } }])).toBe(false)
  })

  it('a track that finishes loading after the class moved on is not started', async () => {
    m.enterScene(mix(layer(1)))
    m.enterScene(mix())
    await flush()
    expect(FakeCtx.last.sources).toHaveLength(0)
  })

  it('ducks under the narration to the scene level and follows mute and volume', async () => {
    m.enterScene(mix(layer(1)))
    m.duck(true)
    expect(m._duckGain.gain.target).toBe(0.3)
    m.duck(false)
    expect(m._duckGain.gain.target).toBe(1)
    m.setVolume(0.5)
    expect(m._masterGain.gain.target).toBe(0.25)
    m.setMuted(true)
    expect(m._masterGain.gain.target).toBe(0)
  })

  it('pause suspends the context; stop fades out and refuses new scenes', async () => {
    m.enterScene(mix(layer(1)))
    await flush()
    m.pause()
    expect(FakeCtx.last.state).toBe('suspended')
    m.resume()
    expect(FakeCtx.last.state).toBe('running')
    m.stop()
    expect(FakeCtx.last.sources[0].stopAt).toBeGreaterThan(0)
    m.enterScene(mix(layer(2)))
    await flush()
    expect(FakeCtx.last.sources).toHaveLength(1)
  })
})

describe('MusicMixer load failure', () => {
  it('tells the caller when a track cannot be loaded', async () => {
    const errors = []
    const mixer = new MusicMixer(TRACKS, {
      AudioContextCtor: FakeCtx,
      fetchFn: () => Promise.resolve({ ok: false, status: 403 }),
      onError: id => errors.push(id),
    })
    mixer.enterScene(mix(layer(1)))
    await flush(); await flush()
    expect(errors).toEqual(['1'])
  })
})

describe('MusicMixer on the beat', () => {
  it('waits for the next bar of the leaving track and fades over four bars', async () => {
    // 120 BPM, first beat at 0.5 s: bars fall on 0.5, 2.5, 4.5 ... of the file.
    const tracks = { 1: { url: '/one.mp3', bpm: 120, beat_offset: 0.5 }, 2: { url: '/two.mp3', bpm: 120, beat_offset: 0.25 } }
    const mixer = new MusicMixer(tracks, { AudioContextCtor: FakeCtx, fetchFn })
    mixer.enterScene(mix(layer(1)))
    await flush()
    const ctx = FakeCtx.last
    ctx.currentTime = 3.1   // the file is at 3.1 s, so the next bar line is 4.5 s
    mixer.enterScene(mix(layer(2)))
    await flush()
    const [one, two] = ctx.sources
    const out = mixer._voices.get('2') ? one : null
    expect(out).not.toBeNull()
    const fadeOut = one.out[0].gain.events
    expect(fadeOut).toContainEqual(['set', expect.any(Number), 4.5])
    expect(fadeOut.at(-1)).toEqual(['ramp', 0, 4.5 + 8])
    // The new track starts at the same moment, on a downbeat of its own (0.25 s into the file).
    expect(two.when).toBeCloseTo(4.5)
    expect(two.started).toBeCloseTo(0.25)
    expect(mixer._voices.get('2').gain.gain.events.at(-1)).toEqual(['ramp', 0.6, 4.5 + 8])
  })

  it('falls back to the timed crossfade when no tempo is known', async () => {
    const mixer = new MusicMixer(TRACKS, { AudioContextCtor: FakeCtx, fetchFn })
    mixer.enterScene(mix(layer(1)))
    await flush()
    FakeCtx.last.currentTime = 3.1
    mixer.enterScene(mix(layer(2)))
    await flush()
    const [one, two] = FakeCtx.last.sources
    expect(one.out[0].gain.events.at(-1)).toEqual(['ramp', 0, 3.1 + 2])
    expect(two.when).toBeCloseTo(3.1)
  })
})
