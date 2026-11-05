/**
 * timeline-edit.js — editing a SELECTION of keyframes, which is how Figma's timeline works: click
 * selects, Shift+click adds, a marquee sweeps, and a drag or Delete acts on everything selected.
 *
 * A keyframe is addressed by `{ target, property, time }`, never by index — indices shift the
 * moment a key moves past another. Pure: every function returns new tracks.
 */

import { sameTime } from './keyframes.js'

/** @typedef {{ target: string, property: string, time: number }} KeyRef */

/** A stable string for a key, for the selection list and the DOM. */
export const keyId = (ref) => `${ref.target}|${ref.property}|${ref.time}`

const matches = (track, key, ref) =>
  track.target === ref.target && track.property === ref.property && sameTime(key.time, ref.time)

const isIn = (track, key, refs) => refs.some((ref) => matches(track, key, ref))

/**
 * Move every referenced key by `delta` seconds, clamped so none crosses [lo, hi].
 *
 * Always computed from the tracks as they were when the drag began, so a drag that passes over
 * another key and comes back leaves that key where it was. A moved key that lands on an unmoved
 * one REPLACES it: two keys on one moment is one keyframe nobody can select.
 *
 * @returns {{ tracks: object[], delta: number }} the delta actually applied, after clamping
 */
export const moveKeys = (tracks, refs, delta, lo = 0, hi = Infinity) => {
  if (!refs.length) return { tracks, delta: 0 }
  const times = refs.map((r) => r.time)
  const applied = Math.min(hi - Math.max(...times), Math.max(lo - Math.min(...times), delta))

  const next = tracks.map((track) => {
    const keys = track.keyframes ?? []
    const moved = keys.filter((k) => isIn(track, k, refs)).map((k) => ({ ...k, time: k.time + applied }))
    if (!moved.length) return track
    const kept = keys.filter((k) => !isIn(track, k, refs) && !moved.some((m) => sameTime(m.time, k.time)))
    return { ...track, keyframes: [...kept, ...moved].sort((a, b) => a.time - b.time) }
  })
  return { tracks: next, delta: applied }
}

/** Remove every referenced key. A track left empty is dropped, so nothing inert is saved. */
export const deleteKeys = (tracks, refs) => tracks
  .map((track) => ({ ...track, keyframes: (track.keyframes ?? []).filter((k) => !isIn(track, k, refs)) }))
  .filter((track) => track.keyframes.length)

/** How close two keys of one row may be, seconds (Bart 11-05). */
export const KEY_GAP_S = 0.2
/** How far a key follows the pointer into another key's zone. */
const RUBBER_SHARE = 0.25

/**
 * A dragged key near another: it stops at the edge of that key's zone and stretches in a little (`at`), and comes to rest
 * on the edge (`rest`) when let go. Past the middle of the zone it goes to the far edge, so keys can still pass each other.
 * Null when there is no room on either side.
 */
export const rubberBand = (wanted, others, lo = 0, hi = Infinity, gap = KEY_GAP_S) => {
  const near = others.filter((o) => Math.abs(o - wanted) < gap).sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))[0]
  if (near === undefined) return { at: wanted, rest: wanted }
  const free = (t) => t >= lo && t <= hi && others.every((o) => Math.abs(o - t) >= gap - 1e-9)
  const towards = wanted >= near ? 1 : -1
  const rest = [near + towards * gap, near - towards * gap].find(free)
  return rest === undefined ? null : { at: Math.max(lo, Math.min(hi, rest + (wanted - rest) * RUBBER_SHARE)), rest }
}

/** Nearest candidate within `tolerance`, else the time unchanged. */
export const snapToNearest = (time, candidates, tolerance) => {
  let best = time
  let bestGap = tolerance
  for (const c of candidates) {
    const gap = Math.abs(c - time)
    if (gap <= bestGap) { best = c; bestGap = gap }
  }
  return best
}
