// An animation (a sprite sheet): one picture of cols x rows frames, played one frame at a time on the stage. The frame
// comes from the scene's own time, never a free-running clock, so a seek or a pause shows the same frame every time.
// The layer shader draws the frame's cell of the sheet (layer.ts `cell`), so paper, light and ink still apply.
import type { Asset, SceneLayer } from './types'

export const isAnimation = (a: Pick<Asset, 'kind' | 'cols' | 'rows'> | null | undefined): boolean =>
  a?.kind === 'animation' && (a.cols ?? 0) >= 1 && (a.rows ?? 0) >= 1

const FPS = 12

/** The frame on show (0-based) t seconds into the scene. play.speed scales the sheet's fps (0 holds a frame),
 *  play.offset is where in the animation (seconds) it starts. A loop wraps; else it stays on its last frame. */
export function frameAt(asset: Asset, play: SceneLayer['play'], t: number): number {
  const frames = Math.max(1, asset.frames ?? (asset.cols ?? 1) * (asset.rows ?? 1))
  const speed = play?.speed ?? 1
  const at = ((play?.offset ?? 0) + t * speed) * (asset.fps ?? FPS)
  const n = Math.floor(at + 1e-6)   // 1e-6: t * fps landing a hair under a whole frame still counts as that frame
  return asset.loop === false ? Math.min(frames - 1, Math.max(0, n)) : ((n % frames) + frames) % frames
}

/** Where frame n sits on the sheet, as uv [u0, v0, du, dv] (v 0 at the top, row by row from the top left). */
export function cellOf(asset: Asset, n: number): [number, number, number, number] {
  const cols = asset.cols ?? 1, rows = asset.rows ?? 1
  return [(n % cols) / cols, Math.floor(n / cols) / rows, 1 / cols, 1 / rows]
}
