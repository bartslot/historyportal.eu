/**
 * sail-clip.js — a voyage leg's crossing as a clip on the scene's timeline.
 *
 * Bart 2026-11-21: "the hormuz voyage leg is too long, I want it to control the time, but it's not added to the
 * timeline." So the crossing is a bar like a balloon's: where it starts is when the ship sets sail, its length is how
 * long the crossing takes. Stored as `timeline.sail = { start, end }` in seconds. A leg nobody has touched has no
 * `sail`, and plays as it always did: it sets off when the camera's keys are done, and takes as long as the leg's dates
 * say (two seconds a month, between 6 and 26).
 */

import { cameraEnd } from './scene-animation.js'

export const SEC_PER_MONTH = 2
export const MIN_SAIL_S = 6
export const MAX_SAIL_S = 26
/** The shortest crossing a teacher can drag the bar down to. */
export const MIN_CLIP_S = 0.5
const MONTH_MS = 30.44 * 24 * 3600 * 1000

/** How long a leg sails when nobody has set it: two seconds per month between its dates, clamped. */
export const defaultSailSeconds = (depart, arrive) => {
  const span = Date.parse(arrive) - Date.parse(depart)
  if (!Number.isFinite(span)) return MIN_SAIL_S
  return Math.min(MAX_SAIL_S, Math.max(MIN_SAIL_S, (span / MONTH_MS) * SEC_PER_MONTH))
}

const round = (s) => Math.round(s * 100) / 100

/** The stored clip, when it is a usable one. */
export const storedSail = (timeline) => {
  const s = timeline?.sail
  const start = Number(s?.start)
  const end = Number(s?.end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end - start < MIN_CLIP_S - 1e-6) return null
  return { start: round(start), end: round(end) }
}

/**
 * The crossing on this scene's clock, { start, end } in seconds: the teacher's clip, or the default — setting off
 * once the camera's keys are done, for as long as the dates say.
 * @param {object|null} timeline the scene's config.timeline
 * @param {{ depart?: string, arrive?: string }|null} leg the leg's dates
 */
export const sailClip = (timeline, leg = null) => {
  const stored = storedSail(timeline)
  if (stored) return stored
  const start = round(cameraEnd(timeline))
  return { start, end: round(start + defaultSailSeconds(leg?.depart, leg?.arrive)) }
}

/** How far through the crossing the ship is at scene time `t`, 0..1. */
export const sailProgressAt = (clip, t) => {
  if (!clip || !(clip.end > clip.start)) return t >= (clip?.start ?? 0) ? 1 : 0
  return Math.min(1, Math.max(0, (t - clip.start) / (clip.end - clip.start)))
}
