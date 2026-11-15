/**
 * stage-hold.js: a stage scene's voice waits for its set. The narration is the stage's clock, so a voice that starts
 * while the set still loads plays its first seconds to a picture that is not there yet (3.4 to 3.7 s on a GPU, 11 to
 * 13 s headless, 11-15). The voice starts once the stage is shown, or after `timeoutMs`, so a stage that never comes up
 * never holds the lesson.
 */

/** How long a voice waits for its stage at most. */
export const STAGE_HOLD_MS = 8000

/** Resolves when `shown` settles (shown or failed: the player falls back on its own) or after `timeoutMs`, whichever first. */
export function whenStageReady (shown, timeoutMs = STAGE_HOLD_MS) {
  if (!shown) return Promise.resolve('none')
  let timer
  const late = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), timeoutMs) })
  return Promise.race([Promise.resolve(shown).then(() => 'ready', () => 'failed'), late]).finally(() => clearTimeout(timer))
}
