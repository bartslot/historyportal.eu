// Strewn ground, pure parts: grass clumps over the floor and bushes on the horizon, as upright sprites (billboards).
// Which sprites stand on a ground follows that ground's tags (grass on a grass floor, nothing on ice); where they
// stand is seeded per scene, so the same scene always looks the same. The GL side is scatter-gl.ts.
import { isBandPicture, viewWidthAt } from './layout'
import type { Asset, Library } from './types'

/** One picture to strew: a library plant, or one cell of a sprite sheet (cell: uv [u0, v0, du, dv], v 0 at the top). */
export interface Sprite { asset: string; file: string; tags: string[]; height_m: number; aspect: number; cell: [number, number, number, number] }
/** One strewn sprite: where it stands (metres), how tall, which pick, its sway phase. */
export interface Clump { x: number; z: number; h: number; pick: number; phase: number }

/** At most this many clumps per scene (classroom laptops). */
export const CLUMP_MAX = 600
/** A clump is low: taller plants are bushes for the horizon row. */
export const CLUMP_MAX_M = 1.5
/** No clump stands nearer the camera than this (it would fill the frame). */
export const CLUMP_CLEAR_M = 2
/** Across: this share of the view width at its distance on either side (room for a truck of a few metres). */
const ACROSS = 0.8
const PLANT_TAGS = ['grass', 'heather', 'reeds', 'shrub', 'bramble', 'juniper', 'hazel', 'meadow', 'fern', 'tree', 'bush', 'sedge', 'flower']
const BUSH_TAGS = ['shrub', 'tree', 'bush', 'bramble', 'hedge']
/** Tags every ground carries: never a reason to match. */
const PLAIN = ['ground']

/** mulberry32: a small seeded random (0..1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A string's seed (FNV-1a). */
export function seedOf(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

const isPlant = (a: Asset) => a.layer !== 'ground' && a.layer !== 'sky' && a.layer !== 'bg' && a.layer !== 'figure'
  && !a.tileable_x && !isBandPicture(a) && a.kind !== 'animation' && a.tags.some((t) => PLANT_TAGS.includes(t))

/** Everything a library can strew: the cells of its sprite sheets (kind 'sheet', cells in library.json), else its
 *  single plant pictures. A bundle with a sheet strews only from its sheets, so a new sheet replaces the stand-in
 *  without a code change. */
export function spritesOf(lib: Library): Sprite[] {
  const sheets = lib.assets.filter((a) => a.kind === 'sheet')
  if (sheets.length) {
    return sheets.flatMap((a) => (a.cells ?? []).map((c): Sprite => ({ asset: a.id, file: a.file, tags: c.tags, height_m: c.height_m, aspect: (c.rect[2] * a.w) / Math.max(1, c.rect[3] * a.h), cell: c.rect })))
  }
  return lib.assets.filter(isPlant).map((a) => ({ asset: a.id, file: a.file, tags: a.tags, height_m: a.height_m, aspect: a.w / Math.max(1, a.h), cell: [0, 0, 1, 1] }))
}

const shares = (s: Sprite, groundTags: string[]) => s.tags.some((t) => !PLAIN.includes(t) && groundTags.includes(t))

/** The low plants that grow on a ground with these tags. */
export const clumpPicks = (sprites: Sprite[], groundTags: string[]): Sprite[] =>
  sprites.filter((s) => s.height_m <= CLUMP_MAX_M && !s.tags.includes('tree') && shares(s, groundTags))

/** A ground things grow on (a meadow, a heath, a field edge): its horizon gets the bundle's shrubs when none of them
 *  share its tags. Ice, sand, water get none. */
const GREEN = ['grass', 'meadow', 'heath', 'field', 'hedge', 'forest', 'marsh', 'wet', 'edge', 'heather']

/** The bushes and trees that stand on that ground's horizon: its own, else (a green ground) the bundle's shrubs. */
export function horizonPicks(sprites: Sprite[], groundTags: string[]): Sprite[] {
  const bushes = sprites.filter((s) => s.height_m > CLUMP_MAX_M && s.tags.some((t) => BUSH_TAGS.includes(t)))
  const own = bushes.filter((s) => shares(s, groundTags))
  if (own.length || !groundTags.some((t) => GREEN.includes(t))) return own
  return bushes.filter((s) => !s.tags.includes('tree'))
}

export interface ScatterSpec { picks: Sprite[]; count: number; from: number; to: number; front: number; seed: number; size?: number }

/** Clumps over x and z: z log-uniform between from and to (as many per screen row near as far), x across the view at
 *  that distance, heights jittered 0.7..1.3, sorted far to near (the draw order within one bucket). */
export function scatter(spec: ScatterSpec): Clump[] {
  const n = Math.min(CLUMP_MAX, Math.max(0, Math.round(spec.count)))
  if (!spec.picks.length || !n) return []
  const r = rng(spec.seed)
  const z0 = Math.max(spec.from, spec.front + CLUMP_CLEAR_M), z1 = Math.max(z0, spec.to)
  const out: Clump[] = []
  for (let i = 0; i < n; i++) {
    const z = z0 * Math.pow(z1 / z0, r())
    const pick = Math.floor(r() * spec.picks.length)
    out.push({ z, x: (r() * 2 - 1) * ACROSS * viewWidthAt(z), h: spec.picks[pick].height_m * (0.7 + 0.6 * r()) * (spec.size ?? 1), pick, phase: r() * Math.PI * 2 })
  }
  return out.sort((a, b) => b.z - a.z)
}

/** Distance buckets (metres, each 1.4x the last from 2.5 m): one mesh per bucket draws in the depth slot of its far
 *  edge, so a picture standing in a bucket covers the clumps behind it; finer buckets = fewer misorders, more draws. */
export const BUCKET_EDGES: number[] = [...Array.from({ length: 16 }, (_, i) => 2.5 * Math.pow(1.4, i + 1)), Infinity]
export const bucketOf = (z: number): number => BUCKET_EDGES.findIndex((e) => z < e)
