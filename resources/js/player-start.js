/**
 * Where an embedded player starts, and whether it may start by itself.
 *
 * The editor's Play opens the real player over the editor at the scene the teacher has selected.
 * The editor knows a scene by its id (the wizard's ?scene=), the player plays by its index in
 * lesson.scenes (its scene queue). And the teacher's click on Play happens in the editor, around
 * the frame: that click is the gesture that lets the frame start with sound.
 */

/** Pure: the index to start at: ?scene_id= (a scene id) when the lesson has it, else ?scene= (an index), else 0. */
export function startSceneIndex (scenes, params) {
  const id = params.get('scene_id')
  if (id !== null && id !== '') {
    const at = (scenes ?? []).findIndex(s => String(s?.id) === id)
    if (at >= 0) return at
  }
  const n = parseInt(params.get('scene'), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/**
 * Whether a human asked for this visit to play: a click in this page, or (a frame) in the
 * same-origin page around it. A cold reload of a parked tab never starts talking on its own.
 * Browsers without userActivation (Safari) keep the old behaviour; their own policy is stricter.
 */
export function mayAutoplay (win) {
  const own = win?.navigator?.userActivation?.hasBeenActive
  if (own === undefined) return true
  if (own) return true
  try {
    return win.parent !== win && !!win.parent?.navigator?.userActivation?.hasBeenActive
  } catch {
    return false
  }
}
