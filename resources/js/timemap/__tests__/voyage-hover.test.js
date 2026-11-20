import { describe, it, expect } from 'vitest'
import { dateAtSample, datedPoints, formatVoyageDate, landTransportAtSample, nearestOnRoute } from '../voyage-hover.js'
import { smooth, SAMPLES_PER_SEGMENT } from '../voyages.js'
import voyagesDoc from '../voyages.json'

const S = SAMPLES_PER_SEGMENT
const voyage = (id) => voyagesDoc.voyages.find((v) => v.id === id)

// Three waypoints on the equator, evenly spaced, two legs with a stop between them.
const line = { waypoints: [[0, 0], [10, 0], [20, 0]] }
const coords = smooth(line.waypoints)
// The spline does not space its samples evenly, so tests address the line by longitude.
const at = (lng) => nearestOnRoute(coords, lng, 0).sample

describe('dateAtSample', () => {
  const v = {
    ...line,
    legs: [
      { depart: '1642-12-01', arrive: '1642-12-11', wp: [0, 1] },
      { depart: '1642-12-21', arrive: '1642-12-31', wp: [1, 2] },
    ],
  }

  it('returns the exact leg date on a dated waypoint', () => {
    expect(formatVoyageDate(dateAtSample(v, coords, 0), 'en')).toBe('1 December 1642')
  })

  it('interpolates by distance between the two dated ends', () => {
    expect(formatVoyageDate(dateAtSample(v, coords, at(5)), 'en')).toBe('6 December 1642')
    expect(formatVoyageDate(dateAtSample(v, coords, at(15)), 'en')).toBe('26 December 1642')
  })

  it('formats in the teacher language', () => {
    expect(formatVoyageDate(dateAtSample(v, coords, at(5)), 'nl')).toBe('6 december 1642')
  })

  it('drops to the month when one end is only known to the month', () => {
    const coarse = { ...v, legs: [{ ...v.legs[0], arrive_precision: 'month' }, v.legs[1]] }
    expect(dateAtSample(coarse, coords, at(5)).precision).toBe('month')
    expect(formatVoyageDate(dateAtSample(coarse, coords, at(5)), 'en')).toBe('December 1642')
  })

  it('shows only the year for a voyage with no day-level dates (Marco Polo)', () => {
    const polo = voyage('marco-polo-1271')
    const date = dateAtSample(polo, smooth(polo.waypoints), 7.5 * S)
    expect(date.precision).toBe('year')
    expect(formatVoyageDate(date, 'en')).toMatch(/^12\d\d$/)
  })

  it('gives no date past the last dated point', () => {
    const open = { ...line, legs: [{ depart: '1642-12-01', arrive: '1642-12-11', wp: [0, 1] }] }
    expect(dateAtSample(open, coords, at(15))).toBeNull()
  })

  it('names the era for BCE years', () => {
    const date = { ms: Date.parse('-000215-08-02'), precision: 'day' }
    expect(formatVoyageDate(date, 'en')).toBe('2 August 216 BC')
  })

  it('every voyage in the catalogue parses all of its leg dates', () => {
    for (const v of voyagesDoc.voyages) {
      expect(datedPoints(v).length, v.id).toBe(v.legs.length * 2)
    }
  })
})

describe('nearestOnRoute', () => {
  it('snaps a point beside the line onto it', () => {
    const hit = nearestOnRoute(coords, 5, 0.4)
    expect(hit.lat).toBeCloseTo(0, 6)
    expect(hit.lng).toBeCloseTo(5, 6)
    expect(hit.sample).toBeGreaterThan(0)
    expect(hit.sample).toBeLessThan(S)
  })

  it('picks the nearer of two passes', () => {
    const uTurn = [[0, 0], [10, 0], [10, 2], [0, 2]]
    expect(nearestOnRoute(uTurn, 5, 1.8).sample).toBeCloseTo(2.5, 6)
    expect(nearestOnRoute(uTurn, 5, 0.2).sample).toBeCloseTo(0.5, 6)
  })

  it('finds an unwrapped Pacific stretch from a wrapped pointer', () => {
    const pacific = [[170, -10], [190, -10]]
    const hit = nearestOnRoute(pacific, -175, -10.2)
    expect(hit.lng).toBeCloseTo(185, 6)
    expect(hit.sample).toBeCloseTo(0.75, 6)
  })
})

describe('landTransportAtSample', () => {
  const marco = voyage('marco-polo-1271')

  it('names the mount on Marco Polo\'s land legs, so the label never says galley over Persia', () => {
    expect(landTransportAtSample(marco, 10 * S)).toBe('camel')   // Persian desert, wp 9-12
    expect(landTransportAtSample(marco, 7.5 * S)).toBe('horse')  // Anatolian highlands, wp 6-9
  })

  it('stays null at sea, where the fleet names belong', () => {
    expect(landTransportAtSample(marco, 1.5 * S)).toBeNull()     // Venice to Acre
    expect(landTransportAtSample(marco, 27 * S)).toBeNull()      // the sea road home
  })

  it('stays null on a route without legs', () => {
    expect(landTransportAtSample({ waypoints: [[0, 0], [1, 1]] }, 3)).toBeNull()
  })
})
