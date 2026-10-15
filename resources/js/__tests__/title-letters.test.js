import { describe, it, expect } from 'vitest'
import { splitTitle, missingGlyphs, canLetter, fitLines } from '../title-letters.js'

describe('splitTitle', () => {
  it('splits the series from the episode at the first ": "', () => {
    expect(splitTitle('Tasman: De eerste reis')).toEqual({ series: 'Tasman', episode: 'De eerste reis' })
    expect(splitTitle('A: B: C')).toEqual({ series: 'A', episode: 'B: C' })
  })

  it('makes the whole title the series when there is no colon', () => {
    expect(splitTitle('De Watersnood van 1953')).toEqual({ series: 'De Watersnood van 1953', episode: '' })
    expect(splitTitle('Tijd:12')).toEqual({ series: 'Tijd:12', episode: '' })
  })
})

describe('missing glyphs', () => {
  it('draws Dutch, French and Italian accents ComicRoma has', () => {
    expect(missingGlyphs('Één brug, één überzee: café à Napoli è più')).toEqual([])
    expect(canLetter('Reünie in Noord-Holland')).toBe(true)
  })

  it('lists each character the font lacks once, as drawn (uppercase)', () => {
    expect(missingGlyphs('Façade & Ça')).toEqual(['Ç', '&'])
    expect(missingGlyphs('España (1492)')).toEqual(['Ñ', '(', ')'])
  })

  it('falls back to plain when the series lacks a glyph, but not for the episode', () => {
    expect(canLetter('Mañana: de reis')).toBe(false)
    expect(canLetter('Die Ärzte')).toBe(false)
    expect(canLetter('De VOC: (deel 1) "Batavia"')).toBe(true)
  })
})

describe('fitLines', () => {
  // A fake line breaker: 10 characters per line at 100px, more as the size drops.
  const measure = (text) => (px) => ({ lines: Math.ceil(text.length / Math.floor(1000 / px)), overflow: false })

  it('keeps the CSS size when the series fits in two lines', () => {
    expect(fitLines(measure('Tasman'), 100, 24)).toBe(100)
  })

  it('steps down until a long series fits in two lines', () => {
    const size = fitLines(measure('Een heel lange reeks titel'), 100, 24)
    expect(size).toBeLessThan(100)
    expect(measure('Een heel lange reeks titel')(size).lines).toBeLessThanOrEqual(2)
  })

  it('steps down while a word overflows, and stops at the minimum', () => {
    expect(fitLines(() => ({ lines: 1, overflow: true }), 100, 24)).toBe(24)
  })
})
