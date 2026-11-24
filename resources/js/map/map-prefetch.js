/**
 * map-prefetch.js — the tiles a coming map scene will need, fetched before it needs them.
 *
 * Bart, 2026-11-24: "preload the tiles before they arrive, i don't want to see the loading of tiles
 * anymore". A lesson keeps one map for all its map scenes (lesson-player.js), and every tile set on it
 * stops at zoom 4 to 6, so a scene's frames cover only a handful of tiles per source. This works out
 * which ones from the scene's own views (its opening, and every half second of a timeline camera move),
 * and fetches them once, so the browser already holds them when MapLibre asks.
 */

import { openingCamera, cameraDrives, cameraEnd, frameAt } from '../anim/scene-animation.js'
import { openingView, labelsView } from '../map-view.js'

const STEP_S = 0.5            // a camera move is sampled this often
const PARALLEL = 6            // fetches at a time
const fetched = new Set()     // every tile URL already asked for, this page

/**
 * The frames a map scene shows: where it opens, and each step of its timeline camera.
 *
 * @param {object} cfg a map scene's config
 * @param {{width?: number, height?: number}} [size] the stage, for a labels fit
 * @returns {Array<{center:[number,number], zoom:number, pitch?:number, bearing?:number}>}
 */
export function sceneViews (cfg = {}, size = {}) {
  const content = { annotations: cfg.annotations || [], labels: cfg.labels || [], route: cfg.route || [] }
  const views = []
  const open = openingCamera(cfg.timeline, cfg.camera)
    || (cfg.fit === 'labels' ? labelsView(content, { width: size.width || 1280, height: size.height || 720 }) : null)
    || openingView(content)
  if (open) views.push(open)
  if (cameraDrives(cfg.timeline)) {
    const end = cameraEnd(cfg.timeline)
    for (let t = STEP_S; t < end + STEP_S; t += STEP_S) {
      const c = frameAt(cfg.timeline, Math.min(t, end)).camera
      if (c && Number.isFinite(c.lng) && Number.isFinite(c.lat) && Number.isFinite(c.zoom)) {
        views.push({ center: [c.lng, c.lat], zoom: c.zoom, ...(Number.isFinite(c.tilt) ? { pitch: c.tilt } : {}), ...(Number.isFinite(c.heading) ? { bearing: c.heading } : {}) })
      }
    }
  }
  return views
}

const mercY = (lat) => {
  const r = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180
  return (1 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / Math.PI) / 2
}

/**
 * The tiles (z, x, y) a view covers for one source, the way MapLibre picks them: a 512 px world, a
 * source of `tileSize` px, clamped to its zoom range. A tilted or turned view sees more ground than its
 * box, so its box is widened.
 */
export function tilesForView (view, { width = 1280, height = 720 } = {}, { tileSize = 512, minzoom = 0, maxzoom = 22, round = false } = {}) {
  const zoom = Number(view?.zoom)
  const [lng, lat] = view?.center ?? []
  if (!Number.isFinite(zoom) || !Number.isFinite(lng) || !Number.isFinite(lat)) return []
  const cover = zoom + Math.log2(512 / tileSize)
  const z = Math.max(minzoom, Math.min(maxzoom, round ? Math.round(cover) : Math.floor(cover)))
  if (z < 0) return []
  const world = 512 * 2 ** zoom
  const tilt = Number(view.pitch) || 0
  const spread = (tilt > 0 ? 1.4 + tilt / 30 : 1) * (Number(view.bearing) ? 1.42 : 1)
  const halfX = (width * spread) / 2 / world
  const halfY = (height * spread) / 2 / world
  const cx = (lng + 180) / 360
  const cy = mercY(lat)
  const n = 2 ** z
  const span = (a, b) => [Math.floor(Math.max(0, a) * n), Math.min(n - 1, Math.floor(Math.min(0.999999, b) * n))]
  const [y0, y1] = span(cy - halfY, cy + halfY)
  const out = []
  // x wraps around the date line; y does not.
  const x0 = Math.floor((cx - halfX) * n)
  const x1 = Math.floor((cx + halfX) * n)
  for (let x = x0; x <= Math.min(x1, x0 + n - 1); x++) {
    for (let y = y0; y <= y1; y++) out.push({ z, x: ((x % n) + n) % n, y })
  }
  return out
}

/** Every tile URL the map's tiled sources need for these views, not yet asked for on this page. */
export function tileUrlsFor (sources, views, size) {
  const urls = []
  const seen = new Set()
  for (const src of Object.values(sources || {})) {
    if (!src || !Array.isArray(src.tiles) || !src.tiles[0]) continue
    const raster = src.type === 'raster'
    const opts = { tileSize: src.tileSize ?? (raster ? 256 : 512), minzoom: src.minzoom ?? 0, maxzoom: src.maxzoom ?? 22, round: raster }
    for (const v of views || []) {
      for (const t of tilesForView(v, size, opts)) {
        const url = src.tiles[0].replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y)
        if (!seen.has(url) && !fetched.has(url)) { seen.add(url); urls.push(url) }
      }
    }
  }
  return urls
}

/**
 * Fetch the tiles of these views for this map's style, a few at a time, at low priority.
 *
 * @param {object} map a maplibregl.Map
 * @param {Array} views from sceneViews()
 * @param {{width?: number, height?: number}} size the map's box
 * @returns {Promise<number>} how many tiles were fetched
 */
export async function prefetchTiles (map, views, size = {}) {
  let sources
  try { sources = map.getStyle()?.sources } catch (_) { return 0 }
  const urls = tileUrlsFor(sources, views, { width: size.width || 1280, height: size.height || 720 })
  urls.forEach((u) => fetched.add(u))
  let i = 0
  const worker = async () => {
    while (i < urls.length) {
      const url = urls[i++]
      try { await fetch(url, { priority: 'low', credentials: 'same-origin' }) } catch (_) { fetched.delete(url) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, urls.length) }, worker))
  return urls.length
}
