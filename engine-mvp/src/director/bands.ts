// Ground bands: the bare floor tile over ~45 % of the frame was the #1 fault of every art review (Claude and
// ChatGPT, 10-28). A painted band (library asset: layer ground_band, or a strip tagged `ground`) standing on the
// floor covers it with the same ink and wash as the rest. The director proposes one for an outdoor dry scene that
// names none, behind the middle plane (so it never cuts a hut or a hunebed), and a low one in front of it. The
// low band crests under the middle plane's floor row (a band at z stands 0.15 z tall: z 5.5 crests at 6 degrees
// below the horizon, the middle plane's feet are at 4) and it would bury anything standing at fg (7 m), so a scene
// with fg or near layers gets the far band only.
// A scene that carries its own set.groundBands, or says `bands: false`, keeps what it has.
import { habitatOf } from './dress'
import type { Library, LibraryAsset, Scene } from './types'

export type GroundBand = { asset: string; z: number }
/** metres from the camera: behind mid (22 m); in front of mid and fg (7 m) */
export const BAND_Z = { far: 30, near: 5.5 } as const

/** A band is a strip: at least this much wider than tall (grass-tall-01 is tagged `ground` too and is no band). */
export const BAND_ASPECT = 2

/** The library's band assets: explicit ground_band, else wide non-floor strips tagged `ground`; best score, then id. */
export function bandAssets(library: Library | null): LibraryAsset[] {
  const pool = (library?.assets ?? []).filter((a) => a.layer === 'ground_band' || (a.layer !== 'ground' && a.layer !== 'sky' && a.tags.includes('ground') && (a.w ?? 0) >= BAND_ASPECT * (a.h ?? Infinity)))
  return [...pool].sort((a, b) => (b.qa?.score ?? 0) - (a.qa?.score ?? 0) || a.id.localeCompare(b.id))
}

/** Reeds alone make a scene `wet` (a farm by a stream); open water keeps the floor: no meadow on the sea. */
const OPEN_WATER = /\b(water|sea|river|canal|lake|coast|shore|swamp|delta|nile|euphrates|marsh|polder)\b/
function onOpenWater(scene: Scene, library: Library | null): boolean {
  const byId = new Map((library?.assets ?? []).map((a) => [a.id, a]))
  // a reed bed at fg is tagged water and marsh, but it is a plant at the edge of the frame, not the scene's water
  const said = [scene.set.ground, ...scene.set.layers.flatMap((l) => {
    const a = l.asset ? byId.get(l.asset) : undefined
    return [l.need, l.asset, ...(a && a.layer !== 'fg' && a.layer !== 'prop' ? a.tags : [])]
  })]
  return OPEN_WATER.test(said.filter(Boolean).join(' ').toLowerCase())
}

/** The bands for a scene, or undefined when it keeps its floor (indoors, deck, quay, open water; own bands; opted out).
 *  Two different strips when the library has them (far: behind mid; near: the better one, in front), else one twice. */
export function groundBandsFor(scene: Scene, library: Library | null): GroundBand[] | undefined {
  if (scene.bands === false || scene.set.groundBands?.length) return undefined
  const habitat = habitatOf(scene, library)
  if (habitat !== 'dry' && !(habitat === 'wet' && !onOpenWater(scene, library))) return undefined
  const [near, far = near] = bandAssets(library)
  if (!near) return undefined
  const front = scene.set.layers.some((l) => l.depth === 'fg' || l.depth === 'near')
  return [{ asset: far.id, z: BAND_Z.far }, ...(front ? [] : [{ asset: near.id, z: BAND_Z.near }])]
}
