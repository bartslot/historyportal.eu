/**
 * scene-animation.js — a scene's keyframes as the PLAYER plays them.
 *
 * The editor's timeline (timeline-panel.js) and the player sample the same tracks with the same
 * sampler and the same rule: a property moves only once it has two keys, because one key is a
 * stored position. What differs is only where a frame lands, so that is a parameter.
 */

import { sortedKeys } from './keyframes.js'
import { sampleFrame, kindOfTarget } from './properties.js'

/** The tracks that move something: two keys or more. */
export const liveTracks = (timeline) => (timeline?.tracks ?? []).filter((t) => sortedKeys(t).length >= 2)

export const hasAnimation = (timeline) => liveTracks(timeline).length > 0

/**
 * When the scene's camera stops moving, in seconds: its last key. 0 with no camera move. After it the
 * camera is let go (the voyage's own follow camera takes over a leg), so frameAt leaves it out.
 */
export const cameraEnd = (timeline) => Math.max(0, ...liveTracks(timeline)
  .filter((t) => kindOfTarget(t.target) === 'camera')
  .flatMap((t) => sortedKeys(t).map((k) => k.time)))

/** Does the timeline move the map's camera? Then it is the scene's opening, not the voyage's built-in fly-in. */
export const cameraDrives = (timeline) => cameraEnd(timeline) > 0

/**
 * The "from space" intro as camera keys (Bart 2026-11-20: show it in the timeline, and let it tilt).
 * Held on the whole globe for a beat, then a dive to `to` that ends tilted, so the map arrives at an angle.
 */
export const INTRO_FROM_ZOOM = 1.05
export const INTRO_TILT = 40
export const introCameraTracks = (to, { hold = 0.9, dive = 3.2 } = {}) => {
  const end = { lng: to.lng, lat: to.lat, zoom: to.zoom, heading: to.heading ?? 0, tilt: Math.max(Number(to.tilt) || 0, INTRO_TILT) }
  const start = { ...end, zoom: INTRO_FROM_ZOOM, tilt: 0 }
  const times = [0, hold, hold + dive]
  return ['lng', 'lat', 'zoom', 'heading', 'tilt'].map((property) => ({
    target: 'camera',
    property,
    keyframes: [start, start, end].map((v, i) => ({ time: +times[i].toFixed(3), value: +Number(v[property]).toFixed(property === 'zoom' ? 3 : 6) })),
  }))
}

/** Is this camera the intro's (so switching the intro off may take it away), not one a teacher keyed? */
export const isIntroCamera = (tracks) => {
  const zoom = (tracks ?? []).find((t) => t.target === 'camera' && t.property === 'zoom')
  const keys = sortedKeys(zoom)
  return keys.length === 3 && Math.abs(keys[0].value - INTRO_FROM_ZOOM) < 1e-6
}

/**
 * Where a map scene opens: its timeline camera at 0 s when the timeline moves the camera, else the
 * writer's fixed camera (lesson.json `camera: {center, zoom}`), else null (the map frames its pins).
 * In the shape a MapLibre jumpTo/easeTo takes.
 */
export const openingCamera = (timeline, fixed = null) => {
  const cam = cameraDrives(timeline) ? frameAt(timeline, 0).camera : null
  if (cam && Number.isFinite(cam.lng) && Number.isFinite(cam.lat) && Number.isFinite(cam.zoom)) {
    return {
      center: [cam.lng, cam.lat],
      zoom: cam.zoom,
      ...(Number.isFinite(cam.heading) ? { bearing: cam.heading } : {}),
      ...(Number.isFinite(cam.tilt) ? { pitch: cam.tilt } : {}),
    }
  }
  const c = fixed?.center
  if (Array.isArray(c) && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])) && Number.isFinite(Number(fixed?.zoom))) {
    return { center: [Number(c[0]), Number(c[1])], zoom: Number(fixed.zoom) }
  }
  return null
}

/** Every animated value at `time`, as `{ target: { property: value } }`. */
export const frameAt = (timeline, time) => sampleFrame(liveTracks(timeline), time)

/**
 * Put a frame on screen. Each sink is optional: a scene without a map has no camera to move.
 *
 * @param {object} frame from frameAt()
 * @param {{ art?: {setLayerProp: Function}, text?: {patch: Function}, bal?: {patch: Function}, bg?: {patch: Function}, map?: object, territory?: {setTerritoryValues: Function} }} sinks
 *        bal.patch(id, values): a balloon by its editor id ('bal_3') and its values at this time
 *        bg.patch(id, values): a background by its id ('0', or a split panel's index)
 */
export const applyFrameTo = (frame, { art = null, text = null, bal = null, bg = null, map = null, territory = null } = {}) => {
  for (const [target, values] of Object.entries(frame)) {
    const kind = kindOfTarget(target)
    const id = String(target).slice(kind.length + 1)
    if (kind === 'art' || kind === 'arw') {
      for (const [property, value] of Object.entries(values)) art?.setLayerProp?.(id, property, value)
    } else if (kind === 'text' || kind === 'rect') {
      text?.patch?.(id, values)
    } else if (kind === 'bal') {
      bal?.patch?.(`bal_${id}`, values)
    } else if (kind === 'bg') {
      bg?.patch?.(id, values)
    } else if (kind === 'terr') {
      territory?.setTerritoryValues?.(values)
    } else if (kind === 'camera' && map) {
      const c = map.getCenter()
      map.jumpTo({
        center: [values.lng ?? c.lng, values.lat ?? c.lat],
        zoom: values.zoom ?? map.getZoom(),
        bearing: values.heading ?? map.getBearing(),
        pitch: values.tilt ?? map.getPitch(),
      })
    }
  }
}
