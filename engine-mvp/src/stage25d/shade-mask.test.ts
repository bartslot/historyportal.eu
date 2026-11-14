import { describe, expect, it } from 'vitest'
import { shadeMaskUrl } from './layer'

// rig_parts.py writes a flat rig's shade mask beside its atlas: fig.webp -> fig-shade.webp
describe('shadeMaskUrl', () => {
  it('names the mask beside the atlas', () => {
    expect(shadeMaskUrl('/storage/lessons/4/edits/fig-ana-flat-rig-01.webp')).toBe('/storage/lessons/4/edits/fig-ana-flat-rig-01-shade.webp')
  })
  it('keeps a cache-busting query after the name', () => {
    expect(shadeMaskUrl('/a/fig.webp?v=3')).toBe('/a/fig-shade.webp?v=3')
  })
  it('gives an atlas without an extension a .webp mask', () => {
    expect(shadeMaskUrl('/a/fig')).toBe('/a/fig-shade.webp')
  })
})
