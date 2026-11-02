import { describe, it, expect, vi } from 'vitest'

// the house view: 2 m wide per metre of distance, to keep the numbers readable
vi.mock('@stage25d/stage25d/layout', () => ({ GROUND_NEAR_M: 2, GROUND_FAR_M: 120, viewWidthAt: (z) => 2 * z }))

const { groundUnderRay, settle, pointForSizeRatio, gridStep, gridPolylines, groundOf, layerOf } = await import('../floor.js')

describe('stage25d ground grid', () => {
  it('a ray down from eye height meets the ground at the right point', () => {
    // eye 1.6 m, looking 45 degrees down and forward: lands 1.6 m away
    const p = groundUnderRay({ origin: [0, 1.6, 0], dir: [0, -Math.SQRT1_2, Math.SQRT1_2] })
    expect(p[0]).toBeCloseTo(0)
    expect(p[1]).toBeCloseTo(1.6)
  })

  it('a ray above the horizon meets no ground: the picture stays put', () => {
    expect(groundUnderRay({ origin: [0, 1.6, 0], dir: [0, 0.2, 0.98] })).toBeNull()
  })

  it('snaps to quarter steps of the grid at that distance and stays on the ground', () => {
    expect(settle([3.1, 5.12])).toEqual([3, 5])          // 1 m grid up close: quarter metre
    expect(settle([3.1, 20.3])).toEqual([2.5, 20])      // 5 m grid in the middle: 1.25 m steps
    expect(settle([999, 5])[0]).toBe(80)                 // never off the ground
    expect(settle([0, 0])[1]).toBe(2)
  })

  it('turns a layer x (share of the view at its distance) into metres and back', () => {
    expect(groundOf(0.75, 10)).toEqual([5, 10])
    expect(layerOf([5, 10])).toEqual({ x: 0.75, z: 10 })
  })

  it('a bigger picture is a nearer one, counted from where the camera stands, in the same column', () => {
    const [gx, gz] = pointForSizeRatio([4, 20], 2)
    expect(gz).toBeCloseTo(10)
    expect(gx / gz).toBeCloseTo(4 / 20)
    const [mx, mz] = pointForSizeRatio([4, 20], 2, [1, 4])   // camera trucked 4 m in, 1 m right
    expect(mz).toBeCloseTo(12)                               // 16 m away -> 8 m away
    expect((mx - 1) / (mz - 4)).toBeCloseTo(3 / 16)
    expect(pointForSizeRatio([4, 20], 1000)[1]).toBe(2)      // stops at the near edge
  })

  it('draws grid lines on the ground, coarser the further away', () => {
    expect([5, 20, 100].map(gridStep)).toEqual([1, 5, 20])
    const lines = gridPolylines()
    expect(lines.length).toBeGreaterThan(10)
    expect(lines.every((l) => l.every(([, y]) => y === 0))).toBe(true)
  })
})
