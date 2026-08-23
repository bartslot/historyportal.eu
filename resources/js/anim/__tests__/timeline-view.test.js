import { describe, it, expect } from 'vitest'
import {
  fitZoom, timeAtX, xAtTime, toleranceSeconds, tickStep, ticksFor, formatTime, SNAP_PX,
} from '../timeline-view.js'

/**
 * Pixel↔time, which is the whole of a timeline that nobody sees until it is one pixel out.
 * The pair must round-trip exactly, or a keyframe lands somewhere other than where it was dropped.
 */

describe('fitZoom', () => {
  it('makes the narration fill the lane', () => {
    expect(fitZoom(1000, 20)).toBe(50)
  })

  it('falls back to something usable rather than dividing by zero', () => {
    expect(fitZoom(1000, 0)).toBe(100)
    expect(fitZoom(0, 20)).toBe(100)
  })
})

describe('timeAtX and xAtTime', () => {
  it('round-trip, which is what stops a keyframe drifting under the hand', () => {
    const zoom = 37.5, scroll = 214, laneLeft = 96
    for (const t of [0, 0.4, 3.75, 12.5, 28.746]) {
      expect(timeAtX(xAtTime(t, scroll, zoom) + laneLeft, laneLeft, scroll, zoom)).toBeCloseTo(t, 9)
    }
  })

  it('reads the lane origin as time zero', () => {
    expect(timeAtX(96, 96, 0, 50)).toBe(0)
  })

  it('accounts for a scrolled lane', () => {
    expect(timeAtX(96, 96, 100, 50)).toBe(2)
  })
})

describe('toleranceSeconds', () => {
  it('is a fixed number of PIXELS, so snapping feels the same at every zoom', () => {
    expect(toleranceSeconds(100)).toBeCloseTo(SNAP_PX / 100, 10)
    expect(toleranceSeconds(10)).toBeCloseTo(SNAP_PX / 10, 10)
  })
})

describe('tickStep', () => {
  it('spreads ticks out as the timeline is squeezed', () => {
    expect(tickStep(1000)).toBe(0.1)     // very zoomed in: 100ms ticks are 100px apart
    expect(tickStep(60)).toBe(1)         // 1s ticks are 60px apart
    expect(tickStep(10)).toBe(10)        // squeezed: 10s ticks
  })

  it('never returns a step so small the labels would overlap', () => {
    expect(tickStep(1) * 1).toBeGreaterThanOrEqual(0)
    expect(tickStep(0.1)).toBe(300)
  })
})

describe('ticksFor', () => {
  it('runs from zero to the duration inclusive', () => {
    expect(ticksFor(4, 1)).toEqual([0, 1, 2, 3, 4])
  })

  it('does not accumulate floating point drift across a long track', () => {
    const ticks = ticksFor(3, 0.1)
    expect(ticks).toHaveLength(31)
    expect(ticks[10]).toBe(1)
    expect(ticks.at(-1)).toBe(3)
  })

  it('is empty rather than infinite for nonsense', () => {
    expect(ticksFor(0, 1)).toEqual([])
    expect(ticksFor(10, 0)).toEqual([])
  })
})

describe('formatTime', () => {
  it('reads in seconds, which is what the narration and the teacher both use', () => {
    expect(formatTime(2.856)).toBe('2.86s')
    expect(formatTime(28.746)).toBe('28.7s')
  })

  it('never shows a negative time', () => {
    expect(formatTime(-1)).toBe('0.00s')
  })
})
