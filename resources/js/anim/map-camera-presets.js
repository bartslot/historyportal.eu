/**
 * map-camera-presets.js: the map camera's motion presets as keys on the timeline's Camera rows (lng, lat, zoom,
 * heading, tilt), ending on the shot the teacher framed on the stage.
 *
 * Bart, 2026-11-24: "for map settings I would like to show a couple of animated presets, zoom in from space etc. pan
 * from A > B. tilt and zoom out. A > B is mostly the use case of 1 city or territory zooming out, or zooming." A camera
 * makes one move per scene, so a preset replaces every camera key; the keys are then the teacher's on the timeline.
 *
 * Pure: the framed view `v` in, tracks out. `a`: where A to B starts ([lng, lat], a focus place), else a stretch west.
 */
import { introCameraTracks } from './scene-animation.js'

export const CAMERA_PROPERTIES = ['lng', 'lat', 'zoom', 'heading', 'tilt']
const SMOOTH = 'easeInOutCubic'
const MIN_ZOOM = 1.05

const round = (p, v) => +Number(v).toFixed(p === 'zoom' ? 3 : p === 'lng' || p === 'lat' ? 6 : 2)
const at = (v, over) => ({ ...v, ...over, zoom: Math.max(MIN_ZOOM, (over.zoom ?? v.zoom)) })

/** A start point for A to B: the first focus place that is not already the middle of the shot, else a third of a screen west. */
export const startPoint = (v, focus = []) => {
  const near = 90 / 2 ** v.zoom   // about a tenth of the view
  const far = focus.find(([lng, lat]) => Math.hypot(lng - v.lng, lat - v.lat) > near)
  return far ?? [v.lng - 120 / 2 ** v.zoom, v.lat]
}

/** Each preset: its poses as [seconds, pose] from the framed view `v`. The last pose is always `v`. */
const POSES = {
  fromSpace: null,   // introCameraTracks: the whole globe, a beat, then a dive that lands tilted
  zoomIn: (v) => [[0, at(v, { zoom: v.zoom - 2.5 })], [4, v]],
  zoomOut: (v) => [[0, v], [4, at(v, { zoom: v.zoom - 2.5 })]],
  aToB: (v, a) => [[0, at(v, { lng: a[0], lat: a[1] })], [2.5, at(v, { lng: (a[0] + v.lng) / 2, lat: (a[1] + v.lat) / 2, zoom: v.zoom - 1.5 })], [5, v]],
  tiltZoomOut: (v) => [[0, at(v, { zoom: v.zoom + 1.2, tilt: 55, heading: (v.heading || 0) - 20 })], [5, { ...v, tilt: 0 }]],
  drift: (v) => [[0, v], [8, at(v, { zoom: v.zoom + 0.5, heading: (v.heading || 0) + 10 })]],
}
export const CAMERA_PRESETS = Object.keys(POSES)

/**
 * The tracks with camera preset `id` from `start` (seconds): every camera key replaced, every other track kept.
 * Null for an unknown preset. `to` is when the move ends.
 */
export function applyCameraPreset (tracks, id, view, { start = 0, focus = [] } = {}) {
  if (!(id in POSES)) return null
  const v = { lng: view.lng, lat: view.lat, zoom: view.zoom, heading: view.heading ?? 0, tilt: view.tilt ?? 0 }
  let camera
  if (id === 'fromSpace') {
    camera = introCameraTracks(v).map((t) => ({ ...t, keyframes: t.keyframes.map((k, i) => ({ ...k, time: +(k.time + start).toFixed(3), ...(i === 1 ? { easing: SMOOTH } : {}) })) }))
  } else {
    const poses = POSES[id](v, startPoint(v, focus))
    camera = CAMERA_PROPERTIES.map((property) => ({
      target: 'camera',
      property,
      keyframes: poses.map(([t, pose], i) => ({ time: +(start + t).toFixed(3), value: round(property, pose[property]), ...(i < poses.length - 1 ? { easing: SMOOTH } : {}) })),
    }))
  }
  const to = Math.max(...camera.flatMap((t) => t.keyframes.map((k) => k.time)))
  return { tracks: [...(tracks ?? []).filter((t) => t.target !== 'camera'), ...camera], from: start, to }
}
