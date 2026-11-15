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
 * World metres to add to the figure's x at time t so that the foot standing between two contact keys stays where it
 * stood, carried on through the steps in between. `foot(time, side)` is that foot's world x as the keys alone put it
 * (the layer's x plus the ankle, bent as the rig bends). One foot locks at a time: the one already standing keeps the
 * lock while it stands. A key that tips the whole body over (a fall, `rotation`) is no run: it turns about the feet.
 */
export function footLockOffset(keys: readonly LayerKey[], t: number, foot: (time: number, side: Side) => number): number {
  const ck = contactKeys(keys)
  if (ck.length < 2 || t <= ck[0].t) return 0
  const tipped = (k: LayerKey) => Math.abs(k.rotation ?? 0) > 1e-6
  let offset = 0
  let lock: Side | null = null
  for (let i = 0; i + 1 < ck.length; i++) {
    const a = ck[i], b = ck[i + 1]
    if (a.t >= t) break
    const stand = tipped(a) || tipped(b) ? [] : FEET[a.contact!]?.filter((s) => FEET[b.contact!]?.includes(s)) ?? []
    lock = lock && stand.includes(lock) ? lock : stand[0] ?? null
    if (!lock) continue
    const end = Math.min(t, b.t)
    offset += foot(a.t, lock) - foot(end, lock)
    if (t <= b.t) break
  }
  return offset
}
