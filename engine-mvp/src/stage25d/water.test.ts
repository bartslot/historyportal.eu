import { describe, expect, it } from 'vitest'
import { GLINT_FRAMES, glintFrame, glintPhase, glintRate, glintStrokes, guessWaterMask, rippleAt, twinkleAt, waterCycles, waterOf, type Water } from './water'

const W: Water = { amount: 1, speed: 1, glints: 1, loop: 4, mask: null }
const PX = [1536, 504] as const

describe('water loop', () => {
  it('the ripple at t and at t + loop is the same frame, for any loop and speed', () => {
    for (const w of [W, { ...W, loop: 4.5, speed: 1.7 }, { ...W, loop: 2, speed: 3 }, { ...W, loop: 12, speed: 0.3 }]) {
      for (const t of [0, 0.37, 1.9, 3.2, 17.25]) {
        for (const [u, v] of [[0.1, 0.6], [0.5, 0.9], [0.83, 0.71]]) {
          const a = rippleAt(u, v, t, w, PX, 1)
          const b = rippleAt(u, v, t + w.loop, w, PX, 1)
          expect(b[0]).toBeCloseTo(a[0], 9)
          expect(b[1]).toBeCloseTo(a[1], 9)
        }
      }
    }
  })

  it('the ripple moves within a loop (it is not still)', () => {
    const a = rippleAt(0.4, 0.8, 0, W, PX, 1)
    const b = rippleAt(0.4, 0.8, W.loop / 3, W, PX, 1)
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1e-4)
  })

  it('every wave turns a whole number of times per loop', () => {
    for (const [loop, speed] of [[4, 1], [4.5, 1.7], [7, 0.2]]) expect(Number.isInteger(waterCycles(loop, speed))).toBe(true)
    expect(waterCycles(4, 0)).toBe(0)
    expect(waterCycles(4, 0.01)).toBe(1)
  })

  it('is stronger toward the viewer (the bottom) than far away', () => {
    let near = 0, far = 0
    for (let k = 0; k < 40; k++) {
      const t = k * 0.1
      near += Math.hypot(...rippleAt(0.5, 0.95, t, W, PX, 1))
      far += Math.hypot(...rippleAt(0.5, 0.05, t, W, PX, 1))
    }
    expect(near).toBeGreaterThan(far * 2)
  })

  it('outside the mask nothing moves', () => {
    for (const t of [0, 1.3, 2.9]) expect(rippleAt(0.5, 0.8, t, W, PX, 0)).toEqual([0, 0])
  })

  it('less motion holds the ripple still', () => {
    expect(rippleAt(0.5, 0.8, 1.3, W, PX, 1, true)).toEqual([0, 0])
  })
})

describe('glints', () => {
  it('cycle through 8 frames held on threes (about 8 a second) and loop exactly', () => {
    expect(glintRate(4)).toBe(8)
    expect(glintRate(4.5) * 4.5 % GLINT_FRAMES).toBeCloseTo(0, 9)
    for (const t of [0, 0.4, 2.2]) expect(glintFrame(t + 4.5, 0.3, 4.5)).toBe(glintFrame(t, 0.3, 4.5))
    const frames = Array.from({ length: 8 }, (_, k) => glintFrame(k / 8 + 0.01, 0, 4))
    expect(frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('each glint has its own phase: at one moment they show every frame, never one pulse', () => {
    const count = new Array(GLINT_FRAMES).fill(0)
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) count[glintFrame(1.234, glintPhase(x, y), 4)]++
    expect(count.every((n) => n > 0)).toBe(true)
    expect(Math.max(...count)).toBeLessThan(256 * 0.25)
  })

  it('held still when someone asked for less motion', () => {
    expect(glintFrame(0.1, 0.5, 4, true)).toBe(glintFrame(3.3, 0.5, 4, true))
  })

  it('every frame has strokes to draw', () => {
    for (let i = 0; i < GLINT_FRAMES; i++) expect(glintStrokes(i).length).toBeGreaterThan(1)
  })
})

describe('twinkles', () => {
  it('pop once per loop, briefly, and loop exactly', () => {
    let lit = 0
    for (let k = 0; k < 400; k++) if (twinkleAt(k * 0.01, 1.2, 4) > 0.05) lit++
    expect(lit).toBeGreaterThan(20)
    expect(lit).toBeLessThan(60)
    expect(twinkleAt(1.4 + 4, 1.2, 4)).toBeCloseTo(twinkleAt(1.4, 1.2, 4), 9)
  })
})

describe('waterOf', () => {
  it('is off without water, when turned off, and keeps values in range', () => {
    expect(waterOf({})).toBeNull()
    expect(waterOf({ water: { on: false, amount: 2 } })).toBeNull()
    expect(waterOf({ water: { amount: 9, loop: 1 } })).toEqual({ amount: 3, speed: 1, glints: 1, loop: 2, mask: null })
  })
})

describe('guessWaterMask', () => {
  it('finds blue calm water in the lower part, not the red roofs above it', () => {
    const w = 40, h = 40, data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const [r, g, b] = y < 20 ? [170, 80, 60] : [110, 150, 190]
      data.set([r, g, b, 255], i)
    }
    const m = guessWaterMask(data, w, h)
    expect(m[35 * w + 20]).toBeGreaterThan(200)
    expect(m[10 * w + 20]).toBe(0)
  })

  it('leaves a blue roof in the town alone: the water joins the bottom of the picture', () => {
    const w = 40, h = 40, data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const roof = y >= 14 && y < 22 && x >= 5 && x < 20
      const water = y >= 30
      data.set(roof || water ? [110, 150, 190, 255] : [170, 80, 60, 255], (y * w + x) * 4)
    }
    const m = guessWaterMask(data, w, h)
    expect(m[36 * w + 20]).toBeGreaterThan(200)
    expect(m[18 * w + 12]).toBe(0)
  })
})
