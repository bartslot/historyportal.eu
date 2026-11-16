import { describe, it, expect } from 'vitest'
import { filterMarkup, hasTreatment, applyLayerFilter, layerFilterId, isClipartLayer, backdropLayers } from '../layer-filters.js'

describe('layer colour treatment', () => {
  it('asks for nothing when the layer is untreated', () => {
    expect(hasTreatment({})).toBe(false)
    expect(filterMarkup({})).toBeNull()
  })

  // A cut-out's clear pixels are black at alpha 0: 1 - luminance alone made them solid black.
  it('keeps what was already transparent transparent', () => {
    expect(filterMarkup({ white_key: 0.27 })).toMatch(/<feComposite in2="SourceGraphic" operator="in"\/>$/)
  })

  // The whole point of the white key: paper becomes transparent, ink does not. The alpha row
  // subtracts luminance from 1, so white (1,1,1) lands on 0 and black on 1.
  it('turns luminance into alpha so white keys out and dark ink survives', () => {
    const svg = filterMarkup({ white_key: 0.04 })

    expect(svg).toContain('feColorMatrix type="matrix"')
    expect(svg).toContain('-0.2126 -0.7152 -0.0722 0 1')
  })

  // Tolerance is what stops a 4% key also eating light greys: the alpha ramp is stretched by
  // 1/tolerance so anything below the band saturates to fully opaque.
  it('stretches the alpha ramp by the tolerance', () => {
    expect(filterMarkup({ white_key: 0.04 })).toContain('slope="25.000"')
    expect(filterMarkup({ white_key: 0.5 })).toContain('slope="2.000"')
  })

  it('drains colour before anything else when grayscale is on', () => {
    const svg = filterMarkup({ grayscale: true, white_key: 0.04 })

    expect(svg.indexOf('saturate')).toBeLessThan(svg.indexOf('feComponentTransfer'))
  })

  // A DUOTONE, not a flood. Flooding the colour through the alpha painted the whole layer one
  // flat block — a photograph is opaque everywhere, so the artwork simply vanished.
  it('maps luminance onto the colour so the artwork keeps its detail', () => {
    const svg = filterMarkup({ tint: '#ff0000' })

    expect(svg).not.toContain('feFlood')
    expect(svg).toContain('type="saturate" values="0"')      // to luminance first
    // then luminance runs from pure red (black ink) to white (paper)
    expect(svg).toContain('0.0000 0 0 0 1.0000 1.0000 0 0 0 0.0000 1.0000 0 0 0 0.0000')
  })

  it('colours black ink and keeps white paper white (Bart 11-16: a black shape stayed black)', () => {
    const svg = filterMarkup({ tint: '#ff8000' })
    const rows = svg.match(/type="matrix" values="([^"]+)"/)[1].trim().split(/\s+/).map(Number)
    // after the saturate step R = G = B = luminance; apply the tint matrix to one grey
    const tinted = (lum) => [0, 1, 2].map((r) => rows[r * 5] * lum + rows[r * 5 + 1] * lum + rows[r * 5 + 2] * lum + rows[r * 5 + 4])

    expect(tinted(0).map((v) => +v.toFixed(3))).toEqual([1, 0.502, 0])   // the shape's black stroke takes the colour
    expect(tinted(1).map((v) => +v.toFixed(3))).toEqual([1, 1, 1])       // paper and highlights stay white
  })

  it('keeps the keyed transparency when a tint is applied on top of it', () => {
    const svg = filterMarkup({ white_key: 0.04, tint: '#38bdf8' })

    // The alpha row from the key survives, and the tint only rewrites RGB — the alpha column of
    // the tint matrix is left as identity, so the paper stays gone.
    expect(svg).toContain('-0.2126 -0.7152 -0.0722 0 1')
    expect(svg.trimEnd().endsWith('0 0 0 1 0"/>')).toBe(true)
  })

  it('blends the tint back over the original at partial strength', () => {
    const full = filterMarkup({ tint: '#ff0000' })
    const half = filterMarkup({ tint: '#ff0000', tint_opacity: 0.5 })

    expect(full).not.toContain('arithmetic')
    expect(half).toContain('operator="arithmetic"')
    expect(half).toContain('k2="0.5"')
    expect(half).toContain('k3="0.500"')
  })
})

describe('applyLayerFilter', () => {
  const host = () => document.createElement('div')

  it('returns just the blur when there is no treatment, and adds no svg', () => {
    const el = host()

    expect(applyLayerFilter(el, { asset_id: 1, blur: 2 })).toBe('blur(2px)')
    expect(el.querySelector('svg')).toBeNull()
  })

  it('mounts one filter per layer and composes it with the blur', () => {
    const el = host()
    const css = applyLayerFilter(el, { asset_id: 7, white_key: 0.04, blur: 1 })

    expect(css).toBe(`url(#${layerFilterId(7)}) blur(1px)`)
    expect(el.querySelector(`#${layerFilterId(7)}`)).not.toBeNull()
  })

  // Re-rendering the same layer must not stack a second <svg> on every poll.
  it('reuses the carrier instead of piling them up', () => {
    const el = host()
    applyLayerFilter(el, { asset_id: 7, white_key: 0.04 })
    applyLayerFilter(el, { asset_id: 7, white_key: 0.2 })

    expect(el.querySelectorAll('svg')).toHaveLength(1)
    expect(el.querySelector('filter').innerHTML).toContain('slope="5.000"')
  })

  it('removes the filter when the teacher clears the treatment', () => {
    const el = host()
    applyLayerFilter(el, { asset_id: 7, white_key: 0.04 })
    const css = applyLayerFilter(el, { asset_id: 7, white_key: 0 })

    expect(css).toBe('')
    expect(el.querySelector('svg')).toBeNull()
  })
})

describe('which renderer owns a layer', () => {
  it('gives library figures to the overlay and the backdrop to the parallax scene, never both', () => {
    const layers = [
      { kind: 'cover', url: 'bg.webp', asset_id: null },
      { kind: 'figure', url: 'dante.webp', asset_id: 243 },
      { kind: 'cover', url: 'library-bg.webp', asset_id: 12 },
    ]

    const clipart = layers.filter(isClipartLayer)
    const parallax = layers.filter(l => !isClipartLayer(l))

    expect(clipart.map(l => l.url)).toEqual(['dante.webp'])
    expect(parallax.map(l => l.url)).toEqual(['bg.webp', 'library-bg.webp'])
  })
})

// Bart 2026-10-14, prod scene 1311: a narration scene built only from library backdrops (no cover).
// The editor fell back to handing ParallaxScene the WHOLE list when it found no backdrop, so every
// library picture was drawn twice: once still and selectable (ArtworkOverlay), once under the Ken
// Burns pan. The picture drifted out of its own selection box, and it looked like the layer
// "started animating" the moment it was added.
describe('backdropLayers', () => {
  const library = (id) => ({ asset_id: id, url: `/a/${id}.webp`, kind: 'figure', depth: 1.3 })

  it('a shot made only of library layers has no backdrop for ParallaxScene', () => {
    expect(backdropLayers([library(25), library(28), library(23), library(99)])).toEqual([])
  })

  it('keeps the cover and drops the library layers', () => {
    const cover = { url: '/bg.avif', kind: 'cover', depth: 0.4 }
    expect(backdropLayers([cover, library(25)])).toEqual([cover])
  })

  it('no layers, no backdrop', () => {
    expect(backdropLayers(null)).toEqual([])
  })
})
