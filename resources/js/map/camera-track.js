/**
 * camera-track.js — keyframed camera moves over a globe, in the spirit of Google Earth Studio.
 *
 * A POSE is a place plus a way of looking at it, exactly as Earth Studio states it: the camera sits
 * at (lng, lat, altitude) and looks along a heading, tilted down from the horizontal. Not a map
 * centre and a zoom — those are a projection detail, and they make a dive from space impossible to
 * author. The renderer converts at the last moment (see camera-director.js).
 *
 * A TRACK is poses pinned to times, with an easing per segment. Sampling it is pure: the same time
 * always yields the same pose, which is what makes a move scrubbable, resumable and testable.
 *
 * The three interpolations that matter, and why none of them is a plain lerp:
 *
 *  - LONGITUDE wraps. A move from 170°E to 170°W is 20° east across the date line, not 340° back
 *    across Asia. Keyframes are unwrapped into one continuous frame before sampling.
 *  - HEADING wraps the same way: 350° → 10° swings 20° through north.
 *  - ALTITUDE is logarithmic. Halfway between 100 m and 10,000 m should look halfway, which is
 *    1,000 m (the geometric mean), not 5,050. Linear altitude is why a naive fly-to hangs in space
 *    for most of the move and then falls the last stretch.
 */

import {
  addKeyframe, removeKeyframe, updateKeyframe, setDuration, trackDuration,
  sortedKeys, segmentAt, easingFn, catmullRom, lerp, DEFAULT_EASING,
} from '../anim/keyframes.js'

// The keyframe mechanics — ordering, segment finding, immutable edits — are property-agnostic and
// shared with every other animatable thing. Re-exported so existing callers keep one import, while
// there stays exactly ONE implementation of them.
export { addKeyframe, removeKeyframe, updateKeyframe, setDuration, trackDuration }

/** Where the camera is and how it looks — Earth Studio's model. Altitude is metres above sea level. */
export const DEFAULT_POSE = Object.freeze({
  lng: 0, lat: 0, altitude: 12e6, heading: 0, tilt: 0,
})

const POSE_KEYS = ['lng', 'lat', 'altitude', 'heading', 'tilt']

/** Shift `angle` into the same 360° turn as `near`, so interpolation takes the short way round. */
export const unwrapAngle = (angle, near) => angle + 360 * Math.round((near - angle) / 360)

/** Altitude interpolates through its geometric mean; 0 and negatives fall back to linear. */
export const lerpAltitude = (a, b, t) => (a > 0 && b > 0
  ? Math.exp(lerp(Math.log(a), Math.log(b), t))
  : lerp(a, b, t))

/** Keyframes in time order, with longitude and heading unwrapped into one continuous frame. */
const prepare = (track) => {
  const keys = sortedKeys(track).map((k) => ({ ...DEFAULT_POSE, ...k }))

  for (let i = 1; i < keys.length; i++) {
    keys[i] = {
      ...keys[i],
      lng: unwrapAngle(keys[i].lng, keys[i - 1].lng),
      heading: unwrapAngle(keys[i].heading, keys[i - 1].heading),
    }
  }
  return keys
}

/**
 * The pose at `time`. Before the first keyframe and after the last, the track holds that pose —
 * a camera is somewhere at every moment, so this never returns null.
 *
 * @param {{keyframes: Array, smooth?: boolean}} track
 * @param {number} time
 */
export const samplePose = (track, time) => {
  const keys = prepare(track)
  if (!keys.length) return { ...DEFAULT_POSE }
  if (keys.length === 1 || time <= keys[0].time) return pickPose(keys[0])
  if (time >= keys[keys.length - 1].time) return pickPose(keys[keys.length - 1])

  const { index: i, a, b, u } = segmentAt(keys, time)
  // The easing belongs to the segment being left, so a keyframe can hold a hard cut or a slow start.
  const t = easingFn(a.easing ?? track.easing ?? DEFAULT_EASING)(u)

  if (!track.smooth || keys.length < 3) {
    return {
      lng: lerp(a.lng, b.lng, t),
      lat: lerp(a.lat, b.lat, t),
      altitude: lerpAltitude(a.altitude, b.altitude, t),
      heading: lerp(a.heading, b.heading, t),
      tilt: lerp(a.tilt, b.tilt, t),
    }
  }

  const p0 = keys[Math.max(0, i - 1)]
  const p3 = keys[Math.min(keys.length - 1, i + 2)]
  return {
    lng: catmullRom(p0.lng, a.lng, b.lng, p3.lng, t),
    lat: catmullRom(p0.lat, a.lat, b.lat, p3.lat, t),
    // Splined in log space for the same reason it is lerped there.
    altitude: Math.exp(catmullRom(...[p0, a, b, p3].map((k) => Math.log(Math.max(1, k.altitude))), t)),
    heading: catmullRom(p0.heading, a.heading, b.heading, p3.heading, t),
    tilt: catmullRom(p0.tilt, a.tilt, b.tilt, p3.tilt, t),
  }
}

const pickPose = (k) => POSE_KEYS.reduce((pose, key) => ({ ...pose, [key]: k[key] }), {})
