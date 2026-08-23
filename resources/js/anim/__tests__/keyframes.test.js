import { describe, it, expect } from 'vitest'
import {
  sortedKeys, segmentAt, sampleNumber,
  addKeyframe, removeKeyframe, updateKeyframe, setDuration, trackDuration,
} from '../keyframes.js'

/**
 * The property-agnostic half of a keyframe track — the part a camera pose, a layer's x, and an
 * opacity all need identically. camera-track.js keeps only what is genuinely about a POSE
 * (longitude wrap, logarithmic altitude) and imports the rest from here.
 *
 * Assertions are absolute wherever a number can be worked out by hand. A suite where every
 * expectation is a difference is satisfied by a uniform offset, which is how a 20° error once
 * survived for months.
 */

const track = (keyframes, extra = {}) => ({ keyframes, ...extra })
const at = (time, value, easing) => (easing ? { time, value, easing } : { time, value })

describe('sortedKeys', () => {
  it('puts keyframes in time order whatever order they arrive in', () => {
    expect(sortedKeys(track([at(2, 20), at(0, 0), at(1, 10)])).map((k) => k.time)).toEqual([0, 1, 2])
  })

  it('drops a keyframe with no usable time rather than sorting it to the front', () => {
    const keys = sortedKeys(track([at(1, 10), { value: 5 }, at(0, 0), { time: NaN, value: 9 }]))
    expect(keys.map((k) => k.time)).toEqual([0, 1])
  })

  it('does not mutate the track it is given', () => {
    const original = track([at(2, 20), at(0, 0)])
    sortedKeys(original)
    expect(original.keyframes.map((k) => k.time)).toEqual([2, 0])
  })
})

describe('segmentAt', () => {
  const keys = sortedKeys(track([at(0, 0), at(2, 100), at(6, 300)]))

  it('finds the pair around the time, and how far between them it sits', () => {
    expect(segmentAt(keys, 1)).toMatchObject({ index: 0, u: 0.5 })
    expect(segmentAt(keys, 3)).toMatchObject({ index: 1, u: 0.25 })
  })

  it('clamps before the first keyframe and after the last', () => {
    expect(segmentAt(keys, -5)).toMatchObject({ index: 0, u: 0 })
    expect(segmentAt(keys, 99)).toMatchObject({ index: 1, u: 1 })
  })

  it('returns u = 0 for a zero-length segment rather than dividing by zero', () => {
    const stacked = sortedKeys(track([at(1, 0), at(1, 50)]))
    expect(segmentAt(stacked, 1).u).toBe(0)
  })

  it('is null when there is nothing to sit between', () => {
    expect(segmentAt([], 0)).toBeNull()
    expect(segmentAt(sortedKeys(track([at(0, 5)])), 0)).toBeNull()
  })
})

describe('sampleNumber', () => {
  it('holds the first value before the track starts and the last after it ends', () => {
    const t = track([at(1, 10), at(3, 30)])
    expect(sampleNumber(t, 0)).toBe(10)
    expect(sampleNumber(t, 99)).toBe(30)
  })

  it('interpolates linearly when the segment says linear', () => {
    const t = track([at(0, 0, 'linear'), at(4, 100)])
    expect(sampleNumber(t, 1)).toBe(25)
    expect(sampleNumber(t, 2)).toBe(50)
    expect(sampleNumber(t, 3)).toBe(75)
  })

  it('applies the easing of the segment being LEFT, not the one being entered', () => {
    // easeInQuad at u=0.5 is 0.25, so a 0→100 move is at 25 rather than 50.
    const t = track([at(0, 0, 'easeInQuad'), at(2, 100, 'linear')])
    expect(sampleNumber(t, 1)).toBeCloseTo(25, 10)
  })

  it('falls back to the track easing, then to the default, for a keyframe with none', () => {
    const t = track([at(0, 0), at(2, 100)], { easing: 'linear' })
    expect(sampleNumber(t, 1)).toBe(50)
  })

  it('is 0 for an empty track rather than undefined or NaN', () => {
    expect(sampleNumber(track([]), 5)).toBe(0)
  })

  it('gives the same answer every time it is asked — this is what makes scrubbing possible', () => {
    const t = track([at(0, 0), at(5, 250)])
    expect(sampleNumber(t, 2.5)).toBe(sampleNumber(t, 2.5))
  })
})

describe('trackDuration', () => {
  it('is the time of the last keyframe', () => {
    expect(trackDuration(track([at(0, 0), at(4.5, 10)]))).toBe(4.5)
  })

  it('is 0 for a track with no keyframes', () => {
    expect(trackDuration(track([]))).toBe(0)
    expect(trackDuration(undefined)).toBe(0)
  })
})

describe('editing returns a new track and never touches the old one', () => {
  it('addKeyframe inserts in time order', () => {
    const t = addKeyframe(track([at(0, 0), at(4, 40)]), at(2, 20))
    expect(t.keyframes.map((k) => k.time)).toEqual([0, 2, 4])
  })

  it('addKeyframe replaces a keyframe already at that time', () => {
    const t = addKeyframe(track([at(0, 0), at(2, 20)]), at(2, 99))
    expect(t.keyframes).toHaveLength(2)
    expect(t.keyframes[1].value).toBe(99)
  })

  it('addKeyframe leaves the original alone', () => {
    const original = track([at(0, 0)])
    addKeyframe(original, at(1, 10))
    expect(original.keyframes).toHaveLength(1)
  })

  it('removeKeyframe drops one by index without touching the original', () => {
    const original = track([at(0, 0), at(1, 10), at(2, 20)])
    const t = removeKeyframe(original, 1)
    expect(t.keyframes.map((k) => k.time)).toEqual([0, 2])
    expect(original.keyframes).toHaveLength(3)
  })

  it('updateKeyframe patches one by index without touching the original', () => {
    const original = track([at(0, 0), at(1, 10)])
    const t = updateKeyframe(original, 1, { value: 99 })
    expect(t.keyframes[1]).toMatchObject({ time: 1, value: 99 })
    expect(original.keyframes[1].value).toBe(10)
  })

  it('setDuration rescales every keyframe time so the move runs for that long', () => {
    const t = setDuration(track([at(0, 0), at(1, 10), at(2, 20)]), 6)
    expect(t.keyframes.map((k) => k.time)).toEqual([0, 3, 6])
    expect(trackDuration(t)).toBe(6)
  })

  it('setDuration refuses a track with no length and a duration of zero', () => {
    expect(setDuration(track([at(0, 0)]), 5).keyframes.map((k) => k.time)).toEqual([0])
    expect(setDuration(track([at(0, 0), at(2, 20)]), 0).keyframes.map((k) => k.time)).toEqual([0, 2])
  })
})
