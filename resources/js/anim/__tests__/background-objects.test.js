import { describe, it, expect, vi, afterEach } from 'vitest'
import { propertiesFor } from '../properties.js'
import { backgroundObjects, readObjectProperty, writeObjectProperty } from '../scene-objects.js'
import { applyFrameTo } from '../scene-animation.js'
import { backgroundSource } from '../../scene/background-crop.js'

/**
 * Bart, 2026-10-17, on a split scene whose timeline said nothing could move: "why can't we animate
 * the background? i would like to animate it just like any other layer." The background was never
 * a timeline object: the objects came from the overlays only, and the registry had no kind for it.
 */

afterEach(() => { delete window.__backgrounds })

const twoPanels = () => {
  const crops = { 0: { x: 50, y: 50, zoom: 1, opacity: 1 }, 1: { x: 41, y: 29, zoom: 1, opacity: 1 } }
  window.__backgrounds = backgroundSource(['0', '1'].map((id) => ({ id, get: () => crops[id], set: (c) => { crops[id] = c } })))
  return crops
}

describe('the background as a timeline object', () => {
  it('has rows like any layer: pan X and Y, zoom and opacity', () => {
    expect(propertiesFor('bg').map((p) => p.key)).toEqual(['x', 'y', 'zoom', 'opacity'])
  })

  it('is listed once per picture: one on a single scene, one per panel on a split', () => {
    expect(backgroundObjects('Achtergrond')).toEqual([])
    window.__backgrounds = backgroundSource([{ id: '0', get: () => ({}), set () {} }])
    expect(backgroundObjects('Achtergrond')).toEqual([{ target: 'bg:0', kind: 'bg', label: 'Achtergrond' }])

    twoPanels()
    expect(backgroundObjects('Achtergrond').map((o) => [o.target, o.label]))
      .toEqual([['bg:0', 'Achtergrond 1'], ['bg:1', 'Achtergrond 2']])
  })

  it('reads and writes through the renderer, like a layer does', () => {
    const crops = twoPanels()
    expect(readObjectProperty('bg:1', 'x')).toBe(41)
    writeObjectProperty('bg:1', 'zoom', 2)
    expect(crops[1]).toEqual({ x: 41, y: 29, zoom: 2, opacity: 1 })
  })

  it('the player puts a sampled frame on the background it is showing', () => {
    const bg = { patch: vi.fn() }
    applyFrameTo({ 'bg:1': { x: 30, opacity: 0.5 } }, { bg })
    expect(bg.patch).toHaveBeenCalledWith('1', { x: 30, opacity: 0.5 })
  })
})
