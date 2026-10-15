import { describe, it, expect } from 'vitest'
import { FIT, FIT_START, collisions, nextFit, overlaps, scaleBoxAbout, calmScale, lettersBox, artHits } from '../title-fit.js'

const r = (x, y, w, h) => ({ x, y, w, h })

describe('what overlaps on the title screen', () => {
  it('finds two pieces of different groups and a piece on a face', () => {
    const pieces = [{ group: 'language', rect: r(0, 0, 50, 10) }, { group: 'cta', rect: r(40, 5, 50, 10) }, { group: 'title', rect: r(500, 500, 10, 10) }]
    const keep = [{ kind: 'face', rect: r(505, 505, 20, 20) }, { kind: 'figure', rect: r(0, 0, 999, 999) }]
    expect(collisions(pieces, keep)).toEqual([{ a: 'language', b: 'cta' }, { a: 'title', b: 'face' }])
  })

  it('leaves the QR over a face to the art, and reports it; never the chevron', () => {
    expect(collisions([{ group: 'chevron', rect: r(500, 500, 48, 48) }], [{ kind: 'face', rect: r(505, 505, 20, 20) }])).toEqual([{ a: 'chevron', b: 'face' }])
    const qr = r(500, 500, 96, 96)
    const keep = [{ kind: 'face', rect: r(505, 505, 20, 20) }]
    expect(collisions([{ group: 'qr', rect: qr }], keep)).toEqual([])
    expect(artHits(qr, keep)).toHaveLength(1)
    expect(artHits(null, keep)).toEqual([])
  })

  it('lets the subtitle sit on the letters and pieces of one row touch', () => {
    const pieces = [{ group: 'subtitle', rect: r(0, 0, 50, 10) }, { group: 'cta', rect: r(0, 20, 10, 10) }, { group: 'cta', rect: r(5, 20, 10, 10) }]
    expect(collisions(pieces, [{ kind: 'letters', rect: r(0, 0, 50, 10) }])).toEqual([])
  })

  it('ignores a hairline touch', () => {
    expect(overlaps(r(0, 0, 10, 10), r(9.5, 0, 10, 10))).toBe(false)
  })
})

describe('how the title screen gives way', () => {
  const hit = (a, b) => [{ a, b }]

  it('shrinks the QR step by step, then hides it, then scales the title', () => {
    let fit = { ...FIT_START }
    const seen = []
    for (let i = 0; i < 4; i++) {
      fit = nextFit(fit, hit('qr', 'letters'))
      seen.push({ ...fit })
    }
    expect(seen.map(f => [f.qrStep, f.qrHidden, f.shrink])).toEqual([[1, false, 0], [2, false, 0], [2, true, 0], [2, true, 1]])
  })

  it('scales the title straight away when the QR is not involved', () => {
    expect(nextFit({ ...FIT_START }, hit('cta', 'letters'))).toEqual({ ...FIT_START, shrink: 1 })
  })

  it('stops when nothing overlaps, and when it has no step left', () => {
    expect(nextFit({ ...FIT_START }, [])).toBeNull()
    expect(nextFit({ qrStep: 2, qrHidden: true, shrink: FIT.maxShrink }, hit('cta', 'letters'))).toBeNull()
  })
})

describe('the calm size of the title', () => {
  it('lets the letters span a share of the screen, never more than drawn', () => {
    expect(calmScale(1000, 1440)).toBeCloseTo(FIT.letterShare * 1440 / 1000)
    expect(calmScale(300, 1440)).toBe(1)
  })

  it('keeps a stacked title to a share of the height', () => {
    expect(calmScale(400, 1440, 600, 900)).toBeCloseTo(FIT.letterShareH * 900 / 600)
  })

  it('lets a phone use most of its width', () => {
    expect(calmScale(1000, 375)).toBeCloseTo(FIT.letterSharePhone * 375 / 1000)
  })

  it('finds the letters across every letters box', () => {
    const keep = [{ kind: 'letters', box: r(10, 10, 20, 5) }, { kind: 'letters', box: r(5, 20, 40, 5) }, { kind: 'face', box: r(0, 0, 99, 99) }]
    expect(lettersBox(keep)).toEqual(r(5, 10, 40, 15))
    expect(lettersBox([])).toBeNull()
  })

  it('scales a letters box about the lettering centre', () => {
    expect(scaleBoxAbout({ x: 10, y: 50, w: 40, h: 20 }, { x: 30, y: 60 }, 0.5)).toEqual({ x: 20, y: 55, w: 20, h: 10 })
  })
})
