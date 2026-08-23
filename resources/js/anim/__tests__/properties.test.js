import { describe, it, expect } from 'vitest'
import { propertiesFor, sampleFrame, INTERPOLATE } from '../properties.js'

/**
 * What each kind of object can be animated on, and how each property gets from one key to the next.
 *
 * The registry is the answer to Bart's correction: the timeline lists the scene's OBJECTS, and a
 * camera is one an author adds to a map. So the property rows come from the object, never from a
 * fixed list — and a camera's longitude and altitude do not interpolate like a layer's opacity.
 */

const track = (target, property, keyframes) => ({ target, property, keyframes })
const at = (time, value, easing = 'linear') => ({ time, value, easing })

describe('propertiesFor', () => {
  it('gives a camera the five things a pose is made of', () => {
    expect(propertiesFor('camera').map((p) => p.key))
      .toEqual(['lng', 'lat', 'altitude', 'heading', 'tilt'])
  })

  it('gives a layer what a layer actually has, which is not the same list', () => {
    expect(propertiesFor('layer').map((p) => p.key))
      .toEqual(['x', 'y', 'scale', 'rotation', 'opacity'])
  })

  it('is empty for an object kind that cannot be animated yet, rather than guessing', () => {
    expect(propertiesFor('quiz')).toEqual([])
  })

  it('labels and units come from the registry so the panel never invents them', () => {
    const altitude = propertiesFor('camera').find((p) => p.key === 'altitude')
    expect(altitude).toMatchObject({ label: 'Altitude', unit: 'm' })
  })
})

describe('INTERPOLATE.angle', () => {
  it('takes the short way across the date line', () => {
    // 170°E → 170°W is 20° east, not 340° back across Asia.
    expect(INTERPOLATE.angle(170, -170, 0.5)).toBe(180)
  })

  it('swings through north rather than all the way round', () => {
    expect(INTERPOLATE.angle(350, 10, 0.5)).toBe(360)
  })
})

describe('INTERPOLATE.log', () => {
  it('puts the halfway point at the geometric mean, which is what looks halfway', () => {
    // 100m → 10,000m: halfway is 1,000m, not 5,050m. Linear altitude is why a naive fly-to
    // hangs in space and then drops the last stretch.
    expect(INTERPOLATE.log(100, 10000, 0.5)).toBeCloseTo(1000, 6)
  })

  it('falls back to linear when a value is not positive, instead of returning NaN', () => {
    expect(INTERPOLATE.log(0, 100, 0.5)).toBe(50)
  })
})

describe('sampleFrame', () => {
  it('groups every track by the object it belongs to', () => {
    const frame = sampleFrame([
      track('camera', 'altitude', [at(0, 100), at(2, 10000)]),
      track('layer:7', 'opacity', [at(0, 0), at(2, 1)]),
    ], 1)

    expect(Object.keys(frame).sort()).toEqual(['camera', 'layer:7'])
    expect(frame['layer:7'].opacity).toBeCloseTo(0.5, 10)
  })

  it('uses each property OWN interpolation, not one rule for all of them', () => {
    const frame = sampleFrame([
      track('camera', 'altitude', [at(0, 100), at(2, 10000)]),
      track('camera', 'tilt', [at(0, 0), at(2, 60)]),
    ], 1)

    expect(frame.camera.altitude).toBeCloseTo(1000, 6)   // logarithmic
    expect(frame.camera.tilt).toBeCloseTo(30, 10)        // plain
  })

  it('wraps longitude per segment so a Pacific crossing goes the short way', () => {
    const frame = sampleFrame([track('camera', 'lng', [at(0, 170), at(2, -170)])], 1)
    expect(frame.camera.lng).toBe(180)
  })

  it('leaves out a property that has no track, so nothing is overwritten with a default', () => {
    const frame = sampleFrame([track('camera', 'tilt', [at(0, 0), at(2, 60)])], 1)
    expect(frame.camera).toEqual({ tilt: 30 })
  })

  it('is an empty frame when there is nothing to animate', () => {
    expect(sampleFrame([], 1)).toEqual({})
    expect(sampleFrame(null, 1)).toEqual({})
  })

  it('gives the same frame for the same time — scrubbing depends on it', () => {
    const tracks = [track('camera', 'altitude', [at(0, 100), at(4, 10000)])]
    expect(sampleFrame(tracks, 2.5)).toEqual(sampleFrame(tracks, 2.5))
  })

  it('ignores a track for a property the registry does not know', () => {
    const frame = sampleFrame([track('camera', 'nonsense', [at(0, 0), at(2, 10)])], 1)
    expect(frame).toEqual({})
  })
})
