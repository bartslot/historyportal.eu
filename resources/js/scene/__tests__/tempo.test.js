import { describe, it, expect } from 'vitest'
import { estimateTempo, secondsToNextBar } from '../tempo.js'

/** A click track: a short burst every beat, the first one `offset` seconds in. */
function clicks (bpm, offset, seconds = 20, rate = 22050) {
  const data = new Float32Array(rate * seconds)
  for (let t = offset; t < seconds; t += 60 / bpm) {
    const i = Math.round(t * rate)
    for (let k = 0; k < 200 && i + k < data.length; k++) data[i + k] = Math.sin(k) * (1 - k / 200)
  }
  return { sampleRate: rate, length: data.length, getChannelData: () => data }
}

describe('estimateTempo', () => {
  it.each([[96, 0.3], [120, 0.1], [140, 0.4]])('finds %s BPM and the first beat', (bpm, offset) => {
    const tempo = estimateTempo(clicks(bpm, offset))
    expect(Math.abs(tempo.bpm - bpm)).toBeLessThan(1.5)
    const beat = 60 / bpm
    const phaseError = Math.abs(((tempo.beat_offset - offset) % beat + beat) % beat)
    expect(Math.min(phaseError, beat - phaseError)).toBeLessThan(0.03)
  })

  it('gives up on a steady tone with no beat', () => {
    const rate = 22050
    const data = Float32Array.from({ length: rate * 20 }, (_, i) => 0.5 * Math.sin(i * 0.05) + 0.01 * (Math.random() - 0.5))
    expect(estimateTempo({ sampleRate: rate, getChannelData: () => data })).toBeNull()
  })

  it('gives up on silence or a buffer it cannot read', () => {
    expect(estimateTempo(clicks(120, 0, 0.1))).toBeNull()
    expect(estimateTempo({ duration: 10 })).toBeNull()
  })
})

describe('secondsToNextBar', () => {
  it('waits for the next bar line, never less than the lead', () => {
    expect(secondsToNextBar(3.1, { bpm: 120, beat_offset: 0.5 })).toBeCloseTo(1.4)
    expect(secondsToNextBar(4.49, { bpm: 120, beat_offset: 0.5 })).toBeCloseTo(2.01)
  })
})
