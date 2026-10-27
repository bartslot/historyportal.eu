import { describe, expect, it } from 'vitest'
import { cameraAt, DEPTH_Z, HOUSE, layerAt, motionOf, placeLayer, viewWidthAt } from './layout'
import type { Asset } from './types'

const tree: Asset = { id: 't', layer: 'fg', tags: [], file: '', w: 1000, h: 2000, anchor: [0.5, 1], height_m: 10, motion: 'sway' }
const hills: Asset = { ...tree, layer: 'bg', w: 4000, h: 1000, height_m: 40, tileable_x: true, motion: 'none' }

describe('placeLayer', () => {
  it('scales by height_m and keeps the image aspect', () => {
    const p = placeLayer(tree, { depth: 'fg', x: 0.5, scale: 1.5 }, 0)
    expect(p.h).toBe(15)
    expect(p.w).toBe(7.5)
    expect(p.y).toBe(0) // anchor on the ground
  })
  it('maps x 0..1 across the house view at that depth', () => {
    const p = placeLayer(tree, { depth: 'mid', x: 1 }, 0)
    expect(p.x).toBeCloseTo(viewWidthAt(DEPTH_Z.mid) / 2)
  })
  it('stretches tileable strips past the view and repeats the texture', () => {
    const p = placeLayer(hills, { depth: 'bg' }, 0)
    expect(p.w).toBeGreaterThan(viewWidthAt(DEPTH_Z.bg))
    expect(p.uRepeat).toBeCloseTo(p.w / 160)
  })
  it('draws nearer depths later, and later layers at one depth later and nearer', () => {
    const a = placeLayer(tree, { depth: 'mid' }, 0), b = placeLayer(tree, { depth: 'mid' }, 1), c = placeLayer(tree, { depth: 'fg' }, 0)
    expect(b.alphaIndex).toBeGreaterThan(a.alphaIndex)
    expect(c.alphaIndex).toBeGreaterThan(b.alphaIndex)
    expect(b.z).toBeLessThan(a.z)
  })
})

describe('cameraAt', () => {
  const move = { move: 'truck', from: { x: -2, y: 1.6, z: 0, fov: 50 }, to: { x: 2, y: 1.6, z: 0, fov: 40 }, ease: 'inOut' as const, dur_s: 10 }
  it('holds the house pose without a move', () => expect(cameraAt(null, 3, 8)).toEqual(HOUSE))
  it('starts at from, ends at to, eases in-out', () => {
    expect(cameraAt(move, 0, 10).x).toBe(-2)
    expect(cameraAt(move, 10, 10).x).toBe(2)
    expect(cameraAt(move, 5, 10).x).toBeCloseTo(0)
    expect(cameraAt(move, 1, 10).x).toBeLessThan(-2 + 0.4) // slow start
  })
  it('reads fov in degrees', () => expect(cameraAt(move, 10, 10).fov).toBeCloseTo((40 * Math.PI) / 180))
})

describe('layerAt', () => {
  it('returns the layer values without keys', () => expect(layerAt({ depth: 'fg', x: 0.2 }, 3)).toEqual({ x: 0.2, scale: 1, opacity: 1 }))
  it('interpolates keyed fields only', () => {
    const l = { depth: 'fg' as const, x: 0.2, keys: [{ t: 0, x: 0 }, { t: 4, x: 1 }] }
    const mid = layerAt(l, 2)
    expect(mid.x).toBeCloseTo(0.5)
    expect([mid.scale, mid.opacity]).toEqual([1, 1])
    expect(layerAt(l, 9).x).toBe(1)
  })
})

describe('motionOf', () => {
  it('uses the asset motion unless the layer overrides it', () => {
    expect(motionOf(tree, { depth: 'fg' })).toEqual({ kind: 'sway', amount: 1, speed: 1 })
    expect(motionOf(tree, { depth: 'fg', motion: 'none' }).kind).toBe('none')
    expect(motionOf(tree, { depth: 'fg', motion: { amount: 2 } })).toEqual({ kind: 'sway', amount: 2, speed: 1 })
  })
})
