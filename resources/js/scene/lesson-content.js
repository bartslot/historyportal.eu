// What a lesson CONTAINS decides how the player runs it, never the game_type it was created with
// (Bart 2026-11-17: a voyage, choices and class meters are things any lesson can take). Mirrors
// Lesson::hasChoices / hasMeters / hasVoyage on the server.

const scenesOf = (lesson) => (Array.isArray(lesson?.scenes) ? lesson.scenes : [])

/**
 * The lesson has Decision points: the player asks the class at the question and plays only the option it taps, then
 * goes on where the options meet again (PM 2026-11-17, Twine interactivity). Meters are not needed for that.
 */
export function hasChoices (lesson) {
  return scenesOf(lesson).some((s) => !!s?.branch_role)
}

/** Class meters the options push up and down: an add-on to choices, never a condition for them. */
export function hasMeters (lesson) {
  const meters = lesson?.game_config?.meters
  return Array.isArray(meters) && meters.length > 0
}

/** The lesson sails: one persistent map across its legs, the deck's voyage navigation and A/B keys. */
export function hasVoyage (lesson) {
  return scenesOf(lesson).some((s) => s?.kind === 'voyage')
}
