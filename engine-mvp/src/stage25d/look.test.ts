import { describe, expect, it } from 'vitest'
import { DEPTHS, lineOf, lineKeys, LOOK_RANGE, pxPerMetre, pxUV, STAGE_SHEET } from './look'
import { GROUND_SLOT, placeLayer } from './layout'
import type { Asset } from './types'

describe('look: line by depth', () => {
  it('reads defaults per depth, far lighter and hazier than near', () => {
    const far = lineOf({}, 'bg'), near = lineOf({}, 'fg')
    expect(far.fade).toBeGreaterThan(near.fade)
    expect(far.haze).toBeGreaterThan(near.haze)
    expect(far.brown).toBe(STAGE_SHEET.lineBrown)
  })
  it('a teacher value wins; a junk value falls back to the default', () => {
    expect(lineOf({ lineFadeMid: 0.9, lineBrown: 0 }, 'mid')).toMatchObject({ fade: 0.9, brown: 0 })
    expect(lineOf({ hazeBg: 'x' }, 'bg').haze).toBe(STAGE_SHEET.hazeBg)
  })
  it('every value has a default and a slider range (house rule: every value a slider)', () => {
    for (const d of DEPTHS) for (const k of Object.values(lineKeys(d))) { expect(STAGE_SHEET[k]).toBeTypeOf('number'); expect(LOOK_RANGE[k]).toHaveLength(3) }
    for (const k of Object.keys(STAGE_SHEET)) expect(LOOK_RANGE[k][0]).toBeLessThanOrEqual(STAGE_SHEET[k])
  })
})

describe('look: screen px maths', () => {
  it('px per metre halves at twice the distance', () => {
    const fov = (50 * Math.PI) / 180
    expect(pxPerMetre(1080, 20, fov)).toBeCloseTo(2 * pxPerMetre(1080, 40, fov))
    expect(pxPerMetre(1080, 1, fov)).toBeCloseTo(1080 / (2 * Math.tan(fov / 2)))
  })
  it('uv per px is per 1080p px at any render size, and counts the repeats across u', () => {
    const [u, v] = pxUV(10, 5, 1, 100, 1080)          // a 10 x 5 m plane at 100 px/m = 1000 x 500 px
    expect(u).toBeCloseTo(1 / 1000); expect(v).toBeCloseTo(1 / 500)
    const [u2, v2] = pxUV(10, 5, 1, 200, 2160)        // the same plane on a 4K render: same uv per 1080p px
    expect(u2).toBeCloseTo(u); expect(v2).toBeCloseTo(v)
    expect(pxUV(10, 5, 3, 100, 1080)[0]).toBeCloseTo(3 / 1000)
  })
})

describe('ground draw slot', () => {
  it('the floor draws after every sky layer and before the far landscape', () => {
    const a: Asset = { id: 'a', layer: 'prop', tags: [], file: '', w: 100, h: 100, anchor: [0.5, 1], height_m: 2, motion: 'none' }
    expect(placeLayer({ ...a, layer: 'sky' }, { depth: 'sky' }, 0).alphaIndex).toBeLessThan(GROUND_SLOT)
    expect(placeLayer(a, { depth: 'sky' }, 40).alphaIndex).toBeLessThan(GROUND_SLOT)   // even the 40th cloud
    expect(placeLayer({ ...a, layer: 'bg' }, { depth: 'bg' }, 0).alphaIndex - 1).toBeGreaterThan(GROUND_SLOT) // and a stain before it
  })
})
