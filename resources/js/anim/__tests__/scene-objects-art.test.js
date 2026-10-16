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

describe('the timeline reads a text layer', () => {
  afterEach(() => { delete window.__lessonTextLayer })

  // A diamond keys what the row SHOWS. An unset scale or opacity reading 0 would key a text out
  // of existence, the same trap the W row fell into for pictures.
  it('an unset look reads its default, never 0', () => {
    window.__lessonTextLayer = { _texts: [{ id: 'a', text: 'Batavia', x: 10, y: 10 }] }
    expect(readObjectProperty('text:a', 'scale')).toBe(1)
    expect(readObjectProperty('text:a', 'opacity')).toBe(1)
    expect(readObjectProperty('text:a', 'colorOpacity')).toBe(1)
    expect(readObjectProperty('text:a', 'rotation')).toBe(0)
    expect(readObjectProperty('text:a', 'color')).toBe('#f8fafc')
  })

  it('a set value reads as stored', () => {
    window.__lessonTextLayer = { _texts: [{ id: 'a', text: 'B', x: 10, y: 10, scale: 2, color: '#ffaa00' }] }
    expect(readObjectProperty('text:a', 'scale')).toBe(2)
    expect(readObjectProperty('text:a', 'color')).toBe('#ffaa00')
  })
})
