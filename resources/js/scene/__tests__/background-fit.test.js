import { describe, it, expect } from 'vitest'
import { isTopAnchored, normalizeFit } from '../background-fit.js'

describe('normalizeFit', () => {
  it('only ever returns one of the two supported fits', () => {
    expect(normalizeFit('contain')).toBe('contain')
    expect(normalizeFit('cover')).toBe('cover')
    expect(normalizeFit('stretch')).toBe('cover')
    expect(normalizeFit(undefined)).toBe('cover')
    expect(normalizeFit(null)).toBe('cover')
  })
})

describe('isTopAnchored', () => {
  it('leaves a TALL image centred when nothing says there is a face in it', () => {
    // The regression this replaces: a tall engraving of a ship anchored top, so the stage showed
    // mast and flag and cropped the ship away. Tall is not evidence of a face.
    expect(isTopAnchored('cover', 'center', 736, 1475)).toBe(false)
  })

  it('honours a stored top hint for a WIDE image, which shape can never detect', () => {
    // A landscape canvas titled "Portrait of…" — only the hint knows the subject sits high.
    expect(isTopAnchored('cover', 'top', 1600, 900)).toBe(true)
  })

  it('leaves a landscape image centred', () => {
    expect(isTopAnchored('cover', 'center', 3840, 2408)).toBe(false)
  })

  it('never anchors a contained image, because nothing is cropped', () => {
    expect(isTopAnchored('contain', 'top', 736, 1475)).toBe(false)
    expect(isTopAnchored('contain', 'center', 736, 1475)).toBe(false)
  })

  it('needs no dimensions at all — the hint is the whole decision', () => {
    expect(isTopAnchored('cover', 'top', 0, 0)).toBe(true)
    expect(isTopAnchored('cover', 'center', 0, 0)).toBe(false)
  })
})
