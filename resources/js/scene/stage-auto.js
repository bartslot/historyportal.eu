// When a stage slide (a voyage landfall, a gallery) moves on by itself.
//
// Such a slide asks nothing of the class, so it must continue on its own once its narration and
// a short look are done, exactly like a story scene. Only real interaction holds a lesson: a quiz,
// a team game, a power-meter moment, a race, or the teacher pausing.
//
// The voice decides, never a flat clock: a leg with thirty seconds to say gets thirty seconds.
// The floor is for a slide with little or no narration, so it is still on screen long enough to be
// looked at. A teacher who sets the scene's Duration (config.estimate_seconds) sets that floor.

import { CYCLE_MS } from '../gallery-scene.js'

export const STAGE_FLOOR_MS = 10000     // a silent slide still gets a beat to be looked at
export const STAGE_TAIL_MS = 1200       // a breath after the last word, before the slide moves on
export const STAGE_CEILING_MS = 180000  // audio that never ends must not strand the class on one slide

/**
 * The least time this scene stays up. The teacher's Duration wins; a gallery otherwise shows every
 * image once at the default cycle.
 *
 * @param {{ kind?: string, config?: object }} scene
 * @returns {number} ms
 */
export function stageFloorMs (scene) {
  const cfg = scene?.config || {}
  const set = Number(cfg.estimate_seconds)
  if (set > 0) return set * 1000
  const images = scene?.kind === 'gallery' && Array.isArray(cfg.images) ? cfg.images.length : 0
  return Math.max(STAGE_FLOOR_MS, images * CYCLE_MS)
}

/**
 * Where the countdown stands.
 *
 * @param {{ elapsed: number, silentAt: number|null, floorMs?: number, tailMs?: number, ceilingMs?: number }} s
 *   elapsed  ms the slide has been counting (pauses excluded)
 *   silentAt elapsed ms at which the narration finished, or null while it is still going
 * @returns {{ progress: number, done: boolean }}
 */
export function stageAdvance ({ elapsed, silentAt, floorMs = STAGE_FLOOR_MS, tailMs = STAGE_TAIL_MS, ceilingMs = STAGE_CEILING_MS }) {
  const readyAt = silentAt === null ? null : Math.max(floorMs, silentAt + tailMs)
  // While the voice is still going the bar creeps but never fills: a full bar that then does not
  // advance reads as a stuck lesson.
  const progress = readyAt === null ? Math.min(0.92, elapsed / floorMs) : Math.min(1, elapsed / readyAt)
  return { progress, done: elapsed >= (readyAt ?? ceilingMs) }
}
