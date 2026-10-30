import { describe, expect, it } from 'vitest'
import { figureAsset, frameShare, mainStand, MAIN_MIN, MAX_SCALE, otherStand, OTHER_MIN, placeFigures, SPREAD, speakerOf, spread } from './figures'
import { FILL_MAX, holdPose, holdSpeaker } from './speaker'
import { groundBandsFor } from './bands'
import type { Library, LibraryAsset, Scene } from './types'

const fig = (char: string, pose: string, h: number, facing: 'left' | 'right' = 'right'): LibraryAsset => ({
  id: `fig-${char}-${pose}-01${facing === 'left' ? '-l' : ''}`, layer: 'figure', height_m: h,
  tags: ['figure', `char:${char}`, `pose:${pose}`, `facing:${facing}`],
})
const both = (char: string, pose: string, h: number) => [fig(char, pose, h), fig(char, pose, h, 'left')]
const LIB: Library = { bundle: 't', assets: [
  ...both('meisje', 'stand', 1.33), ...both('meisje', 'push', 1.18), ...both('opa', 'stand', 1.6), ...both('opa', 'sit', 1.1),
  { id: 'band-a', layer: 'ground_band', tags: ['ground'], w: 3000, h: 400 },
  { id: 'band-b', layer: 'ground_band', tags: ['ground'], w: 3000, h: 400 },
] }
const scene = (figures: Scene['figures'], extra: Partial<Scene> = {}): Scene =>
  ({ id: 's', beat: 'setup', narration: 'x', camera: null, sound: null, set: { layers: [{ asset: 'tree', depth: 'bg', x: 0.5 }] }, figures, ...extra })

describe('figureAsset', () => {
  it('picks by char and pose, mirrored file for facing left', () => {
    expect(figureAsset(LIB, 'meisje', 'push', 'right')?.id).toBe('fig-meisje-push-01')
    expect(figureAsset(LIB, 'meisje', 'push', 'left')?.id).toBe('fig-meisje-push-01-l')
  })
  it('falls back to an alias, then to stand, and to null for a char nobody drew', () => {
    expect(figureAsset(LIB, 'meisje', 'pull', 'right')?.id).toBe('fig-meisje-push-01')
    expect(figureAsset(LIB, 'meisje', 'dance', 'right')?.id).toBe('fig-meisje-stand-01')
    expect(figureAsset(LIB, 'hond', 'stand', 'right')).toBeNull()
  })
})

describe('stands', () => {
  it('the speaker stands at fg; a child or a kneeling figure is a little bigger than life, never over MAX_SCALE', () => {
    expect(mainStand(1.7)).toEqual({ depth: 'fg', scale: 1 })
    const kid = mainStand(1.0)
    expect(kid.depth).toBe('fg')
    expect(kid.scale).toBeGreaterThan(1)
    expect(kid.scale).toBeLessThanOrEqual(MAX_SCALE)
  })
  it('anyone else keeps the writer\'s depth, bg counts as mid, and a speck steps up to fg', () => {
    expect(otherStand(1.7, 'mid').depth).toBe('mid')
    expect(otherStand(1.7, 'bg').depth).toBe('mid')
    expect(otherStand(1.7, 'fg').depth).toBe('fg')
    expect(otherStand(0.5, 'mid').depth).toBe('fg')
    expect(frameShare(1.7, 'mid')).toBeGreaterThanOrEqual(OTHER_MIN)
  })
})

describe('the camera keeps the speaker readable (holdPose)', () => {
  const fig = { z: 7, x: 0, h: 1.7 }
  const share = (p: { z: number; fov: number }) => fig.h / (2 * (fig.z - p.z) * Math.tan((Math.min(p.fov, 50) * Math.PI) / 360))
  it('a wide shot that backs the camera up to z -3 is pulled in until the speaker is 30 % of the frame', () => {
    const p = holdPose({ x: 0, y: 1.9, z: -3, fov: 58 }, fig)
    expect(share(p)).toBeGreaterThanOrEqual(MAIN_MIN - 0.005)
  })
  it('a close push that would fill the frame is held back: the speaker never fills more than 85 % and the feet stay in', () => {
    const p = holdPose({ x: 0, y: 1.5, z: 6, fov: 35 }, fig)
    expect(share(p)).toBeLessThanOrEqual(FILL_MAX + 0.005)
    expect(1.5 / (fig.z - p.z)).toBeLessThan(Math.tan(((35 / 2 - 2) * Math.PI) / 180))
  })
  it('keeps the speaker inside the middle of the frame', () => {
    const p = holdPose({ x: 5, y: 1.6, z: 1, fov: 50 }, { z: 7, x: -0.5, h: 1.7 })
    const nx = (-0.5 - p.x) / ((7 - p.z) * Math.tan((50 * Math.PI) / 360) * (16 / 9))
    expect(Math.abs(nx)).toBeLessThanOrEqual(0.7)
  })
  it('a shot of a scene with a speaker comes out held; a scene without figures is untouched', () => {
    const s = placeFigures(scene([{ char: 'opa', pose: 'stand', x: 0.5, depth: 'mid' }]), LIB)
    const held = holdSpeaker({ from: { x: 0, y: 1.9, z: -3, fov: 58 }, to: { x: 0, y: 1.9, z: -3, fov: 58 } }, s)
    expect(held.from.z).toBeGreaterThan(-3)
    const bare = scene([])
    const poses = { from: { x: 0, y: 1.6, z: 0, fov: 50 }, to: { x: 0, y: 1.6, z: 0, fov: 50 } }
    expect(holdSpeaker(poses, bare)).toBe(poses)
  })
})

describe('placeFigures', () => {
  const s = scene(
    [{ char: 'meisje', pose: 'push', x: 0.4, depth: 'mid', facing: 'left' }, { char: 'opa', pose: 'stand', x: 0.45, depth: 'mid', facing: 'right' }],
    { balloons: [{ char: 'meisje', text: 'Hij zit muurvast!' }] },
  )
  const out = placeFigures(s, LIB)
  const layers = out.set.layers.filter((l) => l.figure)
  it('adds one layer per figure with the mirrored asset and a contact shadow', () => {
    expect(layers.map((l) => l.asset)).toEqual(['fig-meisje-push-01-l', 'fig-opa-stand-01'])
    expect(layers.every((l) => (l.shadow ?? 0) > 0)).toBe(true)
  })
  it('the balloon speaker is the main figure: fg, and the figure records its drawn height for the camera', () => {
    expect(speakerOf(s)).toBe('meisje')
    expect(layers[0].depth).toBe('fg')
    expect(out.figures![0].h_m).toBeCloseTo(1.18 * (layers[0].scale ?? 1), 2)
  })
  it('keeps neighbours at one depth apart and rewrites figures[] to where they stand', () => {
    const [a, b] = out.figures!
    if (a.depth === b.depth) expect(Math.abs((a.x ?? 0) - (b.x ?? 0))).toBeGreaterThanOrEqual(SPREAD - 1e-9)
    expect(a.depth).toBe(layers[0].depth)
  })
  it('is idempotent: a second run replaces the figure layers instead of doubling them', () => {
    expect(placeFigures(out, LIB).set.layers.filter((l) => l.figure)).toHaveLength(2)
  })
  it('skips a char with no art, leaves the scene alone', () => {
    const lonely = scene([{ char: 'hond', pose: 'stand' }])
    expect(placeFigures(lonely, LIB)).toBe(lonely)
  })
  it('a scene with a fg or near figure gets no ground band in front of it (far band only)', () => {
    const bands = groundBandsFor(out, LIB)
    expect(bands).toHaveLength(1)
    expect(bands![0].z).toBeGreaterThan(10)
  })
})

describe('spread', () => {
  it('moves the non-main figure, never the main one', () => {
    const r = spread([{ x: 0.5, depth: 'fg' as const, main: true }, { x: 0.52, depth: 'fg' as const }])
    expect(r[0].x).toBe(0.5)
    expect(r[1].x).toBeCloseTo(0.5 + SPREAD)
  })
})

describe('a crane shot cannot throw the speaker away', () => {
  it('a high camera (tilt from the sky) is lowered to eye height, and the lens is no wider than the house lens', () => {
    const p = holdPose({ x: 0, y: 4, z: -2, fov: 60 }, { z: 7, x: 0, h: 1.3 })
    expect(p.y).toBeLessThanOrEqual(1.6)
    expect(p.fov).toBeLessThanOrEqual(50)
    expect(1.3 / (2 * (7 - p.z) * Math.tan((p.fov * Math.PI) / 360))).toBeGreaterThanOrEqual(0.25)
  })
})
