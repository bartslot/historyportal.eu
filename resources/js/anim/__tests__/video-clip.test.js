import { describe, it, expect } from 'vitest'
import { loopRestarts, videoLengthLabel } from '../video-clip.js'

describe('loopRestarts', () => {
  it('cuts an 8 s loop in a 20 s scene where each pass starts again', () => {
    expect(loopRestarts(20, 8)).toEqual([8, 16])
  })

  it('has no cut when the video is as long as the scene or longer', () => {
    expect(loopRestarts(6, 8)).toEqual([])
    expect(loopRestarts(8, 8)).toEqual([])
  })

  it('has no cut while the length is unknown', () => {
    expect(loopRestarts(20, null)).toEqual([])
    expect(loopRestarts(20, 0)).toEqual([])
  })

  it('never puts a cut on the scene end', () => {
    expect(loopRestarts(16, 8)).toEqual([8])
  })

  it('caps the cuts for a broken tiny length', () => {
    expect(loopRestarts(100, 0.06, 5)).toHaveLength(5)
  })
})

describe('videoLengthLabel', () => {
  it('rounds to a tenth of a second', () => {
    expect(videoLengthLabel(8.0167)).toBe('8 s')
    expect(videoLengthLabel(7.54)).toBe('7.5 s')
    expect(videoLengthLabel(null)).toBe('')
  })
})
