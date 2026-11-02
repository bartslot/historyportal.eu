import { describe, it, expect, vi } from 'vitest'

// the house view: 2 m wide per metre of distance, to keep the numbers readable
vi.mock('@stage25d/stage25d/layout', () => ({ GROUND_NEAR_M: 2, GROUND_FAR_M: 120, viewWidthAt: (z) => 2 * z }))

const { groundUnderRay, settle, pointForSizeRatio, gridStep, gridPieces, groundOf, layerOf } = await import('../floor.js')

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

  it('walks a ray onto ground that rises with distance', () => {
    // ground flat to 20 m, then rising 0.1 m per metre; a ray from eye height dropping 1 m per 20 m
    const rise = (z) => Math.max(0, (z - 20) * 0.1)
    const [, z] = groundUnderRay({ origin: [0, 1.6, 0], dir: [0, -0.05, 1] }, rise)
    expect(1.6 - 0.05 * z).toBeCloseTo(rise(z), 3)   // on the ground there, not on the flat floor (32 m)
    expect(z).toBeLessThan(32)
  })

  it('finds the ground for feet higher than the eye, from below', () => {
    // feet 3 m up (above the 1.6 m eye), pointer ray rising 1 m per 20 m: meets that height 28 m out
    const [, z] = groundUnderRay({ origin: [0, 1.6, 0], dir: [0, 0.05, 1] }, () => 3)
    expect(z).toBeCloseTo(28, 2)
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

  it('draws a few grid lines on the ground, coarser the further away, in pieces by distance', () => {
    expect([5, 20, 100].map(gridStep)).toEqual([1, 5, 20])
    const pieces = gridPieces()
    // rows every 2 m up close, every 10 m in the middle, every 40 m far out: each row once
    expect(pieces.map((p) => p.z)).toEqual([2, 4, 6, 8, 10, 12, 20, 30, 40, 80, 120])
    for (const { z, lines } of pieces) {
      const rows = lines.filter((l) => l[0][0] !== l[l.length - 1][0])
      expect(rows.length).toBe(1)                                   // its own far row, never the one before it
      expect(rows[0].every(([, rz]) => rz === z)).toBe(true)
      expect(lines.every((l) => l.every(([, lz]) => lz <= z))).toBe(true)   // nothing beyond its row
    }
    // the lines running away are sampled every metre, so the stage can bend them onto rising ground
    const across = pieces.find((p) => p.z === 30).lines.find((l) => l[0][0] === l[l.length - 1][0])
    expect(across.map(([, z]) => z)).toContain(22)
  })
})
