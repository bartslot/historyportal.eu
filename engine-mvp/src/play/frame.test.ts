import { describe, expect, it } from 'vitest'
import { headOnScreen } from './frame'
import type { Scene } from '../stage25d/types'

const scene = (extra: Partial<Scene> = {}): Scene => ({ id: 's', set: { layers: [] }, camera: null, ...extra })

describe('headOnScreen', () => {
  it('a figure at the centre of the house view is mid-frame horizontally, its head near the horizon', () => {
    const h = headOnScreen(scene(), { depth: 'fg', x: 0.5 }, 1.7, 0)!
    expect(h.x).toBeCloseTo(0.5, 2)
    expect(h.y).toBeGreaterThan(0.4)
    expect(h.y).toBeLessThan(0.6)
  })
  it('x follows the layer: left of centre is left on screen', () => {
    expect(headOnScreen(scene(), { depth: 'mid', x: 0.2 }, 1.7, 0)!.x).toBeLessThan(0.3)
  })
  it('is null when the figure is off the frame (the camera trucked away)', () => {
    const cam = { from: { x: 0, y: 1.6, z: 0, fov: 50 }, to: { x: 6, y: 1.6, z: 0, fov: 50 }, dur_s: 4, ease: 'linear' as const }
    expect(headOnScreen(scene({ camera: cam, dur_s: 4 }), { depth: 'fg', x: 0.5 }, 1.7, 4)).toBeNull()
  })
})
