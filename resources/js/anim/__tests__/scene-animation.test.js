import { describe, it, expect } from 'vitest'


import { introCameraTracks, isIntroCamera, cameraEnd, cameraDrives, INTRO_TILT, openingCamera } from '../scene-animation.js'

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


// Bart 11-22, Bukhara: the editor opened on the focus pin's close-up, and only moving the playhead
// put the timeline camera on the map.
describe('openingCamera', () => {
  const key = (property, a, b) => ({ target: 'camera', property, keyframes: [{ time: 0, value: a }, { time: 6, value: b }] })
  const timeline = { tracks: [key('lng', 61.69, 49.43), key('lat', 42.45, 38), key('zoom', 1.22, 1.68)] }

  it('opens on the timeline camera at 0 s', () => {
    expect(openingCamera(timeline)).toEqual({ center: [61.69, 42.45], zoom: 1.22 })
  })

  it('carries heading and tilt when the timeline keys them', () => {
    const tilted = { tracks: [...timeline.tracks, key('heading', 10, 0), key('tilt', 30, 0)] }
    expect(openingCamera(tilted)).toMatchObject({ bearing: 10, pitch: 30 })
  })

  it("prefers the timeline over the writer's camera, and falls back to it", () => {
    const writer = { center: [12, 41], zoom: 4 }
    expect(openingCamera(timeline, writer).center).toEqual([61.69, 42.45])
    expect(openingCamera(null, writer)).toEqual({ center: [12, 41], zoom: 4 })
  })

  it('has no opening camera for a single key or no camera at all', () => {
    const single = { tracks: [{ target: 'camera', property: 'lng', keyframes: [{ time: 0, value: 5 }] }] }
    expect(openingCamera(single)).toBeNull()
    expect(openingCamera({ tracks: [] })).toBeNull()
  })
})
