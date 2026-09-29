import { describe, it, expect } from 'vitest'
import { clipOf, shiftClip, stretchClip, shiftPath, MIN_CLIP_S } from '../clip.js'
import { poseAt, frameFor } from '../timeline.js'

const keys = [
  { t: 1, cell: [0, 0] },
  { t: 3, cell: [4, 0], walk: 'walk' },
  { t: 5, cell: [4, 4], walk: 'walk' },
]

describe('an item\'s path is one clip', () => {
  it('spans its first to its last key; standing still is no clip', () => {
    expect(clipOf({ keys })).toEqual({ from: 1, to: 5 })
    expect(clipOf({ keys: [keys[0]] })).toBeNull()
    expect(clipOf({})).toBeNull()
  })

  it('dragging it moves every key by the same time, never before 0', () => {
    expect(shiftClip(keys, 2).map(k => k.t)).toEqual([3, 5, 7])
    expect(shiftClip(keys, -5).map(k => k.t)).toEqual([0, 2, 4])
    expect(keys[0].t).toBe(1)                       // the input is untouched
  })

  it('stretching the end slows the whole path down, keeping its shape', () => {
    const slow = stretchClip(keys, 'end', 9)          // 4 s → 8 s
    expect(slow.map(k => k.t)).toEqual([1, 5, 9])
    expect(slow.map(k => k.cell)).toEqual(keys.map(k => k.cell))
  })

  it('stretching the start keeps the end where it is', () => {
    expect(stretchClip(keys, 'start', 3).map(k => k.t)).toEqual([3, 4, 5])
  })

  it('a clip cannot be squeezed to nothing or turned inside out', () => {
    const tiny = stretchClip(keys, 'end', 0)
    expect(tiny[2].t - tiny[0].t).toBeCloseTo(MIN_CLIP_S, 9)
  })

  it('twice as fast, the feet still match the floor: the walk frame at a place is the same', () => {
    const sheet = { frames: 5, anims: { walk: { frames: [1, 2, 3, 4], stride_m: 1.5 } } }
    const fast = stretchClip(keys, 'end', 3)          // 4 s → 2 s
    const atSlow = poseAt({ keys }, 2, 0.5)           // halfway along the first stretch
    const atFast = poseAt({ keys: fast }, 1.5, 0.5)   // the same place, sooner
    expect(atFast.cell).toEqual(atSlow.cell)
    expect(frameFor(sheet, atFast.anim, atFast.walkedM)).toBe(frameFor(sheet, atSlow.anim, atSlow.walkedM))
  })

  it('moving the item on the stage moves the whole path', () => {
    expect(shiftPath(keys, [1, -2]).map(k => k.cell)).toEqual([[1, -2], [5, -2], [5, 2]])
  })
})
