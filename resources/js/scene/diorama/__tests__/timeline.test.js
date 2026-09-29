import { describe, it, expect } from 'vitest'
import { poseAt, frameFor } from '../timeline.js'

const CELL_M = 0.5
const sheet = { frames: 5, anims: { idle: { frames: [0] }, walk: { frames: [1, 2, 3, 4], stride_m: 1.5 } } }
// Stand at [0, 0] until 1 s, walk 6 cells (3 m) to [6, 0] by 3 s, then glide back without walking.
const item = {
  cell: [0, 0],
  keys: [
    { t: 1, cell: [0, 0] },
    { t: 3, cell: [6, 0], walk: 'walk' },
    { t: 4, cell: [6, 2] },
  ],
}

describe('poseAt', () => {
  it('without keys the item stands at its cell', () => {
    expect(poseAt({ cell: [2, 3] }, 5, CELL_M)).toEqual({ cell: [2, 3], anim: null, walkedM: 0, dir: null })
  })

  it('holds the first key before it starts', () => {
    expect(poseAt(item, 0.5, CELL_M).cell).toEqual([0, 0])
    expect(poseAt(item, 0.5, CELL_M).anim).toBeNull()
  })

  it('moves at constant speed between keys and names the walk', () => {
    const p = poseAt(item, 2, CELL_M)            // halfway through the walk
    expect(p.cell).toEqual([3, 0])
    expect(p.anim).toBe('walk')
    expect(p.walkedM).toBeCloseTo(1.5, 9)          // 3 cells of 0.5 m
    expect(p.dir).toEqual([6, 0])
  })

  it('a stretch without walk moves the item but plays no walk', () => {
    const p = poseAt(item, 3.5, CELL_M)
    expect(p.cell).toEqual([6, 1])
    expect(p.anim).toBeNull()
    expect(p.walkedM).toBeCloseTo(3, 9)            // only the walked stretch counts
  })

  it('stays at the last key after it', () => {
    expect(poseAt(item, 99, CELL_M).cell).toEqual([6, 2])
  })
})

describe('frameFor: frames follow distance, not time', () => {
  it('one stride plays the four walk frames once', () => {
    expect([0, 0.375, 0.75, 1.125, 1.5].map(m => frameFor(sheet, 'walk', m))).toEqual([1, 2, 3, 4, 1])
  })

  it('walking twice as fast shows the same frame at the same place on the floor (no foot slide)', () => {
    const slow = { ...item, keys: [{ t: 0, cell: [0, 0] }, { t: 4, cell: [6, 0], walk: 'walk' }] }
    const fast = { ...item, keys: [{ t: 0, cell: [0, 0] }, { t: 2, cell: [6, 0], walk: 'walk' }] }
    const atSlow = poseAt(slow, 2, CELL_M)      // halfway, 2 s in
    const atFast = poseAt(fast, 1, CELL_M)      // halfway, 1 s in
    expect(atFast.cell).toEqual(atSlow.cell)
    expect(frameFor(sheet, atFast.anim, atFast.walkedM)).toBe(frameFor(sheet, atSlow.anim, atSlow.walkedM))
  })

  it('standing shows the idle frame; a static picture is frame 0', () => {
    expect(frameFor(sheet, null, 2)).toBe(0)
    expect(frameFor(undefined, 'walk', 2)).toBe(0)
  })
})

describe('clips that play by time', () => {
  const waver = { frames: 6, anims: { idle: { frames: [0, 1], fps: 2 }, wave: { frames: [2, 3, 4, 5], fps: 8 } } }

  it('a standing figure loops its idle clip at its frame rate', () => {
    expect([0, 0.49, 0.5, 1.0].map(t => frameFor(waver, null, 0, t))).toEqual([0, 0, 1, 0])
  })

  it('a named clip without a stride plays by time', () => {
    expect([0, 0.125, 0.25, 0.5].map(t => frameFor(waver, 'wave', 0, t))).toEqual([2, 3, 4, 2])
  })

  it('a walk still follows distance, not time', () => {
    expect(frameFor(sheet, 'walk', 0.375, 99)).toBe(2)
  })
})

