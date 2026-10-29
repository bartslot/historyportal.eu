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

import { sortedKeys, segmentAt, easingFn, lerp, segmentEasing, sameTime } from './keyframes.js'
import { unwrapAngle, lerpAltitude } from '../map/camera-track.js'

/** How a pair of keyed values becomes every value between them. */
export const INTERPOLATE = {
  linear: lerp,
  /** Degrees that wrap. Unwrapping per SEGMENT is both simpler and right: each leg takes its own
   *  short way round, so a three-stop tour is not forced into one continuous turn. */
  angle: (a, b, t) => lerp(a, unwrapAngle(b, a), t),
  /** Metres above sea level. Halfway between 100 and 10,000 should look halfway, which is 1,000. */
  log: lerpAltitude,
  /** A position round a closed outline, 0..1 (a balloon tail's root): 0.95 to 0.05 runs through
   *  the corner at 0, not back round the whole balloon. */
  loop: (a, b, t) => {
    const d = ((((b - a) % 1) + 1.5) % 1) - 0.5
    return (((a + d * t) % 1) + 1) % 1
  },
  /** '#rrggbb' per channel. A missing colour ('' is "no tint") cannot be mixed, so it cuts at the
   *  end of the segment rather than inventing a colour between nothing and something. */
  color: (a, b, t) => {
    const A = rgb(a)
    const B = rgb(b)
    if (!A || !B) return t < 1 ? a : b
    return `#${A.map((c, i) => Math.round(lerp(c, B[i], t)).toString(16).padStart(2, '0')).join('')}`
  },
}

const rgb = (hex) => (/^#[0-9a-f]{6}$/i.test(String(hex ?? ''))
  ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  : null)

const P = (key, label, interpolate, unit = '', group = null) => ({ key, label, interpolate, unit, group, type: interpolate === 'color' ? 'color' : 'number' })

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
  // Since 2026-10-16 a text also has a look (App\Services\Support\TextLayerStyle), drawn by
  // TextOverlayLayer: every key below is a field it reads. `size` stays the string "xl": no row.
  text: [
    P('x', 'X', 'linear', '%'),
    P('y', 'Y', 'linear', '%'),
    P('w', 'W', 'linear', '%'),
    P('scale', 'Scale', 'linear', '%'),
    P('rotation', 'Angle', 'angle', '°'),
    P('blur', 'Blur', 'linear', ''),
    P('opacity', 'Opacity', 'linear', ''),
    P('color', 'Colour', 'color', ''),
    P('colorOpacity', 'Colour %', 'linear', ''),
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
    P('height', 'H', 'linear', '%'),
    P('scale', 'Scale', 'linear', '%'),
    P('rotation', 'Angle', 'angle', '°'),
    P('blur', 'Blur', 'linear', ''),
    P('opacity', 'Opacity', 'linear', ''),
    P('tint', 'Colour', 'color', ''),
    P('tint_opacity', 'Colour %', 'linear', ''),
  ],
  /**
   * A speech or thought balloon (config.lines, BalloonLayer.balloonValue): where its middle is, its
   * size and opacity, and its tail: the tip, the root on the outline (0..1) and the bend.
   */
  bal: [
    P('x', 'X', 'linear', '%'),
    P('y', 'Y', 'linear', '%'),
    P('scale', 'Scale', 'linear', '%'),
    P('opacity', 'Opacity', 'linear', ''),
    P('tip_x', 'Tail X', 'linear', '%', 'tail'),
    P('tip_y', 'Tail Y', 'linear', '%', 'tail'),
    P('root', 'Tail root', 'loop', '', 'tail'),
    P('bend', 'Bend', 'linear', '', 'tail'),
  ],
  /**
   * A vector arrow (scene/arrow-shape.js): its start is the layer's X / Y, and its end, bend,
   * shaft width and head size are one row each, keyed together as one arrow (group 'arrow').
   */
  arw: [
    P('x', 'X', 'linear', '%'),
    P('y', 'Y', 'linear', '%'),
    P('end_x', 'End X', 'linear', '%', 'arrow'),
    P('end_y', 'End Y', 'linear', '%', 'arrow'),
    P('bend', 'Bend', 'linear', '', 'arrow'),
    P('shaft', 'Width', 'linear', '', 'arrow'),
    P('head', 'Head', 'linear', '', 'arrow'),
  ],
  /**
   * A scene's background picture, or one split panel's (scene/background-crop.js): which point of
   * it stays in view, as the panel's Uitsnede stores it, its zoom about that point and its opacity.
   */
  bg: [
    P('x', 'X', 'linear', '%'),
    P('y', 'Y', 'linear', '%'),
    P('zoom', 'Zoom', 'linear', ''),
    P('opacity', 'Opacity', 'linear', ''),
  ],
  /** A diorama item: its place on its floor, in cells. X runs left-right, Z away from the camera.
   *  No Y: nothing leaves the floor. The keys live in the diorama JSON, not in timeline tracks. */
  dio: [
    P('x', 'X', 'linear', ''),
    P('z', 'Z', 'linear', ''),
  ],
}

/** The properties of an object kind, or an empty list for one that cannot be animated yet. */
export const propertiesFor = (kind) => REGISTRY[kind] ?? []

/** Every object kind that can be keyed. A new kind added to the registry is covered without a change here. */
export const keyframeKinds = () => Object.keys(REGISTRY)

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
  const t = easingFn(segmentEasing(seg.a, seg.index, keys.length - 1, track))(seg.u)
  return interpolate(seg.a.value, seg.b.value, t)
}

/**
 * Rows that are one thing on screen take their keys together: a balloon's tail is ONE shape (tip,
 * root, bend). Keyed row by row, Bart keyed the tip at 0 s and the root at 1.2 s; each row held one
 * key, one key is a stored position, and the tail never moved (2026-10-27, prod scene 1589).
 *
 * After `property` of `target` gained a key: every row of its group gets a key at every moment any
 * of them has one, holding the value it had there before this write (`before`: the tracks then),
 * or `now(row)` for a row nobody had keyed. Pure: new tracks, the old ones untouched.
 */
export const keyGroupTogether = (tracks, before, target, property, now) => {
  const kind = kindOfTarget(target)
  const group = propertyFor(kind, property)?.group
  if (!group) return tracks
  const rows = propertiesFor(kind).filter((p) => p.group === group)
  const own = (list, key) => (list ?? []).find((t) => t.target === target && t.property === key) ?? null
  const times = rows.flatMap((p) => sortedKeys(own(tracks, p.key)).map((k) => k.time))
  let next = tracks
  for (const row of rows) {
    const track = own(next, row.key) ?? { target, property: row.key, keyframes: [] }
    const missing = times.filter((t, i) => times.findIndex((u) => sameTime(u, t)) === i)
      .filter((t) => !sortedKeys(track).some((k) => sameTime(k.time, t)))
    if (!missing.length) continue
    const old = own(before, row.key)
    const valueAt = (t) => (sortedKeys(old).length ? sampleOne(old, t, INTERPOLATE[row.interpolate] ?? lerp) : now(row.key))
    const added = missing.map((time) => ({ time, value: valueAt(time) })).filter((k) => Number.isFinite(k.value))
    if (!added.length) continue
    const filled = { ...track, base: track.base ?? now(row.key), keyframes: [...(track.keyframes ?? []), ...added].sort((a, b) => a.time - b.time) }
    next = own(next, row.key) ? next.map((t) => (t === own(next, row.key) ? filled : t)) : [...next, filled]
  }

  return next
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
