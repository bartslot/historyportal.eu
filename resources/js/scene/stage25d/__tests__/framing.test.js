import { describe, expect, it } from 'vitest'
import { CAM_RANGE, cameraKeys, cameraPoseAt, clampPose, movedCameraKey, nearestCameraKey, panPose, shotsOfKeys, wheelPose, withCameraKey, withoutCameraKey } from '../framing.js'

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

  it('a roll is held to its range, and a level pose has none', () => {
    expect(clampPose({ roll: 90 }).roll).toBe(45)
    expect(clampPose({ roll: 0 })).toEqual(HOUSE)
    const keys = [{ t: 0, pose: HOUSE }, { t: 8, pose: { ...HOUSE, roll: 10 } }]
    const [cam, ...more] = shotsOfKeys(keys)
    expect(cameraPoseAt(cam, more, 8, 8).roll).toBeCloseTo(10)
  })

  it('keys go to shots and back, one shot per pair, with no gap in the keys', () => {
    const keys = [{ t: 0, pose: HOUSE }, { t: 3, pose: { ...HOUSE, z: 4 } }, { t: 8, pose: { ...HOUSE, x: 1 } }]
    const [first, ...rest] = shotsOfKeys(keys)
    expect(rest).toHaveLength(1)
    expect(first).toMatchObject({ at_s: 0, dur_s: 3, from: HOUSE })
    expect(rest[0]).toMatchObject({ at_s: 3, dur_s: 5, to: { x: 1 } })
    expect(cameraKeys(first, rest, 8)).toEqual(keys)
  })

  it('a single key is a still shot, no key is no move', () => {
    const [still, ...none] = shotsOfKeys([{ t: 2, pose: { ...HOUSE, z: 4 } }])
    expect(none).toEqual([])
    expect(still.from).toEqual(still.to)
    expect(cameraKeys(still, none, 8)).toHaveLength(1)   // framing it again stays still, it does not start a move
    expect(shotsOfKeys([])).toEqual([])
  })

  it('a dragged key keeps its pose, passes other keys both ways and stays in the scene', () => {
    const keys = [{ t: 0, pose: HOUSE }, { t: 3, pose: { ...HOUSE, z: 4 } }, { t: 6, pose: { ...HOUSE, x: 1 } }]
    const moved = movedCameraKey(keys, 3, 4.5, 8)
    expect(moved.t).toBe(4.5)
    expect(moved.keys[1]).toEqual({ t: 4.5, pose: { ...HOUSE, z: 4 } })
    expect(movedCameraKey(keys, 6, 1, 8).keys.map((k) => [k.t, k.pose.x])).toEqual([[0, 0], [1, 1], [3, 0]])   // the last goes before the middle one
    expect(movedCameraKey(keys, 0, 7, 8).keys.map((k) => k.t)).toEqual([3, 6, 7])                                // the first goes past both
    expect(movedCameraKey(keys, 6, 99, 8).t).toBe(8)
    expect(movedCameraKey(keys, 3, -1, 8).t).toBeCloseTo(0.05)                                                   // the start is taken: it stays beside that key
    expect(movedCameraKey(keys, 2, 4, 8)).toEqual({ keys, t: 2 })
    const [first, ...rest] = shotsOfKeys(movedCameraKey(keys, 0, 1, 8).keys)
    expect(cameraKeys(first, rest, 8).map((k) => k.t)).toEqual([1, 3, 6])
  })

  it('a dragged key landing on another hops over it, in the way it was going', () => {
    const keys = [{ t: 0, pose: HOUSE }, { t: 3, pose: { ...HOUSE, z: 4 } }, { t: 8, pose: HOUSE }]
    expect(movedCameraKey(keys, 8, 3, 8).t).toBeCloseTo(2.95)
    expect(movedCameraKey(keys, 0, 3, 8).t).toBeCloseTo(3.05)
    expect(movedCameraKey(keys, 3, 8, 8).t).toBeCloseTo(7.95)                                                    // past the end: stays inside
  })

  it('a key replaces the one at its time, or joins in order; the pose is read back in degrees', () => {
    const keys = withCameraKey([{ t: 0, pose: HOUSE }, { t: 8, pose: HOUSE }], 4, { z: 2 })
    expect(keys.map((k) => k.t)).toEqual([0, 4, 8])
    expect(withCameraKey(keys, 4, { z: 3 }).find((k) => k.t === 4).pose.z).toBe(3)
    expect(withoutCameraKey(keys, 4).map((k) => k.t)).toEqual([0, 8])
    expect(nearestCameraKey(keys, 7).t).toBe(8)
    const [cam, ...more] = shotsOfKeys(keys)
    expect(cameraPoseAt(cam, more, 4, 8).z).toBeCloseTo(2)
    expect(cameraPoseAt(null, [], 1, 8)).toEqual(HOUSE)
  })
})
