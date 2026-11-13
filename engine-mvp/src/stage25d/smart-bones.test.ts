import { describe, expect, it } from 'vitest'
import { bindPuppet } from './bones'
import { childShare, nearJoint, partMesh, smoothstep } from './smart-bones'
import type { Puppet } from './types'

const q = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

/** An upper arm over a forearm, 28 px wide, the elbow at (50, 100) bending across a 14 px band either side. */
const arm = (band?: number): Puppet => ({
  atlas: 'a.png', width: 100, height: 200, facing: 1,
  bones: [
    { name: 'upperarm_n', parent: null, from: [50, 40], to: [50, 100] },
    { name: 'forearm_n', parent: 'upperarm_n', from: [50, 100], to: [50, 170], band },
  ],
  parts: [
    { bone: 'forearm_n', quad: q(36, 100, 64, 170), uv: [0, 0, 0.5, 1] },
    { bone: 'upperarm_n', quad: q(36, 40, 64, 100), uv: [0.5, 0, 1, 1] },
  ],
})

describe('smart bones: a joint with a band bends its parts', () => {
  it('blends smoothly from parent to child across the band', () => {
    expect(smoothstep(0)).toBe(0); expect(smoothstep(1)).toBe(1); expect(smoothstep(0.5)).toBe(0.5)
    expect(childShare([50, 86], [50, 100], [0, 1], 14)).toBe(0)
    expect(childShare([50, 100], [50, 100], [0, 1], 14)).toBe(0.5)
    expect(childShare([50, 114], [50, 100], [0, 1], 14)).toBe(1)
  })

  it('a part no band reaches keeps its four corners', () => {
    const m = partMesh(arm(), arm().parts[0])
    expect(m.points).toHaveLength(4)
  })

  it('a part a band reaches becomes a grid whose points near the joint follow both bones', () => {
    const m = partMesh(arm(14), arm(14).parts[1])   // the upper arm, reached by the elbow's band
    expect(m.points.length).toBeGreaterThan(4)
    const nearElbow = m.weights[m.points.findIndex(([, y]) => y === 100)]
    expect(nearElbow.map((s) => s.bone).sort()).toEqual(['forearm_n', 'upperarm_n'])
    const shoulder = m.weights[0]
    expect(shoulder).toEqual([{ bone: 'upperarm_n', weight: 1 }])
  })

  it('at rest the figure is where it was drawn', () => {
    const bent = bindPuppet(arm(14))
    const v = bent.bend({})
    const points = [arm(14).parts[0], arm(14).parts[1]].flatMap((p) => partMesh(arm(14), p).points.flat())
    v.forEach((n, i) => expect(n).toBeCloseTo(points[i], 6))
  })

  it('the seam between the two parts never opens, at any bend', () => {
    const p = arm(14)
    const fore = partMesh(p, p.parts[0]), upper = partMesh(p, p.parts[1])
    const bent = bindPuppet(p)
    for (const deg of [-120, -90, -45, -10]) {
      const v = bent.bend({ forearm_n: deg })
      const at = (offset: number, i: number) => [v[(offset + i) * 2], v[(offset + i) * 2 + 1]]
      // every point on the shared line y = 100 lands in the same place from both parts
      fore.points.forEach(([x, y], i) => {
        if (y !== 100) return
        const j = upper.points.findIndex(([ux, uy]) => ux === x && uy === 100)
        const [a, b] = [at(0, i), at(fore.points.length, j)]
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(1e-6)
      })
    }
  })

  it('outside the band a part stays rigid: the shoulder does not move when the elbow bends', () => {
    const p = arm(14)
    const fore = partMesh(p, p.parts[0])
    const v = bindPuppet(p).bend({ forearm_n: -90 })
    const shoulder = fore.points.length   // the upper arm's first point, its top-left corner
    expect(v[shoulder * 2]).toBeCloseTo(36, 6); expect(v[shoulder * 2 + 1]).toBeCloseTo(40, 6)
  })
})

describe('a band holds only near its joint', () => {
  it('fades out past the reach', () => {
    expect(nearJoint([50, 100], [50, 100], 20)).toBe(1)
    expect(nearJoint([70, 100], [50, 100], 20)).toBe(1)
    expect(nearJoint([80, 100], [50, 100], 20)).toBe(0)
  })

  it('a wide parent part only bends round the joint, not in a strip across itself', () => {
    const p = arm(14)
    const wide = { ...p, parts: [p.parts[0], { ...p.parts[1], quad: q(0, 40, 100, 100) }], bones: p.bones.map((b) => (b.name === 'forearm_n' ? { ...b, reach: 16 } : b)) }
    const m = partMesh(wide, wide.parts[1])
    const farSide = m.weights[m.points.findIndex(([x, y]) => x === 100 && y === 100)]
    expect(farSide).toEqual([{ bone: 'upperarm_n', weight: 1 }])
  })
})
