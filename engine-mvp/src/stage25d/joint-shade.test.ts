import { describe, expect, it } from 'vitest'
import { jointShade, JOINT_REACH_PX } from './joint-shade'
import type { Puppet } from './types'

// two parts side by side at rest: a "chest" 0..40 and an "arm" 40..80 (puppet px = atlas px), all shaded 200
function figure() {
  const aw = 80, ah = 10
  const atlas = new Uint8ClampedArray(aw * ah * 4), shade = new Uint8ClampedArray(aw * ah * 4)
  for (let i = 0; i < aw * ah; i++) { atlas[i * 4 + 3] = 255; shade[i * 4] = 200; shade[i * 4 + 1] = 7 }
  const puppet = { atlas: '', width: 80, height: 10, bones: [], parts: [
    { bone: 'chest', quad: [[0, 0], [40, 0], [40, 10], [0, 10]], uv: [0, 0, 0.5, 1] },
    { bone: 'upperarm_n', quad: [[40, 0], [80, 0], [80, 10], [40, 10]], uv: [0.5, 0, 1, 1] },
  ] } as unknown as Puppet
  return { aw, ah, atlas, shade, puppet }
}

describe('jointShade', () => {
  it('fades the shade out toward the cut between two parts, keeps it far from it and on the silhouette', () => {
    const { aw, ah, atlas, shade, puppet } = figure()
    jointShade(shade, atlas, aw, ah, puppet)
    const r = (x: number) => shade[(5 * aw + x) * 4]
    expect(r(39)).toBe(0)                     // at the cut
    expect(r(40)).toBe(0)
    expect(r(39 - JOINT_REACH_PX + 1)).toBe(0)    // none across the band's width
    expect(r(16)).toBeGreaterThan(0)              // fading back in
    expect(r(16)).toBeLessThan(200)
    expect(r(0)).toBe(200)                       // the silhouette keeps its shade
    expect(shade[(5 * aw + 39) * 4 + 1]).toBe(7)   // eyes and face channels stay
  })

  it('takes the shade off what a part hides under another at rest', () => {
    const { aw, ah, atlas, shade, puppet } = figure()
    // the arm drawn first and its tile 5 px further left: the chest, drawn after it, hides those 5 px at rest
    puppet.parts.reverse()
    puppet.parts[0] = { ...puppet.parts[0], quad: [[35, 0], [75, 0], [75, 10], [35, 10]] }
    jointShade(shade, atlas, aw, ah, puppet)
    // the arm's first atlas columns land on puppet x 35..39, under the chest: no shade
    expect(shade[(5 * aw + 41) * 4]).toBe(0)
  })
})
