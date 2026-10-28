// The floor of the stage, pure parts: which ground a scene uses, the colour the far landscape ends in (so the ground
// fades into it), and how big a contact stain is. The GL side is ground-gl.ts.
import { resolveAsset } from './library'
import type { Asset, Library, Scene } from './types'

/** History Lines paper (vault STYLE.md); a bundle may name its own in library.json `paper`. */
export const PAPER = '#f6f5ee'
/** The bottom of a bg strip feathers into the ground over this share of its height (layer.feather overrides). */
export const BG_FEATHER = 0.22
/** A layer's soft lower edge: only bg STRIPS feather (the feather is painted opaque, so on a prop's quad, even one
 *  placed at depth bg, it would turn the see-through part into a solid block). */
export const featherOf = (asset: { layer: string }, layer: { feather?: number }): number =>
  asset.layer === 'bg' ? layer.feather ?? BG_FEATHER : 0
/** Contact stain opacity under mid/fg assets (layer.shadow overrides; 0 = none). */
export const STAIN_DEFAULT = 0.6
/** Metres the ground art repeats over when the asset does not say (asset.height_m = one tile's depth). */
export const GROUND_TILE_M = 12

export type GroundChoice = { kind: 'asset'; asset: Asset } | { kind: 'paper'; colour: string; reason?: string }

/** set.ground: an asset id or tags (a 'ground' asset), a '#hex' wash, or nothing (the bundle's first ground, else paper). */
export function resolveGround(set: Scene['set'], lib: Library & { paper?: string }): GroundChoice {
  const paper = lib.paper ?? PAPER
  const g = set.ground
  if (g && g.startsWith('#')) return { kind: 'paper', colour: g }
  const grounds = lib.assets.filter((a) => a.layer === 'ground')
  if (!g) return grounds.length ? { kind: 'asset', asset: [...grounds].sort((a, b) => a.id.localeCompare(b.id))[0] } : { kind: 'paper', colour: paper }
  const asset = resolveAsset({ ...lib, assets: grounds }, { asset: g }, 'ground')
  return asset ? { kind: 'asset', asset } : { kind: 'paper', colour: paper, reason: `no ground for ${g}` }
}

/** The colour (0..1) a strip's bottom rows are painted in: the per-channel median of their opaque pixels, so the
 *  sparse ink and plant marks do not darken it (an average turned a cream heath into a dark sand band). */
export function bottomColour(data: Uint8ClampedArray | Uint8Array, w: number, h: number, share = 0.08): [number, number, number] | null {
  return bandColour(data, w, h, 1 - share, 1)
}

/** The same median colour for the rows between from and to (0 = top, 1 = bottom of the picture). */
export function bandColour(data: Uint8ClampedArray | Uint8Array, w: number, h: number, from: number, to: number): [number, number, number] | null {
  const r0 = Math.max(0, Math.floor(h * from)), r1 = Math.min(h, Math.max(r0 + 1, Math.ceil(h * to)))
  const ch: number[][] = [[], [], []]
  const step = Math.max(1, Math.floor((w * (r1 - r0)) / 20000))   // a sample is enough on big images
  for (let p = r0 * w; p < r1 * w; p += step) {
    const i = p * 4
    if (data[i + 3] < 200) continue
    ch[0].push(data[i]); ch[1].push(data[i + 1]); ch[2].push(data[i + 2])
  }
  if (!ch[0].length) return null
  const med = (v: number[]) => { const s = [...v].sort((x, y) => x - y); return s[s.length >> 1] / 255 }
  return [med(ch[0]), med(ch[1]), med(ch[2])]
}

/** A picture's colour per band of rows, top to bottom (SKY_BANDS bands): where a sky meets the floor is only known
 *  once it is placed, so the loader keeps the bands and the stage picks one. */
export const SKY_BANDS = 32
export const rowBands = (data: Uint8ClampedArray | Uint8Array, w: number, h: number) =>
  Array.from({ length: SKY_BANDS }, (_, b) => bandColour(data, w, h, b / SKY_BANDS, (b + 1) / SKY_BANDS))

/** The band at height f of a placed picture (0 = its bottom edge, 1 = its top): a sky's colour at the horizon. */
export const bandAt = (bands: ([number, number, number] | null)[], f: number) =>
  bands[Math.min(SKY_BANDS - 1, Math.max(0, Math.floor((1 - f) * SKY_BANDS)))] ?? null

/** How dark this picture's ink is: the median brightness (0..1) of its opaque line pixels (null: no line pixels). */
export function inkLevel(data: Uint8ClampedArray | Uint8Array, w: number, h: number): number | null {
  const v: number[] = []
  const step = Math.max(1, Math.floor((w * h) / 60000))
  for (let p = 0; p < w * h; p += step) {
    const i = p * 4
    if (data[i + 3] < 230) continue
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255
    if (l < 0.45) v.push(l)
  }
  if (v.length < 20) return null
  v.sort((a, b) => a - b)
  return v[v.length >> 1]
}

/** Where a strip's land starts: the first row (share of the height, from the top) that is mostly opaque. */
export function landTop(data: Uint8ClampedArray | Uint8Array, w: number, h: number): number {
  for (let y = 0; y < h; y++) {
    let n = 0
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) n++
    if (n / w > 0.5) return y / h
  }
  return 0
}

/** Eye height of the house camera (layout HOUSE.y): a flat stain is foreshortened by eye / distance. */
const EYE_M = 1.6
/** On screen a stain is this share of its width tall, at any distance. */
const STAIN_SCREEN_RATIO = 0.12

/** The stain under an asset at distance z: as wide as its foot (never wider than half its height), and deep enough
 *  in metres that, lying flat and seen from eye height, it still reads as a soft foot on screen (a fixed 0.32 x width
 *  was 2 px tall at 22 m). Most of its depth is hidden behind the asset. */
export function stainSize(asset: Asset, w: number, h: number, z: number): { w: number; d: number } {
  const foot = Math.min(w * 0.8, h * 0.55, 6)
  const d = (foot * STAIN_SCREEN_RATIO * z) / EYE_M
  return { w: foot, d: Math.min(Math.max(d, foot * 0.3), foot * 3) }
}

/** The ground assets a teacher can pick for a scene: from the library that scene is built with (its own bundle, else
 *  the lesson's), sorted by id. */
/** Near ground choices in the scene's own bundle: the wide painted strips that are not sky, far landscape or floor tile. */
export const nearOptions = (sceneLib: Library): string[] =>
  sceneLib.assets.filter((a) => a.layer === 'near_ground' || (!['sky', 'bg', 'ground', 'decal'].includes(a.layer) && !a.tileable_x && a.w / a.h >= NEAR_MIN_RATIO)).map((a) => a.id).sort()
/** A near band is wide: at least this many times as wide as it is tall. */
export const NEAR_MIN_RATIO = 2.2
export const groundOptions = (sceneLib: Library): string[] => sceneLib.assets.filter((a) => a.layer === 'ground').map((a) => a.id).sort()

export const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
