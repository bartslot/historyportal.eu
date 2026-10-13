import { describe, it, expect, vi } from 'vitest'
import { rms, toDb, flatness, noiseFloor, levelAbove, soundStep, SOUND } from '../meter-inputs/sound.js'

/** A power spectrum in dB like AnalyserNode gives: flat (noise) or one peak plus harmonics (a voice). */
const noiseSpectrum = (n = 1024, rand = mulberry(7)) => Float32Array.from({ length: n }, () => -50 + (rand() - 0.5) * 6)
const voiceSpectrum = (n = 1024) => Float32Array.from({ length: n }, (_, i) => ([20, 40, 60, 80].includes(i) ? -20 : -110))
function mulberry (seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

describe('sound measures', () => {
  it('rms and dB of a frame', () => {
    expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5)
    expect(rms([])).toBe(0)
    expect(toDb(1)).toBeCloseTo(0)
    expect(toDb(0)).toBe(-120)
  })

  it('tells blowing (broadband) from a voice (a few harmonics)', () => {
    expect(flatness(noiseSpectrum())).toBeGreaterThan(SOUND.blowFlatness)
    expect(flatness(voiceSpectrum())).toBeLessThan(SOUND.blowFlatness)
    expect(flatness(new Float32Array(0))).toBe(0)
  })

  it('takes the room noise from calibration, ignoring a single clap', () => {
    const room = [-62, -61, -63, -60, -62, -61, -20, -62, -61, -60]
    const floor = noiseFloor(room)
    expect(floor).toBeGreaterThan(-60)
    expect(floor).toBeLessThan(-50)
    expect(noiseFloor([])).toBe(-60 + SOUND.floorMarginDb)
    expect(levelAbove(floor + SOUND.rangeDb / 2, floor)).toBeCloseTo(0.5)
    expect(levelAbove(floor - 10, floor)).toBe(0)
    expect(levelAbove(0, floor)).toBe(1)
  })
})

describe('what a frame does to the meter', () => {
  const cfg = { threshold: 0.4, holdSeconds: 4, goal: 4 }

  it('loudness fills while the class is loud enough, voice or not', () => {
    expect(soundStep('loudness', { level: 0.8, flatness: 0.05 }, cfg, 1).amount).toBeCloseTo(SOUND.fillPerSecond)
    expect(soundStep('loudness', { level: 0.2, flatness: 0.9 }, cfg, 1).amount).toBe(0)
  })

  it('blow fills only for broadband sound: shouting does not count', () => {
    expect(soundStep('blow', { level: 0.8, flatness: 0.6 }, cfg, 0.5).amount).toBeCloseTo(SOUND.fillPerSecond / 2)
    expect(soundStep('blow', { level: 0.8, flatness: 0.05 }, cfg, 0.5)).toEqual({ amount: 0, active: false, knock: false })
  })

  it('silence fills the whole meter over the hold time, and a noise knocks it back', () => {
    expect(soundStep('silence', { level: 0.1, flatness: 0 }, cfg, 4).amount).toBeCloseTo(4)
    expect(soundStep('silence', { level: 0.9, flatness: 0 }, cfg, 0.05)).toEqual({ amount: 0, active: false, knock: true })
  })
})

describe('rhythm: claps in time fill the meter', async () => {
  const { rhythmStep, rhythmStart } = await import('../meter-inputs/sound.js')
  const cfg = { threshold: 0.4, bpm: 60, beats: 4, goal: 4 }
  /** Feed 25 ms frames: a clap is 50 ms loud at each given second, otherwise quiet. */
  const play = (claps, seconds) => {
    let state = rhythmStart()
    let filled = 0
    let heard = 0
    for (let i = 0; i < seconds / 0.025; i++) {
      const t = i * 0.025
      const level = claps.some(c => t >= c && t < c + 0.05) ? 0.9 : 0.05
      const step = rhythmStep(state, { level, dt: 0.025 }, cfg)
      state = step.state
      filled += step.amount
      if (step.clap) heard++
    }
    return { filled, heard }
  }

  it('the first clap sets the pace, then every clap on the beat fills a quarter', () => {
    expect(play([1, 2, 3, 4, 5], 6)).toEqual({ filled: 4, heard: 5 })
  })

  it('a clap a little early or late still counts; one missed beat is forgiven', () => {
    expect(play([1, 2.2, 3.1, 5.0], 6).filled).toBe(3)
  })

  it('claps out of time and a steady loud room fill nothing', () => {
    expect(play([1, 1.5, 2.9, 3.35], 5).filled).toBe(0)
    let state = rhythmStart()
    let filled = 0
    for (let i = 0; i < 200; i++) { const s = rhythmStep(state, { level: 0.9, dt: 0.025 }, cfg); state = s.state; filled += s.amount }
    expect(filled).toBe(0)
  })
})

describe('motion: shake or tilt a phone', async () => {
  const { shakeStep, shakeStart, tiltStep, accelOf, MOTION } = await import('../meter-inputs/motion.js')

  it('one shake (many readings above the threshold) counts once', () => {
    let state = shakeStart()
    let filled = 0
    for (const accel of [2, 20, 25, 18, 3, 30, 2]) {
      const s = shakeStep(state, { accel, dt: 0.05 }, { beats: 8, goal: 4 })
      state = s.state
      filled += s.amount
    }
    expect(filled).toBe(0.5)   // the second rise came within one swing of the first
  })

  it('tilt fills while the phone leans past the angle', () => {
    expect(tiltStep({ tilt: -40, dt: 1 }, { holdSeconds: 4, goal: 4 })).toBe(1)
    expect(tiltStep({ tilt: MOTION.tiltDeg - 1, dt: 1 }, { holdSeconds: 4, goal: 4 })).toBe(0)
  })

  it('reads the movement without gravity where it can', () => {
    expect(accelOf({ acceleration: { x: 3, y: 4, z: 0 } })).toBe(5)
    expect(accelOf({ acceleration: null, accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 } })).toBe(0)
    expect(accelOf({})).toBe(0)
  })
})

describe('a motion event without a reading is no sensor', async () => {
  const { hasReading, listenMotion, MOTION } = await import('../meter-inputs/motion.js')

  it('tells an empty desktop event from a phone held still', () => {
    expect(hasReading({ acceleration: { x: null }, accelerationIncludingGravity: { x: null } })).toBe(false)
    expect(hasReading({ acceleration: { x: 0, y: 0, z: 0 } })).toBe(true)
    expect(hasReading({ gamma: null }, 'tilt')).toBe(false)
    expect(hasReading({ gamma: 0 }, 'tilt')).toBe(true)
  })

  it('an empty event never opens the sensor: the taps take over', async () => {
    vi.useFakeTimers()
    window.DeviceMotionEvent = window.DeviceMotionEvent || function () {}
    const opened = listenMotion({ gesture: 'shake', onFrame: () => {} })
    const empty = new Event('devicemotion')
    window.dispatchEvent(Object.assign(empty, { acceleration: { x: null } }))
    vi.advanceTimersByTime(MOTION.silentMs + 10)
    await expect(opened).rejects.toThrow('no-motion')
    vi.useRealTimers()
  })
})
