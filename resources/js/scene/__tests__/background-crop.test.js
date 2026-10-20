import { describe, it, expect } from 'vitest'
import { normalizeCrop, cropImage, cropBox, textureCrop, backgroundSource } from '../background-crop.js'

/**
 * A scene's background as an animatable layer (Bart, 2026-10-17: "why can't we animate the
 * background? i would like to animate it just like any other layer"). One crop for every renderer:
 * which point of the picture stays in view (x, y in %), how far it is zoomed in, and its opacity.
 */

describe('a background crop', () => {
  it('fills in the middle, no zoom and full opacity, and clamps the rest', () => {
    expect(normalizeCrop({})).toEqual({ x: 50, y: 50, zoom: 1, opacity: 1 })
    expect(normalizeCrop({ x: -5, y: 140, zoom: 9, opacity: 3 })).toEqual({ x: 0, y: 100, zoom: 4, opacity: 1 })
    expect(normalizeCrop({ opacity: 0.25 }).opacity).toBe(0.25)
  })

  it('lands on a picture as object-position, a zoom about that point, and a fade', () => {
    const img = document.createElement('img')
    cropImage(img, { x: 30, y: 70, zoom: 2, opacity: 0.5 })
    expect(img.style.objectPosition).toBe('30% 70%')
    expect(img.style.transformOrigin).toBe('30% 70%')
    expect(img.style.transform).toBe('scale(2)')
    expect(img.style.filter).toBe('opacity(0.5)')

    cropImage(img, { x: 50, y: 50, zoom: 1, opacity: 1 })
    expect(img.style.transform).toBe('')
    expect(img.style.filter).toBe('')
  })

  it('lands on a background-image box without touching its own transform or opacity', () => {
    // The player crossfades with `opacity` and slides scenes in with `transform`: the crop must
    // compose with both, so it uses background-position, the separate `scale` and a filter.
    const el = document.createElement('div')
    el.style.opacity = '1'
    el.style.transform = 'translateX(10%)'
    cropBox(el, { x: 20, y: 40, zoom: 1.5, opacity: 0.4 })
    expect(el.style.backgroundPosition).toBe('20% 40%')
    expect(el.style.scale).toBe('1.5')
    expect(el.style.filter).toBe('opacity(0.4)')
    expect(el.style.opacity).toBe('1')
    expect(el.style.transform).toBe('translateX(10%)')
  })

  it('crops a stretched texture the same way CSS crops a cover picture', () => {
    // A cover texture showing 60% of the picture's width: at x 0 it shows the left edge, at 100
    // the right, at 50 the middle; zoom 2 shows half as much about the same point.
    const cover = { rX: 0.6, rY: 1 }
    expect(textureCrop(cover, { x: 0, y: 50, zoom: 1 })).toMatchObject({ rX: 0.6, oX: 0 })
    expect(textureCrop(cover, { x: 100, y: 50, zoom: 1 }).oX).toBeCloseTo(0.4, 6)
    expect(textureCrop(cover, { x: 50, y: 50, zoom: 1 }).oX).toBeCloseTo(0.2, 6)
    const zoomed = textureCrop(cover, { x: 50, y: 0, zoom: 2 })
    expect(zoomed.rX).toBeCloseTo(0.3, 6)
    expect(zoomed.rY).toBeCloseTo(0.5, 6)
    expect(zoomed.oY).toBeCloseTo(0.5, 6)   // flipY: y 0 is the picture's top, v near 1
  })
})

describe('a renderer\'s backgrounds, as the timeline reads and writes them', () => {
  it('lists each picture, reads its crop and patches one property without losing the others', () => {
    let crop = { x: 41, y: 29, zoom: 1, opacity: 1 }
    const seen = []
    const source = backgroundSource([{ id: '1', get: () => crop, set: (c) => { crop = c; seen.push(c) } }])

    expect(source.list()).toEqual([{ id: '1' }])
    expect(source.value('1', 'x')).toBe(41)
    source.patch('1', { zoom: 2.5 })
    expect(crop).toEqual({ x: 41, y: 29, zoom: 2.5, opacity: 1 })
    source.patch('9', { x: 1 })
    expect(seen).toHaveLength(1)
    expect(source.value('9', 'x')).toBeNull()
  })
})

describe('a single scene\'s background', () => {
  it('starts at its base and draws every change through the picture looked up when it runs', async () => {
    const { singleSource, cropPlates, publishBackgrounds } = await import('../background-crop.js')
    const drawn = []
    const src = singleSource({ base: { y: 20 }, draw: (c) => drawn.push(c) })
    expect(src.value('0', 'y')).toBe(20)
    src.patch('0', { zoom: 2 })
    expect(drawn).toEqual([{ x: 50, y: 20, zoom: 2, opacity: 1 }])

    const root = document.createElement('div')
    root.innerHTML = '<div class="px-layer-bg"><img></div><div class="px-layer-bg"><img></div>'
    cropPlates(root, { x: 10, y: 90, zoom: 1.5, opacity: 0.5 })
    for (const img of root.querySelectorAll('img')) expect(img.style.objectPosition).toBe('10% 90%')

    const heard = []
    window.addEventListener('scene-objects-changed', () => heard.push(1))
    publishBackgrounds(src)
    publishBackgrounds(singleSource({ draw () {} }))   // the same list: no re-read
    publishBackgrounds(null)
    expect(window.__backgrounds).toBeNull()
    expect(heard).toHaveLength(2)
  })
})
