import { describe, expect, it } from 'vitest'
import { bottomColour, groundOptions, hexRgb, PAPER, resolveGround, stainSize } from './ground'
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
    expect(placeLayer(strip, set().layers[0], 0, set().horizon).y).toBe(6)
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
