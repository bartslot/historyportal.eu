import { describe, it, expect } from 'vitest'
import { stripLayout, STRIP } from '../title-expect.js'

const frame = { x: 0, y: -40, w: 1440, h: 940 }
const box = { x: 0, y: 0, w: 100, h: 5.7 }

describe('the expect strip', () => {
  it('sits at its slot across the screen, the lines starting after the edit pill', () => {
    const l = stripLayout(frame, { w: 1440, h: 900 }, box, { x: 48, y: 14, w: 166, h: 33 })
    expect(l.top).toBe(0)
    expect(l.minHeight).toBeCloseTo(53.58, 1)
    expect(l.padLeft).toBe(48 + 166 + STRIP.gap)
    expect(l.stacked).toBe(false)
  })

  it('follows a slot lower in the frame', () => {
    expect(stripLayout({ x: 0, y: 100, w: 1000, h: 600 }, { w: 1000, h: 800 }, { ...box, y: 10 }).top).toBe(160)
  })

  it('stacks its lines under the top row on a phone', () => {
    const l = stripLayout(frame, { w: 375, h: 812 }, box, { x: 32, y: 14, w: 166, h: 33 })
    expect(l).toMatchObject({ top: 0, stacked: true, padTop: 14 + 33 + 8, padLeft: STRIP.gutter })
  })
})
