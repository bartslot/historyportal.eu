/**
 * properties.js — what each kind of object can be animated on, and how each property moves.
 *
 * The timeline lists the scene's OBJECTS and a camera is one an author adds to a map, so the
 * property rows have to come from the object rather than from a fixed list. A camera has a place
 * and a way of looking at it; a layer has a position on a picture. They share no property.
 *
 * They also do not share INTERPOLATION, which is the part that is easy to miss: longitude wraps,
 * altitude is logarithmic, opacity is neither. Sampling every property with one rule produces a
 * fly-to that crosses the Pacific the long way round and hangs in space on the way.
 */

import { sortedKeys, segmentAt, easingFn, lerp, DEFAULT_EASING } from './keyframes.js'
import { unwrapAngle, lerpAltitude } from '../map/camera-track.js'

/** How a pair of keyed values becomes every value between them. */
export const INTERPOLATE = {
  linear: lerp,
  /** Degrees that wrap. Unwrapping per SEGMENT is both simpler and right: each leg takes its own
   *  short way round, so a three-stop tour is not forced into one continuous turn. */
  angle: (a, b, t) => lerp(a, unwrapAngle(b, a), t),
  /** Metres above sea level. Halfway between 100 and 10,000 should look halfway, which is 1,000. */
  log: lerpAltitude,
}

const P = (key, label, interpolate, unit = '') => ({ key, label, interpolate, unit })

/**
 * The animatable properties of each object kind. Adding a kind here is what makes it appear in the
 * timeline with lanes — there is no second list anywhere.
 */
const REGISTRY = {
  // Map-native, deliberately: these are exactly what map.jumpTo() takes and what getCenter/
  // getZoom/getBearing/getPitch give back, so a keyframe round-trips through the map without a
  // conversion in the middle. ZOOM rather than altitude because it is the number a teacher sees
  // everywhere else in the app — and it costs nothing, since zoom is already logarithmic in
  // altitude, so interpolating zoom linearly IS the log-altitude flight camera-track.js was
  // written for. Altitude stays inside camera-track.js for cinematic poses; it is not a second
  // row here, because two rows driving one degree of freedom fight each other.
  camera: [
    P('lng', 'Longitude', 'angle', '°'),
    P('lat', 'Latitude', 'linear', '°'),
    P('zoom', 'Zoom', 'linear', ''),
    P('heading', 'Heading', 'angle', '°'),
    P('tilt', 'Tilt', 'linear', '°'),
  ],
  // A TEXT layer, whose real property names these are — read off a stored scene's own `texts`
  // rather than assumed. The first draft listed `size` and `opacity`: `size` is the STRING "xl",
  // and a text item has no `opacity` at all (it has `bgOpacity`, and only the rect has `opacity`).
  // Both would have drawn a row that silently animated nothing, which is the exact failure this
  // registry exists to prevent — and writing the warning in the comment did not stop me guessing.
  text: [
    P('x', 'X', 'linear', '%'),
    P('y', 'Y', 'linear', '%'),
  ],
  /** The half-panel behind a caption. `opacity` is a number on these and only on these. */
  rect: [
    P('opacity', 'Opacity', 'linear', ''),
  ],
  /** An icon, painting or embed layer — names taken off ArtworkOverlay's own items. */
  art: [
    P('x', 'X', 'linear', '%'),
    P('y', 'Y', 'linear', '%'),
    P('width', 'W', 'linear', '%'),
    P('scale', 'Scale', 'linear', '%'),
    P('rotation', 'Angle', 'angle', '°'),
    P('opacity', 'Opacity', 'linear', ''),
  ],
}

/** The properties of an object kind, or an empty list for one that cannot be animated yet. */
export const propertiesFor = (kind) => REGISTRY[kind] ?? []

/** A property descriptor by kind and key, or null when the registry has never heard of it. */
export const propertyFor = (kind, key) => propertiesFor(kind).find((p) => p.key === key) ?? null

/** 'camera' → 'camera';  'layer:7' → 'layer'. The target names the object, its kind names the rows. */
export const kindOfTarget = (target) => String(target ?? '').split(':')[0]

const sampleOne = (track, time, interpolate) => {
  const keys = sortedKeys(track)
  if (!keys.length) return null
  if (keys.length === 1 || time <= keys[0].time) return keys[0].value
  if (time >= keys[keys.length - 1].time) return keys[keys.length - 1].value

  const seg = segmentAt(keys, time)
  const t = easingFn(seg.a.easing ?? track?.easing ?? DEFAULT_EASING)(seg.u)
  return interpolate(seg.a.value, seg.b.value, t)
}

/**
 * Every animated object's state at `time`, as `{ target: { property: value } }`.
 *
 * A property with no track is ABSENT rather than defaulted — the caller applies what the timeline
 * says and leaves everything else exactly as the teacher set it. Defaulting here would silently
 * reset a tilt nobody keyed.
 */
export const sampleFrame = (tracks, time) => {
  const frame = {}

  for (const track of tracks ?? []) {
    const descriptor = propertyFor(kindOfTarget(track.target), track.property)
    if (!descriptor) continue

    const value = sampleOne(track, time, INTERPOLATE[descriptor.interpolate] ?? lerp)
    if (value === null) continue

    frame[track.target] = { ...(frame[track.target] ?? {}), [track.property]: value }
  }

  return frame
}
