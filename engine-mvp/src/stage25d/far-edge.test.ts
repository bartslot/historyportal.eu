import { describe, expect, it } from 'vitest'
import { farEdgeOf, farEdgeOptions, farPieceScale, farPieceShare } from './far-edge'
import { ASPECT, BAND_VIEWS } from './layout'
import type { Asset, Library } from './types'

const asset = (id: string, layer: Asset['layer'], tags: string[], extra: Partial<Asset> = {}): Asset =>
  ({ id, layer, tags, file: `${id}.webp`, w: 1440, h: 100, anchor: [0.5, 1], height_m: 10, tileable_x: true, ...extra })
const lib: Library = { version: 1, bundle: 'test', assets: [
  asset('far-treeline-01', 'mid', ['far', 'horizon', 'trees', 'woodland']),
  asset('far-palms-01', 'mid', ['far', 'horizon', 'palm', 'dry']),
  asset('horizon-meadow-01', 'mid', ['far', 'horizon', 'meadow']),
  asset('terrain-meadow-02', 'ground', ['meadow'], { horizon: 'horizon-meadow-01' }),
  asset('tree-birch-01', 'mid', ['trees', 'birch'], { tileable_x: false }),
  asset('date-palm-01', 'mid', ['palm', 'dry'], { tileable_x: false }),
  asset('bg-farmland-01', 'bg', ['village']),
] }

describe('the far edge of a scene with nothing on its horizon', () => {
  it('takes the far piece that matches the scene: trees by a birch, palms by a palm', () => {
    expect(farEdgeOf({ layers: [{ asset: 'tree-birch-01', depth: 'fg' }] }, lib)).toBe('far-treeline-01')
    expect(farEdgeOf({ layers: [{ asset: 'date-palm-01', depth: 'fg' }] }, lib)).toBe('far-palms-01')
  })

  it('a tag matches its plural: a tree by trees', () => {
    const plural: Library = { ...lib, assets: [...lib.assets, asset('oak-01', 'mid', ['tree'], { tileable_x: false })] }
    expect(farEdgeOf({ layers: [{ asset: 'oak-01', depth: 'fg' }] }, plural)).toBe('far-treeline-01')
  })

  it('always gives something, the same every time, when nothing matches', () => {
    expect(farEdgeOf({ layers: [] }, lib)).toBe('far-palms-01')
  })

  it('leaves a scene alone whose far landscape is already there', () => {
    expect(farEdgeOf({ layers: [{ asset: 'bg-farmland-01', depth: 'bg' }] }, lib)).toBeNull()
  })

  it('stands behind a terrain\'s own far edge too: that edge is only the ground meeting the sky', () => {
    expect(farEdgeOf({ layers: [], groundSlots: [{ asset: 'terrain-meadow-02', from_m: 0 }] }, lib)).toBe('far-palms-01')
  })

  it('the teacher can name another piece or none', () => {
    expect(farEdgeOf({ layers: [], farEdge: 'far-treeline-01' }, lib)).toBe('far-treeline-01')
    expect(farEdgeOf({ layers: [], farEdge: 'none' }, lib)).toBeNull()
    expect(farEdgeOf({ layers: [], farEdge: 'gone-01' }, lib)).toBeNull()
  })

  it('a far piece looks far: a hill an eighth of the frame at most, scrub a sliver, never blown up past the view', () => {
    expect(farPieceShare(35)).toBeCloseTo(0.117, 2)
    expect(farPieceShare(5)).toBe(0.02)
    expect(farPieceShare(400)).toBe(0.12)
    const hills = { w: 4096, h: 495, height_m: 35 }
    const k = farPieceScale(hills)
    const copyViews = k * BAND_VIEWS                       // one copy's width, in views
    expect((copyViews * hills.h / hills.w) * ASPECT).toBeCloseTo(farPieceShare(35), 3)   // its height, in frames
    expect(copyViews * 1920).toBeLessThan(hills.w)          // drawn smaller than its pixels: sharp
  })

  it('offers only free far pieces, never a terrain\'s own edge', () => {
    expect(farEdgeOptions(lib)).toEqual(['far-palms-01', 'far-treeline-01'])
  })
})
