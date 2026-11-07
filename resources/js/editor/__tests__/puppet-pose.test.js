import { describe, it, expect } from 'vitest'
import { movableBones, matrixOf, apply, invert, jointAt, partUnder, turnBetween, poseFields, poseTimes, poseKeyAt, withPoseKey, withoutPoseKey } from '../puppet-pose.js'

const quad = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const puppet = {
  width: 100, height: 200,
  bones: [{ name: 'hips', parent: null, from: [50, 120] }, { name: 'chest', parent: 'hips', from: [50, 100] }, { name: 'upperarm_n', parent: 'chest', from: [30, 50] }, { name: 'forearm_n', parent: 'upperarm_n', from: [30, 90] }],
  parts: [
    { bone: 'hips', quad: quad(30, 100, 70, 200), uv: [0, 0, 0.5, 0.5] },
    { bone: 'chest', quad: quad(30, 40, 70, 110), uv: [0.5, 0, 1, 0.5] },
    { bone: 'forearm_n', quad: quad(20, 90, 40, 130), uv: [0, 0.5, 0.5, 1] },
    { bone: 'upperarm_n', quad: quad(20, 45, 40, 95), uv: [0.5, 0.5, 1, 1] },
  ],
}

describe('a rigid part', () => {
  it('standing where it was drawn has no transform', () => {
    const m = matrixOf(quad(10, 10, 20, 30), 10, 10, 20, 10)
    expect(m.map((n) => Math.round(n * 1000) / 1000)).toEqual([1, 0, -0, 1, 0, 0])
  })

  it('a quarter turn clockwise round its corner', () => {
    const m = matrixOf(quad(10, 10, 20, 30), 10, 10, 10, 20)
    const [x, y] = apply(m, 20, 10)
    expect(x).toBeCloseTo(10)
    expect(y).toBeCloseTo(20)
    const [bx, by] = invert(m, 10, 20)
    expect(bx).toBeCloseTo(20)
    expect(by).toBeCloseTo(10)
  })

  it('finds a joint in the pose', () => {
    const still = [[1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 5, 7], [1, 0, 0, 1, 0, 0]]
    expect(jointAt(puppet, still, 'forearm_n')).toEqual([35, 97])
    expect(jointAt(puppet, still, 'nope')).toBeNull()
  })
})

describe('what a press takes', () => {
  const still = puppet.parts.map(() => [1, 0, 0, 1, 0, 0])
  const movable = movableBones(puppet)
  const paint = () => true

  it('the hips stay out of it', () => {
    expect(movable).toEqual(['chest', 'upperarm_n', 'forearm_n'])
    expect(partUnder(puppet, still, 50, 180, paint, movable)).toBeNull()
  })

  it('the front part wins where parts overlap', () => {
    expect(partUnder(puppet, still, 30, 92, paint, movable)).toBe('upperarm_n')   // the upper arm is drawn over the forearm
  })

  it('the air in a part\'s box takes nothing: the part behind it gets the press', () => {
    const noUpperArm = (u, v) => !(u >= 0.5 && v >= 0.5)
    expect(partUnder(puppet, still, 30, 92, noUpperArm, movable)).toBe('forearm_n')
  })

  it('reads the atlas at the right place', () => {
    const seen = []
    partUnder(puppet, still, 30, 120, (u, v) => { seen.push([u, v]); return true }, movable)
    expect(seen[0][0]).toBeCloseTo(0.25)
    expect(seen[0][1]).toBeCloseTo(0.875)
  })
})

describe('a drag round a joint', () => {
  it('is clockwise on screen, the short way round', () => {
    expect(turnBetween([0, 0], [10, 0], [0, 10])).toBeCloseTo(90)    // right to down: clockwise on screen
    expect(turnBetween([0, 0], [10, 0], [0, -10])).toBeCloseTo(-90)
    expect(turnBetween([0, 0], [-10, 1], [-10, -1])).toBeCloseTo(turnBetween([0, 0], [-10, 1], [-10, -1]))
    expect(Math.abs(turnBetween([0, 0], [-10, 1], [-10, -1]))).toBeLessThan(20)   // across the seam of atan2
  })
})

describe('pose keys', () => {
  const pose = { head: 10, chest: -5 }
  it('a pose as fields', () => {
    expect(poseFields(pose)).toEqual({ 'bone:head': 10, 'bone:chest': -5 })
  })

  it('adds a key in order and keeps what a key at that moment already holds', () => {
    const keys = [{ t: 0, x: 1 }, { t: 2, 'bone:head': 1 }]
    expect(withPoseKey(keys, 1, pose).map((k) => k.t)).toEqual([0, 1, 2])
    expect(withPoseKey(keys, 0, pose)[0]).toEqual({ t: 0, x: 1, 'bone:head': 10, 'bone:chest': -5 })
    expect(keys[0]).toEqual({ t: 0, x: 1 })   // the old list is left alone
  })

  it('only keys with a pose count as pose keys', () => {
    const keys = [{ t: 0, x: 1 }, { t: 2, 'bone:head': 1 }]
    expect(poseTimes(keys)).toEqual([2])
    expect(poseKeyAt(keys, 2)).toBe(2)
    expect(poseKeyAt(keys, 0)).toBeNull()
  })

  it('removing a pose leaves the rest of its key, and an empty key goes', () => {
    const keys = [{ t: 1, x: 1, 'bone:head': 2 }, { t: 2, 'bone:head': 1 }]
    expect(withoutPoseKey(keys, 1)).toEqual([{ t: 1, x: 1 }, { t: 2, 'bone:head': 1 }])
    expect(withoutPoseKey(keys, 2)).toEqual([{ t: 1, x: 1, 'bone:head': 2 }])
  })
})
