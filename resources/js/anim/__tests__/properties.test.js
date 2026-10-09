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
      .toEqual(['lng', 'lat', 'zoom', 'heading', 'tilt'])
  })

  it('gives a text layer what a text layer actually has, which is not the camera list', () => {
    expect(propertiesFor('text').map((p) => p.key)).toEqual(['x', 'y'])
    // `size` is the string "xl" on a real text item and there is no `opacity` — neither is a
    // number, so neither gets a row.
    expect(propertiesFor('text').map((p) => p.key)).not.toContain('size')
    expect(propertiesFor('rect').map((p) => p.key)).toEqual(['opacity'])
  })

  it('is empty for an object kind that cannot be animated yet, rather than guessing', () => {
    expect(propertiesFor('quiz')).toEqual([])
  })

  it('labels and units come from the registry so the panel never invents them', () => {
    expect(propertiesFor('camera').find((p) => p.key === 'zoom'))
      .toMatchObject({ label: 'Zoom', unit: '' })
    expect(propertiesFor('camera').find((p) => p.key === 'tilt'))
      .toMatchObject({ label: 'Tilt', unit: '°' })
  })

  it('has no altitude row beside zoom — two rows driving one degree of freedom fight', () => {
    expect(propertiesFor('camera').map((p) => p.key)).not.toContain('altitude')
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
      track('camera', 'zoom', [at(0, 1), at(2, 9)]),
      track('rect:7', 'opacity', [at(0, 0), at(2, 1)]),
    ], 1)

    expect(Object.keys(frame).sort()).toEqual(['camera', 'rect:7'])
    expect(frame.camera.zoom).toBeCloseTo(5, 10)
    expect(frame['rect:7'].opacity).toBeCloseTo(0.5, 10)
  })

  it('uses each property OWN interpolation, not one rule for all of them', () => {
    const frame = sampleFrame([
      track('camera', 'lng', [at(0, 170), at(2, -170)]),   // wraps
      track('camera', 'tilt', [at(0, 0), at(2, 60)]),      // plain
    ], 1)

    expect(frame.camera.lng).toBe(180)
    expect(frame.camera.tilt).toBeCloseTo(30, 10)
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
    const tracks = [track('camera', 'zoom', [at(0, 1), at(4, 9)])]
    expect(sampleFrame(tracks, 2.5)).toEqual(sampleFrame(tracks, 2.5))
  })

  it('ignores a track for a property the registry does not know', () => {
    const frame = sampleFrame([track('camera', 'nonsense', [at(0, 0), at(2, 10)])], 1)
    expect(frame).toEqual({})
  })
})
