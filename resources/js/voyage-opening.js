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
 * What to warm for a voyage: the box its camera can ever look at, and the zooms it can look from.
 *
 * The box is every waypoint (bends too, the ship sails them) plus any timeline camera's centre. The
 * zooms run from the widest view the voyage shows (the itinerary, the dive from space, a timeline
 * camera) to the closest (the sailing zoom plus the landfall dolly). map-prefetch.js turns that into
 * tile URLs; the tile sets stop at zoom 4 to 6, so this stays a few MB at most.
 *
 * @param {{ waypoints?: Array<[number, number]> }} route
 * @param {{ followZoom: number, dolly?: number, overviewZoom?: number|null, views?: Array<{center: [number, number], zoom: number}> }} opts
 * @returns {{ box: [[number, number], [number, number]], minZoom: number, maxZoom: number }|null}
 */
export function voyagePrefetchPlan (route, { followZoom, dolly = 0, overviewZoom = null, views = [] } = {}) {
  const pts = (route?.waypoints || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
  const extra = (views || []).filter((v) => Array.isArray(v?.center) && Number.isFinite(v.center[0]) && Number.isFinite(v.center[1]) && Number.isFinite(v.zoom))
  extra.forEach((v) => pts.push(v.center))
  if (!pts.length || !Number.isFinite(followZoom)) return null
  const zooms = [followZoom, followZoom + Math.max(0, dolly), ...extra.map((v) => v.zoom)]
  if (Number.isFinite(overviewZoom)) zooms.push(overviewZoom)
  return {
    box: [[Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))], [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]],
    minZoom: Math.min(...zooms),
    maxZoom: Math.max(...zooms),
  }
}
