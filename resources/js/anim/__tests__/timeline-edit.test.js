import { describe, it, expect } from 'vitest'
import { moveKeys, deleteKeys, snapToNearest, keyId } from '../timeline-edit.js'

const tracks = () => [
  { target: 'camera', property: 'zoom', keyframes: [{ time: 0, value: 3 }, { time: 2, value: 5 }, { time: 4, value: 6 }] },
  { target: 'camera', property: 'tilt', keyframes: [{ time: 2, value: 10 }, { time: 6, value: 40 }] },
]

describe('moveKeys', () => {
  it('moves only the referenced keys, across tracks, by the same delta', () => {
    const { tracks: out, delta } = moveKeys(tracks(), [
      { target: 'camera', property: 'zoom', time: 2 },
      { target: 'camera', property: 'tilt', time: 2 },
    ], 0.5)
    expect(delta).toBe(0.5)
    expect(out[0].keyframes.map((k) => k.time)).toEqual([0, 2.5, 4])
    expect(out[1].keyframes.map((k) => k.time)).toEqual([2.5, 6])
  })

  it('clamps the whole selection at zero instead of squashing the first key', () => {
    const { tracks: out, delta } = moveKeys(tracks(), [
      { target: 'camera', property: 'zoom', time: 2 },
      { target: 'camera', property: 'zoom', time: 4 },
    ], -3)
    expect(delta).toBe(-2)
    expect(out[0].keyframes.map((k) => k.time)).toEqual([0, 2])
    // the key at 0 was replaced by the moved key landing on it: one key per moment
    expect(out[0].keyframes[0].value).toBe(5)
  })

  it('never touches the tracks it was handed', () => {
    const input = tracks()
    moveKeys(input, [{ target: 'camera', property: 'zoom', time: 4 }], 1)
    expect(input[0].keyframes[2].time).toBe(4)
  })
})

describe('deleteKeys', () => {
  it('removes the referenced keys and drops a track left empty', () => {
    const out = deleteKeys(tracks(), [
      { target: 'camera', property: 'tilt', time: 2 },
      { target: 'camera', property: 'tilt', time: 6 },
      { target: 'camera', property: 'zoom', time: 2 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].keyframes.map((k) => k.time)).toEqual([0, 4])
  })
})

describe('snapToNearest', () => {
  it('snaps within tolerance and leaves the time alone outside it', () => {
    expect(snapToNearest(1.96, [0, 2, 4], 0.05)).toBe(2)
    expect(snapToNearest(1.8, [0, 2, 4], 0.05)).toBe(1.8)
  })
})

it('keyId is stable for the same key', () => {
  expect(keyId({ target: 'art:3', property: 'x', time: 1.5 })).toBe('art:3|x|1.5')
})
