/**
 * voyage-opening.js — where a voyage map opens, and which tiles it warms.
 *
 * The voyage map used to open on a framing of its place labels, wait for every tile of THAT view,
 * and only then move to where the scene starts: a fitBounds snap for the itinerary, a 1.4 s glide
 * for a leg. That is the layout jump at the start of a voyage lesson (Bart 2026-11-23: "when the
 * lesson starts ... there is layout changes. maybe it's the camera work or starting point that loads
 * later"). The scene that is about to play is known before the map is built, so the map opens there.
 *
 * Pure: no MapLibre here, so the rules can be tested without a WebGL context.
 */

export const INTRO_ZOOM = 1.05   // the first leg's "from space" dive starts here
// The itinerary's air around the whole trip. One value for the opening and for showOverview, or the
// opening would frame the trip one way and the overview would re-frame it another a moment later.
export const OVERVIEW_PADDING = { top: 70, bottom: 70, left: 60, right: 60 }

/**
 * The scene a tour is built for, in the shape renderVoyageTour's `start` option takes.
 *
 * @param {object} cfg  the voyage scene's config
 * @param {{ cameraHold?: number, sailStart?: number }} [timing]  seconds, from the scene timeline
 * @returns {{ overview: boolean, leg: number, intro: boolean }}
 */
export function voyageStart (cfg = {}, { cameraHold = 0, sailStart = 0 } = {}) {
  return {
    overview: !!cfg.overview,
    leg: Number(cfg.leg) || 0,
    // Same rule as the player's playLeg call: a timeline camera or a delayed sail replaces the dive.
    intro: !!cfg.intro && !cameraHold && !sailStart,
  }
}

/**
 * The [[west, south], [east, north]] box of every stop on the trip — the itinerary's framing.
 * Null when the route names no usable stop.
 */
export function overviewBounds (route) {
  const wps = route?.waypoints || []
  const legs = route?.legs || []
  if (!legs.length) return null
  const pts = [wps[legs[0].wp?.[0]], ...legs.map((l) => wps[l.wp?.[1]])]
    .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
  if (!pts.length) return null
  const lngs = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

/**
 * The camera a leg opens on: its departure, at the dive's height or the sailing zoom.
 *
 * @returns {{ center: [number, number], zoom: number, pitch: 0 }|null}
 */
export function legOpeningCamera (route, { leg = 0, intro = false } = {}, followZoom) {
  const def = route?.legs?.[Number(leg) || 0]
  const wp = def && route.waypoints?.[def.wp?.[0]]
  if (!Array.isArray(wp) || !Number.isFinite(wp[0]) || !Number.isFinite(wp[1])) return null
  return { center: [wp[0], wp[1]], zoom: intro ? INTRO_ZOOM : followZoom, pitch: 0 }
}

/**
 * Which chart tiles to warm along the route, per tile source, at the zooms MapLibre will ask for.
 *
 * The prefetch used to warm NASA satellite and elevation tiles, up to 1500 of each, from the moment
 * the map loaded. The voyage has drawn the watercolour chart since October and never shows either,
 * so the class downloaded imagery nobody saw, at exactly the moment the chart's own tiles were
 * loading. These are the chart's sources, with the zoom each one actually loads:
 *   raster, 256 px tiles: round(zoom + 1), capped at the source's maxzoom (4);
 *   vector, 512 px tiles: floor(zoom), within the source's minzoom..maxzoom.
 *
 * @param {Record<string, {type: string, tiles: string[], minzoom?: number, maxzoom?: number, tileSize?: number}>} sources
 *   chartSources(origin), so every URL is byte-for-byte the one the map requests (and the cache hits)
 * @param {number} followZoom  the sailing zoom
 * @param {number} [dolly]     the extra zoom of "Dolly in on arrival", when it is on
 * @returns {Array<{ templates: string[], zooms: number[] }>}
 */
export function chartPrefetchPlan (sources, followZoom, dolly = 0) {
  const byZooms = new Map()
  for (const src of Object.values(sources || {})) {
    if (!src || !Array.isArray(src.tiles) || !src.tiles[0]) continue
    if (src.type !== 'raster' && src.type !== 'vector') continue
    const min = src.minzoom ?? 0
    const max = src.maxzoom ?? 22
    const at = (z) => (src.type === 'raster'
      ? Math.round(z + Math.log2(512 / (src.tileSize || 512)))
      : Math.floor(z))
    const lo = Math.max(min, Math.min(max, at(followZoom)))
    const hi = Math.max(min, Math.min(max, at(followZoom + Math.max(0, dolly))))
    const zooms = []
    for (let z = lo; z <= hi; z++) zooms.push(z)
    const key = zooms.join(',')
    if (!byZooms.has(key)) byZooms.set(key, { templates: [], zooms })
    byZooms.get(key).templates.push(src.tiles[0])
  }
  return [...byZooms.values()]
}
