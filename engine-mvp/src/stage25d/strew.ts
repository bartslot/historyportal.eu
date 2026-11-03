// Which clumps and bushes a scene gets, pure: per floor slot the plants of the ground you see there (the scene's
// ground bands when it has them, else that slot's picture), seeded by the scene id. stage.ts draws them (scatter-gl).
import { CLUMP_MAX, clumpPicks, horizonPicks, scatter, seedOf, type Clump, type Sprite } from './scatter'
import type { GroundSlot } from './ground'

/** Clumps from here to here (metres); past it the floor is a thin line and grass would only flicker. */
export const GRASS_RANGE = [3, 60] as const
/** Bushes on the horizon stand this far out, at most HORIZON_MAX of them. */
export const HORIZON_RANGE = [60, 300] as const
export const HORIZON_MAX = 80

export interface StrewPlan { picks: Sprite[]; clumps: Clump[]; horizon?: boolean }

/** The tags of the ground a slot shows: the bands' own when the scene has ground bands (they carry the land you see),
 *  else the slot picture's. */
const tagsOf = (slot: GroundSlot, bandTags: string[] | null) => bandTags ?? slot.asset.tags

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
    out.push({ picks, horizon: true, clumps: scatter({ picks, count: o.bushes * HORIZON_MAX, from: HORIZON_RANGE[0], to: HORIZON_RANGE[1], front: o.front, seed: seedOf(`${o.sceneId}:horizon`) }) })
  }
  return out.filter((p) => p.clumps.length)
}
