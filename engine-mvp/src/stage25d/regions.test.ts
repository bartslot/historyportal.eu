import { describe, expect, it } from 'vitest'
import { FIELD_PX, flatRegions, shadeField, THIN_PX } from './regions'

/** A 12 x 4 drawing: cream on the left, red on the right, a dark line between and a soft rim beside it, air at the end. */
function strip(): Uint8ClampedArray {
  const px = [
    [250, 230, 180, 255], [250, 230, 180, 255], [250, 230, 180, 255], [160, 140, 110, 255],   // cream, cream, cream, rim
    [30, 25, 20, 255], [30, 25, 20, 255], [130, 60, 40, 255],                                 // line, line, rim
    [220, 90, 60, 255], [220, 90, 60, 255], [220, 90, 60, 255], [0, 0, 0, 0], [0, 0, 0, 0],   // red, red, red, air, air
  ]
  const d = new Uint8ClampedArray(12 * 4 * 4)
  for (let y = 0; y < 4; y++) px.forEach((c, x) => d.set(c, (y * 12 + x) * 4))
  return d
}

describe('a flat figure\'s colour regions', () => {
  it('every line px and its soft rim take the colour of the fill beside them; the air stays air', () => {
    const out = flatRegions(strip(), 12, 4)
    const at = (x: number) => [...out.slice((12 + x) * 4, (12 + x) * 4 + 4)]
    for (const x of [3, 4]) expect(at(x)).toEqual([250, 230, 180, 255])
    for (const x of [5, 6]) expect(at(x)).toEqual([220, 90, 60, 255])
    expect(at(10)).toEqual([0, 0, 0, 0])
    expect(at(0)).toEqual([250, 230, 180, 255])
  })
})

describe('what is a region on a face', () => {
  /** A 60 x 60 skin square with a small eye (white round a thick dark iris) and a thin line across it. */
  function face(): Uint8ClampedArray {
    const d = new Uint8ClampedArray(60 * 60 * 4)
    for (let i = 0; i < 3600; i++) d.set([250, 190, 120, 255], i * 4)
    const put = (x: number, y: number, c: number[]) => d.set(c, (y * 60 + x) * 4)
    for (let y = 20; y < 30; y++) for (let x = 15; x < 35; x++) put(x, y, [252, 250, 245, 255])   // the eye's white
    for (let y = 21; y < 29; y++) for (let x = 21; x < 29; x++) put(x, y, [70, 40, 20, 255])       // a thick dark iris
    for (let x = 5; x < 55; x++) put(x, 45, [25, 20, 16, 255])                                      // a thin line
    return d
  }

  it('a small eye and its thick iris melt into the skin; a thin line takes the skin beside it', () => {
    const out = flatRegions(face(), 60, 60)
    const at = (x: number, y: number) => [...out.slice((y * 60 + x) * 4, (y * 60 + x) * 4 + 3)]
    expect(at(25, 25)).toEqual([250, 190, 120])   // the iris: no region of its own
    expect(at(17, 22)).toEqual([250, 190, 120])   // the white: too small to be one
    expect(at(30, 45)).toEqual([250, 190, 120])   // the line
  })

  it('dark that is thicker than a line and big is a region of its own (hair)', () => {
    const d = new Uint8ClampedArray(60 * 60 * 4)
    for (let i = 0; i < 3600; i++) d.set(i % 60 < 30 ? [60, 35, 20, 255] : [250, 190, 120, 255], i * 4)
    const out = flatRegions(d, 60, 60)
    expect([...out.slice((30 * 60 + 10) * 4, (30 * 60 + 10) * 4 + 3)]).toEqual([60, 35, 20])
  })
})

describe('the shade field', () => {
  /** A w x h cream block on air, with an optional dark-brown cord down its middle `cord` px wide. */
  function block(w: number, h: number, cord = 0): Uint8ClampedArray {
    const d = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (x < 10 || x >= w - 10 || y < 10 || y >= h - 10) continue
      const inCord = cord && Math.abs(x - w / 2) < cord / 2
      d.set(inCord ? [150, 80, 40, 255] : [250, 225, 175, 255], (y * w + x) * 4)
    }
    return d
  }
  const read = (f: Uint8ClampedArray, w: number, x: number, y: number) => {
    const i = (y * w + x) * 4
    return { d: (f[i] / 255) * FIELD_PX, nx: f[i + 1] / 255 * 2 - 1, ny: f[i + 2] / 255 * 2 - 1 }
  }

  it('gives each px its distance in from the edge and the way inward', () => {
    const w = 120, h = 80, f = shadeField(block(w, h), w, h)
    const nearLeft = read(f, w, 14, 40)
    expect(nearLeft.d).toBeCloseTo(4, 0)
    expect(nearLeft.nx).toBeGreaterThan(0.9)          // inward from the left edge: to the right
    const nearTop = read(f, w, 60, 13)
    expect(nearTop.ny).toBeGreaterThan(0.9)           // inward from the top: down
    expect(read(f, w, 2, 2).d).toBe(0)                // the air has no field
  })

  it('a cord thinner than THIN_PX casts nothing: the block beside it is as deep as if it were not there', () => {
    expect(THIN_PX).toBeGreaterThan(12)
    const w = 120, h = 80
    const withCord = shadeField(block(w, h, 12), w, h), without = shadeField(block(w, h), w, h)
    const x = w / 2 + 8   // just beside the cord
    expect(read(withCord, w, x, 40).d).toBeCloseTo(read(without, w, x, 40).d, 0)
  })
})
