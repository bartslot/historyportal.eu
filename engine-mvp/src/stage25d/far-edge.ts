import type { Asset, Library, Scene } from './types'

/** One word for a tag, singular: 'trees' matches 'tree'. */
const stem = (t: string) => t.replace(/s$/, '')
/** Tags every far piece carries: they say what it is for, not what it shows, so they never count as a match. */
const FAR_TAGS = ['far', 'horizon']

/** A far piece: a low, wide, tileable silhouette made to stand on the horizon (a tree line, hills, palms, dunes, swell).
 *  A terrain's own far edge (another asset's `horizon`) is the terrain's, not a free piece. */
const farPieces = (lib: Library): Asset[] => {
  const edges = new Set(lib.assets.map((a) => a.horizon).filter(Boolean))
  return lib.assets.filter((a) => FAR_TAGS.every((t) => a.tags.includes(t)) && a.tileable_x && !edges.has(a.id))
}

/**
 * What stands on the horizon of a scene with nothing there (Bart 11-13: "we need dunes or trees or anything but it
 * has to be context agnostic"): the far piece of the scene's own library that shares most tags with the pictures in
 * the scene, ties to the first by id, so every world gets its own (palms by a Babylonian field, a tree line by a
 * hunebed) without a list per period. `set.farEdge` names another piece, or 'none'. A scene whose far landscape is
 * already there (a far strip, a terrain with its own edge) gets nothing.
 */
export function farEdgeOf(set: Scene['set'], lib: Library, terrainEdge?: string): string | null {
  if (set.farEdge === 'none') return null
  if (set.farEdge) return lib.assets.some((a) => a.id === set.farEdge) ? set.farEdge : null
  const byId = new Map(lib.assets.map((a) => [a.id, a]))
  if (terrainEdge || set.layers.some((l) => byId.get(l.asset ?? '')?.layer === 'bg')) return null
  const used = [...set.layers.map((l) => l.asset ?? ''), ...(set.groundBands ?? []).map((g) => g.asset), ...(set.groundSlots ?? []).map((g) => g.asset), set.sky ?? '']
  const seen = new Set(used.flatMap((id) => byId.get(id)?.tags ?? []).filter((t) => !FAR_TAGS.includes(t)).map(stem))
  const ranked = farPieces(lib)
    .map((a) => ({ id: a.id, score: a.tags.filter((t) => !FAR_TAGS.includes(t) && seen.has(stem(t))).length }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return ranked[0]?.id ?? null
}

/** The far pieces a teacher can choose from for this scene's horizon. */
export const farEdgeOptions = (lib: Library): string[] => farPieces(lib).map((a) => a.id).sort()
