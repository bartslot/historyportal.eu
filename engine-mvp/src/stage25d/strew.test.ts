import { describe, expect, it } from 'vitest'
import { strewPlan, GRASS_RANGE, HORIZON_RANGE } from './strew'
import { spritesOf } from './scatter'
import type { Asset } from './types'

const a = (id: string, tags: string[], height_m: number, layer: Asset['layer'] = 'fg'): Asset => ({ id, layer, tags, file: `${id}.webp`, w: 600, h: 500, anchor: [0.5, 1], height_m })
const sprites = spritesOf({ version: 1, bundle: 't', assets: [a('grass-tall-01', ['grass', 'meadow'], 1), a('heather-01', ['heather', 'heath'], 0.5), a('shrub-juniper-01', ['shrub', 'heath'], 2.5)] })
const grass = { asset: a('ground-grass-heather-01', ['ground', 'grass', 'heather', 'heath'], 4, 'ground'), from: 0 }
const ice = { asset: a('ground-ice-01', ['ground', 'ice'], 4, 'ground'), from: 0 }
const base = { sceneId: '9690', slots: [grass], bandTags: null, sprites, grass: 0.5, bushes: 0.5, front: 0 }

describe('strewPlan: the clumps follow the scene\'s ground', () => {
  it('grass and heather on a grass-heath floor, bushes on its horizon, all in their ranges', () => {
    const plan = strewPlan(base)
    expect(plan.map((p) => p.picks.map((s) => s.asset).sort())).toEqual([['grass-tall-01', 'heather-01'], ['shrub-juniper-01']])
    for (const c of plan[0].clumps) { expect(c.z).toBeGreaterThanOrEqual(GRASS_RANGE[0]); expect(c.z).toBeLessThanOrEqual(GRASS_RANGE[1]) }
    for (const c of plan[1].clumps) expect(c.z).toBeGreaterThanOrEqual(HORIZON_RANGE[0])
  })
  it('an ice floor gets nothing; a band adds its own plants to the floor\'s', () => {
    expect(strewPlan({ ...base, slots: [ice] })).toEqual([])
    expect(strewPlan({ ...base, slots: [ice], bandTags: ['meadow', 'field', 'hedge', 'ground'] }).flatMap((p) => p.picks.map((s) => s.asset))).toEqual(['grass-tall-01'])
    // a steppe floor under a bare verge strip still grows its own steppe plants (Bart 11-13)
    const steppe = { asset: a('terrain-dry-steppe-01', ['steppe', 'dry', 'earth'], 4, 'ground'), from: 0 }
    const dry = spritesOf({ version: 1, bundle: 't', assets: [a('dry-tuft-01', ['steppe', 'dry', 'grass'], 0.5)] })
    expect(strewPlan({ ...base, slots: [steppe], sprites: dry, bandTags: ['ground', 'field', 'verge'] }).flatMap((p) => p.picks.map((s) => s.asset))).toEqual(['dry-tuft-01'])
  })
  it('Grass 0 and Horizon 0 strew nothing; more Grass, more clumps; the same scene is the same', () => {
    expect(strewPlan({ ...base, grass: 0, bushes: 0 })).toEqual([])
    expect(strewPlan({ ...base, grass: 1 })[0].clumps.length).toBeGreaterThan(strewPlan(base)[0].clumps.length)
    expect(strewPlan(base)).toEqual(strewPlan(base))
  })
  it('with ground bands no horizon row: the band\'s painted crest is the horizon', () => {
    expect(strewPlan({ ...base, bandTags: ['meadow', 'hedge'] }).some((p) => p.horizon)).toBe(false)
  })
  it('every slot strews its own plants over its own distances', () => {
    const plan = strewPlan({ ...base, slots: [ice, { ...grass, from: 20 }] })
    expect(plan[0].clumps.every((c) => c.z >= 20)).toBe(true)
  })
})

describe('strewPlan: the teacher\'s own plants (set.strew, Bart 11-24)', () => {
  it('chosen plants grow on every slot instead of the ground\'s own; none chosen strews nothing', () => {
    const plan = strewPlan({ ...base, choice: { plants: ['heather-01'] } })
    expect(plan[0].picks.map((s) => s.key)).toEqual(['heather-01'])
    expect(strewPlan({ ...base, choice: { plants: [] }, bushes: 0 })).toEqual([])
  })
  it('a tree or a bush is never a clump, even when chosen; an unknown key is skipped', () => {
    expect(strewPlan({ ...base, choice: { plants: ['shrub-juniper-01', 'gone-01'] }, bushes: 0 })).toEqual([])
  })
  it('a seed throws the same plants on other spots; no seed is the old throw', () => {
    const one = strewPlan({ ...base, choice: { seed: 3 } })[0]
    expect(one.picks).toEqual(strewPlan(base)[0].picks)
    expect(one.clumps).not.toEqual(strewPlan(base)[0].clumps)
    expect(strewPlan({ ...base, choice: {} })).toEqual(strewPlan(base))
  })
  it('a sheet cell is named asset#n', () => {
    const sheet = spritesOf({ version: 1, bundle: 't', assets: [{ ...a('sprites-01', ['sheet'], 1), kind: 'sheet', cells: [{ tags: ['grass'], height_m: 1, rect: [0, 0, 0.5, 1] }, { tags: ['heather'], height_m: 0.5, rect: [0.5, 0, 0.5, 1] }] } as Asset] })
    expect(sheet.map((s) => s.key)).toEqual(['sprites-01#0', 'sprites-01#1'])
  })
})
