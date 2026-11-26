import { describe, it, expect } from 'vitest'
import { voyageStart, overviewBounds, legOpeningCamera, voyagePrefetchPlan, INTRO_ZOOM } from '../voyage-opening.js'

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

describe('voyagePrefetchPlan', () => {
  it('covers every waypoint, from the widest view to the closest', () => {
    const plan = voyagePrefetchPlan(route, { followZoom: 4.65, dolly: 1.1, overviewZoom: 2.47 })
    expect(plan.box).toEqual([[12.33, 20], [56.27, 45.44]])
    expect(plan.minZoom).toBe(2.47)
    expect(plan.maxZoom).toBeCloseTo(5.75)
  })

  it('reaches out to a timeline camera and the dive from space', () => {
    const plan = voyagePrefetchPlan(route, { followZoom: 4.65, views: [{ center: [0, 50], zoom: INTRO_ZOOM }] })
    expect(plan.box[0]).toEqual([0, 20])
    expect(plan.box[1][1]).toBe(50)
    expect(plan.minZoom).toBe(INTRO_ZOOM)
  })

  it('is null with no route', () => {
    expect(voyagePrefetchPlan({ waypoints: [] }, { followZoom: 4 })).toBeNull()
  })
})
