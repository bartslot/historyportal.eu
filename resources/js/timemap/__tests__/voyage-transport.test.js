import { describe, it, expect } from 'vitest'
import { TRANSPORTS, clampMotion, markerImageAt, transportAt, waypointAt } from '../voyage-ships.js'
import { SAMPLES_PER_SEGMENT } from '../voyages.js'
import voyagesDoc from '../voyages.json'

/**
 * Per-leg transport on a voyage route.
 *
 * Marco Polo went out overland and came home by sea, so the marker has to change vehicle partway
 * along a single route. These cover the pure resolution — which mount belongs at which point —
 * independently of WebGL, which cannot run in this environment.
 */

/** Mirror smooth()'s spacing so waypoint indices line up with samples. */
const trackFor = (waypointCount) => {
  const cum = []
  for (let i = 0; i <= (waypointCount - 1) * SAMPLES_PER_SEGMENT; i++) cum.push(i)
  return { cum, total: cum[cum.length - 1] }
}

const marco = voyagesDoc.voyages.find((v) => v.id === 'marco-polo-1271')
const withTrack = { ...marco, track: trackFor(marco.waypoints.length) }
/** Transport at the exact fraction of raw waypoint `i`. */
const atWaypoint = (i) => transportAt(withTrack, (i * SAMPLES_PER_SEGMENT) / withTrack.track.total)
/**
 * A stop's waypoint index, found by its coordinates (searching from `from`, since Acre is visited
 * twice). Indices move whenever a sea leg gets a routing point round a cape; the places do not.
 */
const stop = (lng, lat, from = 0) => {
  const i = marco.waypoints.findIndex(([x, y], k) => k >= from && x === lng && y === lat)
  if (i < 0) throw new Error(`no Marco Polo waypoint at ${lng},${lat}`)
  return i
}
const VENICE = stop(12.34, 45.44)
const ACRE = stop(35.07, 32.92)
const JERUSALEM = stop(35.23, 31.78)
const ACRE_AGAIN = stop(35.07, 32.92, JERUSALEM)
const SIVAS = stop(37.02, 39.75)
const ERZURUM = stop(41.28, 39.9)
const KERMAN = stop(57.08, 30.28)
const WAKHAN = stop(73.5, 37)
const KHOTAN = stop(79.92, 37.11)
const ZHANGYE = stop(100.45, 38.93)
const MALACCA = stop(102.0, 2.0)
const CEYLON = stop(79.85, 6.95)
const TABRIZ = stop(46.29, 38.08, CEYLON)
const TREBIZOND = stop(39.72, 41, TABRIZ)
const CONSTANTINOPLE = stop(28.98, 41.01)
const HOME = marco.waypoints.length - 1

describe('waypointAt', () => {
  it('maps track fractions back onto raw waypoint indices', () => {
    const track = trackFor(11)          // 10 gaps
    expect(waypointAt(track, 0)).toBeCloseTo(0, 5)
    expect(waypointAt(track, 1)).toBeCloseTo(10, 5)
    expect(waypointAt(track, 0.5)).toBeCloseTo(5, 5)
  })

  it('clamps outside [0,1] instead of running off the track', () => {
    const track = trackFor(11)
    expect(waypointAt(track, -3)).toBeCloseTo(0, 5)
    expect(waypointAt(track, 42)).toBeCloseTo(10, 5)
  })
})

describe('transportAt', () => {
  it('defaults to sea when a route declares no legs', () => {
    expect(transportAt({ legs: [], track: trackFor(2) }, 0.5)).toBe('sea')
    expect(transportAt({ track: trackFor(2) }, 0.5)).toBe('sea')
  })

  it('ignores a transport with no model rather than rendering nothing', () => {
    const v = { track: trackFor(3), legs: [{ wp: [0, 2], transport: 'hovercraft' }] }
    expect(transportAt(v, 0.5)).toBe('sea')
  })

  it('puts Marco Polo at sea from Venice to Acre', () => {
    expect(atWaypoint(VENICE)).toBe('sea')
    expect(atWaypoint(ACRE)).toBe('sea')
  })

  it('rides from Acre up to Jerusalem and back before sailing on to Ayas', () => {
    expect(atWaypoint((ACRE + JERUSALEM) / 2)).toBe('horse')  // the road to Jerusalem
    expect(atWaypoint((JERUSALEM + ACRE_AGAIN) / 2)).toBe('horse')  // back down to Acre
    expect(atWaypoint(ACRE_AGAIN + 0.5)).toBe('sea')    // Acre to Ayas
  })

  it('switches to the horse for the Anatolian and Armenian highlands', () => {
    expect(atWaypoint(SIVAS)).toBe('horse')
    expect(atWaypoint(ERZURUM)).toBe('horse')
  })

  it('switches to the camel for the deserts and Central Asia', () => {
    expect(atWaypoint(KERMAN)).toBe('camel')
    expect(atWaypoint(WAKHAN)).toBe('camel')  // the Pamirs
    expect(atWaypoint(KHOTAN)).toBe('camel')
    expect(atWaypoint(ZHANGYE)).toBe('camel')  // the Gobi
  })

  it('returns to the sea for the long voyage home', () => {
    expect(atWaypoint(MALACCA)).toBe('sea')
    expect(atWaypoint(CEYLON)).toBe('sea')
  })

  it('rides overland again from Hormuz, then sails the last stretch to Venice', () => {
    expect(atWaypoint(TABRIZ)).toBe('camel')
    expect(atWaypoint(TREBIZOND - 0.5)).toBe('horse')  // over the mountains to Trebizond
    expect(atWaypoint(CONSTANTINOPLE)).toBe('sea')
    expect(atWaypoint(HOME)).toBe('sea')
  })

  it('uses both mounts, so neither model is dead weight', () => {
    const used = new Set(marco.waypoints.map((_, i) => atWaypoint(i)))
    expect(used).toContain('horse')
    expect(used).toContain('camel')
    expect(used).toContain('sea')
  })

  it('keeps Hannibal entirely overland, so a marching army never renders as a ship', () => {
    const hannibal = voyagesDoc.voyages.find((v) => v.id === 'hannibal-218')
    const t = { ...hannibal, track: trackFor(hannibal.waypoints.length) }
    const kinds = new Set(hannibal.waypoints.map((_, i) => transportAt(t, (i * SAMPLES_PER_SEGMENT) / t.track.total)))
    expect([...kinds]).toEqual(['horse'])
  })

  it('leaves every route that is not an overland one entirely at sea', () => {
    // The land routes are the exception, so they are named rather than assumed: adding another
    // overland voyage should make someone come and think about this list.
    const overland = ['marco-polo-1271', 'hannibal-218', 'napoleon-1796']
    for (const v of voyagesDoc.voyages.filter((x) => !overland.includes(x.id))) {
      const t = { ...v, track: trackFor(v.waypoints.length) }
      const kinds = new Set(v.waypoints.map((_, i) => transportAt(t, (i * SAMPLES_PER_SEGMENT) / t.track.total)))
      expect([...kinds]).toEqual(['sea'])
    }
  })
})

describe('the transport catalogue', () => {
  it('backs every mount a route asks for, so a leg never names a model that cannot load', () => {
    const known = new Set(TRANSPORTS.map((t) => t.id))
    for (const v of voyagesDoc.voyages) {
      for (const leg of v.legs ?? []) {
        if (leg.transport) expect(known).toContain(leg.transport)
      }
    }
  })

  it('offers something to pick in both collections', () => {
    expect(TRANSPORTS.some((t) => t.terrain === 'water')).toBe(true)
    expect(TRANSPORTS.some((t) => t.terrain === 'land')).toBe(true)
  })

  it('gives every entry a thumbnail and a label for the picker', () => {
    for (const t of TRANSPORTS) {
      expect(t.label, t.id).toBeTruthy()
      expect(t.thumb, t.id).toMatch(/^\/timemap\/assets\/thumbs\/.+\.png$/)
    }
  })
})

describe('markerImageAt', () => {
  const track = trackFor(3)

  it('is null when the leg names no picture, so the model keeps the stage', () => {
    expect(markerImageAt({ track, legs: [{ wp: [0, 2], transport: 'camel' }] }, 0.5)).toBeNull()
    expect(markerImageAt({ track, legs: [] }, 0.5)).toBeNull()
  })

  it('returns the picture the teacher chose for the stretch being travelled', () => {
    const v = {
      track: trackFor(3),
      legs: [
        { wp: [0, 1], marker_image: '/storage/sledge.jpg' },
        { wp: [1, 2], transport: 'camel' },
      ],
    }
    expect(markerImageAt(v, 0.1)).toBe('/storage/sledge.jpg')
    expect(markerImageAt(v, 0.9)).toBeNull()
  })

  it('ignores an empty string, which is how a cleared marker arrives from a form', () => {
    expect(markerImageAt({ track, legs: [{ wp: [0, 2], marker_image: '' }] }, 0.5)).toBeNull()
  })
})

describe('clampMotion', () => {
  it('keeps the tuned rocking when nothing is set', () => {
    expect(clampMotion(undefined)).toBe(1)
    expect(clampMotion(null)).toBe(1)
    expect(clampMotion('not a number')).toBe(1)
  })

  it('passes a real setting through, including a full stop', () => {
    expect(clampMotion(0)).toBe(0)
    expect(clampMotion(0.35)).toBeCloseTo(0.35, 5)
  })

  it('clamps out-of-range values rather than letting the ship spin', () => {
    expect(clampMotion(-2)).toBe(0)
    expect(clampMotion(7)).toBe(1)
  })
})
