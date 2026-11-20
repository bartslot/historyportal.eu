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

/** Seconds into the scene of the camera's last key, or 0 when the camera does not move. */
export const cameraEndsAt = (timeline) => Math.max(0, ...liveTracks(timeline)
  .filter((t) => kindOfTarget(t.target) === 'camera')
  .flatMap((t) => sortedKeys(t).map((k) => Number(k.time) || 0)))

/**
 * The frame without its camera once the camera's keys are done. A voyage sails after its intro and
 * the sail follows the ship: a camera still holding its last key every frame would pin the map.
 */
export const releaseCameraAfter = (frame, time, end) => {
  if (!(time > end) || !frame.camera) return frame
  const { camera, ...rest } = frame
  return rest
}

/** Every animated value at `time`, as `{ target: { property: value } }`. */
export const frameAt = (timeline, time) => sampleFrame(liveTracks(timeline), time)

/**
 * Put a frame on screen. Each sink is optional: a scene without a map has no camera to move.
 *
 * @param {object} frame from frameAt()
 * @param {{ art?: {setLayerProp: Function}, text?: {patch: Function}, bal?: {patch: Function}, bg?: {patch: Function}, map?: object }} sinks
 *        bal.patch(id, values): a balloon by its editor id ('bal_3') and its values at this time
 *        bg.patch(id, values): a background by its id ('0', or a split panel's index)
 */
export const applyFrameTo = (frame, { art = null, text = null, bal = null, bg = null, map = null } = {}) => {
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
