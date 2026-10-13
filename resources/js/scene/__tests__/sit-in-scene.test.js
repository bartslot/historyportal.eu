import { describe, it, expect, afterEach } from 'vitest'
import {
  sitSpec, coverToImage, sampleBoxes, averageRgb, washMatrix, shade, waveMask, rippleMask,
  sampleColours, renderSitIn,
} from '../sit-in-scene.js'
import { filterMarkup } from '../layer-filters.js'
import { ArtworkOverlay, layersSignature } from '../ArtworkOverlay.js'

afterEach(() => { document.head.innerHTML = ''; document.body.innerHTML = '' })

/** RGBA pixels: the top half one colour, the bottom half another. */
function pixels (w, h, top, bottom) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.set([...(y < h / 2 ? top : bottom), 255], (y * w + x) * 4)
  }
  return { data, width: w, height: h, aspect: w / h }
}

describe('blend into the scene: the numbers', () => {
  it('is off unless a value is set, and clamps to 0..1', () => {
    expect(sitSpec({})).toBeNull()
    expect(sitSpec({ waterline: 0, reflection: null })).toBeNull()
    expect(sitSpec({ waterline: 4, color_match: -1, reflection: '0.3' }))
      .toEqual({ waterline: 1, reflection: 0.3, contact_shadow: 0, color_match: 0 })
  })

  it('maps the stage onto a cover-fitted backdrop, and is the identity for a plate shown whole', () => {
    expect(coverToImage(0.3, 0.7, 16 / 9, 16 / 9)).toEqual([0.3, 0.7])
    // A plate twice as wide as the stage shows only its middle half.
    expect(coverToImage(0, 0.5, 1, 2)).toEqual([0.25, 0.5])
    expect(coverToImage(1, 0.5, 1, 2)).toEqual([0.75, 0.5])
    // A tall plate on a wide stage loses its top and bottom.
    expect(coverToImage(0.5, 0, 2, 1)).toEqual([0.5, 0.25])
  })

  it('samples around the box and under its waterline, inside the picture', () => {
    const { around, below } = sampleBoxes({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, 0.25)
    expect(around.x0).toBeCloseTo(0.34); expect(around.x1).toBeCloseTo(0.66)
    expect(below.y0).toBeCloseTo(0.55)   // 0.4 + 0.2 x (1 - 0.25)
    expect(below.y1).toBeCloseTo(0.6)
    const edge = sampleBoxes({ x: 0.9, y: 0.9, w: 0.2, h: 0.2 })
    expect(edge.around.x1).toBe(1); expect(edge.below.y0).toBe(1)
  })

  it('averages the colour in a box and skips transparent pixels', () => {
    const px = pixels(4, 4, [200, 100, 0], [0, 0, 100])
    expect(averageRgb(px.data, 4, 4, { x0: 0, y0: 0, x1: 1, y1: 0.5 })).toEqual([200, 100, 0])
    expect(averageRgb(px.data, 4, 4, { x0: 0, y0: 0, x1: 1, y1: 1 })).toEqual([100, 50, 50])
    const clear = new Uint8ClampedArray(16)
    expect(averageRgb(clear, 2, 2, { x0: 0, y0: 0, x1: 1, y1: 1 })).toBeNull()
  })

  it('reads the water under a boat and the light around it from the backdrop', () => {
    const px = pixels(10, 10, [240, 200, 150], [20, 40, 90])   // sky over sea
    const c = sampleColours(px, { x: 0.4, y: 0.1, w: 0.2, h: 0.4 }, 1, 0)
    expect(c.below).toEqual([20, 40, 90])
    expect(sampleColours(null, { x: 0, y: 0, w: 1, h: 1 }, 1)).toBeNull()
  })

  it('a wash of 0 is the identity, and a dusk colour cools and darkens', () => {
    expect(washMatrix([10, 20, 200], 0)).toBe('1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0')
    const [r, , , , , , g, , , , , , b] = washMatrix([40, 60, 120], 1).split(' ').map(Number)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeLessThan(1)
    expect(shade([100, 50, 200], 0.5)).toBe('rgb(50, 25, 100)')
  })

  it('colour match is the last step of the layer filter, and off without a sample', () => {
    expect(filterMarkup({ wash: null })).toBeNull()
    expect(filterMarkup({ wash: { rgb: [1, 2, 3], amount: 0 } })).toBeNull()
    const m = filterMarkup({ grayscale: true, wash: { rgb: [40, 60, 120], amount: 0.5 } })
    expect(m.indexOf('saturate')).toBeLessThan(m.lastIndexOf('feColorMatrix type="matrix"'))
  })

  it('the waterline mask is a seamless wavy tile at the level, the ripple mask is stepped bands', () => {
    const svg = decodeURIComponent(waveMask(0.25))
    expect(svg).toContain('V75Q')         // the line sits 25% up from the bottom
    expect(svg).toMatch(/T0 75Z/)         // and ends where it began
    const bands = decodeURIComponent(rippleMask(5)).match(/fill-opacity='([\d.]+)'/g).map(s => Number(s.match(/[\d.]+/)[0]))
    expect(bands).toHaveLength(5)
    expect([...bands].sort((a, b) => b - a)).toEqual(bands)   // each band fainter
    expect(decodeURIComponent(rippleMask())).not.toMatch(/blur|Gaussian/i)
  })
})

describe('blend into the scene: drawn on a layer', () => {
  const layer = (over = {}) => {
    const node = document.createElement('div')
    const body = document.createElement('div')
    const img = document.createElement('img')
    img.src = 'ship.png'
    body.appendChild(img); node.appendChild(body)
    return { node, body, img, item: { asset_id: 5, ...over } }
  }

  it('draws nothing for a layer that does not blend', () => {
    const { node, body, img, item } = layer()
    expect(renderSitIn(node, body, img, item)).toBeNull()
    expect(node.children).toHaveLength(1)
    expect(img.style.maskImage).toBe('')
  })

  it('a boat gets a waterline, a reflection behind it and a shadow behind both; reset takes them away', () => {
    const { node, body, img, item } = layer({ waterline: 0.15, reflection: 0.35, contact_shadow: 0.4 })
    renderSitIn(node, body, img, item, { below: [20, 40, 90] })
    expect(img.classList.contains('sit-waterline')).toBe(true)
    const order = [...node.children].filter(c => !(c instanceof SVGElement)).map(c => c.className)
    expect(order).toEqual(['sit-shadow', 'sit-reflection', ''])
    const refl = node.querySelector('.sit-reflection')
    expect(refl.style.top).toBe('85%')
    expect(refl.style.opacity).toBe('0.35')
    expect(refl.querySelector('img').style.transform).toBe('scaleY(-1)')
    expect(node.querySelector('.sit-shadow').style.background).toContain('rgb(9, 18, 41)')   // 0.45 x the water

    renderSitIn(node, body, img, { asset_id: 5 })
    expect(node.querySelector('.sit-reflection, .sit-shadow')).toBeNull()
    expect(img.classList.contains('sit-waterline')).toBe(false)
  })

  it('the overlay draws them, previews a change live, and re-seeds when one changes', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new ArtworkOverlay(host, { readonly: true })
    const base = { asset_id: 9, url: 'ship.png', x: 50, y: 50, height: 20, kind: 'figure' }
    overlay.setLayers([base])
    expect(host.querySelector('.sit-shadow')).toBeNull()

    overlay.setLayerProp(9, 'contact_shadow', '0.5')
    expect(host.querySelector('.sit-shadow')).not.toBeNull()
    overlay.setLayerProp(9, 'contact_shadow', 0)
    expect(host.querySelector('.sit-shadow')).toBeNull()

    expect(layersSignature([base])).not.toBe(layersSignature([{ ...base, reflection: 0.3 }]))
    expect(overlay.syncProps([{ ...base, reflection: 0.3 }])).toBe(true)
    expect(host.querySelector('.sit-reflection')).not.toBeNull()
  })
})
