import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { smooth, SAMPLES_PER_SEGMENT } from '../voyages.js'
import voyagesDoc from '../voyages.json'

/**
 * Ships at sea, armies on land.
 *
 * Bart, 2026-11-26, on Napoleon: ships sailed through Corsica and Sardinia, and a ship sailed from
 * Paris to Toulon, because that stretch had no leg (an unlabelled stretch is drawn as a ship).
 * This is the same check as `scripts/voyage-routes.py check`, on the same Catmull-Rom curve the
 * map draws and the chart's own land (public/map-chart/land.geojson). Fix a failure with that
 * script (`sea` routes a stretch through open water, `land` adds the towns a road went through).
 */

const LAND_TRANSPORTS = new Set(['horse', 'camel'])
const TOLERANCE_KM = 25   // generalised coast
const PORT_KM = 30        // a port is on the shore, an island call is on the island

const land = JSON.parse(readFileSync(resolve(__dirname, '../../../../public/map-chart/land.geojson'), 'utf8'))
const polygons = land.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates))
  .map((rings) => {
    const xs = rings[0].map((p) => p[0])
    const ys = rings[0].map((p) => p[1])
    return { rings, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
  })

const inRing = (ring, x, y) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const onLand = (lng, lat) => {
  const x = ((lng + 180) % 360 + 360) % 360 - 180
  return polygons.some(({ rings, box }) => x >= box[0] && x <= box[2] && lat >= box[1] && lat <= box[3]
    && inRing(rings[0], x, lat) && !rings.slice(1).some((hole) => inRing(hole, x, lat)))
}

const km = (a, b) => Math.hypot((b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180), b[1] - a[1]) * 111.32

const legFor = (v, x) => (v.legs ?? []).find((l) => x >= Math.min(...l.wp) && x <= Math.max(...l.wp))

describe.each(voyagesData())('%s', (id, v) => {
  it('has a leg for every stretch, so no stretch falls back to a ship by accident', () => {
    if (!v.legs?.length) return
    const gaps = v.waypoints.slice(0, -1).map((_, i) => i).filter((i) => !legFor(v, i + 0.5))
    expect(gaps).toEqual([])
  })

  it('keeps ships at sea and mounts on land', () => {
    const curve = smooth(v.waypoints)
    const wrong = []
    for (let i = 0; i < v.waypoints.length - 1; i++) {
      const byLand = LAND_TRANSPORTS.has(legFor(v, i + 0.5)?.transport)
      const seg = curve.slice(i * SAMPLES_PER_SEGMENT, (i + 1) * SAMPLES_PER_SEGMENT + 1)
      const lengths = seg.slice(1).map((b, k) => km(seg[k], b))
      const total = lengths.reduce((s, d) => s + d, 0)
      let run = 0
      let bad = 0
      lengths.forEach((d, k) => {
        run += d
        const at = run - d / 2
        if (at < PORT_KM || at > total - PORT_KM) return
        const [a, b] = [seg[k], seg[k + 1]]
        if (onLand((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) !== byLand) bad += d
      })
      if (bad > TOLERANCE_KM) wrong.push(`wp${i}->${i + 1}: ${Math.round(bad)} km ${byLand ? 'on sea' : 'over land'}`)
    }
    expect(wrong).toEqual([])
  })
})

function voyagesData() {
  return voyagesDoc.voyages.map((v) => [v.id, v])
}
