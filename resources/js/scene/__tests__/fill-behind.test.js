import { describe, it, expect } from 'vitest'
import { fillBehind, grow } from '../fill-behind.js'

const W = 40, H = 30

/** A picture whose colour at (x, y) is `at(x, y)` = [r, g, b, a]. */
const picture = (at) => {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px.set(at(x, y), (y * W + x) * 4)
  return px
}
/** A round subject in the middle. */
const subject = (r = 6, cx = 20, cy = 15) => {
  const m = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = (x - cx) ** 2 + (y - cy) ** 2 <= r * r ? 1 : 0
  return m
}
/** The same picture with the subject painted on it in a loud red. */
const withSubject = (px, mask) => { const out = new Uint8ClampedArray(px); mask.forEach((m, i) => { if (m) out.set([255, 0, 0, 255], i * 4) }); return out }
const at = (px, x, y) => [...px.slice((y * W + x) * 4, (y * W + x) * 4 + 4)]

describe('fillBehind', () => {
  it('fills a hole in a flat colour with that colour', () => {
    const flat = picture(() => [40, 110, 160, 255])
    const out = fillBehind(withSubject(flat, subject()), W, H, subject())
    for (let i = 0; i < W * H * 4; i++) expect(Math.abs(out[i] - flat[i])).toBeLessThanOrEqual(1)
  })

  it('fills a hole in a gradient with that gradient', () => {
    const ramp = picture((x, y) => [Math.round(x * 5), Math.round(y * 6), 120, 255])
    const out = fillBehind(withSubject(ramp, subject()), W, H, subject())
    // the subject's middle comes back as the ramp, not as the colour of one edge
    for (const [x, y] of [[20, 15], [16, 15], [24, 15], [20, 11], [20, 19]]) {
      const [r, g] = at(out, x, y)
      expect(Math.abs(r - x * 5)).toBeLessThanOrEqual(3)
      expect(Math.abs(g - y * 6)).toBeLessThanOrEqual(3)
    }
  })

  it('leaves everything outside the grown hole alone and blends at its edge', () => {
    const ramp = picture((x, y) => [Math.round(x * 5), Math.round(y * 6), 120, 255])
    const mask = subject()
    const red = withSubject(ramp, mask)
    const out = fillBehind(red, W, H, mask)
    const hole = grow(mask, W, H)
    for (let i = 0; i < W * H; i++) if (!hole[i]) expect(at(out, i % W, Math.floor(i / W))).toEqual(at(red, i % W, Math.floor(i / W)))
    // no seam: across the hole's edge a step is no bigger than the ramp's own step, and no red is left
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        if (hole[i] === hole[i + 1]) continue
        const [a, b] = [at(out, x, y), at(out, x + 1, y)]
        expect(Math.abs(a[0] - b[0])).toBeLessThanOrEqual(8)
        expect(Math.abs(a[1] - b[1])).toBeLessThanOrEqual(8)
      }
    }
    for (let i = 0; i < W * H; i++) if (hole[i]) expect(out[i * 4 + 1]).toBeGreaterThan(20)
  })

  it('fills transparent where the picture round the subject is transparent', () => {
    const clear = picture(() => [0, 0, 0, 0])
    const out = fillBehind(withSubject(clear, subject()), W, H, subject())
    expect(at(out, 20, 15)[3]).toBe(0)
  })

  it('lays the grain round the hole back in: a noisy surface does not fill as a smooth smear', () => {
    let s = 7
    const noise = () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) % 41 - 20 }
    const grainy = picture(() => [100 + noise(), 140 + noise(), 160 + noise(), 255])
    const mask = subject(8)
    const out = fillBehind(withSubject(grainy, mask), W, H, mask)
    const spread = (px) => { const v = []; for (let y = 12; y <= 18; y++) for (let x = 17; x <= 23; x++) v.push(at(px, x, y)[0]); const m = v.reduce((a, b) => a + b) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) }
    expect(spread(out)).toBeGreaterThan(4)
    expect(spread(fillBehind(withSubject(grainy, mask), W, H, mask, { grain: 0 }))).toBeLessThan(spread(out))
  })

  it('copies the real paint from beside the hole: stripes and bands come back as stripes and bands, not a smear', () => {
    // a painted field 100 px wide: vertical strokes every 6 px, a darker band of trees above
    const w = 100, h = 30
    const truth = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (x % 6 < 3 ? 70 : 0) + (y < 12 ? 40 : 120); truth.set([v, v, 60, 255], (y * w + x) * 4) }
    const mask = new Uint8Array(w * h)
    for (let y = 8; y < 20; y++) for (let x = 44; x < 56; x++) mask[y * w + x] = 1
    const red = new Uint8ClampedArray(truth)
    mask.forEach((m, i) => { if (m) red.set([255, 0, 0, 255], i * 4) })
    const hole = grow(mask, w, h)
    const error = (px) => { let e = 0, k = 0; hole.forEach((m, i) => { if (m) { e += Math.abs(px[i * 4] - truth[i * 4]); k++ } }); return e / k }
    const copied = error(fillBehind(red, w, h, mask))
    const smooth = error(fillBehind(red, w, h, mask, { grain: 0 }))
    expect(copied).toBeLessThan(8)
    expect(copied).toBeLessThan(smooth / 3)
  })

  it('does not touch the picture it was given', () => {
    const flat = withSubject(picture(() => [10, 20, 30, 255]), subject())
    const copy = new Uint8ClampedArray(flat)
    fillBehind(flat, W, H, subject())
    expect(flat).toEqual(copy)
  })
})
