// Which clumps and bushes a scene gets, pure: per floor slot the plants of the ground you see there (the scene's
// ground bands when it has them, else that slot's picture), seeded by the scene id. stage.ts draws them (scatter-gl).
import { CLUMP_MAX, clumpPicks, horizonPicks, scatter, seedOf, type Clump, type Sprite } from './scatter'
import type { GroundSlot } from './ground'

/** Clumps from here to here (metres); past it the floor is a thin line and grass would only flicker. */
export const GRASS_RANGE = [3, 60] as const
/** Bushes on the horizon stand this far out, at most HORIZON_MAX of them. */
export const HORIZON_RANGE = [60, 300] as const
export const HORIZON_MAX = 80
/** Horizon bushes against their picture's own height. Was 1.8 (to read as tufts 100 m off); Bart 11-11: "less tall
 *  bushes afar, they are too tall". A bit under life size, so the row reads far. */
export const HORIZON_SIZE = 0.8

export interface StrewPlan { picks: Sprite[]; clumps: Clump[]; horizon?: boolean }

/** The tags of the ground a slot shows: the slot picture's, and the ground bands' with them. Strips are bare soil standing
 *  on the floor (Bart 11-12), so the floor still shows between them: its plants grow there too (Bart 11-13). */
const tagsOf = (slot: GroundSlot, bandTags: string[] | null) => [...slot.asset.tags, ...(bandTags ?? [])]

/** grass, bushes: the look's Gras and Horizon (0..1). front: the scene's cameraFront. With ground bands there is no
 *  horizon row: the farthest band's painted crest is the horizon, and bushes behind it would never show. */
export function strewPlan(o: { sceneId: string; slots: GroundSlot[]; bandTags: string[] | null; sprites: Sprite[]; grass: number; bushes: number; front: number }): StrewPlan[] {
  const out: StrewPlan[] = []
  const span = Math.log(GRASS_RANGE[1] / GRASS_RANGE[0])
  o.slots.forEach((slot, i) => {
    const from = Math.max(GRASS_RANGE[0], slot.from), to = Math.min(GRASS_RANGE[1], o.slots[i + 1]?.from ?? Infinity)
    if (to <= from) return
    const picks = clumpPicks(o.sprites, tagsOf(slot, o.bandTags))
    const count = o.grass * CLUMP_MAX * (Math.log(to / from) / span)   // as many per screen row on every slot
    out.push({ picks, clumps: scatter({ picks, count, from, to, front: o.front, seed: seedOf(`${o.sceneId}:grass:${i}`) }) })
  })
  const last = o.slots[o.slots.length - 1]
  if (last && !o.bandTags) {
    const picks = horizonPicks(o.sprites, last.asset.tags)
    out.push({ picks, horizon: true, clumps: scatter({ picks, count: o.bushes * HORIZON_MAX, from: HORIZON_RANGE[0], to: HORIZON_RANGE[1], front: o.front, size: HORIZON_SIZE, seed: seedOf(`${o.sceneId}:horizon`) }) })
  }
  return out.filter((p) => p.clumps.length)
}
