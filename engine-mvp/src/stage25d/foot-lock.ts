// A planted foot stays planted (Bart 11-15). An animation preset's keys say which feet stand (`contact`); their root x
// is fitted on the standard skeleton, but each rig bends its own way (its limits, a robe that holds its legs back,
// longer legs), so on the stage a standing foot would slide. Here the figure moves sideways, as it plays, by whatever
// keeps the standing foot where it stood: stateless (any t gives the same answer, so seeking and scrubbing agree).
import type { LayerKey } from './types'

export type Side = 'n' | 'f'
const FEET: Record<string, Side[]> = { n: ['n'], f: ['f'], both: ['n', 'f'], none: [] }

/** The keys that say which feet stand, in time order. */
export const contactKeys = (keys: readonly LayerKey[] | undefined): LayerKey[] =>
  (keys ?? []).filter((k) => typeof k.contact === 'string').sort((a, b) => a.t - b.t)

/**
 * World metres to add to the figure's x at time t so that what stands between two contact keys stays where it stood,
 * carried on through the steps in between. `foot(time, side)` is a foot's world x as the keys alone put it (the layer's
 * x plus the ankle, bent as the rig bends). One foot standing: that foot is held. Both standing: the point between them
 * is held, so a rig whose legs cannot bend as the clip asks (a skirt holding them back) lets each foot drift half as
 * far instead of one foot the whole way (PM 11-15). A key that tips the whole body over (a fall, `rotation`) is no run.
 */
export function footLockOffset(keys: readonly LayerKey[], t: number, foot: (time: number, side: Side) => number): number {
  const ck = contactKeys(keys)
  if (ck.length < 2 || t <= ck[0].t) return 0
  const tipped = (k: LayerKey) => Math.abs(k.rotation ?? 0) > 1e-6
  const held = (time: number, stand: Side[]) => stand.reduce((sum, s) => sum + foot(time, s), 0) / stand.length
  let offset = 0
  for (let i = 0; i + 1 < ck.length; i++) {
    const a = ck[i], b = ck[i + 1]
    if (a.t >= t) break
    const stand = tipped(a) || tipped(b) ? [] : FEET[a.contact!]?.filter((s) => FEET[b.contact!]?.includes(s)) ?? []
    if (stand.length) offset += held(a.t, stand) - held(Math.min(t, b.t), stand)
    if (t <= b.t) break
  }
  return offset
}

/** A held-back figure's turns: its leg turns scaled by how deep its legs can go (BentPuppet.legHold), so both legs
 *  bend alike inside what holds them; every other turn as it is. */
export function heldBones(bones: Record<string, number>, hold: number): Record<string, number> {
  if (hold >= 1) return bones
  return Object.fromEntries(Object.entries(bones).map(([name, deg]) => [name, /^(thigh|shin|foot)_/.test(name) ? deg * hold : deg]))
}

/** A held-back figure sinks only as deep as its legs bend: the drop below its own y (`base`), scaled the same way. */
export const heldY = (y: number, base: number, hold: number): number => (hold >= 1 || y >= base ? y : base + (y - base) * hold)
