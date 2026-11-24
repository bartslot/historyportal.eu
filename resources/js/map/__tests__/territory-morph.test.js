import { describe, it, expect } from 'vitest'
import { signedField, blendFields, zeroContours, distanceTo, morphProgress } from '../territory-morph.js'

const square = (w, h, x0, y0, x1, y1) => {
  const m = new Uint8Array(w * h)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1
  return m
}
const span = (loop) => {
  const xs = loop.map((p) => p[0])
  return Math.max(...xs) - Math.min(...xs)
}

describe('territory morph (Bart 11-24: "morphs to the new vector so you can see it expanding")', () => {
  it('measures distance in cells', () => {
    const d = distanceTo((i) => i === 0, 5, 1)
    expect(Array.from(d)).toEqual([0, 1, 2, 3, 4])
  })
  it('reads one closed loop back from a square', () => {
    const W = 20; const H = 20
    const loops = zeroContours(signedField(square(W, H, 5, 5, 15, 15), W, H), W, H)
    expect(loops).toHaveLength(1)
    expect(loops[0][0]).toEqual(loops[0].at(-1))
    expect(span(loops[0])).toBeGreaterThan(8)
    expect(span(loops[0])).toBeLessThan(11)
  })
  it('halfway between a small and a big square is in between', () => {
    const W = 40; const H = 40
    const a = signedField(square(W, H, 15, 15, 25, 25), W, H)
    const b = signedField(square(W, H, 5, 5, 35, 35), W, H)
    const mid = span(zeroContours(blendFields(a, b, 0.5), W, H)[0])
    expect(mid).toBeGreaterThan(14)
    expect(mid).toBeLessThan(26)
  })
  it('a territory that did not exist yet grows from its middle', () => {
    const W = 30; const H = 30
    const none = signedField(new Uint8Array(W * H), W, H)
    const b = signedField(square(W, H, 5, 5, 25, 25), W, H)
    expect(zeroContours(blendFields(none, b, 0.1), W, H)).toHaveLength(0)
    expect(zeroContours(blendFields(none, b, 1), W, H)).toHaveLength(1)
  })
  it('eases in and out over its duration', () => {
    expect(morphProgress(0, 0, 1000)).toBe(0)
    expect(morphProgress(500, 0, 1000)).toBe(0.5)
    expect(morphProgress(2000, 0, 1000)).toBe(1)
  })
})
