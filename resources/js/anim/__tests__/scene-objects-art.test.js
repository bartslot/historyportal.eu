import { describe, it, expect, afterEach } from 'vitest'
import { readObjectProperty } from '../scene-objects.js'

afterEach(() => { delete window.__lessonArtworkLayer })

const overlay = (layer, measured) => ({
  _layers: [layer],
  measure: () => measured,
})

describe('the timeline reads an artwork layer', () => {
  // Bart 2026-10-14: a backdrop dropped from the library read "W 0" in the timeline. A layer with no
  // explicit width takes it from the picture's aspect, so the row showed a number nothing uses, and
  // the W diamond keyed that 0 — a zero-width layer the moment a second key existed.
  it('a layer with no explicit width reads the width it is drawn at', () => {
    window.__lessonArtworkLayer = overlay({ asset_id: 108, height: 40, width: null }, { ratio: 1.25 })
    expect(readObjectProperty('art:108', 'width')).toBe(50)
  })

  it('an explicit width wins over the measurement', () => {
    window.__lessonArtworkLayer = overlay({ asset_id: 108, height: 40, width: 30 }, { ratio: 1.25 })
    expect(readObjectProperty('art:108', 'width')).toBe(30)
  })

  it('nothing to measure yet reads null, never 0', () => {
    window.__lessonArtworkLayer = overlay({ asset_id: 108, height: 40, width: null }, null)
    expect(readObjectProperty('art:108', 'width')).toBeNull()
  })
})
