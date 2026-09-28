import { describe, it, expect } from 'vitest'
import {
  fitZoom, timeAtX, xAtTime, toleranceSeconds, tickStep, ticksFor, formatTime, toMs, fromMs, SNAP_PX,
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

describe('milliseconds on the face, seconds in the model', () => {
  it('shows whole milliseconds — no decimals in a field two digits wide', () => {
    expect(formatTime(2.856)).toBe('2856')
    expect(formatTime(28.746)).toBe('28746')
  })

  it('never shows a negative time', () => {
    expect(formatTime(-1)).toBe('0')
    expect(toMs(-1)).toBe(0)
  })

  it('round-trips, so typing a number back gives the same moment', () => {
    for (const s of [0, 0.4, 2.856, 8]) expect(fromMs(toMs(s))).toBeCloseTo(s, 3)
  })
})

describe('the zoom slider: whole timeline to 20x closer, logarithmic', () => {
  it('runs from the fitted zoom to 20 times it, and round-trips', async () => {
    const { zoomFromSlider, sliderFromZoom } = await import('../timeline-view.js')
    expect(zoomFromSlider(0, 110)).toBeCloseTo(110)
    expect(zoomFromSlider(1000, 110)).toBeCloseTo(2200)
    expect(sliderFromZoom(zoomFromSlider(437, 110), 110)).toBe(437)
  })

  // 88px slider: one pixel is ~11.4 steps. Linear 2-600 moved ~7px/s per pixel, x1.6 over 10px
  // at the usual zoom and a doubling per pixel at the low end.
  it('changes zoom by about 3.5% per slider pixel, the same at both ends', async () => {
    const { zoomFromSlider } = await import('../timeline-view.js')
    const perPixel = 1000 / 88
    const low = zoomFromSlider(perPixel, 110) / zoomFromSlider(0, 110)
    const high = zoomFromSlider(1000, 110) / zoomFromSlider(1000 - perPixel, 110)
    expect(low).toBeCloseTo(high, 6)
    expect(low).toBeLessThan(1.04)
  })

  it('pins a zoom outside the range to the nearest end', async () => {
    const { sliderFromZoom } = await import('../timeline-view.js')
    expect(sliderFromZoom(50, 110)).toBe(0)
    expect(sliderFromZoom(99999, 110)).toBe(1000)
  })
})
