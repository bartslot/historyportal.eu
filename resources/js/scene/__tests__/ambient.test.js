import { describe, it, expect, afterEach, vi } from 'vitest'
import { applyAmbient, ambientSpec } from '../ambient.js'
import { ParallaxScene } from '../ParallaxScene.js'
import { ArtworkOverlay } from '../ArtworkOverlay.js'

const stubReducedMotion = (reduce) => {
  window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: reduce && q.includes('reduce'), media: q }))
}

afterEach(() => {
  delete window.matchMedia
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('ambient layer motion', () => {
  it('puts the mode class and its variables on the wrapper', () => {
    const el = document.createElement('div')

    expect(applyAmbient(el, { ambient: 'breeze', ambient_speed: 2, ambient_amount: 1.5, asset_id: 7 })).toBe(true)
    expect(el.classList.contains('amb')).toBe(true)
    expect(el.classList.contains('amb-breeze')).toBe(true)
    expect(el.style.getPropertyValue('--amb-amount')).toBe('1.5')
    expect(el.style.getPropertyValue('--amb-dur')).toBe('3s')   // 6s breeze at speed 2
    expect(parseFloat(el.style.getPropertyValue('--amb-delay'))).toBeLessThanOrEqual(0)
    expect(document.getElementById('amb-styles')).not.toBeNull()
  })

  it('does nothing for none, a missing mode, or a mode it does not know', () => {
    for (const layer of [{ ambient: 'none' }, {}, { ambient: 'spin' }, null]) {
      const el = document.createElement('div')
      expect(applyAmbient(el, layer)).toBe(false)
      expect(el.className).toBe('')
    }
  })

  it('clears the previous motion when the mode changes, so the editor can preview in place', () => {
    const el = document.createElement('div')
    applyAmbient(el, { ambient: 'drift' })
    applyAmbient(el, { ambient: 'bob' })
    expect([...el.classList]).toEqual(['amb', 'amb-bob'])

    applyAmbient(el, { ambient: 'none' })
    expect(el.className).toBe('')
    expect(el.style.getPropertyValue('--amb-dur')).toBe('')
  })

  it('stays still under prefers-reduced-motion', () => {
    stubReducedMotion(true)
    const el = document.createElement('div')

    expect(applyAmbient(el, { ambient: 'drift' })).toBe(false)
    expect(el.className).toBe('')
  })

  it('clamps speed and amount to their ranges', () => {
    expect(ambientSpec({ ambient: 'drift', ambient_speed: 99, ambient_amount: -3 })).toMatchObject({ durS: 13.333, amount: 0 })
    expect(ambientSpec({ ambient: 'drift', ambient_speed: 0 })).toMatchObject({ durS: 160 })   // floor 0.25
    expect(ambientSpec({ ambient: 'drift', ambient_speed: null, ambient_amount: '' })).toMatchObject({ durS: 40, amount: 1 })
  })

  // Two clouds side by side must not move in lock-step.
  it('gives neighbouring layers different phases', () => {
    const a = ambientSpec({ ambient: 'drift', asset_id: 1 })
    const b = ambientSpec({ ambient: 'drift', asset_id: 2 })
    expect(a.delayS).not.toBe(b.delayS)
    expect(Math.abs(a.delayS)).toBeLessThan(a.durS)
  })
})

// Both renderers must go through the helper, on an inner wrapper that is NOT the element carrying
// the layer's own transform — otherwise the motion would overwrite position/parallax.
describe('both renderers use it', () => {
  it('ParallaxScene wraps the image in an ambient element inside the plane', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    new ParallaxScene(host).show({ layers: [{ url: 'tree.png', kind: 'figure', x: 30, y: 60, height: 40, ambient: 'breeze' }] })

    const wrap = host.querySelector('.px-ambient')
    expect(wrap.classList.contains('amb-breeze')).toBe(true)
    expect(wrap.parentElement.classList.contains('px-layer')).toBe(true)
    expect(wrap.querySelector('img')).not.toBeNull()
    expect(wrap.style.transformOrigin).toBe('30% 80%')   // the tree's base, not the stage middle
  })

  it('ArtworkOverlay wraps the image and previews a change without rebuilding the node', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new ArtworkOverlay(host, { readonly: true })
    overlay.setLayers([{ asset_id: 5, url: 'cloud.png', ambient: 'drift' }])

    const node = host.querySelector('[data-layer-id="art_5"]')
    const wrap = node.querySelector('.art-ambient')
    expect(wrap.classList.contains('amb-drift')).toBe(true)

    overlay.setLayerProp(5, 'ambient', 'bob')
    expect(host.querySelector('[data-layer-id="art_5"]')).toBe(node)
    expect(wrap.classList.contains('amb-bob')).toBe(true)
  })
})
