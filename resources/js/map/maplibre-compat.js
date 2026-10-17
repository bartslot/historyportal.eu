/**
 * The two MapLibre internals our globe layers need that MapLibre 6 took away.
 *
 * Dependency-free on purpose: the unit tests import the modules that use these without loading
 * MapLibre itself.
 */

export const EARTH_RADIUS_M = 6371008.8   // MapLibre's earthRadius

/**
 * The map's camera transform. MapLibre 6 removed `map.transform` (the Map now holds a Camera) and
 * has no public getter for `cameraPosition`, which the globe overlays need in planet space; the
 * transform is still there as `map._camera.transform`. `map.transform` stays as the fallback for
 * MapLibre 5 and for the test stubs that hand one in.
 */
export const mapTransform = (map) => map?._camera?.transform ?? map?.transform

const D2R = Math.PI / 180

/**
 * MapLibre 5's `transform.getMatrixForModel(lngLat, altitude)`, removed in 6 with no replacement:
 * the model matrix that stands a metre-scaled three.js model on the ground at `lngLat`, +Y up.
 * `globe` picks the vertical-perspective form, as MapLibre 5 did whenever the globe was rendering
 * (that is when the custom layer's `shaderData.variantName` is 'globe'); otherwise mercator.
 *
 * @param {[number, number] | {lng: number, lat: number}} lngLat
 * @param {number} altitude  metres above sea level
 * @param {boolean} globe
 * @returns {number[]} column-major 4x4
 */
export const modelMatrix = (lngLat, altitude = 0, globe = true) => {
  const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng
  const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat

  if (globe) {
    // rotateY(lng) · rotateX(-lat) · translate(0, 0, 1 + alt/R) · rotateX(90°) · scale(1/R)
    const s = 1 / EARTH_RADIUS_M
    const d = 1 + altitude / EARTH_RADIUS_M
    const sl = Math.sin(lng * D2R), cl = Math.cos(lng * D2R)
    const sp = Math.sin(lat * D2R), cp = Math.cos(lat * D2R)
    // Columns of rotateY(lng) · rotateX(-lat): east, north, outward normal.
    const east = [cl, 0, -sl]
    const north = [-sl * sp, cp, -cl * sp]
    const normal = [sl * cp, sp, cl * cp]
    // rotateX(90°) sends model Y to the normal and model Z to minus north.
    return [
      ...east.map((v) => v * s), 0,
      ...normal.map((v) => v * s), 0,
      ...north.map((v) => -v * s), 0,
      ...normal.map((v) => v * d), 1,
    ]
  }

  // translate(mercator) · rotateZ(180°) · rotateX(90°) · scale(-s, s, s)
  const circumference = 2 * Math.PI * EARTH_RADIUS_M
  const x = (180 + lng) / 360
  const y = (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2))) / 360
  const s = 1 / (circumference * Math.cos(lat * D2R))   // meterInMercatorCoordinateUnits
  return [
    s, 0, 0, 0,
    0, 0, s, 0,
    0, s, 0, 0,
    x, y, altitude * s, 1,
  ]
}
