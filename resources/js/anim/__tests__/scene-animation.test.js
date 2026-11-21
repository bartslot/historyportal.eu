import { describe, it, expect } from 'vitest'


import { introCameraTracks, isIntroCamera, cameraEnd, cameraDrives, INTRO_TILT } from '../scene-animation.js'

/** The space intro is the scene's camera (Bart 2026-11-20): globe, a beat, then a dive that ends tilted. */
describe('introCameraTracks', () => {
  const to = { lng: 60, lat: 35, zoom: 3.2, heading: 0, tilt: 0 }
  const tracks = introCameraTracks(to)
  const keys = (p) => tracks.find((t) => t.property === p).keyframes

  it('starts on the whole globe, flat, and lands on the stage view tilted', () => {
    expect(keys('zoom').map((k) => k.value)).toEqual([1.05, 1.05, 3.2])
    expect(keys('tilt').map((k) => k.value)).toEqual([0, 0, INTRO_TILT])
    expect(keys('lng').every((k) => k.value === 60)).toBe(true)
  })

  it('is recognised as the intro, so switching it off may remove it, and drives the camera for its length', () => {
    expect(isIntroCamera(tracks)).toBe(true)
    expect(cameraEnd({ tracks })).toBeCloseTo(4.1)
    expect(cameraDrives({ tracks })).toBe(true)
    expect(cameraDrives({ tracks: [] })).toBe(false)
  })

  it('keeps a steeper tilt the stage already has', () => {
    const steep = introCameraTracks({ ...to, tilt: 60 })
    expect(steep.find((t) => t.property === 'tilt').keyframes.at(-1).value).toBe(60)
  })
})

