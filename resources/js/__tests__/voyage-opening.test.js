import { describe, it, expect } from 'vitest'
import { voyageStart, overviewBounds, legOpeningCamera, chartPrefetchPlan, INTRO_ZOOM } from '../voyage-opening.js'
import { chartSources } from '../map-chart.js'

// Venice → Acre → Hormuz, the shape of a catalog route: waypoints, and legs naming two of them.
const route = {
  waypoints: [[12.33, 45.44], [20, 20], [35.07, 32.92], [56.27, 27.1]],
  legs: [{ wp: [0, 2] }, { wp: [2, 3] }],
}

describe('voyageStart', () => {
  it('names the leg and whether it is the itinerary', () => {
    expect(voyageStart({ leg: '1' })).toEqual({ overview: false, leg: 1, intro: false })
    expect(voyageStart({ overview: true })).toMatchObject({ overview: true, leg: 0 })
  })

  it('drops the dive when a timeline camera or a delayed sail opens the scene instead', () => {
    expect(voyageStart({ intro: true }).intro).toBe(true)
    expect(voyageStart({ intro: true }, { cameraHold: 2 }).intro).toBe(false)
    expect(voyageStart({ intro: true }, { sailStart: 1.5 }).intro).toBe(false)
  })
})

describe('overviewBounds', () => {
  it('frames the home port and every landfall, not the bends between them', () => {
    expect(overviewBounds(route)).toEqual([[12.33, 27.1], [56.27, 45.44]])
  })

  it('is null for a route with no stops', () => {
    expect(overviewBounds({ waypoints: [], legs: [] })).toBeNull()
    expect(overviewBounds(null)).toBeNull()
  })
})

describe('legOpeningCamera', () => {
  it('opens a leg on its departure at the sailing zoom', () => {
    expect(legOpeningCamera(route, { leg: 1 }, 4.6)).toEqual({ center: [35.07, 32.92], zoom: 4.6, pitch: 0 })
  })

  it('opens the first leg high up when it dives in from space', () => {
    expect(legOpeningCamera(route, { leg: 0, intro: true }, 4.6).zoom).toBe(INTRO_ZOOM)
  })

  it('is null for a leg the route does not have', () => {
    expect(legOpeningCamera(route, { leg: 9 }, 4.6)).toBeNull()
  })
})

describe('chartPrefetchPlan', () => {
  const sources = chartSources('https://historyportal.test')
  const zoomsOf = (plan, name) => plan.find((p) => p.templates.some((t) => t.includes(`/${name}/`)))?.zooms

  it('warms the chart the voyage draws, never satellite imagery', () => {
    const urls = chartPrefetchPlan(sources, 4.65).flatMap((p) => p.templates)
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((u) => u.startsWith('https://historyportal.test/map-chart/'))).toBe(true)
  })

  it('uses the exact URLs the map asks for, so the browser cache serves them', () => {
    const urls = chartPrefetchPlan(sources, 4.65).flatMap((p) => p.templates)
    expect(urls).toContain(sources['chart-wash-sea'].tiles[0])
    expect(urls).toContain(sources['chart-waves'].tiles[0])
  })

  it('asks each source for the zoom MapLibre loads it at', () => {
    const plan = chartPrefetchPlan(sources, 4.65)
    expect(zoomsOf(plan, 'wash-sea')).toEqual([4])   // 256 px raster, capped at its maxzoom
    expect(zoomsOf(plan, 'waves')).toEqual([4])      // 512 px vector: floor(zoom)
  })

  it('reaches one zoom further when the camera dollies in on arrival', () => {
    expect(zoomsOf(chartPrefetchPlan(sources, 4.65, 1.1), 'waves')).toEqual([4, 5])
  })

  it('skips sources with no tiles to fetch (the GeoJSON land, the world rectangle)', () => {
    const urls = chartPrefetchPlan(sources, 4.65).flatMap((p) => p.templates)
    expect(urls.some((u) => u.endsWith('.geojson'))).toBe(false)
  })
})
