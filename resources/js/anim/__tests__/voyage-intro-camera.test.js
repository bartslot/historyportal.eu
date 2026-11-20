import { describe, it, expect } from 'vitest'
import { cameraEndsAt, releaseCameraAfter } from '../scene-animation.js'

const track = (target, property, times) => ({ target, property, keyframes: times.map((time) => ({ time, value: time })) })

describe('a voyage camera hands the map back after its last key', () => {
  it('ends at the camera\'s last key, ignoring other objects', () => {
    const timeline = { tracks: [track('camera', 'zoom', [0, 0.9, 4.1]), track('camera', 'tilt', [0, 2.5]), track('text:1', 'x', [0, 9])] }
    expect(cameraEndsAt(timeline)).toBe(4.1)
  })

  it('is 0 when the camera has a single key or none', () => {
    expect(cameraEndsAt({ tracks: [track('camera', 'zoom', [3])] })).toBe(0)
    expect(cameraEndsAt(null)).toBe(0)
  })

  it('keeps the camera until the end, then drops only the camera', () => {
    const frame = { camera: { zoom: 3 }, 'text:1': { x: 1 } }
    expect(releaseCameraAfter(frame, 4, 4.1)).toBe(frame)
    expect(releaseCameraAfter(frame, 4.2, 4.1)).toEqual({ 'text:1': { x: 1 } })
  })
})
