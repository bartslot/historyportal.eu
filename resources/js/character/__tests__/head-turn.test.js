import { describe, expect, it } from 'vitest'
import { headField, depthAt, shiftAt, isRest, padOf, regionOf, warpPixels, turnPicture, nodAt, TURN_SHARE, NOD_SHARE } from '../head-turn.js'

// the man's face piece in the Old Babylonian kit: [x, y, w, h] on the baked canvas
const FACE = [825, 91, 360, 525]
const field = headField(FACE)

/** A picture w x h, every pixel opaque, its red channel its x (so a shift reads straight off the pixels). */
const ramp = (w, h) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) { data[i * 4] = i % w; data[i * 4 + 3] = 255 }
  return { width: w, height: h, data }
}

describe('head turn: the depth bump behind the face', () => {
  it('peaks between the eyes and the mouth and is nothing at the back of the skull, the crown and below the chin', () => {
    expect(depthAt(field, field.cx, field.cy)).toBe(1)
    expect(depthAt(field, FACE[0], field.cy)).toBe(0)                       // the back of the skull
    expect(depthAt(field, field.cx, FACE[1])).toBe(0)                       // the crown
    expect(depthAt(field, field.cx, FACE[1] + FACE[3] * 0.9)).toBe(0)       // the neck
    // the nose's edge moves with the turn, a little: the profile turns too
    const front = depthAt(field, FACE[0] + FACE[2], field.cy)
    expect(front).toBeGreaterThan(0.2)
    expect(front).toBeLessThan(0.5)
  })

  it('a turn slides the features sideways, a nod down, by the shares of the face', () => {
    const [dx, dy] = shiftAt(field, field.cx, field.cy, 1, 0)
    expect(dx).toBeCloseTo(FACE[2] * TURN_SHARE)
    expect(dy).toBe(0)
    expect(shiftAt(field, field.cx, field.cy, 0, -1)[1]).toBeCloseTo(-FACE[3] * NOD_SHARE)
    expect(shiftAt(field, field.cx, field.cy, 5, 0)[0]).toBeCloseTo(FACE[2] * TURN_SHARE)   // held to -1..1
  })

  it('never folds: the shift changes slower than one pixel per pixel, so no paint lands on other paint', () => {
    for (const [turn, nod] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      let steepest = 0
      for (let y = FACE[1]; y < FACE[1] + FACE[3]; y += 3) {
        for (let x = FACE[0] - 20; x < FACE[0] + FACE[2] + 60; x += 3) {
          const [a, b] = shiftAt(field, x, y, turn, nod)
          const [ax] = shiftAt(field, x + 1, y, turn, nod)
          const [, by] = shiftAt(field, x, y + 1, turn, nod)
          steepest = Math.max(steepest, Math.abs(ax - a), Math.abs(by - b))
        }
      }
      expect(steepest).toBeLessThan(0.75)
    }
  })

  it('knows a straight head, and how far a pose can reach', () => {
    expect(isRest({ turn: 0, nod: 0 })).toBe(true)
    expect(isRest(null)).toBe(true)
    expect(isRest({ turn: 0.5, nod: 0 })).toBe(false)
    expect(padOf(field, { turn: 1, nod: 0 })).toBe(Math.ceil(FACE[2] * TURN_SHARE) + 1)
  })
})

describe('head turn: pixels', () => {
  it('moves the paint at the bump\'s peak by the whole shift, and leaves the paint far from it where it was', () => {
    const box = [field.cx - 50, field.cy - 5, 200, 10]
    const out = warpPixels(ramp(200, 10), box, field, { turn: -1, nod: 0 }, 0)
    // turned towards the camera the features slide left: the pixel at the peak shows paint from its right
    const shift = FACE[2] * TURN_SHARE
    expect(out.data[(5 * 200 + 50) * 4]).toBeGreaterThan(50 + shift - 2)
    expect(out.data[(5 * 200 + 50) * 4]).toBeLessThan(50 + shift + 2)
    expect(out.data[(5 * 200 + 199) * 4]).toBe(0)   // paint slid in from past the piece: nothing there
  })

  it('a piece clear of the head is not touched; an outfit is only redone round the head', () => {
    expect(regionOf([0, 1500, 400, 400], [400, 400], field, { turn: 1, nod: 0 }, 2)).toBeNull()
    const body = [600, 0, 900, 2800]
    const r = regionOf(body, [900, 2800], field, { turn: 1, nod: 1 }, 60)
    expect(r[3]).toBeLessThan(700)          // a head's height, not the body's
  })

  it('turns a whole picture: larger by the pad, the same paint outside the head, key colours never blended', () => {
    const w = 200, h = 700, pad = 60
    const box = [800, 0, w, h]
    const img = ramp(w, h)
    for (let i = 0; i < w * h; i++) img.data[i * 4] = (i % w) < 100 ? 10 : 28   // two kind keys side by side
    const out = turnPicture(img, box, field, { turn: 1, nod: 0.5 }, pad, false)
    expect(out.width).toBe(w + 2 * pad)
    expect(out.height).toBe(h + 2 * pad)
    const at = (x, y) => out.data[((y + pad) * out.width + x + pad) * 4]
    expect(at(10, h - 5)).toBe(10)            // below the chin: as it was
    expect(at(150, h - 5)).toBe(28)
    const keys = new Set()
    for (let i = 0; i < out.width * out.height; i++) if (out.data[i * 4 + 3]) keys.add(out.data[i * 4])
    expect([...keys].sort()).toEqual([10, 28])
  })
})

describe('head turn: the nod button', () => {
  it('dips twice and comes back to the pose it started in', () => {
    const from = { turn: -0.4, nod: 0.1 }
    expect(nodAt(0, from)).toEqual({ turn: -0.4, nod: 0.1 })
    expect(nodAt(1, from).nod).toBeCloseTo(0.1)
    expect(nodAt(0.25, from).nod).toBeGreaterThan(nodAt(0.75, from).nod)   // the second dip smaller
    expect(nodAt(0.5, from).nod).toBeCloseTo(0.1)
  })
})
