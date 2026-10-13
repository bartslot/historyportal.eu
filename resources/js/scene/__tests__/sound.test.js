import { describe, it, expect } from 'vitest'
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
