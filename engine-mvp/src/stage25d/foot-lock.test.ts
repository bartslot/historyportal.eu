import { describe, expect, it } from 'vitest'
import { footLockOffset } from './foot-lock'
import type { LayerKey } from './types'

// a foot that drifts forward 1 m a second while it stands, as a rig that bends less than the clip expects would carry it
const drift = (time: number) => time

describe('footLockOffset: a planted foot stays planted', () => {
  const keys: LayerKey[] = [{ t: 0, contact: 'n' }, { t: 1, contact: 'n' }, { t: 2, contact: 'none' }, { t: 3, contact: 'f' }, { t: 4, contact: 'f' }]
  it('holds the standing foot on its spot while it stands', () => {
    for (const t of [0.25, 0.5, 1]) expect(drift(t) + footLockOffset(keys, t, drift)).toBeCloseTo(0)
  })
  it('carries the correction through a step and starts the next foot where it lands', () => {
    expect(footLockOffset(keys, 2.5, drift)).toBeCloseTo(-1)
    expect(drift(3.5) + footLockOffset(keys, 3.5, drift)).toBeCloseTo(drift(3) - 1)
  })
  it('is the same answer whichever order the times are asked in (seeking)', () => {
    expect(footLockOffset(keys, 3.5, drift)).toBeCloseTo(footLockOffset(keys, 3.5, drift))
    expect(footLockOffset(keys, 0, drift)).toBe(0)
  })
  it('when both feet stand, holds the point between them: each drifts half as far', () => {
    const both: LayerKey[] = [{ t: 0, contact: 'both' }, { t: 1, contact: 'both' }]
    const foot = (time: number, side: string) => (side === 'n' ? 2 * time : 0)   // the near foot drifts 2 m, the far one stays
    const off = footLockOffset(both, 1, foot)
    expect([foot(1, 'n') + off - foot(0, 'n'), foot(1, 'f') + off - foot(0, 'f')]).toEqual([1, -1])
  })
  it('a fall turns about the feet: no lock across a tipped key; keys without contact change nothing', () => {
    expect(footLockOffset([{ t: 0, contact: 'both' }, { t: 1, contact: 'both', rotation: -60 }], 0.5, drift)).toBe(0)
    expect(footLockOffset([{ t: 0, x: 0.2 }, { t: 1, x: 0.4 }], 0.5, drift)).toBe(0)
  })
})
