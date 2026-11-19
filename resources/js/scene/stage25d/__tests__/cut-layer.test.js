import { describe, it, expect } from 'vitest'
import { layerOverCut, Z_FAR_MAX } from '../cut-layer.js'
import { placeLayer, HOUSE } from '@stage25d/stage25d/layout'

const eye = { x: HOUSE.x, y: HOUSE.y, z: HOUSE.z }
/** Where a world point lands on the camera's picture plane (scaling along a ray from the eye keeps it). */
const seen = (p) => [(p.x - eye.x) / (p.z - eye.z), (p.y - eye.y) / (p.z - eye.z)]
/** The cut-out as the stage's library row has it (Cutouts::stageRow). */
const cutAsset = (heightM) => ({ id: 'cut-1', layer: 'mid', tags: ['cutout'], file: '', w: 200, h: 100, anchor: [0.5, 1], height_m: heightM })

/** The new layer placed by the stage's own placeLayer: its foot and top in the world. */
const placed = (fields, order, land, heightM = 2) => {
  const p = placeLayer(cutAsset(heightM), { depth: fields.depth, x: fields.x, y: fields.y, z: fields.z, scale: fields.height_m / heightM, rotation: fields.rotation }, order, land, land)
  return { foot: { x: p.x, y: p.y, z: p.z }, top: { x: p.x, y: p.y + p.h, z: p.z } }
}

describe('layerOverCut', () => {
  it('a cut off a far strip: from the camera the new layer covers the very same spot, one step nearer', () => {
    const bottom = { x: 6.2, y: 3.1, z: 70 }, top = { x: 6.2, y: 7.4, z: 70 }
    const fields = layerOverCut({ bottom, top, eye, depth: 'bg', order: 3, land: 2.5 })
    const { foot, top: head } = placed(fields, 3, 2.5)
    expect(foot.z).toBeLessThan(70)
    expect(foot.z).toBeGreaterThan(69.9)
    for (const [a, b] of [[seen(foot), seen(bottom)], [seen(head), seen(top)]]) {
      expect(a[0]).toBeCloseTo(b[0], 5)
      expect(a[1]).toBeCloseTo(b[1], 5)
    }
  })

  it('a cut off the backdrop 380 m away stands at the farthest a layer may, scaled about the eye: no jump on screen', () => {
    const bottom = { x: -40, y: 20, z: 380 }, top = { x: -40, y: 52, z: 380 }
    const fields = layerOverCut({ bottom, top, eye, depth: 'sky', order: 0 })
    expect(fields.z).toBeLessThanOrEqual(Z_FAR_MAX)
    const { foot, top: head } = placed(fields, 0, 0)
    expect(seen(foot)[0]).toBeCloseTo(seen(bottom)[0], 5)
    expect(seen(foot)[1]).toBeCloseTo(seen(bottom)[1], 5)
    expect(seen(head)[1]).toBeCloseTo(seen(top)[1], 5)
  })

  it('keeps a turned picture turned, its height measured along the turn', () => {
    const bottom = { x: 0, y: 0, z: 22 }, top = { x: 3, y: 4, z: 22 }
    const fields = layerOverCut({ bottom, top, eye, depth: 'mid', order: 0, rotation: 36.87 })
    expect(fields.rotation).toBe(36.87)
    expect(fields.height_m).toBeCloseTo(5 * ((22 - 0.05) / 22), 3)
  })

  it('says null for a cut it cannot place: no height, or behind the eye', () => {
    expect(layerOverCut({ bottom: { x: 0, y: 0, z: 10 }, top: { x: 0, y: 0, z: 10 }, eye, depth: 'mid', order: 0 })).toBeNull()
    expect(layerOverCut({ bottom: { x: 0, y: 0, z: -1 }, top: { x: 0, y: 1, z: -1 }, eye, depth: 'mid', order: 0 })).toBeNull()
  })
})
