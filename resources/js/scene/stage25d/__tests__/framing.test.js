import { describe, expect, it } from 'vitest'
import { CAM_RANGE, clampPose, endOf, panPose, wheelPose, withEnd } from '../framing.js'

const HOUSE = { x: 0, y: 1.6, z: 0, fov: 50 }

describe('camera framing', () => {
  it('fills a pose from the house camera and holds it to the range', () => {
    expect(clampPose({ x: 99 })).toEqual({ ...HOUSE, x: CAM_RANGE.x[1] })
    expect(clampPose({ y: 'nope' })).toEqual(HOUSE)
  })

  it('a drag moves the camera against the pointer, so the picture follows it', () => {
    const p = panPose(HOUSE, 100, 100, 500)
    expect(p.x).toBeLessThan(0)      // dragged right: the camera went left
    expect(p.y).toBeGreaterThan(1.6) // dragged down: the camera went up
  })

  it('a scroll moves forward, a pinch zooms the lens', () => {
    expect(wheelPose(HOUSE, { deltaY: -100 }).z).toBeCloseTo(1)
    expect(wheelPose(HOUSE, { deltaY: -50, ctrlKey: true }).fov).toBeLessThan(50)
    expect(wheelPose(HOUSE, { deltaY: -50, ctrlKey: true }).z).toBe(0)
  })

  it('setting one end keeps the other, and a scene with no move starts both at the house pose', () => {
    const cam = withEnd(null, 'to', { z: 4 })
    expect(cam.from).toEqual(HOUSE)
    expect(cam.to).toEqual({ ...HOUSE, z: 4 })
    expect(withEnd(cam, 'from', { x: 1 }).to).toEqual(cam.to)
    expect(endOf(null, 'to')).toEqual(HOUSE)
  })
})
