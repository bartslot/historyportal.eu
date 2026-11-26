import { describe, it, expect } from 'vitest'
import { sceneViews, tilesForView, tileUrlsFor, tileUrlsForBox, visibleSources } from '../map-prefetch.js'
import { pinZoomFactor, PIN_SCALE_MAX, PIN_SCALE_MIN } from '../../scene/ArtworkOverlay.js'

describe('tilesForView', () => {
  it('picks the tiles a view covers at the source zoom, clamped to its max zoom', () => {
    const t = tilesForView({ center: [14.5, 46], zoom: 7 }, { width: 1280, height: 720 }, { tileSize: 512, maxzoom: 4 })
    expect(t.length).toBeGreaterThan(0)
    expect(t.every((x) => x.z === 4)).toBe(true)
    // Ljubljana at z4: x = floor((14.5 + 180) / 360 * 16) = 8
    expect(t.some((x) => x.x === 8 && x.y === 5)).toBe(true)
  })

  it('a 256 px raster source covers one zoom deeper, rounded', () => {
    const t = tilesForView({ center: [0, 0], zoom: 2.6 }, { width: 400, height: 300 }, { tileSize: 256, maxzoom: 6, round: true })
    expect(t[0].z).toBe(4)
  })

  it('wraps x across the date line and covers more ground when tilted', () => {
    const flat = tilesForView({ center: [179.9, 0], zoom: 3 }, { width: 800, height: 400 }, { maxzoom: 3 })
    expect(flat.some((x) => x.x === 0)).toBe(true)
    const tilted = tilesForView({ center: [10, 45], zoom: 3, pitch: 50 }, { width: 800, height: 400 }, { maxzoom: 3 })
    const plain = tilesForView({ center: [10, 45], zoom: 3 }, { width: 800, height: 400 }, { maxzoom: 3 })
    expect(tilted.length).toBeGreaterThan(plain.length)
  })

  it('gives nothing for a broken view', () => {
    expect(tilesForView({ center: [NaN, 0], zoom: 3 })).toEqual([])
  })
})

describe('tileUrlsFor', () => {
  it('fills each tiled source template once and skips sources without tiles', () => {
    const sources = {
      a: { type: 'vector', tiles: ['/a/{z}/{x}/{y}.pbf'], maxzoom: 2 },
      b: { type: 'geojson', data: '/x.geojson' },
    }
    const urls = tileUrlsFor(sources, [{ center: [0, 0], zoom: 2 }, { center: [0, 0], zoom: 2 }], { width: 256, height: 256 })
    expect(urls.length).toBeGreaterThan(0)
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls.every((u) => u.startsWith('/a/2/'))).toBe(true)
  })
})

describe('sceneViews', () => {
  it('opens on the writer camera', () => {
    const v = sceneViews({ camera: { center: [12, 45], zoom: 5 } })
    expect(v[0]).toEqual({ center: [12, 45], zoom: 5 })
  })

  it('walks a timeline camera move every half second', () => {
    const track = (property, a, b) => ({ target: 'camera', property, keyframes: [{ time: 0, value: a }, { time: 2, value: b }] })
    const timeline = { tracks: [track('lng', 0, 10), track('lat', 40, 45), track('zoom', 2, 6)] }
    const v = sceneViews({ timeline })
    expect(v.length).toBe(5)
    expect(v[0].zoom).toBeCloseTo(2)
    expect(v[v.length - 1].zoom).toBeCloseTo(6)
  })
})

describe('pinZoomFactor', () => {
  const at = (z, ref) => ({ zoom: () => z, refZoom: () => ref })
  it('is 1 at the opening zoom and with no map', () => {
    expect(pinZoomFactor(at(5, 5))).toBe(1)
    expect(pinZoomFactor(null)).toBe(1)
    expect(pinZoomFactor(at(5, NaN))).toBe(1)
  })
  it('grows by sqrt 2 a zoom step, held between its bounds', () => {
    expect(pinZoomFactor(at(6, 4))).toBeCloseTo(2)
    expect(pinZoomFactor(at(20, 4))).toBe(PIN_SCALE_MAX)
    expect(pinZoomFactor(at(0, 10))).toBe(PIN_SCALE_MIN)
  })
})

describe('tileUrlsForBox', () => {
  const sources = {
    wash: { type: 'raster', tiles: ['/w/{z}/{x}/{y}.webp'], tileSize: 256, maxzoom: 4 },
    waves: { type: 'vector', tiles: ['/v/{z}/{x}/{y}.pbf'], minzoom: 3, maxzoom: 5 },
    land: { type: 'geojson', data: '/land.geojson' },
  }
  const box = [[12, 20], [56, 45]]   // Venice to Hormuz

  it('asks each source for every zoom it loads between the widest and the closest view', () => {
    const zs = (urls, pre) => [...new Set(urls.filter((u) => u.startsWith(pre)).map((u) => Number(u.split('/')[2])))]
    const urls = tileUrlsForBox(sources, box, { minZoom: 2.4, maxZoom: 5.75 })
    expect(zs(urls, '/w/')).toEqual([3, 4])        // raster: round(zoom + 1), capped at 4
    expect(zs(urls, '/v/')).toEqual([3, 4, 5])     // vector: floor(zoom), from its minzoom
    expect(urls.some((u) => u.includes('geojson'))).toBe(false)
  })

  it('fetches coarse zooms first and stops at the cap', () => {
    const urls = tileUrlsForBox(sources, box, { minZoom: 2.4, maxZoom: 5.75, max: 10 })
    expect(urls).toHaveLength(10)
    expect(urls[0]).toMatch(/\/3\//)
  })

  it('keeps a tile of margin round the box, and wraps past the date line', () => {
    const urls = tileUrlsForBox({ wash: sources.wash }, [[170, -20], [190, -10]], { minZoom: 1, maxZoom: 1 })
    const xs = new Set(urls.map((u) => Number(u.split('/')[3])))
    expect(xs.has(0)).toBe(true)   // 190°E is tile 0 again
    expect(xs.has(3)).toBe(true)
  })
})

describe('visibleSources', () => {
  it('keeps only sources a visible layer draws, so hidden borders are never fetched', () => {
    const style = {
      sources: { wash: { type: 'raster' }, cliopatria: { type: 'vector' }, rivers: { type: 'vector' } },
      layers: [
        { id: 'bg', type: 'background' },
        { id: 'wash', source: 'wash' },
        { id: 'borders', source: 'cliopatria', layout: { visibility: 'none' } },
        { id: 'rivers', source: 'rivers', layout: { visibility: 'visible' } },
      ],
    }
    expect(Object.keys(visibleSources(style))).toEqual(['wash', 'rivers'])
  })
})
