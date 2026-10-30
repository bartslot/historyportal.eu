import { describe, expect, it } from 'vitest'
import { BAND_Z, bandAssets, groundBandsFor } from './bands'
import type { Library, Scene } from './types'

const LIB: Library = {
  bundle: 't',
  assets: [
    { id: 'tile-01', layer: 'ground', tags: ['ground', 'grass'], qa: { score: 9 } },
    { id: 'meadow-band-01', layer: 'mid', tags: ['meadow', 'field', 'ground'], w: 1536, h: 599, qa: { score: 8 } },
    { id: 'grass-tall-01', layer: 'fg', tags: ['grass', 'ground'], w: 800, h: 1200, qa: { score: 9 } },
    { id: 'hut-01', layer: 'mid', tags: ['hut'], qa: { score: 8 } },
  ],
}
const scene = (extra: Partial<Scene> = {}): Scene => ({
  id: 's', beat: 'setup', narration: 'x', camera: null, sound: null,
  set: { layers: [{ asset: 'hut-01', depth: 'mid', x: 0.5 }] }, ...extra,
})

describe('ground bands', () => {
  it('picks a strip tagged ground, never the floor tile', () => {
    expect(bandAssets(LIB).map((a) => a.id)).toEqual(['meadow-band-01'])
    expect(bandAssets({ bundle: 't', assets: [LIB.assets[0]] })).toEqual([])
  })
  it('proposes a far band behind the middle plane and a near one, for a dry scene', () => {
    expect(groundBandsFor(scene(), LIB)).toEqual([{ asset: 'meadow-band-01', z: BAND_Z.far }, { asset: 'meadow-band-01', z: BAND_Z.near }])
  })
  it('uses two different strips when the library has them: the better one near, the other far', () => {
    const lib = { ...LIB, assets: [...LIB.assets, { id: 'heath-band-01', layer: 'mid', tags: ['heath', 'ground'], w: 1500, h: 570, qa: { score: 9 } }] }
    expect(groundBandsFor(scene(), lib)).toEqual([{ asset: 'meadow-band-01', z: BAND_Z.far }, { asset: 'heath-band-01', z: BAND_Z.near }])
  })
  it('gives reeds by a farm the bands, open water not', () => {
    expect(groundBandsFor(scene({ set: { habitat: 'wet', layers: [{ need: 'reed', depth: 'mid' }] } }), LIB)).toBeDefined()
  })
  it('does not read a reed bed tagged water as open water', () => {
    const lib = { ...LIB, assets: [...LIB.assets, { id: 'reeds-01', layer: 'fg', tags: ['reeds', 'water', 'marsh', 'wet'], w: 500, h: 400 }] }
    const s = scene({ set: { layers: [{ asset: 'hut-01', depth: 'mid' }, { asset: 'reeds-01', depth: 'fg' }] } })
    expect(groundBandsFor(s, lib)).toEqual([{ asset: 'meadow-band-01', z: BAND_Z.far }])
  })
  it('gives a scene with a fg layer the far band only', () => {
    const s = scene({ set: { layers: [{ asset: 'hut-01', depth: 'mid' }, { asset: 'hut-01', depth: 'fg' }] } })
    expect(groundBandsFor(s, LIB)).toEqual([{ asset: 'meadow-band-01', z: BAND_Z.far }])
  })
  it('keeps the floor indoors, by water, with own bands, or when opted out', () => {
    expect(groundBandsFor(scene({ set: { habitat: 'interior', layers: [] } }), LIB)).toBeUndefined()
    expect(groundBandsFor(scene({ set: { habitat: 'wet', ground: 'river sand', layers: [] } }), LIB)).toBeUndefined()
    expect(groundBandsFor(scene({ set: { layers: [], groundBands: [{ asset: 'x', z: 5 }] } }), LIB)).toBeUndefined()
    expect(groundBandsFor(scene({ bands: false }), LIB)).toBeUndefined()
  })
})
