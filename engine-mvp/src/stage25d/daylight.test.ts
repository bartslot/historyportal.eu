import { describe, expect, it } from 'vitest'
import { castPoint, CLOUDS_MAX, daylightOf, DULL_SHADOW, hasSky, isDynamic, PRESETS, shadowReach, SHADOW_REACH_MAX, skyAt, sunDirOf, timeOfTags } from './daylight'
import { BUILT_IN_CLOUDS, cloudArt, cloudPlan } from './clouds'
import type { Asset } from './types'

describe('daylight: one light per scene', () => {
  it('a painted sky keeps its picture and is lit by the time its tags name', () => {
    expect(timeOfTags(['sky', 'night', 'moon'])).toBe('night')
    expect(timeOfTags(['sky', 'evening', 'dusk'])).toBe('dusk')
    expect(timeOfTags(['sky', 'morning', 'mideast'])).toBe('dawn')
    expect(timeOfTags(['sky', 'hot', 'clear', 'noon'])).toBe('day')
    const l = daylightOf({ sky: 'sky-night-01' }, { tags: ['sky', 'night'] })
    expect(l).toMatchObject({ time: 'night', dynamic: false, auto: true })
    expect(isDynamic({ sky: 'sky-night-01' } as never)).toBe(false)
  })

  it('a painted overcast or rain sky throws weak shadows; a clear one full ones', () => {
    expect(daylightOf({ sky: 'x' }, { tags: ['sky', 'overcast'] }).shadowK).toBeCloseTo(PRESETS.day.shadowK * DULL_SHADOW)
    expect(daylightOf({ sky: 'x' }, { tags: ['sky', 'clear'] }).shadowK).toBe(PRESETS.day.shadowK)
  })

  it('set.daylight paints its own sky, with the time\'s colours under the teacher\'s own', () => {
    const l = daylightOf({ sky: 'sky-hot-01', daylight: { time: 'dusk', colours: { top: '#112233', mid: 'red' } } })
    expect(l.dynamic).toBe(true)
    expect(l.hex).toEqual({ top: '#112233', mid: PRESETS.dusk.sky.mid, horizon: PRESETS.dusk.sky.horizon })
    expect(l.sky.top).toEqual([0x11 / 255, 0x22 / 255, 0x33 / 255])
    expect(hasSky({ daylight: { time: 'day' } })).toBe(true)
    expect(hasSky({ daylight: { time: 'day', painted: true } })).toBe(false)
    expect(hasSky({ sky: 'sky-hot-01', daylight: { time: 'day', painted: true } })).toBe(true)
  })

  it('an unknown time falls back to what the sky shows; numbers out of range are held to 0..1', () => {
    const l = daylightOf({ daylight: { time: 'noon' as never, sun: { x: 4, height: -1 }, clouds: { amount: 9 } } }, { tags: ['night'] })
    expect(l.time).toBe('night')
    expect(l.sun).toEqual({ x: 1, height: 0 })
    expect(l.clouds.amount).toBe(1)
  })

  it('the sun on the left throws shadows to the right and toward the viewer; on the right, to the left', () => {
    const left = sunDirOf({ x: 0.1, height: 0.5 }), right = sunDirOf({ x: 0.9, height: 0.5 })
    expect(left[0]).toBeGreaterThan(0)
    expect(right[0]).toBeLessThan(0)
    expect(left[1]).toBeLessThan(0)
    expect(left[2]).toBeLessThan(0)
    expect(Math.hypot(...left)).toBeCloseTo(1)
    const mid = sunDirOf({ x: 0.5, height: 0.5 })
    expect(mid[0]).toBeCloseTo(0)
    expect(mid[2]).toBeLessThan(0)
  })

  it('a low sun throws long shadows, never longer than the cap; a high one short', () => {
    expect(shadowReach({ height: 0 })).toBe(SHADOW_REACH_MAX)
    expect(shadowReach({ height: 1 })).toBeLessThan(0.5)
    expect(shadowReach({ height: 0.3 })).toBeGreaterThan(shadowReach({ height: 0.7 }))
  })

  it('a point up high falls on the ground away from the sun', () => {
    const dir = sunDirOf({ x: 0.1, height: 0.5 })
    const [x, z] = castPoint(2, 20, 1.8, dir, shadowReach({ height: 0.5 }))
    expect(x).toBeGreaterThan(2)
    expect(z).toBeLessThan(20)
    expect(castPoint(2, 20, 0, dir, 1)).toEqual([2, 20])   // the foot stays where it stands
  })

  it('more cloud, softer shadows', () => {
    const clear = daylightOf({ daylight: { time: 'day', clouds: { amount: 0 } } })
    const full = daylightOf({ daylight: { time: 'day', clouds: { amount: 1 } } })
    expect(full.shadowK).toBeCloseTo(clear.shadowK / 2)
  })

  it('the gradient runs from the horizon colour to the top colour', () => {
    const l = daylightOf({ daylight: { time: 'day' } })
    expect(skyAt(l, 0)).toEqual(l.sky.horizon)
    expect(skyAt(l, 1)).toEqual(l.sky.top)
    expect(skyAt(l, 0.5)).toEqual(l.sky.mid)
    expect(skyAt(l, 0.1)).toEqual(l.sky.horizon)   // the horizon colour reaches up past the far landscape
  })
})

describe('cloudPlan: the clouds of a scene', () => {
  const art = BUILT_IN_CLOUDS
  it('Amount 0 is a clear sky, 1 the most clouds', () => {
    expect(cloudPlan({ sceneId: 's1', art, chosen: null, amount: 0 })).toEqual([])
    expect(cloudPlan({ sceneId: 's1', art, chosen: null, amount: 1 })).toHaveLength(CLOUDS_MAX)
  })

  it('a higher Amount only adds clouds: the ones there stay where they are', () => {
    const few = cloudPlan({ sceneId: 's1', art, chosen: null, amount: 0.3 })
    const many = cloudPlan({ sceneId: 's1', art, chosen: null, amount: 0.8 })
    expect(many.slice(0, few.length)).toEqual(few)
  })

  it('the same scene always gets the same sky; another scene another', () => {
    const a = cloudPlan({ sceneId: 's1', art, chosen: null, amount: 0.5 })
    expect(cloudPlan({ sceneId: 's1', art, chosen: null, amount: 0.5 })).toEqual(a)
    expect(cloudPlan({ sceneId: 's2', art, chosen: null, amount: 0.5 })).not.toEqual(a)
  })

  it('only the chosen cut-outs; none chosen that exist = no clouds', () => {
    const plan = cloudPlan({ sceneId: 's1', art, chosen: ['cloud-cirrus-01'], amount: 1 })
    expect(new Set(plan.map((c) => c.asset.id))).toEqual(new Set(['cloud-cirrus-01']))
    expect(plan.every((c) => c.lift >= 0.5)).toBe(true)   // cirrus floats high
    expect(cloudPlan({ sceneId: 's1', art, chosen: ['gone'], amount: 1 })).toEqual([])
  })

  it('a bundle with its own clouds uses them; one without gets the built-in set', () => {
    const own: Asset = { ...BUILT_IN_CLOUDS[0], id: 'cloud-own-01' }
    expect(cloudArt({ assets: [own] })).toEqual([own])
    expect(cloudArt({ assets: [] })).toBe(BUILT_IN_CLOUDS)
  })
})
