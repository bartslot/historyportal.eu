import { describe, expect, it } from 'vitest'
import { uvsUnder } from './pick'

// two quads of a figure, the second over the first's right half
const quad = (x0: number, x1: number, u0: number) => ({
  positions: [x0, 0, 0, x1, 0, 0, x1, 1, 0, x0, 1, 0],
  uvs: [u0, 1, u0 + 0.1, 1, u0 + 0.1, 0, u0, 0],
})
const a = quad(0, 2, 0), b = quad(1, 3, 0.5)
const positions = [...a.positions, ...b.positions]
const uvs = [...a.uvs, ...b.uvs]
const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]

describe('uvsUnder', () => {
  it('reports every overlapping part under a point, not only the nearest', () => {
    const under = uvsUnder(positions, uvs, indices, 1.5, 0.25)
    expect(under.some(([u]) => u < 0.2)).toBe(true)
    expect(under.some(([u]) => u >= 0.5)).toBe(true)
  })

  it('reads the uv of the point on the part', () => {
    const [[u, v]] = uvsUnder(positions, uvs, indices, 0.5, 0.25)
    expect(u).toBeCloseTo(0.025)
    expect(v).toBeCloseTo(0.75)
  })

  it('reports nothing beside every part', () => {
    expect(uvsUnder(positions, uvs, indices, 4, 0.5)).toEqual([])
  })
})
