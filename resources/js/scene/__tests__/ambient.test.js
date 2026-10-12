import { describe, it, expect, afterEach, vi } from 'vitest'
import { applyAmbient, ambientSpec, AMBIENT_MODES, PERIOD_S, AMP, flashGapS, flashKeyframes, FLASH_MS } from '../ambient.js'
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

// The web-comic sea (Tasman, 2026-10-13): nine more modes in the same vocabulary.
describe('world motion modes', () => {
  const NEW = ['swell', 'roll', 'billow', 'rain', 'flash', 'spray', 'flicker', 'rise', 'oars']

  it('knows every new mode, after the old ones, in the order the server lists them', () => {
    expect(AMBIENT_MODES).toEqual(['none', 'drift', 'breeze', 'bob', 'flutter', ...NEW])
  })

  it('gives every new mode a class, a period at speed 1, and the shared clamps', () => {
    for (const mode of NEW) {
      const el = document.createElement('div')
      expect(applyAmbient(el, { ambient: mode, ambient_speed: 2, ambient_amount: 5 })).toBe(true)
      expect(el.classList.contains(`amb-${mode}`)).toBe(true)
      expect(el.style.getPropertyValue('--amb-amount')).toBe('2')                 // amount max 2
      expect(parseFloat(el.style.getPropertyValue('--amb-dur'))).toBeCloseTo(PERIOD_S[mode] / 2, 3)
      applyAmbient(el, { ambient: 'none' })   // stop a flash timer
    }
  })

  it('has a keyframe rule for every CSS-played mode, and rain draws its own streaks', () => {
    applyAmbient(document.createElement('div'), { ambient: 'rain' })
    const css = document.getElementById('amb-styles').textContent
    for (const kf of ['amb-swell', 'amb-swell-scroll', 'amb-roll', 'amb-billow', 'amb-rain-far', 'amb-rain-near', 'amb-spray', 'amb-flicker', 'amb-rise', 'amb-oars']) {
      expect(css).toContain(`@keyframes ${kf} `)
    }
    expect(css).toMatch(/\.amb-rain::before[^}]*data:image\/svg\+xml/s)
    // The scroll and the rain are the only linear motion: a constant rate is the physics.
    expect(css).toMatch(/amb-swell-scroll [^;]* linear infinite/)
  })

  it('swell adds a twin of the picture for a seamless scroll, and removes it when the mode changes', () => {
    const el = document.createElement('div')
    const img = document.createElement('img')
    img.src = 'sea.png'
    el.appendChild(img)

    applyAmbient(el, { ambient: 'swell' })
    // A mirrored copy (so any painted strip joins without a seam), then the original again (so the
    // loop lands exactly where it started).
    const twins = [...el.querySelectorAll('img.amb-twin')]
    expect(twins.map(t => t.classList.contains('amb-twin-mirror'))).toEqual([true, false])
    expect(twins[1].classList.contains('amb-twin-again')).toBe(true)
    expect(twins[0].getAttribute('aria-hidden')).toBe('true')
    expect(twins[0].style.position).toBe('absolute')   // laid over the in-flow original

    applyAmbient(el, { ambient: 'swell' })        // re-applying never stacks twins
    expect(el.querySelectorAll('img.amb-twin')).toHaveLength(2)

    applyAmbient(el, { ambient: 'roll' })
    expect(el.querySelector('img.amb-twin')).toBeNull()
  })

  it('flash waits a random gap of 0.4x to 1.6x the period', () => {
    expect(flashGapS(10, () => 0)).toBe(4)
    expect(flashGapS(10, () => 1)).toBe(16)
    expect(flashGapS(10, () => 0.5)).toBe(10)
  })

  it('a flash is two pulses that end where they started, scaled by amount', () => {
    const kf = flashKeyframes(1)
    expect(kf[0].filter).toBe('brightness(1)')
    expect(kf.at(-1).filter).toBe('brightness(1)')
    const peaks = kf.map(k => parseFloat(k.filter.match(/[\d.]+/)[0]))
    expect(Math.max(...peaks)).toBeCloseTo(1 + AMP.flashPeak, 3)
    expect(flashKeyframes(0).every(k => k.filter === 'brightness(1)')).toBe(true)
    // Two strikes inside FLASH_MS: under three flashes a second.
    expect(FLASH_MS).toBeLessThanOrEqual(1000)
  })

  it('flash schedules strikes and stops them when the mode changes', () => {
    vi.useFakeTimers()
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.animate = vi.fn(() => ({ cancel: vi.fn() }))

    vi.spyOn(Math, 'random').mockReturnValue(0.5)              // every gap = the period
    applyAmbient(el, { ambient: 'flash', ambient_speed: 3 })   // 3s period
    vi.advanceTimersByTime(3100)
    expect(el.animate).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(3000)
    expect(el.animate).toHaveBeenCalledTimes(2)

    applyAmbient(el, { ambient: 'none' })
    vi.advanceTimersByTime(60000)
    expect(el.animate).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('every new mode stays still under prefers-reduced-motion', () => {
    stubReducedMotion(true)
    for (const mode of NEW) {
      const el = document.createElement('div')
      expect(applyAmbient(el, { ambient: mode })).toBe(false)
      expect(el.className).toBe('')
    }
  })

  it('a rolling backdrop is marked as a plate, so it rolls about its middle and hides its edges', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    new ParallaxScene(host).show({ layers: [{ url: 'deck.png', kind: 'cover', ambient: 'roll' }] })
    const wrap = host.querySelector('.px-ambient')
    expect(wrap.classList.contains('amb-roll')).toBe(true)
    expect(wrap.hasAttribute('data-amb-plate')).toBe(true)
  })
})
