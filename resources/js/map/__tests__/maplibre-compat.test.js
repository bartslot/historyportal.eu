import { describe, it, expect } from 'vitest'
import { mapTransform, modelMatrix, EARTH_RADIUS_M } from '../maplibre-compat.js'

/** Column-major 4x4 times a point. */
const apply = (m, [x, y, z]) => [0, 1, 2].map((r) => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r])
const close = (a, b, digits = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits))
const D2R = Math.PI / 180

describe('mapTransform', () => {
  it('reads the camera transform from a MapLibre 6 map, which has no map.transform', () => {
    const transform = { cameraPosition: [1, 2, 3] }
    expect(mapTransform({ _camera: { transform } })).toBe(transform)
  })

  it('still reads map.transform, the MapLibre 5 shape the unit-test stubs use', () => {
    const transform = { getCameraAltitude: () => 42 }
    expect(mapTransform({ transform })).toBe(transform)
  })

  it('returns undefined rather than throwing when there is no map', () => {
    expect(mapTransform(undefined)).toBeUndefined()
    expect(mapTransform({})).toBeUndefined()
  })
})

describe('modelMatrix (MapLibre 5 transform.getMatrixForModel, removed in 6)', () => {
  it('globe: puts the model origin on the sphere at its lng/lat, lifted by its altitude', () => {
    const lng = 147, lat = -42, alt = 1200
    const r = 1 + alt / EARTH_RADIUS_M
    const expected = [Math.cos(lat * D2R) * Math.sin(lng * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lng * D2R)].map((v) => v * r)
    close(apply(modelMatrix([lng, lat], alt, true), [0, 0, 0]), expected)
  })

  it('globe: one model metre is one metre on the planet, and model +Y points away from the ground', () => {
    const m = modelMatrix([10, 50], 0, true)
    const origin = apply(m, [0, 0, 0])
    const up = apply(m, [0, 1, 0]).map((v, i) => v - origin[i])
    expect(Math.hypot(...up) * EARTH_RADIUS_M).toBeCloseTo(1, 9)
    // Up is along the surface normal, which on a unit sphere is the origin itself.
    close(up.map((v) => v * EARTH_RADIUS_M), origin, 9)
  })

  it('mercator: puts the model origin at the MercatorCoordinate of its lng/lat', () => {
    const lng = 4.9, lat = 52.37
    const x = (180 + lng) / 360
    const y = (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2))) / 360
    close(apply(modelMatrix([lng, lat], 0, false), [0, 0, 0]), [x, y, 0])
  })

  it('mercator: model +Y is up (+z) and model +Z is south (+y), scaled to mercator metres', () => {
    const lat = 30
    const m = modelMatrix([0, lat], 0, false)
    const metre = 1 / (2 * Math.PI * EARTH_RADIUS_M * Math.cos(lat * D2R))
    const o = apply(m, [0, 0, 0])
    close(apply(m, [0, 1, 0]).map((v, i) => v - o[i]), [0, 0, metre], 15)
    close(apply(m, [0, 0, 1]).map((v, i) => v - o[i]), [0, metre, 0], 15)
    close(apply(m, [1, 0, 0]).map((v, i) => v - o[i]), [metre, 0, 0], 15)
  })

  it('accepts {lng, lat} as well as [lng, lat]', () => {
    expect(modelMatrix({ lng: 3, lat: 4 }, 5, true)).toEqual(modelMatrix([3, 4], 5, true))
  })
})
