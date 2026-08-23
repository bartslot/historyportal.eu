/**
 * keyframes.js — the property-agnostic half of a keyframe track.
 *
 * A camera pose, a layer's x, and an opacity all need the same things: keys in time order, the
 * segment a given moment falls in, and immutable edits. Only the INTERPOLATION differs — longitude
 * wraps, altitude is logarithmic, a plain number is neither. So the mechanics live here and
 * camera-track.js keeps what is genuinely about a pose.
 *
 * Everything is pure. The same time always yields the same value, which is what lets a track be
 * scrubbed, resumed and tested; and every edit returns a NEW track, so an editor can hold an
 * undo stack without cloning by hand.
 */

import { EASING } from '../easing.js'

/** The camera convention in easing.js (EASE.move). Shared so a layer eases like the camera does. */
export const DEFAULT_EASING = 'easeInOutCubic'

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const lerp = (a, b, t) => a + (b - a) * t

export const easingFn = (name) => EASING[name] || EASING[DEFAULT_EASING]

const num = (v) => (Number.isFinite(v) ? v : 0)

/**
 * Keyframes in time order. A key with no usable time is DROPPED rather than sorted to the front —
 * a NaN compares false against everything and would otherwise sit wherever the sort left it.
 * Never mutates the track it is given.
 */
export const sortedKeys = (track) => [...(track?.keyframes ?? [])]
  .filter((k) => k && Number.isFinite(k.time))
  .sort((a, b) => a.time - b.time)

/**
 * The pair of keyframes `time` falls between, and how far across it sits.
 *
 * Clamps at both ends: before the first key it is the opening segment at u = 0, after the last it
 * is the closing segment at u = 1, so a caller never has to special-case the edges. Null when
 * there is no segment at all (nothing, or a single key).
 *
 * @returns {{index: number, a: object, b: object, u: number}|null}
 */
export const segmentAt = (keys, time) => {
  if (!keys || keys.length < 2) return null

  let i = 0
  while (i < keys.length - 2 && time > keys[i + 1].time) i++

  const a = keys[i]
  const b = keys[i + 1]
  const span = b.time - a.time
  // Two keys stacked on the same frame: hold the first rather than divide by zero.
  const u = span > 0 ? clamp((time - a.time) / span, 0, 1) : 0

  return { index: i, a, b, u }
}

/**
 * The value of a plain numeric track at `time`. Outside the track it holds the nearest key, because
 * a property has a value at every moment.
 *
 * The easing belongs to the segment being LEFT, so one keyframe can hold a hard cut and the next a
 * slow start. Falls back to the track's own easing, then to the default.
 */
export const sampleNumber = (track, time) => {
  const keys = sortedKeys(track)
  if (!keys.length) return 0
  if (keys.length === 1 || time <= keys[0].time) return num(keys[0].value)
  if (time >= keys[keys.length - 1].time) return num(keys[keys.length - 1].value)

  const seg = segmentAt(keys, time)
  const t = easingFn(seg.a.easing ?? track?.easing ?? DEFAULT_EASING)(seg.u)
  return lerp(num(seg.a.value), num(seg.b.value), t)
}

/** Total run time, in the unit the keyframe times use (seconds by convention). */
export const trackDuration = (track) => {
  const keys = sortedKeys(track)
  return keys.length ? keys[keys.length - 1].time : 0
}

/**
 * Catmull-Rom through four values, for tracks that should not stop at every key.
 *
 * Per-segment easing alone makes a multi-stop move stutter: it eases to a halt at every keyframe it
 * passes through, like a bus at every stop.
 */
export const catmullRom = (p0, p1, p2, p3, t) => {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

// ── Editing. Every one of these returns a NEW track; nothing here mutates what it is handed. ──

/** Insert a keyframe, keeping the track in time order. Replaces any keyframe at the same time. */
export const addKeyframe = (track, keyframe) => ({
  ...track,
  keyframes: [...(track?.keyframes ?? []).filter((k) => k.time !== keyframe.time), { ...keyframe }]
    .sort((a, b) => a.time - b.time),
})

export const removeKeyframe = (track, index) => ({
  ...track,
  keyframes: (track?.keyframes ?? []).filter((_, i) => i !== index),
})

export const updateKeyframe = (track, index, patch) => ({
  ...track,
  keyframes: (track?.keyframes ?? []).map((k, i) => (i === index ? { ...k, ...patch } : k)),
})

/** Rescale every keyframe time so the whole move runs for `seconds`. */
export const setDuration = (track, seconds) => {
  const current = trackDuration(track)
  if (!(current > 0) || !(seconds > 0)) return { ...track }

  const scale = seconds / current
  return { ...track, keyframes: (track.keyframes ?? []).map((k) => ({ ...k, time: k.time * scale })) }
}
