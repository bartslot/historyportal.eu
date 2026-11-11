import { describe, expect, it, vi } from 'vitest'
import { figureAsset, frameShare, mainStand, MAIN_MIN, MAX_SCALE, otherStand, OTHER_MIN, placeFigures, SPREAD, speakerOf, spread } from './figures'
import { BUST_FIT, bustFit, FILL_MAX, frameEdges, hasBust, holdPose, holdSpeaker } from './speaker'
import { figureTracks } from './motion'
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

describe('close-ups (bust poses)', () => {
  const BUSTS: Library = { bundle: 't', assets: [
    ...LIB.assets, ...both('opa', 'side', 1.6),
    ...both('opa', 'bust', 0.53), ...both('opa', 'bust-back', 0.53), ...both('meisje', 'bust', 0.44),
  ] }
  const figLayer = (s: Scene, char: string) => s.set.layers.find((l) => l.figure === char)!
  const HOUSE_CAM = { x: 0, y: 1.6, z: 0, fov: 50 }

  it('a bust stands on the near plane, the frame bottom cuts its chest and the head sits in the upper part', () => {
    const out = placeFigures(scene([{ char: 'opa', pose: 'bust', x: 0.4 }]), BUSTS)
    const l = figLayer(out, 'opa')
    expect(l).toMatchObject({ asset: 'fig-opa-bust-01', depth: 'near', x: 0.4, shadow: 0 })
    const { bottom, top } = frameEdges(3.5, HOUSE_CAM)
    const headTop = (l.y ?? 0) + 0.53 * (l.scale ?? 1)
    expect(l.y!).toBeLessThan(bottom) // the bust's own bottom edge is below the frame
    expect(headTop).toBeLessThan(top)
    expect((headTop - bottom) / (top - bottom)).toBeGreaterThan(0.7)
    expect(out.figures![0]).toMatchObject({ depth: 'near', y: l.y })
  })
  it('the camera of a bust shot stays near the house pose: never lower, farther or wider than the pose it was sized from', () => {
    const out = placeFigures(scene([{ char: 'opa', pose: 'bust', x: 0.4 }]), BUSTS)
    const held = holdSpeaker({ from: { x: -2, y: 4, z: -3, fov: 58 }, to: { x: 2, y: 1.2, z: 3, fov: 35 } }, out)
    for (const p of [held.from, held.to]) {
      expect(p.y).toBe(1.6)
      expect(p.z).toBeGreaterThanOrEqual(0)
      expect(p.z).toBeLessThanOrEqual(0.5)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.25)
      expect(p.fov).toBeLessThanOrEqual(50)
      expect(frameEdges(3.5, p).bottom).toBeGreaterThanOrEqual(frameEdges(3.5, HOUSE_CAM).bottom - 1e-9)
    }
    expect(hasBust(out)).toBe(true)
  })
  it('bust-back frames the shot from the near edge it is closer to; the face seen over it is a bust at fg', () => {
    const out = placeFigures(scene([{ char: 'meisje', pose: 'bust', x: 0.6 }, { char: 'opa', pose: 'bust-back', x: 0.3 }]), BUSTS)
    const back = figLayer(out, 'opa')
    expect(back).toMatchObject({ asset: 'fig-opa-bust-back-01', depth: 'near', x: 0.12 })
    expect(figLayer(out, 'meisje')).toMatchObject({ asset: 'fig-meisje-bust-01', depth: 'fg' })
    const right = placeFigures(scene([{ char: 'opa', pose: 'bust-back', x: 0.7 }, { char: 'meisje', pose: 'stand' }]), BUSTS)
    expect(figLayer(right, 'opa').x).toBe(0.88)
    expect(figLayer(right, 'meisje').asset).toBe('fig-meisje-stand-01')
    // larger than a plain close-up, and partly out of frame
    const plain = bustFit(0.53, 3.5, BUST_FIT.close)
    expect(back.scale!).toBeGreaterThan(plain.scale)
  })
  it('a bust with no art falls back to the full-body pose, with a warning, never a crash', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = placeFigures(scene([{ char: 'opa', pose: 'bust-afraid', x: 0.5 }]), BUSTS)
    expect(figLayer(out, 'opa').asset).toBe('fig-opa-stand-01')
    expect(figLayer(out, 'opa').depth).toBe('fg')
    expect(out.figures![0].pose).toBe('bust-afraid') // the writer's ask stays, a re-run picks the art up
    expect(hasBust(out)).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('two busts in one shot: the first stays a bust, the second falls back to its full-body pose', () => {
    const out = placeFigures(scene([{ char: 'meisje', pose: 'bust', x: 0.3 }, { char: 'opa', pose: 'bust-side', x: 0.7 }]), BUSTS)
    expect(figLayer(out, 'meisje')).toMatchObject({ asset: 'fig-meisje-bust-01', depth: 'near' })
    expect(figLayer(out, 'opa').asset).toBe('fig-opa-side-01')
    const two = placeFigures(scene([{ char: 'opa', pose: 'bust' }, { char: 'meisje', pose: 'bust' }]), BUSTS)
    expect(figLayer(two, 'meisje').asset).toBe('fig-meisje-stand-01')
  })
  it('the bust breathes around its own y, not the ground', () => {
    const out = placeFigures(scene([{ char: 'opa', pose: 'bust', x: 0.4 }]), BUSTS)
    const y = figureTracks(out, 8)[0].keyframes.map((k) => k.value)
    expect(Math.abs(y[0] - figLayer(out, 'opa').y!)).toBeLessThan(0.01)
  })
})
