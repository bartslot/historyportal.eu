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
  it('an ice floor gets nothing; a meadow band picks the meadow grass only', () => {
    expect(strewPlan({ ...base, slots: [ice] })).toEqual([])
    expect(strewPlan({ ...base, bandTags: ['meadow', 'field', 'hedge', 'ground'] }).flatMap((p) => p.picks.map((s) => s.asset))).toEqual(['grass-tall-01'])
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
