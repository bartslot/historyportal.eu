import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveFloors, placeItem, screenHeight, stackOrder } from '../projection.js'

// The Blender pilot scene (tools/diorama/test_quay.py → public/diorama/test-quay).
const dir = resolve(__dirname, '../../../../../public/diorama/test-quay')
const read = name => JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8'))
const spec = read('scene')
const assets = read('assets')
const truth = read('truth')

const floors = resolveFloors(spec)
const placed = Object.fromEntries(spec.items.map(item => [item.id, {
  id: item.id,
  ...placeItem(spec.camera, floors, item, assets[item.asset].px_per_m),
  heightPx: screenHeight(spec.camera, assets[item.asset].height_m, placeItem(spec.camera, floors, item, 1).depth),
}]))

describe('test quay: the JSON + cut-outs land where Blender rendered them', () => {
  for (const [id, t] of Object.entries(truth)) {
    it(`${id}: bottom centre and top within half a pixel`, () => {
      const p = placed[id]
      expect(Math.abs(p.u - t.feet_px[0])).toBeLessThan(0.5)
      expect(Math.abs(p.v - t.feet_px[1])).toBeLessThan(0.5)
      expect(Math.abs((p.v - p.heightPx) - t.top_px[1])).toBeLessThan(0.5)
    })

    it(`${id}: the cut-out, scaled by px_per_m, is exactly as tall as in the render`, () => {
      const asset = assets[spec.items.find(i => i.id === id).asset]
      const drawnPx = asset.height_m * asset.px_per_m * placed[id].scale   // source px of the thing × display scale
      expect(drawnPx).toBeCloseTo(t.feet_px[1] - t.top_px[1], 1)
    })
  }
})

describe('stackOrder', () => {
  it('test quay: plate, wall, barrel (behind the rail), rail, sailor (in front of it)', () => {
    const order = stackOrder(spec, Object.values(placed)).map(e => e.id)
    expect(order).toEqual(['plate', 'wall', 'barrel_1', 'rail', 'sailor_1'])
  })

  it('a sailor inside the doorway (within the wall thickness) is behind the wall, framed by it', () => {
    const order = stackOrder(spec, [{ id: 'in_door', depth: 14.2, v: 700 }]).map(e => e.id)
    expect(order).toEqual(['plate', 'in_door', 'wall', 'rail'])
  })

  it('an item exactly at an occluder\'s front face stands in front of it', () => {
    const order = stackOrder(spec, [{ id: 'at_rail', depth: 6.0, v: 900 }]).map(e => e.id)
    expect(order.indexOf('at_rail')).toBeGreaterThan(order.indexOf('rail'))
  })
})
