import { describe, expect, it } from 'vitest'
import { CLUMP_MAX, bucketOf, clumpPicks, horizonPicks, rng, scatter, seedOf, spritesOf, type Sprite } from './scatter'
import { viewWidthAt } from './layout'
import type { Asset, Library } from './types'

const a = (id: string, tags: string[], height_m: number, over: Partial<Asset> = {}): Asset =>
  ({ id, layer: 'fg', tags, file: `${id}.webp`, w: 600, h: 500, anchor: [0.5, 1], height_m, ...over })
const lib = (assets: Asset[]): Library => ({ version: 1, bundle: 't', assets })

const plants = lib([
  a('grass-tall-01', ['grass', 'meadow', 'ground'], 1),
  a('heather-01', ['heather', 'heath', 'ground'], 0.5),
  a('reeds-01', ['reeds', 'water', 'marsh'], 2.5),
  a('shrub-juniper-01', ['shrub', 'juniper', 'heath'], 2.5),
  a('tree-pine-01', ['tree', 'pine', 'heath'], 16),
  a('house-01', ['house'], 6),
  a('ground-heath-01', ['ground', 'heath', 'grass', 'path'], 6.9, { w: 1536, h: 574 }),            // a ground strip, not a plant
  a('ground-grass-heather-01', ['ground', 'grass'], 4, { layer: 'ground', tileable_x: true }),
])

describe('seeded randomness', () => {
  it('is the same for the same seed and differs for another', () => {
    const r1 = rng(seedOf('scene-9690')), r2 = rng(seedOf('scene-9690')), r3 = rng(seedOf('scene-9691'))
    const s1 = [r1(), r1(), r1()], s2 = [r2(), r2(), r2()]
    expect(s1).toEqual(s2)
    expect([r3(), r3(), r3()]).not.toEqual(s1)
    for (const v of s1) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })
})

describe('the sprites a scene can strew (spritesOf)', () => {
  it('takes plant pictures, never houses, floor tiles or ground strips', () => {
    expect(spritesOf(plants).map((s) => s.asset).sort()).toEqual(['grass-tall-01', 'heather-01', 'reeds-01', 'shrub-juniper-01', 'tree-pine-01'])
  })
  it('cuts the cells of ONE sprite sheet: each cell its own sprite, uv inside the sheet', () => {
    const sheet = a('ground-sheet-01', ['sheet'], 1, {
      kind: 'sheet', w: 1000, h: 500,
      cells: [{ tags: ['grass'], height_m: 0.6, rect: [0, 0, 0.5, 1] }, { tags: ['shrub', 'heath'], height_m: 2, rect: [0.5, 0, 0.5, 1] }],
    })
    const s = spritesOf(lib([sheet]))
    expect(s).toHaveLength(2)
    expect(s[1]).toMatchObject({ asset: 'ground-sheet-01', tags: ['shrub', 'heath'], height_m: 2, cell: [0.5, 0, 0.5, 1] })
    expect(s[0].aspect).toBeCloseTo((0.5 * 1000) / 500)
  })
})

describe('which sprites stand on which ground (follow the scene\'s ground)', () => {
  const s = spritesOf(plants)
  it('grass and heather on a grass-heath floor; no trees as clumps', () => {
    expect(clumpPicks(s, ['ground', 'grass', 'heather', 'heath']).map((p) => p.asset).sort()).toEqual(['grass-tall-01', 'heather-01'])
  })
  it('nothing on a floor no plant belongs to (ice, sand)', () => {
    expect(clumpPicks(s, ['ground', 'ice'])).toEqual([])
  })
  it('the horizon takes shrubs and trees of that ground', () => {
    expect(horizonPicks(s, ['ground', 'heath']).map((p) => p.asset).sort()).toEqual(['shrub-juniper-01', 'tree-pine-01'])
    expect(horizonPicks(s, ['ground', 'ice'])).toEqual([])
  })
  it('a green ground with no bush of its own gets the bundle\'s shrubs (a meadow with a hedge), never trees', () => {
    expect(horizonPicks(s, ['meadow', 'field', 'hedge', 'ground']).map((p) => p.asset)).toEqual(['shrub-juniper-01'])
  })
})

describe('scatter', () => {
  const picks: Sprite[] = spritesOf(plants).slice(0, 2)
  const spec = { picks, count: 200, from: 3, to: 40, front: 0, seed: 7 }
  it('is deterministic: the same scene always looks the same', () => {
    expect(scatter(spec)).toEqual(scatter(spec))
    expect(scatter({ ...spec, seed: 8 })).not.toEqual(scatter(spec))
  })
  it('spreads over x and z inside the range and the view (with room for a camera move), drawn far to near', () => {
    const out = scatter(spec)
    expect(out).toHaveLength(200)
    for (const c of out) {
      expect(c.z).toBeGreaterThanOrEqual(3)
      expect(c.z).toBeLessThanOrEqual(40)
      expect(Math.abs(c.x)).toBeLessThanOrEqual(viewWidthAt(c.z) * 0.8 + 1e-9)
      expect(c.h).toBeGreaterThan(0)
    }
    for (let i = 1; i < out.length; i++) expect(out[i].z).toBeLessThanOrEqual(out[i - 1].z)
    // spread across, not in a row: both sides of the view are used
    expect(out.some((c) => c.x < -2) && out.some((c) => c.x > 2)).toBe(true)
  })
  it('keeps clear of the camera and never exceeds the cap', () => {
    const out = scatter({ ...spec, front: 2.42, from: 1, count: 5000 })
    expect(out.length).toBe(CLUMP_MAX)
    for (const c of out) expect(c.z).toBeGreaterThanOrEqual(2.42 + 2)
  })
  it('no picks or no count: nothing', () => {
    expect(scatter({ ...spec, picks: [] })).toEqual([])
    expect(scatter({ ...spec, count: 0 })).toEqual([])
  })
  it('sorts into distance buckets so each draws in its depth slot', () => {
    expect(bucketOf(3)).toBeLessThan(bucketOf(30))
    expect(bucketOf(30)).toBeLessThan(bucketOf(250))
  })
})
