import { describe, it, expect } from 'vitest'
import { editSig, groupId, structureSig } from '../live.js'

describe('stage25d live edits: groups and locks', () => {
  const cfg = (set) => ({ bundle: 'b', set: { layers: [{ asset: 'a', depth: 'mid', x: 0.5 }], ...set } })

  it('a group made, moved or a lock set is live: the same set, no rebuild, but the server copy changed', () => {
    const before = cfg({})
    const after = cfg({ layers: [{ asset: 'a', depth: 'mid', x: 0.5, group: 'g1', locked: 1 }], groups: [{ id: 'g1', rest: { x: 0.5, z: 22 }, x: 0.6 }] })
    expect(structureSig(after)).toBe(structureSig(before))
    expect(editSig(after)).not.toBe(editSig(before))
  })

  it('names a group row', () => {
    expect(groupId('group-g2')).toBe('g2')
    expect(groupId('layer-2')).toBeNull()
    expect(groupId('group-')).toBeNull()
  })
})
