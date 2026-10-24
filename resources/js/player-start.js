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

/** Scene statuses that mean the pipeline is still making this scene's media. */
const GENERATING = ['pending', 'generating']

/**
 * Pure: can the class press Start? A lesson whose narration is still being made waits ("Audio
 * generating…"), but a lesson with nothing generating is startable whether or not it is narrated:
 * a narration-free lesson used to wait forever (pair test round 5).
 *
 * It waits while ANY scene that needs a voice is still being made, not just until the first one is
 * ready: a partly narrated lesson offered Start and the class then hit silent scenes mid-lesson
 * (pair test round 6). A scene that plays without narration never blocks, and neither does one
 * that still has its old recording while it is re-narrated.
 */
export function canStartLesson (lesson) {
  const scenes = lesson?.scenes || []
  const playsWithoutVoice = (s) => ['map', 'voyage', 'gallery', 'video', 'game'].includes(s.kind)
  const stillMaking = (s) => GENERATING.includes(s.status) && !s.audio_url && !playsWithoutVoice(s)
  return scenes.length > 0 && !scenes.some(stillMaking)
}
