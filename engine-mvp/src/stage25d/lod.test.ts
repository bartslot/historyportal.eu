import { describe, expect, it } from 'vitest'
import { LOD_FAR_M, LOD_NEAR_M, lodLow } from './lod'

describe('far vegetation draws its low copy (lodLow)', () => {
  it('goes low past the far edge, back to the painting inside the near edge, and holds its copy in between', () => {
    expect(lodLow(false, LOD_FAR_M - 1)).toBe(false)
    expect(lodLow(false, LOD_FAR_M + 1)).toBe(true)
    const between = (LOD_FAR_M + LOD_NEAR_M) / 2   // a camera rocking round here never flickers between the two
    expect([lodLow(false, between), lodLow(true, between)]).toEqual([false, true])
    expect(lodLow(true, LOD_NEAR_M - 1)).toBe(false)
  })
})
