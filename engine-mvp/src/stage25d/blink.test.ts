import { describe, expect, it } from 'vitest'
import {
  BLINK_CLOSE_S, BLINK_GAP_MAX_S, BLINK_GAP_MIN_S, BLINK_HOLD_S, BLINK_OPEN_S, BLINK_S, DOUBLE_GAP_S,
  blinkEyes, blinker, blinkOf, blinks, isBust, lidAt, seedOf,
} from './blink'
import type { Asset } from './types'

const take = (seed: number, n: number) => { const g = blinks(seed); return Array.from({ length: n }, () => g.next().value!) }
const endOf = (b: { start: number; twice: boolean }) => b.start + (b.twice ? 2 * BLINK_S + DOUBLE_GAP_S : BLINK_S)

describe('blink schedule', () => {
  it('the next blink comes 3 to 7 s after the last one ended, the first 3 to 7 s in', () => {
    const all = take(7, 2000)
    expect(all[0].start).toBeGreaterThanOrEqual(BLINK_GAP_MIN_S)
    expect(all[0].start).toBeLessThan(BLINK_GAP_MAX_S)
    for (let i = 1; i < all.length; i++) {
      const gap = all[i].start - endOf(all[i - 1])
      expect(gap).toBeGreaterThanOrEqual(BLINK_GAP_MIN_S - 1e-9)
      expect(gap).toBeLessThan(BLINK_GAP_MAX_S)
    }
  })

  it('about one blink in five is a double blink', () => {
    const rate = take(11, 5000).filter((b) => b.twice).length / 5000
    expect(rate).toBeGreaterThan(0.17)
    expect(rate).toBeLessThan(0.23)
  })

  it('the lid: cubic ease-in close over 70 ms, held 40 ms, cubic ease-out open over 110 ms', () => {
    expect(lidAt(0)).toBe(0)
    expect(lidAt(BLINK_CLOSE_S / 2)).toBeCloseTo(0.125)
    expect(lidAt(BLINK_CLOSE_S + BLINK_HOLD_S / 2)).toBe(1)
    expect(lidAt(BLINK_CLOSE_S + BLINK_HOLD_S + BLINK_OPEN_S / 2)).toBeCloseTo(0.125)
    expect(lidAt(BLINK_S)).toBe(0)
    expect(BLINK_S).toBeCloseTo(0.22)
  })

  it('a figure blinks on its schedule, and a double blink closes again 120 ms after the first opened', () => {
    const seed = [...Array(200).keys()].find((s) => take(s, 1)[0].twice)!
    const [b] = take(seed, 1)
    const lid = blinker(seed)
    expect(lid(b.start - 0.01)).toBe(0)
    expect(lid(b.start + BLINK_CLOSE_S / 2)).toBeCloseTo(0.125)
    expect(lid(b.start + BLINK_CLOSE_S + 0.01)).toBe(1)
    expect(lid(b.start + BLINK_S + DOUBLE_GAP_S / 2)).toBe(0)                       // open between the two
    expect(lid(b.start + BLINK_S + DOUBLE_GAP_S + BLINK_CLOSE_S + 0.01)).toBe(1)    // closed again
    expect(lid(b.start + 2 * BLINK_S + DOUBLE_GAP_S + 0.01)).toBe(0)
  })

  it('no blink with reduced motion', () => {
    const lid = blinker(3, true)
    for (let t = 0; t < 60; t += 0.01) expect(lid(t)).toBe(0)
  })

  it('different figures never blink in step: different seeds, different schedules', () => {
    const a = take(seedOf('fig-ana-bust-01:0'), 5).map((b) => b.start)
    const b = take(seedOf('fig-ana-bust-01-l:1'), 5).map((b) => b.start)
    expect(a).not.toEqual(b)
    expect(take(42, 5)).toEqual(take(42, 5))   // and the same figure, the same blinks
  })
})

describe('blink assets', () => {
  const eye = { x0: 0.5, x1: 0.65, y0: 0.28, y1: 0.35, lash: [0.30, 0.33, 0.31] as [number, number, number] }
  const bust = {
    id: 'fig-ana-bust-01', layer: 'figure', tags: ['pose:bust'], file: 'fig-ana-bust-01.webp', w: 1288, h: 1588, anchor: [0.5, 1], height_m: 0.46,
    blink: { file: 'fig-ana-bust-01-blink.webp', eyes: [eye] },
  } as unknown as Asset

  it('a blink asset gives the closed picture from the same base url, with its eyes', () => {
    expect(blinkOf(bust, {}, '/lib/babylonia/')).toEqual({ url: '/lib/babylonia/fig-ana-bust-01-blink.webp', eyes: [eye] })
  })

  it('no blink without data, on the teacher\'s edited copy, or on a figure of parts', () => {
    expect(blinkOf({ ...bust, blink: undefined } as Asset, {}, '/b/')).toBeNull()
    expect(blinkOf(bust, { src: '/edited.webp' }, '/b/')).toBeNull()
    expect(blinkOf({ ...bust, puppet: {} } as unknown as Asset, {}, '/b/')).toBeNull()
  })

  it('an eye box of the whole picture (a failed detection) is dropped; at most two eyes', () => {
    const whole = { x0: 0, x1: 1, y0: 0, y1: 1, lash: [0.77, 0.6, 0.82] }
    expect(blinkEyes([whole, eye])).toEqual([eye])
    expect(blinkEyes([eye, eye, eye])).toHaveLength(2)
    expect(blinkEyes('nope')).toEqual([])
    expect(blinkOf({ ...bust, blink: { file: 'x.webp', eyes: [whole] } } as unknown as Asset, {}, '/b/')).toBeNull()
  })

  it('a bust is a close-up by its pose tag or its id', () => {
    expect(isBust(bust)).toBe(true)
    expect(isBust({ id: 'fig-hazi-bust-front-01-l', tags: [] })).toBe(true)
    expect(isBust({ id: 'fig-ana-walk-01', tags: ['figure'] })).toBe(false)
  })
})
