// A small prop (library layer `prop`: a pot, an axe, pebbles) the writer stood at mid or bg depth is a speck: a 0.3 m
// pot at 22 m is 2 % of the frame high, and ten scenes of the first hunebedden run showed an empty field with a dot
// (look gate 2/10). The director brings it to fg (7 m) and sizes it to PROP_MIN_M, the way a painter would draw the
// thing the shot is about. Other layers, and props the writer already put at fg or nearer, stay as written.
import type { Library, Scene } from './types'

export const PROP_MIN_M = 1.3

export function liftSmallProps(scene: Scene, library: Library | null): Scene {
  const byId = new Map((library?.assets ?? []).map((a) => [a.id, a]))
  let changed = false
  const layers = scene.set.layers.map((l) => {
    const a = l.asset ? byId.get(l.asset) : undefined
    if (!a || a.layer !== 'prop' || !a.height_m || (l.depth !== 'mid' && l.depth !== 'bg')) return l
    changed = true
    return { ...l, depth: 'fg' as const, scale: Math.max(l.scale ?? 1, PROP_MIN_M / a.height_m) }
  })
  return changed ? { ...scene, set: { ...scene.set, layers } } : scene
}

/** Tags of a stone subject; a tree standing behind one at the same x reads as growing out of the stone. */
const STONE = new Set(['hunebed', 'chamber', 'dolmen', 'boulder', 'capstone', 'rollers', 'megalith', 'monument'])
export const TREE_CLEAR = 0.25

/** A far tree (bg) within TREE_CLEAR of a stone subject (mid) moves to the open side of the frame. */
export function clearTreesFromStone(scene: Scene, library: Library | null): Scene {
  const byId = new Map((library?.assets ?? []).map((a) => [a.id, a]))
  const tagsOf = (asset?: string | null) => (asset ? byId.get(asset)?.tags ?? [] : [])
  const stones = scene.set.layers.filter((l) => l.depth === 'mid' && tagsOf(l.asset).some((t) => STONE.has(t)))
  if (!stones.length) return scene
  let changed = false
  const layers = scene.set.layers.map((l) => {
    if (l.depth !== 'bg' || tagsOf(l.asset)[0] !== 'tree') return l
    const x = l.x ?? 0.5
    const hit = stones.find((st) => Math.abs((st.x ?? 0.5) - x) < TREE_CLEAR)
    if (!hit) return l
    changed = true
    return { ...l, x: (hit.x ?? 0.5) < 0.5 ? 0.85 : 0.15 }
  })
  return changed ? { ...scene, set: { ...scene.set, layers } } : scene
}

/** A subject the library paints for the middle plane (hut, hunebed, ramp) that the writer stood at bg is 70 m away
 *  behind the ground bands (a hunebedden scene showed an empty heath). It stands at mid. */
export function liftSubjects(scene: Scene, library: Library | null): Scene {
  const byId = new Map((library?.assets ?? []).map((a) => [a.id, a]))
  let changed = false
  const layers = scene.set.layers.map((l) => {
    if (l.depth !== 'bg' || !l.asset || byId.get(l.asset)?.layer !== 'mid') return l
    changed = true
    return { ...l, depth: 'mid' as const }
  })
  return changed ? { ...scene, set: { ...scene.set, layers } } : scene
}
