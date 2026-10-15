import { describe, it, expect } from 'vitest'
import { FIT, FIT_START, collisions, nextFit, bandHeight, barShift, overlaps, scaleBoxAbout } from '../title-fit.js'

const r = (x, y, w, h) => ({ x, y, w, h })

describe('what overlaps on the title screen', () => {
  it('finds two pieces of different groups and a piece on a face', () => {
    const pieces = [{ group: 'meta', rect: r(0, 0, 50, 10) }, { group: 'cta', rect: r(40, 5, 50, 10) }, { group: 'qr', rect: r(500, 500, 10, 10) }]
    const keep = [{ kind: 'face', rect: r(505, 505, 20, 20) }, { kind: 'figure', rect: r(0, 0, 999, 999) }]
    expect(collisions(pieces, keep)).toEqual([{ a: 'meta', b: 'cta' }, { a: 'qr', b: 'face' }])
  })

  it('lets the subtitle sit on the letters and pieces of one row touch', () => {
    const pieces = [{ group: 'subtitle', rect: r(0, 0, 50, 10) }, { group: 'meta', rect: r(0, 20, 10, 10) }, { group: 'meta', rect: r(5, 20, 10, 10) }]
    expect(collisions(pieces, [{ kind: 'letters', rect: r(0, 0, 50, 10) }])).toEqual([])
  })

  it('ignores a hairline touch', () => {
    expect(overlaps(r(0, 0, 10, 10), r(9.5, 0, 10, 10))).toBe(false)
  })
})

describe('how the title screen gives way', () => {
  const ctx = { strip: true }
  it('moves the lines to the strip first, then badges icon-only, then the meta row, then shrinks', () => {
    const hits = [{ a: 'lines', b: 'face' }, { a: 'badges', b: 'letters' }, { a: 'meta', b: 'letters' }]
    const one = nextFit(FIT_START, hits, ctx)
    expect(one).toMatchObject({ linesInStrip: true, badgesCompact: false })
    const two = nextFit(one, hits, ctx)
    expect(two).toMatchObject({ badgesCompact: true, metaInStrip: false })
    const three = nextFit(two, hits, ctx)
    expect(three).toMatchObject({ metaInStrip: true, shrink: 0 })
    expect(nextFit(three, hits, ctx).shrink).toBe(1)
  })

  it('skips a step that does not touch what overlaps', () => {
    expect(nextFit(FIT_START, [{ a: 'cta', b: 'face' }], ctx)).toEqual({ ...FIT_START, shrink: 1 })
  })

  it('has no strip to use without a comic candidate', () => {
    expect(nextFit(FIT_START, [{ a: 'meta', b: 'logo' }], { strip: false })).toMatchObject({ metaInStrip: false, shrink: 1 })
  })

  it('stops when nothing overlaps, and when it has no step left', () => {
    expect(nextFit(FIT_START, [], ctx)).toBeNull()
    expect(nextFit({ ...FIT_START, linesInStrip: true, badgesCompact: true, metaInStrip: true, shrink: FIT.maxShrink }, [{ a: 'cta', b: 'face' }], ctx)).toBeNull()
  })
})

describe('a painted candidate', () => {
  const ctx = { strip: true, painted: true, badges: true }
  const walk = (hits) => {
    const steps = []
    for (let fit = FIT_START; (fit = nextFit(fit, hits, ctx));) steps.push(fit)
    return steps
  }

  it('gives way with its chrome first: QR down to 72, badges turned, QR hidden, then the lettering', () => {
    const steps = walk([{ a: 'cta', b: 'language' }])
    expect(steps.map(f => [f.qrStep, f.badgesFlip, f.qrHidden, f.shrink])).toEqual([
      [1, false, false, 0], [2, false, false, 0], [3, false, false, 0],
      [3, true, false, 0], [3, true, true, 0],
      ...Array.from({ length: FIT.maxShrink }, (_, i) => [3, true, true, i + 1]),
    ])
    expect(FIT.qrSteps.slice(1)).toEqual([96, 84, 72])
  })

  it('leaves the chrome alone when only the lettering is in the way', () => {
    expect(nextFit(FIT_START, [{ a: 'subtitle', b: 'face' }], ctx)).toEqual({ ...FIT_START, shrink: 1 })
  })

  it('scales a letters box about the lettering centre', () => {
    expect(scaleBoxAbout({ x: 10, y: 50, w: 40, h: 20 }, { x: 30, y: 60 }, 0.5)).toEqual({ x: 20, y: 55, w: 20, h: 10 })
  })
})

describe('the band the picture leaves the title bar', () => {
  it('is nothing at step 0, the bar at step 1, a share of the screen more per step', () => {
    expect(bandHeight(0, 700, 900)).toBe(0)
    expect(bandHeight(1, 700, 900)).toBe(200 + FIT.gap)
    expect(bandHeight(3, 700, 900)).toBeCloseTo(200 + FIT.gap + 2 * FIT.band * 900)
  })
})

describe('the title bar sliding along the bottom', () => {
  it('stays put when nothing is in the way', () => {
    expect(barShift(r(600, 800, 200, 50), [r(0, 0, 100, 100)], 1440)).toBe(0)
  })

  it('goes to the nearest free place', () => {
    const face = r(650, 780, 100, 100)
    const dx = barShift(r(600, 800, 200, 50), [face], 1440)
    expect(overlaps({ ...r(600 + dx, 800, 200, 50) }, face)).toBe(false)
    expect(Math.abs(dx)).toBeLessThanOrEqual(260)
  })

  it('stays put when no place is free', () => {
    expect(barShift(r(600, 800, 200, 50), [r(0, 790, 1440, 70)], 1440)).toBe(0)
  })
})
