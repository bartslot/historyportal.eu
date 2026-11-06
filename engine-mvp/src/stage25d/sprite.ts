// An animation (a sprite sheet): one picture of cols x rows frames, played one frame at a time on the stage. The frame
// comes from the scene's own time, never a free-running clock, so a seek or a pause shows the same frame every time.
// The layer shader draws the frame's cell of the sheet (layer.ts `cell`), so paper, light and ink still apply.
import type { Asset, SceneLayer } from './types'

export const isAnimation = (a: Pick<Asset, 'kind' | 'cols' | 'rows'> | null | undefined): boolean =>
  a?.kind === 'animation' && (a.cols ?? 0) >= 1 && (a.rows ?? 0) >= 1

/**
 * The asset as a layer's own file changes it. An edited copy may be cropped: it keeps the library's metres per pixel, so its
 * own pixel size sets its shape. A figure of parts is a drawing of the whole person at any pixel size: it stands at the library's
 * height, and its texture is an atlas, so the drawing gives the shape. `src` is what a pick reads.
 */
export const editedAsset = (asset: Asset, layer: { src?: string }, size: { width: number, height: number }, puppet?: { atlas: string, width: number, height: number, parts?: { quad: [number, number][] }[] } | null): Asset => {
  const src = layer.src ?? puppet?.atlas
  if (!src) return asset
  if (puppet) {
    // its drawing has empty canvas above the hair and under the soles: the body stands at that height, the soles on the ground
    const ys = puppet.parts?.flatMap((part) => part.quad.map(([, y]) => y)) ?? []
    const top = ys.length ? Math.min(...ys) : 0, sole = ys.length ? Math.max(...ys) : puppet.height
    return { ...asset, w: puppet.width, h: puppet.height, height_m: asset.height_m * (puppet.height / (sole - top)), anchor: [asset.anchor?.[0] ?? 0.5, sole / puppet.height], src }
  }
  if (!asset.w || !asset.h) return { ...asset, src }
  const sheet = isAnimation(asset)
  const w = size.width / (sheet ? asset.cols! : 1), h = size.height / (sheet ? asset.rows! : 1)   // a sheet: one frame's size
  return { ...asset, w, h, height_m: asset.height_m * (h / asset.h), src }
}

export const FPS = 12

/** How many frames a sheet holds. */
export const framesIn = (asset: Pick<Asset, 'frames' | 'cols' | 'rows'>): number => Math.max(1, asset.frames ?? (asset.cols ?? 1) * (asset.rows ?? 1))

/** The frames a layer plays, in order: its own list (the picture editor's Frames tab: shuffled, repeated, some left out), or all of them. */
export function sequenceOf(asset: Asset, play: SceneLayer['play']): number[] {
  const total = framesIn(asset)
  const own = (play?.frames ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < total)
  return own.length ? own : Array.from({ length: total }, (_, n) => n)
}

/** The frame on show, as a cell of the sheet (0-based), t seconds into the scene. play.speed scales the sheet's fps (0
 *  holds a frame), play.offset is where in the animation (seconds) it starts. A loop wraps; else it stays on its last frame. */
export function frameAt(asset: Asset, play: SceneLayer['play'], t: number): number {
  const sequence = sequenceOf(asset, play)
  const frames = sequence.length
  const speed = play?.speed ?? 1
  const at = ((play?.offset ?? 0) + t * speed) * (asset.fps ?? FPS)
  const n = Math.floor(at + 1e-6)   // 1e-6: t * fps landing a hair under a whole frame still counts as that frame
  const loop = play?.loop ?? asset.loop !== false
  return sequence[loop ? ((n % frames) + frames) % frames : Math.min(frames - 1, Math.max(0, n))]
}

/** Where frame n sits on the sheet, as uv [u0, v0, du, dv] (v 0 at the top, row by row from the top left). */
export function cellOf(asset: Asset, n: number): [number, number, number, number] {
  const cols = asset.cols ?? 1, rows = asset.rows ?? 1
  return [(n % cols) / cols, Math.floor(n / cols) / rows, 1 / cols, 1 / rows]
}
