import { describe, it, expect } from 'vitest'
import { silentWav, sceneSeconds } from '../silent-audio.js'

describe('how long a scene lasts without its voice', () => {
  it('takes the timeline length first, then the stage, then the stored length, then 8 s', () => {
    expect(sceneSeconds({ config: { timeline: { duration: 8.25 }, stage25d: { dur_s: 6 } }, duration_seconds: 5 })).toBe(8.25)
    expect(sceneSeconds({ config: { stage25d: { dur_s: 6 } }, duration_seconds: 5 })).toBe(6)
    expect(sceneSeconds({ duration_seconds: 5 })).toBe(5)
    expect(sceneSeconds({ config: { timeline: { duration: 0 } }, duration_seconds: null })).toBe(8)
    expect(sceneSeconds(null)).toBe(8)
  })
})

describe('silence of a given length', () => {
  it('is a valid 8 kHz mono WAV of that many seconds, all silent', () => {
    const buf = silentWav(5)
    const v = new DataView(buf)
    const ascii = (at, n) => String.fromCharCode(...new Uint8Array(buf, at, n))
    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(v.getUint32(24, true)).toBe(8000)
    expect(v.getUint32(40, true)).toBe(5 * 8000)
    expect(buf.byteLength).toBe(44 + 5 * 8000)
    expect(new Uint8Array(buf, 44).every((b) => b === 128)).toBe(true)
  })

  it('never makes an empty file', () => {
    expect(new DataView(silentWav(0)).getUint32(40, true)).toBeGreaterThan(0)
  })
})
