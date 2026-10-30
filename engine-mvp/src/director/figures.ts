// Figures: the writer's `figures[]` (char, pose, x, depth, facing) become painted cutout layers the stage draws like
// props (library layer `figure`, tags char:<id> pose:<pose> facing:<left|right>; the left-facing file is the mirror).
// Bart, 10-30: 39 of 59 hunebedden scenes had speech balloons and nobody in frame. The rules:
//  - pick by char + pose; facing left takes the mirrored file; an unknown pose falls back (pull -> push, ... -> stand)
//  - the speaker (whoever has a balloon, else the first figure) stands at fg and is a little bigger than life if it is a child
//    or kneels (to MAX_SCALE); director/speaker.ts then holds every shot's camera where the speaker is at least MAIN_MIN
//    of the frame height. Nothing is shrunk to fit.
//  - everyone else keeps the writer's depth unless that makes them a speck (< OTHER_MIN of the frame height, seen from
//    the reference camera), then they step up to fg
//  - figures at one depth are kept apart (SPREAD) so nobody stands inside another
//  - a figure at fg makes the scene a "front" scene: the director's near ground band is left out (bands.ts), a band in
//    front of a figure would hide its feet. Layers are drawn by distance, so a figure over a far band is fine.
import { DEPTH_Z } from './camera'
import type { Depth, Figure, Library, LibraryAsset, Scene } from './types'

import { MAIN_MIN, speakerFigure } from './speaker'

export { MAIN_MIN }
export const OTHER_MIN = 0.08
export const MAX_SCALE = 1.3
export const SPREAD = 0.14
export const FIG_FOV_DEG = 50
/** The camera the scene opens on, for sizing: the house camera pulled in a little by a medium push. */
export const REF_CAM_Z = 2.5
/** Vertical metres the reference camera sees at a depth. */
export const viewHeight = (depth: Depth): number => 2 * (DEPTH_Z[depth] - REF_CAM_Z) * Math.tan((FIG_FOV_DEG * Math.PI) / 360)
/** Share of the frame height a figure of this height fills when it stands at this depth. */
export const frameShare = (heightM: number, depth: Depth, scale = 1): number => (heightM * scale) / viewHeight(depth)

const LADDER: Depth[] = ['mid', 'fg']
/** The poses a writer may ask for that the library does not draw, and what stands in for them. */
const POSE_ALIAS: Record<string, string> = { pull: 'push', climb: 'push', row: 'push', lie: 'sit', run: 'walk', talk: 'stand', wave: 'point' }

const hasTag = (a: LibraryAsset, tag: string) => a.tags.includes(tag)

/** The cutout for a figure, or null when the library has nobody by that char. */
export function figureAsset(lib: Library | null, char: string, pose: string | undefined, facing: 'left' | 'right' = 'right'): LibraryAsset | null {
  const mine = (lib?.assets ?? []).filter((a) => a.layer === 'figure' && hasTag(a, `char:${char}`))
  if (!mine.length) return null
  const want = [pose, POSE_ALIAS[pose ?? ''], 'stand'].filter((p): p is string => !!p)
  for (const p of want) {
    const hit = mine.find((a) => hasTag(a, `pose:${p}`) && hasTag(a, `facing:${facing}`))
    if (hit) return hit
  }
  return null
}

/** The speaker: at fg, scaled up a little (to MAX_SCALE) until it fills MAIN_MIN of the frame from the reference camera. */
export function mainStand(heightM: number): { depth: Depth; scale: number } {
  const scale = Math.min(MAX_SCALE, Math.max(1, MAIN_MIN / frameShare(heightM, 'fg')))
  return { depth: 'fg', scale: Math.round(scale * 100) / 100 }
}

/** Anyone else: the writer's depth (bg counts as mid), one step nearer when that makes them a speck. */
export function otherStand(heightM: number, written: Depth | undefined): { depth: Depth; scale: number } {
  const from = written === 'fg' || written === 'near' ? 1 : 0
  const depth = LADDER.slice(from).find((d) => frameShare(heightM, d) >= OTHER_MIN) ?? 'fg'
  return { depth, scale: 1 }
}

/** The speaker of a scene: the first balloon whose char has a figure here, else the first figure. */
export const speakerOf = (scene: Scene): string | null => speakerFigure(scene)?.char ?? null

/** Keep figures at one depth apart: sorted by x, each is pushed right to SPREAD from the one before (the main figure stays put). */
export function spread<T extends { x: number; depth: Depth; main?: boolean }>(items: T[]): T[] {
  const out = items.map((i) => ({ ...i }))
  for (const d of LADDER) {
    const row = out.filter((i) => i.depth === d).sort((a, b) => a.x - b.x)
    for (let k = 1; k < row.length; k++) {
      if (row[k].x - row[k - 1].x >= SPREAD) continue
      const mover = row[k].main && !row[k - 1].main ? row[k - 1] : row[k]
      mover.x = Math.min(0.92, Math.max(0.08, mover === row[k] ? row[k - 1].x + SPREAD : row[k].x - SPREAD))
    }
  }
  return out
}

/** The scene with its figures as layers (earlier figure layers dropped first, so a re-run never doubles them) and
 *  `figures[]` rewritten to where they now stand (the camera frames the speaker there). Unchanged when nobody is drawn. */
export function placeFigures(scene: Scene, lib: Library | null): Scene {
  const base = scene.set.layers.filter((l) => !l.figure)
  const figs = scene.figures ?? []
  const main = speakerOf(scene)
  const placed = figs.flatMap((f: Figure) => {
    const a = figureAsset(lib, f.char, f.pose, f.facing === 'left' ? 'left' : 'right')
    if (!a) return []
    const isMain = f.char === main
    const h = a.height_m ?? 1.7
    const { depth, scale } = isMain ? mainStand(h) : otherStand(h, f.depth)
    return [{ f, a, depth, scale, h, x: f.x ?? 0.5, main: isMain }]
  })
  if (!placed.length) return base.length === scene.set.layers.length ? scene : { ...scene, set: { ...scene.set, layers: base } }
  const apart = spread(placed)
  const layers = apart.map((p) => ({ asset: p.a.id, need: `char:${p.f.char} pose:${p.f.pose ?? 'stand'}`, depth: p.depth, x: p.x, scale: p.scale, figure: p.f.char, shadow: 0.85 }))
  const moved = new Map(apart.map((p) => [p.f, p]))
  return {
    ...scene,
    set: { ...scene.set, layers: [...base, ...layers] },
    figures: figs.map((f) => { const p = moved.get(f); return p ? { ...f, depth: p.depth, x: p.x, scale: p.scale, h_m: Math.round(p.h * p.scale * 1000) / 1000 } : f }),
  }
}
