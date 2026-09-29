/**
 * An item's choreography as ONE clip on the timeline (Bart, 2026-09-29): its keys from the first to
 * the last. Drag the clip to move the whole path in time; drag an end to stretch or squeeze it,
 * which slows the move down or speeds it up. Walk frames follow the distance walked, so the feet
 * stay right at any speed. Pure: keys in, new keys out, never mutated.
 */

/** The shortest a clip may be squeezed to, in seconds. */
export const MIN_CLIP_S = 0.2

/** {from, to} in seconds, or null when the item has no movement (fewer than two keys). */
export function clipOf (item) {
  const keys = item?.keys ?? []
  return keys.length >= 2 ? { from: keys[0].t, to: keys[keys.length - 1].t } : null
}

const round = t => Math.round(t * 1000) / 1000

/** Every key `dt` seconds later (earlier when negative); the clip never starts before 0. */
export function shiftClip (keys, dt) {
  const d = Math.max(dt, -keys[0].t)
  return keys.map(k => ({ ...k, t: round(k.t + d) }))
}

/**
 * Drag one end to `time`: the other end stays, every key in between keeps its place in the clip
 * (times scaled), so the path keeps its shape and only its speed changes.
 * @param {'start'|'end'} edge
 */
export function stretchClip (keys, edge, time) {
  const from = keys[0].t
  const to = keys[keys.length - 1].t
  const span = to - from
  if (!(span > 0)) return keys
  if (edge === 'end') {
    const newTo = Math.max(from + MIN_CLIP_S, time)
    return keys.map(k => ({ ...k, t: round(from + (k.t - from) * (newTo - from) / span) }))
  }
  const newFrom = Math.max(0, Math.min(to - MIN_CLIP_S, time))
  return keys.map(k => ({ ...k, t: round(to - (to - k.t) * (to - newFrom) / span) }))
}

/** Every key's cell moved by `dc` cells: the stage drag moves the whole path (Bart, 2026-09-29). */
export function shiftPath (keys, dc) {
  return keys.map(k => ({ ...k, cell: [k.cell[0] + dc[0], k.cell[1] + dc[1]] }))
}
