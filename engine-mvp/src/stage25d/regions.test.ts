import { describe, expect, it } from 'vitest'
import { flatRegions } from './layer'

/** A 12 x 4 drawing: cream on the left, red on the right, a dark line between and a soft rim beside it, air at the end. */
function strip(): Uint8ClampedArray {
  const px = [
    [250, 230, 180, 255], [250, 230, 180, 255], [250, 230, 180, 255], [160, 140, 110, 255],   // cream, cream, cream, rim
    [30, 25, 20, 255], [30, 25, 20, 255], [130, 60, 40, 255],                                 // line, line, rim
    [220, 90, 60, 255], [220, 90, 60, 255], [220, 90, 60, 255], [0, 0, 0, 0], [0, 0, 0, 0],   // red, red, red, air, air
  ]
  const d = new Uint8ClampedArray(12 * 4 * 4)
  for (let y = 0; y < 4; y++) px.forEach((c, x) => d.set(c, (y * 12 + x) * 4))
  return d
}

describe('a flat figure\'s colour regions', () => {
  it('every line px and its soft rim take the colour of the fill beside them; the air stays air', () => {
    const out = flatRegions(strip(), 12, 4)
    const at = (x: number) => [...out.slice((12 + x) * 4, (12 + x) * 4 + 4)]
    for (const x of [3, 4]) expect(at(x)).toEqual([250, 230, 180, 255])
    for (const x of [5, 6]) expect(at(x)).toEqual([220, 90, 60, 255])
    expect(at(10)).toEqual([0, 0, 0, 0])
    expect(at(0)).toEqual([250, 230, 180, 255])
  })
})
