import { describe, expect, it } from 'vitest'
import { GLINT_FRAMES, GLINT_VARIANTS, WATER_LOOKS, glintFrame, glintRate, glintStrokes, glintsOf, guessWaterMask, maskTop, rippleAt, twinkleAt, waterCycles, waterOf, type Water } from './water'

const W: Water = { look: 'anime', amount: 1, speed: 1, glints: 1, loop: 4, twinkle: 0.35, size: 1, stretch: 4.5, mask: null }
const PX = [1536, 504] as const

describe('water loop', () => {
  it('the ripple at t and at t + loop is the same frame, for any loop and speed', () => {
    for (const w of [W, { ...W, loop: 4.5, speed: 1.7 }, { ...W, loop: 2, speed: 3 }, { ...W, loop: 12, speed: 0.3 }]) {
      for (const t of [0, 0.37, 1.9, 3.2, 17.25]) {
        for (const [u, v] of [[0.1, 0.6], [0.5, 0.9], [0.83, 0.71]]) {
          const a = rippleAt(u, v, t, w, PX, 1, false, 0.55)
          const b = rippleAt(u, v, t + w.loop, w, PX, 1, false, 0.55)
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
    const all = glintsOf(W, PX, 0.4, () => 1, () => 1)
    for (const g of all) count[glintFrame(1.234, g.phase, 4)]++
    expect(count.every((n) => n > 0)).toBe(true)
    expect(Math.max(...count)).toBeLessThan(all.length * 0.25)
  })

  it('are scattered over the whole mask, never in rows: within a band their heights differ', () => {
    const all = glintsOf(W, PX, 0.4, () => 1, () => 1)
    expect(all.length).toBeGreaterThan(60)
    // the water from 0.4 down, in ten slices: every slice has glints
    for (let k = 0; k < 10; k++) expect(all.some((g) => g.v >= 0.4 + k * 0.06 && g.v < 0.4 + (k + 1) * 0.06)).toBe(true)
    // no two glints share a height: a row would
    const heights = new Set(all.map((g) => g.v.toFixed(6)))
    expect(heights.size).toBeGreaterThan(all.length * 0.99)
  })

  it('are small and close together far away, larger and further apart near', () => {
    const all = glintsOf(W, PX, 0.4, () => 1, () => 1)
    const far = all.filter((g) => g.d < 0.25), near = all.filter((g) => g.d > 0.75)
    const mean = (gs: typeof all) => gs.reduce((n, g) => n + g.width, 0) / gs.length
    expect(mean(far)).toBeLessThan(mean(near) * 0.5)
    // per unit of picture height, far water holds more of them
    expect(far.length / 0.25).toBeGreaterThan(near.length / 0.25)
  })

  it('are denser where the picture is light (reflections of sky and buildings)', () => {
    const light = glintsOf(W, PX, 0.4, (u) => (u < 0.5 ? 1 : 0), () => 1)
    const left = light.filter((g) => g.u < 0.5).length, right = light.filter((g) => g.u >= 0.5).length
    expect(left).toBeGreaterThan(right * 3)
  })

  it('come in every shape: broken strokes most, arcs, dashes and the odd dot', () => {
    const all = glintsOf(W, PX, 0.4, () => 1, () => 1)
    const per = new Array(GLINT_VARIANTS).fill(0)
    for (const g of all) per[g.variant]++
    expect(per.every((n) => n > 0)).toBe(true)
    expect(per[0]).toBe(Math.max(...per))
  })

  it('stay on the water: none where the mask is empty', () => {
    expect(glintsOf(W, PX, 0.4, () => 1, (u) => (u < 0.5 ? 1 : 0)).every((g) => g.u < 0.5)).toBe(true)
  })

  it('held still when someone asked for less motion', () => {
    expect(glintFrame(0.1, 0.5, 4, true)).toBe(glintFrame(3.3, 0.5, 4, true))
  })

  it('every cel of every shape has strokes to draw, inside its frame', () => {
    for (let r = 0; r < GLINT_VARIANTS; r++) for (let i = 0; i < GLINT_FRAMES; i++) {
      const st = glintStrokes(i, r)
      expect(st.length).toBeGreaterThan(0)
      for (const x of st) {
        expect(Math.min(x.x0, x.x1) - x.width * 1.1).toBeGreaterThanOrEqual(0)
        expect(Math.max(x.x0, x.x1) + x.width * 1.1).toBeLessThanOrEqual(96)
        expect(x.y - x.width * 1.1 + Math.min(0, x.bow)).toBeGreaterThanOrEqual(0)
        expect(x.y + x.width * 1.1).toBeLessThanOrEqual(24)
      }
    }
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
    expect(waterOf({ water: { amount: 9, loop: 1 } })).toEqual({ ...WATER_LOOKS.anime, look: 'anime', amount: 3, loop: 2, mask: null })
  })
})

describe('looks', () => {
  it('a look is where the sliders start; a slider the teacher moved wins', () => {
    expect(waterOf({ water: { look: 'quiet' } })).toMatchObject({ amount: WATER_LOOKS.quiet.amount, glints: WATER_LOOKS.quiet.glints, twinkle: WATER_LOOKS.quiet.twinkle })
    expect(waterOf({ water: { look: 'lively', glints: 0.2 } })?.glints).toBe(0.2)
    expect(waterOf({ water: { look: 'bogus' as never } })?.look).toBe('anime')
  })

  it('quiet has the fewest glints, twinkles and the gentlest ripple; lively the most', () => {
    const { quiet, anime, lively } = WATER_LOOKS
    for (const k of ['amount', 'glints', 'twinkle'] as const) {
      expect(quiet[k]).toBeLessThan(anime[k])
      expect(anime[k]).toBeLessThan(lively[k])
    }
  })

  it('the far edge of the water is the highest row of the mask', () => {
    const grey = new Uint8Array(10 * 10)
    for (let y = 6; y < 10; y++) grey.fill(255, y * 10, y * 10 + 10)
    expect(maskTop(grey, 10, 10)).toBe(0.6)
    expect(maskTop(new Uint8Array(100), 10, 10)).toBe(1)
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
