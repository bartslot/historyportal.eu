// Its own module, with no imports: the player reads it too, and must not pull the timeline's code in with it.

/**
 * When the narration starts on the scene's clock, in seconds (Bart, 2026-11-24: "i should also be able to drag the
 * audio to the right or left"). 0 is the start of the scene; never before it.
 */
export const storedNarrationStart = (timeline) => {
  const s = Number(timeline?.narrationStart)
  return Number.isFinite(s) && s > 0 ? Math.min(3600, Math.round(s * 100) / 100) : 0
}
