import { describe, it, expect } from 'vitest'
import { over, applyInk, solid, cloned, colourAt, toHex, fromHex } from '../paint-brush.js'
import { compose, line } from '../erase-brush.js'

const px = (...rgba) => new Uint8ClampedArray(rgba)

describe('paint, pipette and clone stamp maths', () => {
  it('a soft edge over a clear pixel keeps its own colour: no dark halo', () => {
    const out = px(0, 0, 0, 0)
    over(px(0, 0, 0, 0), 0, 200, 40, 20, 128, out)
    expect([...out]).toEqual([200, 40, 20, 128])
  })

  it('half a colour over an opaque one mixes them, and stays opaque', () => {
    const out = px(0, 0, 0, 0)
    over(px(0, 0, 255, 255), 0, 255, 0, 0, 127.5, out)
    expect([...out]).toEqual([128, 0, 128, 255])
  })

  it('a stroke lays its colour by its coverage and opacity, and leaves what it did not touch', () => {
    const w = 2, from = new Uint8ClampedArray(8), to = new Uint8ClampedArray(8)
    from.set([9, 9, 9, 255], 4)
    applyInk(new Uint8Array([255, 0]), { x0: 0, y0: 0, x1: 1, y1: 0 }, w, from, to, solid([10, 20, 30]), 0.5)
    expect([...to.slice(0, 4)]).toEqual([10, 20, 30, 128])
    expect([...to.slice(4)]).toEqual([9, 9, 9, 255])
  })

  it('a stroke never builds up on itself: going over a spot twice in one stroke lays it once', () => {
    const w = 20, h = 20, cov = new Uint8Array(w * h), from = new Uint8ClampedArray(w * h * 4), to = new Uint8ClampedArray(w * h * 4)
    line(cov, w, h, [10, 10], [12, 10], 3)
    line(cov, w, h, [12, 10], [10, 10], 3)
    applyInk(cov, { x0: 0, y0: 0, x1: w - 1, y1: h - 1 }, w, from, to, solid([255, 0, 0]), 0.4)
    expect(to[(10 * w + 11) * 4 + 3]).toBe(102)   // 0.4 of 255, not 0.64
  })

  it('the clone stamp copies the pixel its offset away, and nothing from past the edge', () => {
    const w = 3, h = 1, pixels = px(1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255)
    const at = cloned(pixels, w, h, [1, 0]), rgba = [0, 0, 0, 0]
    at(0, rgba); expect(rgba).toEqual([2, 2, 2, 255])
    at(2, rgba); expect(rgba).toEqual([0, 0, 0, 0])
  })

  it('the pipette reads a colour, and nothing from a clear pixel or off the picture', () => {
    const pixels = px(12, 34, 56, 255, 0, 0, 0, 0)
    expect(colourAt(pixels, 2, 1, 0, 0)).toEqual([12, 34, 56])
    expect(colourAt(pixels, 2, 1, 1, 0)).toBeNull()
    expect(colourAt(pixels, 2, 1, 5, 0)).toBeNull()
  })

  it('a colour goes to the colour input and back', () => {
    expect(toHex([15, 23, 42])).toBe('#0f172a')
    expect(fromHex('#0f172a')).toEqual([15, 23, 42])
  })

  it('ink shows over the picture; Bring back takes it back to the original, the eraser takes it away', () => {
    const base = px(100, 100, 100, 255), original = px(100, 100, 100, 255), ink = px(255, 0, 0, 255), box = { x0: 0, y0: 0, x1: 0, y1: 0 }
    const out = (erase, bring) => [...compose(base, original, px(erase), px(bring), 1, box, new Uint8ClampedArray(4), ink)]
    expect(out(255, 0)).toEqual([255, 0, 0, 255])
    expect(out(255, 255)).toEqual([100, 100, 100, 255])
    expect(out(0, 0)[3]).toBe(0)
  })
})
