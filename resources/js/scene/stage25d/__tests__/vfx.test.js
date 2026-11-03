import { describe, expect, it } from 'vitest'
import { assetIcon, assetLabel } from '../labels.js'
import { structureSig } from '../live.js'

const fire = { id: 'campfire-01', layer: 'mid', kind: 'animation', cols: 12, rows: 4, frames: 48, fps: 12, tags: ['fire'] }

describe('stage25d animations (VFX)', () => {
  it('an animation gets the sparkles glyph in the object list, a still fire keeps the picture one', () => {
    expect(assetIcon(fire)).toBe('vfx')
    expect(assetIcon({ ...fire, kind: undefined })).toBe('photo')
  })

  it('reads as a campfire', () => {
    expect(assetLabel(fire, 'nl')).toBe('Kampvuur')
  })

  it('a change of speed or start is no rebuild', () => {
    const set = (play) => ({ set: { layers: [{ asset: 'campfire-01', depth: 'mid', play }] } })
    expect(structureSig(set({ speed: 2, offset: 1 }))).toBe(structureSig(set(undefined)))
  })
})
