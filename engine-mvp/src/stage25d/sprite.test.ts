import { describe, expect, it } from 'vitest'
import { cellOf, frameAt, isAnimation } from './sprite'
import type { Asset } from './types'

const fire: Asset = { id: 'campfire-01', layer: 'mid', tags: ['fire'], file: 'fire.webp', w: 240, h: 365, anchor: [0.5, 0.95], height_m: 1.5, kind: 'animation', frames: 48, cols: 12, rows: 4, fps: 12 }

describe('sprite animation', () => {
  it('knows an animation from a still picture', () => {
    expect(isAnimation(fire)).toBe(true)
    expect(isAnimation({ ...fire, kind: undefined })).toBe(false)
    expect(isAnimation({ ...fire, cols: 0 })).toBe(false)
  })

  it('steps one frame per 1/fps second of the scene and loops', () => {
    expect(frameAt(fire, undefined, 0)).toBe(0)
    expect(frameAt(fire, undefined, 1 / 12)).toBe(1)
    expect(frameAt(fire, undefined, 1)).toBe(12)
    expect(frameAt(fire, undefined, 3.99)).toBe(47)
    expect(frameAt(fire, undefined, 4)).toBe(0)
  })

  it('the same time is the same frame, every time (a seek, a pause)', () => {
    const t = 2.37
    expect(frameAt(fire, { speed: 1.5, offset: 0.4 }, t)).toBe(frameAt(fire, { speed: 1.5, offset: 0.4 }, t))
  })

  it('speed scales the fps, 0 holds the start frame, offset starts later in the animation', () => {
    expect(frameAt(fire, { speed: 2 }, 1)).toBe(24)
    expect(frameAt(fire, { speed: 0, offset: 1 }, 30)).toBe(12)
    expect(frameAt(fire, { offset: 0.5 }, 0)).toBe(6)
    expect(frameAt(fire, { speed: -1 }, 1 / 12)).toBe(47)   // backwards wraps too
  })

  it('without loop it stays on its last frame', () => {
    expect(frameAt({ ...fire, loop: false }, undefined, 100)).toBe(47)
  })

  it('a layer plays its own list of frames: shuffled, repeated, some left out', () => {
    const play = { frames: [5, 5, 2] }
    expect(frameAt(fire, play, 0)).toBe(5)
    expect(frameAt(fire, play, 1 / 12)).toBe(5)
    expect(frameAt(fire, play, 2 / 12)).toBe(2)
    expect(frameAt(fire, play, 3 / 12)).toBe(5)   // it wraps at the end of the list, not of the sheet
  })

  it('a frame that is not on the sheet is skipped, and an empty list plays them all', () => {
    expect(frameAt(fire, { frames: [99, -1, 1.5, 7] }, 0)).toBe(7)
    expect(frameAt(fire, { frames: [99] }, 1 / 12)).toBe(1)
    expect(frameAt(fire, { frames: [] }, 1 / 12)).toBe(1)
  })

  it('a layer can loop or not, whatever the sheet says', () => {
    expect(frameAt(fire, { loop: false }, 100)).toBe(47)
    expect(frameAt({ ...fire, loop: false }, { loop: true }, 4)).toBe(0)
    expect(frameAt(fire, { frames: [3, 4], loop: false }, 100)).toBe(4)
  })

  it('a frame is its cell of the sheet, row by row from the top left', () => {
    expect(cellOf(fire, 0)).toEqual([0, 0, 1 / 12, 1 / 4])
    expect(cellOf(fire, 13)).toEqual([1 / 12, 1 / 4, 1 / 12, 1 / 4])
    expect(cellOf(fire, 47)).toEqual([11 / 12, 3 / 4, 1 / 12, 1 / 4])
  })
})
