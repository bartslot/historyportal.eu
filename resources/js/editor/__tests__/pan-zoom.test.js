import { describe, it, expect } from 'vitest'
import { fitView, zoomAt, keepInView, MAX_ZOOM, MIN_ZOOM } from '../pan-zoom.js'

describe('looking closer at a picture', () => {
  it('fits a small figure large and centred in the window', () => {
    const v = fitView(1000, 700, 265, 355)
    expect(v.z).toBeGreaterThan(1.5)
    expect(v.x).toBeCloseTo((1000 - 265 * v.z) / 2)
    expect(v.y).toBeCloseTo((700 - 355 * v.z) / 2)
  })

  it('does not blow a tiny icon up without end', () => {
    expect(fitView(1000, 700, 8, 8).z).toBe(8)
  })

  it('keeps the picture point under the pointer where it is while zooming', () => {
    const before = { z: 2, x: 30, y: 40 }
    const after = zoomAt(before, 3, 200, 100)
    const point = (v) => [(200 - v.x) / v.z, (100 - v.y) / v.z]
    expect(point(after)[0]).toBeCloseTo(point(before)[0])
    expect(point(after)[1]).toBeCloseTo(point(before)[1])
  })

  it('holds the zoom to its range', () => {
    expect(zoomAt({ z: 30, x: 0, y: 0 }, 10, 0, 0).z).toBe(MAX_ZOOM)
    expect(zoomAt({ z: 0.2, x: 0, y: 0 }, 0.1, 0, 0).z).toBe(MIN_ZOOM)
  })

  it('never lets the picture be dragged out of sight', () => {
    const v = keepInView({ z: 2, x: 99999, y: -99999 }, 800, 600, 100, 100)
    expect(v.x).toBeLessThan(800)
    expect(v.y + 200).toBeGreaterThan(0)
  })
})
