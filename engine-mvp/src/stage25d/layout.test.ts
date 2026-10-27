import { describe, expect, it } from 'vitest'
import { cameraAt, DEPTH_Z, HOUSE, layerAt, motionOf, placeLayer, renderScale, sceneDuration, setShotDuration, shotAt, shotsEnd, nextTier, TIER0, ADAPT, viewWidthAt, type Tier } from './layout'
import type { Scene } from './types'
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
  it('holds the house pose without a move, fov in radians like every pose', () => {
    expect(cameraAt(null, 3, 8)).toEqual({ ...HOUSE, fov: (HOUSE.fov * Math.PI) / 180 })
  })
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

describe('renderScale', () => {
  it('uses the device ratio when it fits under the cap', () => expect(renderScale(800, 2, 1920, 0)).toBe(2))
  it('caps the longest side', () => expect(renderScale(1440, 2, 1920, 0)).toBeCloseTo(1920 / 1440))
  it('drops a quarter per notch, never below 1x CSS', () => {
    expect(renderScale(800, 2, 1920, 2)).toBe(1.5)
    expect(renderScale(800, 2, 1920, 9)).toBe(1)
  })
  it('never upsamples a dpr-1 screen', () => expect(renderScale(800, 1, 2560, 0)).toBe(1))
})

describe('sceneDuration', () => {
  const sc = (extra: Partial<Scene>): Scene => ({ id: 's', set: { layers: [] }, est_s: 9, ...extra })
  const cam = { from: HOUSE, to: HOUSE, dur_s: 7 }
  it('takes the director\'s scene length first, then the camera\'s, then the writer\'s estimate', () => {
    expect(sceneDuration(sc({ dur_s: 21, camera: cam }))).toBe(21)
    expect(sceneDuration(sc({ camera: cam }))).toBe(7)
    expect(sceneDuration(sc({}))).toBe(9)
  })
})

describe('shotAt', () => {
  const a = { from: { ...HOUSE, x: -2 }, to: { ...HOUSE, x: 2 }, dur_s: 8, ease: 'linear' as const }
  const b = { from: { ...HOUSE, z: 0 }, to: { ...HOUSE, z: 6 }, dur_s: 8, at_s: 8, ease: 'linear' as const }
  const s: Scene = { id: 's', set: { layers: [] }, dur_s: 16, camera: a, camera_more: [b] }
  it('plays every shot of a split scene, each on its own clock', () => {
    expect(shotAt(s, 3)).toEqual({ cam: a, t: 3 })
    expect(shotAt(s, 12)).toEqual({ cam: b, t: 4 })
  })
  it('poses the second shot in the second half (the scene no longer ends after the first)', () => {
    const pose = (t: number) => { const { cam, t: local } = shotAt(s, t); return cameraAt(cam, local, sceneDuration(s)) }
    expect(pose(12).z).toBeCloseTo(3)
    expect(pose(12).x).toBe(0)
    expect(sceneDuration(s)).toBe(16)
  })
  it('holds the house pose for a scene without a camera', () => {
    expect(shotAt({ id: 's', set: { layers: [] } }, 5)).toEqual({ cam: null, t: 5 })
  })
})

describe('nextTier (adaptive render size)', () => {
  const run = (fpsTrace: number[]) => {
    let t: Tier = TIER0
    const sizes = [t.notches]
    fpsTrace.forEach((fps, i) => { t = nextTier(t, fps, i * 2000, true); sizes.push(t.notches) })
    const steps = sizes.slice(1).map((n, i) => n - sizes[i])
    return { t, changes: steps.filter(Boolean).length, ups: steps.filter((d) => d < 0).length }
  }
  it('a 52-56 fps trace (a laptop at the edge) changes the size at most once in 5 minutes', () => {
    const trace = Array.from({ length: 150 }, (_, i) => 52 + ((i * 7) % 5))
    expect(run(trace).changes).toBeLessThanOrEqual(1)
  })
  it('a laptop that dips under 50 every 24 s and runs 62 between: one step back up at most, then locked', () => {
    const trace = Array.from({ length: 150 }, (_, i) => (i % 12 === 0 ? 45 : 62))
    const { ups, t } = run(trace)
    expect(ups).toBeLessThanOrEqual(1)
    expect(t.locked).toBe(true)
  })
  it('locks at the lower size after two flips', () => {
    let t: Tier = TIER0
    let now = 0
    const step = (fps: number) => { now += 2000; t = nextTier(t, fps, now, true) }
    step(40)                                        // down to 1
    for (let i = 0; i < 40; i++) step(70)           // up after 60 s
    expect(t.notches).toBe(0)
    step(40)                                        // down again: second flip -> locked
    expect(t.notches).toBe(1)
    expect(t.locked).toBe(true)
    for (let i = 0; i < 100; i++) step(90)
    expect(t.notches).toBe(1)
  })
  it('never steps up before upWindows fast windows', () => {
    let t = nextTier(TIER0, 40, 0, true)
    for (let i = 1; i < ADAPT.upWindows; i++) t = nextTier(t, 90, 60000 + i * 2000, true)
    expect(t.notches).toBe(1)
  })
  it('does not count a drop that cannot change the size', () => {
    expect(nextTier(TIER0, 30, 0, false).notches).toBe(0)
  })
})

describe('setShotDuration (checker N4)', () => {
  const a = { from: { ...HOUSE, x: 0 }, to: { ...HOUSE, x: 1 }, dur_s: 7, at_s: 0 }
  const b = { from: { ...HOUSE, x: 1 }, to: { ...HOUSE, x: -1 }, dur_s: 7, at_s: 7 }
  const s: Scene = { id: 's', set: { layers: [] }, dur_s: 14, camera: a, camera_more: [b] }
  it('a longer first shot pushes the second and the scene length along: no jump, nothing cut', () => {
    const l = setShotDuration(s, 0, 12)
    expect(l.camera!.dur_s).toBe(12)
    expect(l.camera_more![0].at_s).toBe(12)
    expect(sceneDuration(l)).toBe(19)
    const pose = (t: number) => { const { cam, t: lt } = shotAt(l, t); return cameraAt(cam, lt, sceneDuration(l)) }
    expect(pose(11.99).x).toBeCloseTo(1, 1)      // shot 1 reaches its end...
    expect(pose(12).x).toBeCloseTo(1, 5)          // ...where shot 2 starts
  })
  it('changes the last shot without touching the ones before', () => {
    const l = setShotDuration(s, 1, 5)
    expect(l.camera).toBe(a)
    expect(l.camera_more![0]).toMatchObject({ dur_s: 5, at_s: 7 })
    expect(l.dur_s).toBe(12)
  })
  it('leaves a scene without dur_s on its derived length', () => {
    const l = setShotDuration({ id: 's', set: { layers: [] }, est_s: 9, camera: { ...a } }, 0, 10)
    expect(l.dur_s).toBeUndefined()
    expect(sceneDuration(l)).toBe(10)
  })
})

describe('shotsEnd (checker N5)', () => {
  it('is where the last shot stops moving, so Scene length never cuts it', () => {
    const s: Scene = { id: 's', set: { layers: [] }, dur_s: 14, camera: { from: HOUSE, to: HOUSE, dur_s: 7 }, camera_more: [{ from: HOUSE, to: HOUSE, dur_s: 7, at_s: 7 }] }
    expect(shotsEnd(s)).toBe(14)
    expect(shotsEnd({ id: 's', set: { layers: [] } })).toBe(0)
  })
})
