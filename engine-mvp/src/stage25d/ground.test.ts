import { describe, expect, it } from 'vitest'
import { bandAt, bandColour, BG_FEATHER, bottomColour, featherOf, groundOptions, defaultNear, hexRgb, inkLevel, landTop, nearOptions, skylineRow, PAPER, resolveGround, rowBands, SKY_BANDS, stainSize, groundSlots, GROUND_SLOTS_MAX, slotAt, grainOctave } from './ground'
import { libraryUrlFor } from './library'
import type { Asset, Library } from './types'

const a = (id: string, layer: Asset['layer'], tags: string[]): Asset => ({ id, layer, tags, file: `${id}.webp`, w: 100, h: 100, anchor: [0.5, 1], height_m: 10 })
const lib = (assets: Asset[], paper?: string): Library => ({ version: 1, bundle: 't', assets, ...(paper ? { paper } : {}) })

describe('resolveGround', () => {
  const grounds = [a('ground-heath-01', 'ground', ['ground', 'heath', 'sand']), a('ground-field-01', 'ground', ['ground', 'field']), a('heath-far', 'bg', ['heath'])]
  it('takes a ground asset by id or tags, never a bg strip with the same tag', () => {
    expect(resolveGround({ ground: 'ground-field-01', layers: [] }, lib(grounds))).toMatchObject({ kind: 'asset', asset: { id: 'ground-field-01' } })
    expect(resolveGround({ ground: 'heath', layers: [] }, lib(grounds))).toMatchObject({ kind: 'asset', asset: { id: 'ground-heath-01' } })
  })
  it('without a choice uses the bundle\'s first ground (deterministic)', () => {
    expect(resolveGround({ layers: [] }, lib(grounds))).toMatchObject({ kind: 'asset', asset: { id: 'ground-field-01' } })
  })
  it('falls back to the bundle paper, never a flat colour of its own, and says why when a choice misses', () => {
    expect(resolveGround({ layers: [] }, lib([a('x', 'bg', [])]))).toEqual({ kind: 'paper', colour: PAPER })
    expect(resolveGround({ layers: [] }, lib([], '#eee8dc'))).toEqual({ kind: 'paper', colour: '#eee8dc' })
    expect(resolveGround({ ground: 'snow', layers: [] }, lib(grounds))).toMatchObject({ kind: 'paper', reason: 'no ground for snow' })
  })
  it('a #hex choice is a paper wash in that colour (teacher pick)', () => {
    expect(resolveGround({ ground: '#d8cfb8', layers: [] }, lib(grounds))).toEqual({ kind: 'paper', colour: '#d8cfb8' })
  })
})

describe('bottomColour', () => {
  it('is the painted ground of the bottom rows: sparse dark marks and transparent pixels do not count', () => {
    const w = 10, h = 10
    const d = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (y < 9) d.set([10, 10, 10, 255], i)                       // above the bottom band: ignored
      else if (x < 3) d.set([30, 40, 20, 255], i)                  // ink and shrubs
      else if (x === 3) d.set([240, 214, 120, 255], i)             // sunlit yellow grass: bright, but not paper
      else if (x === 9) d.set([0, 0, 0, 0], i)                     // a hole
      else d.set([236, 226, 205, 255], i)                          // the cream ground
    }
    const c = bottomColour(d, w, h, 0.1)!
    expect(c.map((v) => Math.round(v * 255))).toEqual([236, 226, 205])
  })
  it('is null when the bottom is all transparent', () => {
    expect(bottomColour(new Uint8ClampedArray(4 * 4), 2, 2)).toBeNull()
  })
})

describe('stainSize', () => {
  it('is as wide as the foot, capped for tall and huge assets', () => {
    expect(stainSize(a('b', 'mid', []), 3, 2, 22).w).toBeCloseTo(1.1)
    expect(stainSize(a('t', 'fg', []), 5, 14, 7).w).toBe(4)
    expect(stainSize(a('h', 'mid', []), 30, 20, 22).w).toBe(6)
  })
  it('keeps the same height on screen at any distance: deeper in metres when farther (seen from eye height)', () => {
    const screen = (z: number) => { const s = stainSize(a('b', 'mid', []), 2, 4, z); return (s.d * 1.6) / z / s.w }
    expect(screen(7)).toBeCloseTo(0.12)
    expect(screen(22)).toBeCloseTo(0.12)
    expect(stainSize(a('b', 'mid', []), 2, 4, 200).d).toBe(1.6 * 3)  // capped far away
  })
})

describe('hexRgb', () => {
  it('reads #rrggbb as 0..1', () => expect(hexRgb('#ff8000')).toEqual([1, 128 / 255, 0]))
})

describe('teacher edits: ground and horizon (undoable)', () => {
  it('a ground pick, a paper wash and the horizon each change the scene and undo exactly', async () => {
    const { LessonDoc } = await import('./edits')
    const { placeLayer } = await import('./layout')
    const L = lib([a('ground-heath-01', 'ground', ['ground', 'heath']), a('ground-field-01', 'ground', ['ground', 'field'])])
    const strip = { ...a('bg-heath', 'bg', ['heath']), tileable_x: true, height_m: 30, w: 1440, h: 417 }
    const doc = new LessonDoc({ id: 'l', scenes: [{ id: 's', set: { layers: [{ asset: 'bg-heath', depth: 'bg' }] } }] })
    const set = () => doc.lesson.scenes[0].set
    expect(resolveGround(set(), L)).toMatchObject({ asset: { id: 'ground-field-01' } })
    doc.set(['scenes', 0, 'set', 'ground'], 'ground-heath-01', 'Ground')
    expect(resolveGround(set(), L)).toMatchObject({ asset: { id: 'ground-heath-01' } })
    doc.set(['scenes', 0, 'set', 'ground'], '#e8dcc0', 'Ground wash')
    expect(resolveGround(set(), L)).toEqual({ kind: 'paper', colour: '#e8dcc0' })
    doc.set(['scenes', 0, 'set', 'horizon'], 6, 'Horizon')
    expect(placeLayer(strip, set().layers[0], 0, set().horizon as number).y).toBe(6)
    doc.undo(); doc.undo(); doc.undo()
    expect(set()).toEqual({ layers: [{ asset: 'bg-heath', depth: 'bg' }] })
  })
})

describe('groundOptions: the panel lists the scene\'s own bundle (PM follow-up)', () => {
  const libs: Record<string, Library> = {
    'library/nl-prehistory/library.json': lib([a('ground-heath-01', 'ground', ['ground']), a('bg-heath', 'bg', [])]),
    'library/nl-golden-age/library.json': lib([a('ground-quay-01', 'ground', ['ground']), a('ground-cobbles-01', 'ground', ['ground'])]),
  }
  const lesson = { bundle: 'nl-prehistory' }
  const options = (scene: { bundle?: string }) => groundOptions(libs[libraryUrlFor(scene, lesson)])
  it('a scene without a bundle lists the lesson bundle\'s grounds', () => {
    expect(options({})).toEqual(['ground-heath-01'])
  })
  it('a scene with its own bundle lists that bundle\'s grounds, never the lesson\'s', () => {
    expect(options({ bundle: 'nl-golden-age' })).toEqual(['ground-cobbles-01', 'ground-quay-01'])
  })
  it('a bundle without ground art lists none (the panel offers Paper)', () => {
    expect(groundOptions(lib([a('bg', 'bg', [])]))).toEqual([])
  })
})

describe('featherOf: only bg strips feather (checker sky MEDIUM)', () => {
  it('a strip feathers by default or as the teacher set it; a prop at depth bg never does', () => {
    expect(featherOf({ layer: 'bg' }, {})).toBe(BG_FEATHER)
    expect(featherOf({ layer: 'bg' }, { feather: 0.4 })).toBe(0.4)
    expect(featherOf({ layer: 'mid' }, {})).toBe(0)                 // tree-oak-01 at depth bg (hunebedden sc22)
    expect(featherOf({ layer: 'prop' }, { feather: 0.4 })).toBe(0)
  })
})

describe('sky colour at the horizon (checker sky LOW: no paper band under the sky)', () => {
  // a sky: blue on top, pale haze in the lower half
  const w = 8, h = 64, data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(y < 32 ? [90, 140, 220, 255] : [200, 215, 225, 255], (y * w + x) * 4)
  it('bandColour reads the rows asked for; bottomColour is its bottom band', () => {
    expect(bandColour(data, w, h, 0, 0.25)).toEqual([90 / 255, 140 / 255, 220 / 255])
    expect(bottomColour(data, w, h)).toEqual(bandColour(data, w, h, 0.92, 1))
  })
  it('bandAt picks the band at a height of the placed picture (0 = its bottom)', () => {
    const bands = rowBands(data, w, h)
    expect(bands).toHaveLength(SKY_BANDS)
    expect(bandAt(bands, 0.1)).toEqual([200 / 255, 215 / 255, 225 / 255])
    expect(bandAt(bands, 0.9)).toEqual([90 / 255, 140 / 255, 220 / 255])
    expect(bandAt(bands, -1)).toEqual(bands[SKY_BANDS - 1])  // clamped
    expect(bandAt([], 0.5)).toBeNull()
  })
})

describe('landTop: where the land of a strip starts', () => {
  it('is the first mostly-opaque row', () => {
    const w = 4, h = 10, d = new Uint8ClampedArray(w * h * 4)
    for (let y = 3; y < h; y++) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = x < 3 ? 255 : 0   // 3 of 4 opaque from row 3
    d[(1 * w) * 4 + 3] = 255                                                                           // a lone tree top in row 1
    expect(landTop(d, w, h)).toBe(0.3)
    expect(landTop(new Uint8ClampedArray(w * h * 4), w, h)).toBe(0)
  })
})

describe('inkLevel and nearOptions', () => {
  it('inkLevel is the median of the dark opaque pixels; null without lines', () => {
    const n = 100, d = new Uint8ClampedArray(n * 4)
    for (let i = 0; i < n; i++) { const v = i < 40 ? 51 : 230; d.set([v, v, v, 255], i * 4) }   // 40 % ink at 0.2
    expect(inkLevel(d, n, 1)).toBeCloseTo(0.2, 2)
    expect(inkLevel(new Uint8ClampedArray(n * 4).fill(255), n, 1)).toBeNull()
  })
  it('near ground choices are the wide painted strips, not skies, far strips or floor tiles', () => {
    const a = (id: string, layer: Asset['layer'], w: number, h: number, tileable_x = false): Asset => ({ id, layer, tags: [], file: '', w, h, anchor: [0.5, 1], height_m: 5, motion: 'none', tileable_x })
    const lib = { version: 1, bundle: 'b', style: '', assets: [a('quay', 'fg', 1536, 667), a('meadow', 'mid', 1536, 599), a('barrel', 'fg', 400, 500), a('city', 'bg', 1536, 355), a('sky', 'sky', 1536, 512), a('tile', 'ground', 1024, 1024, true)] } as Library
    expect(nearOptions(lib)).toEqual(['meadow', 'quay'])
  })
})

describe('defaultNear: only the near band a scene names', () => {
  const a = (id: string, layer: Asset['layer']): Asset => ({ id, layer, tags: [], file: '', w: 4096, h: 630, anchor: [0.5, 1], height_m: 5, motion: 'none' })
  const lib = { version: 1, bundle: 'b', style: '', assets: [a('z-heath', 'near_ground'), a('a-meadow', 'near_ground'), a('quay', 'fg')] } as Library
  it('none picked for it; its own choice wins; none = none', () => {
    expect(defaultNear(undefined, lib)).toBeNull()
    expect(defaultNear('quay', lib)).toBe('quay')
    expect(defaultNear('none', lib)).toBeNull()
    expect(defaultNear(undefined, { ...lib, assets: [a('quay', 'fg')] })).toBeNull()
  })
})

describe('skylineRow: a band\'s crest is the median of its columns\' first opaque row', () => {
  it('reads the skyline, not the transparent sky above it', () => {
    const w = 4, h = 10, d = new Uint8ClampedArray(w * h * 4)
    for (let x = 0; x < w; x++) for (let y = 3; y < h; y++) d[(y * w + x) * 4 + 3] = 255   // opaque from row 3 (0.3)
    expect(skylineRow(d, w, h)).toBeCloseTo(0.3)
    expect(skylineRow(new Uint8ClampedArray(w * h * 4), w, h)).toBe(0)
  })
})

describe('stainSize for a person', () => {
  const asset = (layer: 'figure' | 'mid') => ({ id: 'a', layer, tags: [], file: 'a.webp', w: 400, h: 900, anchor: [0.5, 1] as [number, number], height_m: 1.7 })
  it('is the span of the feet and shallow, smaller than a prop of the same size', () => {
    const person = stainSize(asset('figure'), 0.8, 1.7, 7), prop = stainSize(asset('mid'), 0.8, 1.7, 7)
    expect(person.w).toBeLessThanOrEqual(1.7 * 0.3 + 1e-9)
    expect(person.d).toBeLessThanOrEqual(person.w * 0.5 + 1e-9)
    expect(person.w).toBeLessThan(prop.w)
  })
})

describe('the ground\'s slots, near to far (groundSlots)', () => {
  const tiles = [a('ground-grass-01', 'ground', ['ground', 'grass']), a('ground-sand-01', 'ground', ['ground', 'sand']), a('ground-ice-01', 'ground', ['ground', 'ice'])]
  it('an old scene is one slot from 0 m: its own ground, so it looks as before', () => {
    expect(groundSlots({ layers: [] }, lib(tiles)).map((s) => [s.asset.id, s.from])).toEqual([['ground-grass-01', 0]])
    expect(groundSlots({ ground: 'sand', layers: [] }, lib(tiles)).map((s) => s.asset.id)).toEqual(['ground-sand-01'])
  })
  it('takes the teacher\'s slots, sorted near to far, at most six, the first from 0 m, unknown pictures skipped', () => {
    const slots = [{ asset: 'ground-ice-01', from_m: 40 }, { asset: 'nope', from_m: 10 }, { asset: 'ground-sand-01', from_m: 12 }, ...Array.from({ length: 8 }, (_, i) => ({ asset: 'ground-grass-01', from_m: 100 + i }))]
    const out = groundSlots({ groundSlots: slots, layers: [] }, lib(tiles))
    expect(out).toHaveLength(GROUND_SLOTS_MAX)
    expect(out.slice(0, 2).map((s) => [s.asset.id, s.from])).toEqual([['ground-sand-01', 0], ['ground-ice-01', 40]])
  })
  it('keeps a flipped slot flipped, and an old slot unflipped', () => {
    const s = groundSlots({ groundSlots: [{ asset: 'ground-grass-01', from_m: 0, flip: true }, { asset: 'ground-sand-01', from_m: 20 }], layers: [] }, lib(tiles))
    expect(s.map((x) => !!x.flip)).toEqual([true, false])
  })
  it('a paper floor has no slots', () => {
    expect(groundSlots({ ground: '#ddccbb', layers: [] }, lib(tiles))).toEqual([])
  })
  it('slotAt: the slot a distance lies on', () => {
    const s = groundSlots({ groundSlots: [{ asset: 'ground-grass-01', from_m: 0 }, { asset: 'ground-sand-01', from_m: 20 }], layers: [] }, lib(tiles))
    expect([slotAt(s, 5), slotAt(s, 20), slotAt(s, 300)]).toEqual([0, 1, 1])
  })
})

describe('the watercolour grain on the floor (grainOctave)', () => {
  it('keeps one grain dot about the same size on screen near and far: never streaks far off, never blobs near', () => {
    for (const d of [2, 5, 13, 40, 120, 400]) {
      const { scale, mix } = grainOctave(d, 1)
      // the world size of one dot (1 / scale) over the distance stays within a factor 2 of the size at 10 m
      const onScreen = 1 / scale / d, ref = 1 / grainOctave(10, 1).scale / 10
      expect(onScreen / ref).toBeGreaterThan(0.49)
      expect(onScreen / ref).toBeLessThan(2.01)
      expect(mix).toBeGreaterThanOrEqual(0)
      expect(mix).toBeLessThan(1)
    }
  })
  it('a larger Grain size makes bigger dots', () => {
    expect(grainOctave(10, 2).scale).toBeLessThan(grainOctave(10, 1).scale)
  })
})
