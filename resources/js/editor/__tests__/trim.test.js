import { describe, it, expect } from 'vitest'
import { cropOf, trimState } from '../trim.js'

describe('a stage picture cropped to its paint on save (Bart 11-16)', () => {
  // a 400 x 300 stone standing on its bottom middle
  const opened = { crop: [0, 0], anchorPx: [200, 300], state: null }

  it('with its bottom half erased, what is left stands on the ground at the same place along it', () => {
    const state = trimState(opened, { x: 0, y: 0, w: 400, h: 150 })
    expect(state.crop).toEqual([0, 0])
    expect(state.anchor).toEqual([0.5, 1])
  })

  it('a side crop keeps the foot on the same point of the picture, so it does not slide', () => {
    const state = trimState(opened, { x: 100, y: 0, w: 300, h: 300 })
    expect(state.anchor[0]).toBeCloseTo(100 / 300, 4)
  })

  it('an empty margin under a foot that stood above the bottom keeps that foot where it was', () => {
    const state = trimState({ ...opened, anchorPx: [200, 270] }, { x: 0, y: 20, w: 400, h: 280 })
    expect(state.anchor[1]).toBeCloseTo(250 / 280, 4)
  })

  it('a second crop adds to the first, so Bring back still lines up with the library file', () => {
    const first = trimState(opened, { x: 50, y: 10, w: 300, h: 290 })
    const second = trimState({ ...opened, crop: first.crop, state: first }, { x: 20, y: 5, w: 200, h: 200 })
    expect(second.crop).toEqual([70, 15])
    expect(second.anchor).toEqual([+(130 / 200).toFixed(4), 1])
  })

  it('crops only when there is an empty edge, and never to nothing', () => {
    expect(cropOf({ x: 0, y: 0, w: 400, h: 300 }, 400, 300)).toBeNull()
    expect(cropOf(null, 400, 300)).toBeNull()
    expect(cropOf({ x: 0, y: 0, w: 400, h: 150 }, 400, 300)).toEqual({ x: 0, y: 0, w: 400, h: 150 })
  })
})
