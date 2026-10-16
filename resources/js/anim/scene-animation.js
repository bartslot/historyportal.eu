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

/** Every animated value at `time`, as `{ target: { property: value } }`. */
export const frameAt = (timeline, time) => sampleFrame(liveTracks(timeline), time)

/**
 * Put a frame on screen. Each sink is optional: a scene without a map has no camera to move.
 *
 * @param {object} frame from frameAt()
 * @param {{ art?: {setLayerProp: Function}, text?: {patch: Function}, bal?: {patch: Function}, map?: object }} sinks
 *        bal.patch(id, values): a balloon by its editor id ('bal_3') and its values at this time
 */
export const applyFrameTo = (frame, { art = null, text = null, bal = null, map = null } = {}) => {
  for (const [target, values] of Object.entries(frame)) {
    const kind = kindOfTarget(target)
    const id = String(target).slice(kind.length + 1)
    if (kind === 'art') {
      for (const [property, value] of Object.entries(values)) art?.setLayerProp?.(id, property, value)
    } else if (kind === 'text' || kind === 'rect') {
      text?.patch?.(id, values)
    } else if (kind === 'bal') {
      bal?.patch?.(`bal_${id}`, values)
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
