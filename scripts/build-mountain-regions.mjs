/**
 * build-mountain-regions.mjs — the AREAS where mountains and hills are, as polygons.
 *
 * Step 1 of the painted-mountains plan (bart, 2026-11-26): instead of many little peak glyphs,
 * each range gets ONE painted picture pinned to its bounds. This script finds those bounds from
 * the real elevation grid (scripts/lib/elevation.mjs, ~10 km/px), smooths it, and traces two
 * classes of region:
 *   • mountains : smoothed height >= MOUNTAIN_M, or strong local relief
 *   • hills     : smoothed height >= HILL_M with some relief, outside the mountains
 * Each region is named after the nearest curated ridge in public/timemap/mountains.geojson.
 *
 * Output: public/timemap/mountain-regions.geojson  ({ kind, name, peak_m, area_km2 })
 * Run:    node scripts/build-mountain-regions.mjs
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { contours } from 'd3-contour'
import simplify from '@turf/simplify'
import area from '@turf/area'
import { loadHeightGrid, gridSizeForZoom } from './lib/elevation.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dirname, '../public/timemap')

const Z = 4
const DOWN = 2            // work grid = DEM / 2 → 2048², ~20 km/px at the equator
const BLUR = 2            // box-blur radius (work px), run 3× ≈ gaussian
const MOUNTAIN_M = 1500
const RELIEF_M = 1100     // relief within the window that also counts as mountains
const HILL_M = 450
const HILL_RELIEF_M = 300
const MIN_KM2 = { mountains: 12000, hills: 9000 }
const LAT_MIN = -56, LAT_MAX = 72 // leave out Antarctica and the Greenland / Arctic ice

const SIZE = gridSizeForZoom(Z)
const N = SIZE / DOWN
const dem = await loadHeightGrid(Z)

// downsample (mean, sea clamped to 0)
let h = new Float32Array(N * N)
const relief = new Float32Array(N * N)
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    let s = 0
    for (let dy = 0; dy < DOWN; dy++) for (let dx = 0; dx < DOWN; dx++) s += Math.max(0, dem[(y * DOWN + dy) * SIZE + x * DOWN + dx])
    h[y * N + x] = s / (DOWN * DOWN)
  }
}
// local relief: max - min in a 5×5 window (~100 km)
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    let lo = Infinity, hi = -Infinity
    for (let dy = -2; dy <= 2; dy++) {
      const yy = Math.min(N - 1, Math.max(0, y + dy))
      for (let dx = -2; dx <= 2; dx++) {
        const v = h[yy * N + ((x + dx + N) % N)]
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
    relief[y * N + x] = hi - lo
  }
}

function blur (src) {
  let a = src, b = new Float32Array(N * N)
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let s = 0
        for (let d = -BLUR; d <= BLUR; d++) s += a[y * N + ((x + d + N) % N)]
        b[y * N + x] = s / (2 * BLUR + 1)
      }
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let s = 0
        for (let d = -BLUR; d <= BLUR; d++) s += b[Math.min(N - 1, Math.max(0, y + d)) * N + x]
        a[y * N + x] = s / (2 * BLUR + 1)
      }
    }
  }
  return a
}

const pxToLng = (px) => (px / N) * 360 - 180
const pyToLat = (py) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * py) / N))) * 180) / Math.PI
const latOk = (py) => { const lat = pyToLat(py); return lat > LAT_MIN && lat < LAT_MAX }

// two soft masks (0..1), blurred so the outlines come out as rounded blobs
const mMask = new Float32Array(N * N)
const hMask = new Float32Array(N * N)
for (let y = 0; y < N; y++) {
  const ok = latOk(y)
  for (let x = 0; x < N; x++) {
    const i = y * N + x
    if (!ok) continue
    const isM = h[i] >= MOUNTAIN_M || (relief[i] >= RELIEF_M && h[i] >= 600)
    mMask[i] = isM ? 1 : 0
    hMask[i] = (isM || (h[i] >= HILL_M && relief[i] >= HILL_RELIEF_M)) ? 1 : 0
  }
}
const mSoft = blur(mMask)
const hSoft = blur(hMask)

// curated ridges, for names and peak heights
const ridges = JSON.parse(readFileSync(resolve(pub, 'mountains.geojson'), 'utf8')).features
const R = 6371
function distKm (a, b) {
  const t = Math.PI / 180
  const dLat = (b[1] - a[1]) * t, dLng = (b[0] - a[0]) * t
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
// Split the mountain mask by range: each mountain pixel goes to the nearest curated ridge
// (within SPLIT_KM), so High Asia comes out as Himalaya, Tian Shan, Hindu Kush… not one blob.
const SPLIT_KM = 450
const ridgePts = []
ridges.forEach((f, ri) => {
  const cs = f.geometry.coordinates
  for (let i = 0; i < cs.length - 1; i++) {
    const n = Math.max(1, Math.ceil(distKm(cs[i], cs[i + 1]) / 20))
    for (let k = 0; k < n; k++) ridgePts.push([cs[i][0] + (cs[i + 1][0] - cs[i][0]) * k / n, cs[i][1] + (cs[i + 1][1] - cs[i][1]) * k / n, ri])
  }
  ridgePts.push([...cs[cs.length - 1], ri])
})
const label = new Int16Array(N * N).fill(-1)
for (let y = 0; y < N; y++) {
  const lat = pyToLat(y + 0.5)
  for (let x = 0; x < N; x++) {
    if (mSoft[y * N + x] < 0.3) continue
    const p = [pxToLng(x + 0.5), lat]
    let best = -1, bestD = SPLIT_KM
    for (const r of ridgePts) {
      if (Math.abs(r[1] - lat) > 5) continue
      const d = distKm(p, r)
      if (d < bestD) { bestD = d; best = r[2] }
    }
    label[y * N + x] = best
  }
}

function trace (soft, kind, name = null, peak_m = null) {
  const [mp] = contours().size([N, N]).thresholds([0.5])(soft)
  const out = []
  for (const poly of mp.coordinates) {
    const rings = poly.filter((ring) => ring.length >= 12).map((ring) => ring.map(([px, py]) => [+pxToLng(px).toFixed(3), +pyToLat(py).toFixed(3)]))
    if (!rings.length || poly[0].length < 12) continue
    let f = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } }
    try { f = simplify(f, { tolerance: 0.08, highQuality: true }) } catch (_) { continue }
    const km2 = area(f) / 1e6
    if (km2 < MIN_KM2[kind]) continue
    f.properties = { kind, name, peak_m, area_km2: Math.round(km2) }
    out.push(f)
  }
  return out
}

const byRange = []
for (let ri = -1; ri < ridges.length; ri++) {
  const m = new Float32Array(N * N)
  for (let i = 0; i < m.length; i++) if (label[i] === ri) m[i] = mSoft[i]
  const props = ri >= 0 ? ridges[ri].properties : {}
  byRange.push(...trace(m, 'mountains', props.name ?? null, props.peak_m ?? null))
}
// hills: hill mask minus mountains
const hOnly = new Float32Array(N * N)
for (let i = 0; i < hOnly.length; i++) hOnly[i] = mSoft[i] >= 0.5 ? 0 : hSoft[i]

const features = [...byRange, ...trace(hOnly, 'hills')]
features.sort((a, b) => b.properties.area_km2 - a.properties.area_km2)
writeFileSync(resolve(pub, 'mountain-regions.geojson'), JSON.stringify({ type: 'FeatureCollection', features }))
const named = features.filter((f) => f.properties.kind === 'mountains')
console.log(`${features.length} regions (${named.length} mountain, ${features.length - named.length} hill)`)
for (const f of named.slice(0, 30)) console.log(`  ${f.properties.name ?? '?'}  ${f.properties.area_km2} km²`)
