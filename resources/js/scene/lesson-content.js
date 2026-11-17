// What a lesson CONTAINS decides how the player runs it, never the game_type it was created with
// (Bart 2026-11-17: a voyage, choices and class meters are things any lesson can take). Mirrors
// Lesson::hasChoices / hasMeters / hasVoyage on the server.

const scenesOf = (lesson) => (Array.isArray(lesson?.scenes) ? lesson.scenes : [])

/** The class meters engine runs when a Decision point has meters to push (else both options play in a row). */
export function playsStoryGame (lesson) {
  const meters = lesson?.game_config?.meters
  return Array.isArray(meters) && meters.length > 0 && scenesOf(lesson).some((s) => !!s?.branch_role)
}

/** The lesson sails: one persistent map across its legs, the deck's voyage navigation and A/B keys. */
export function hasVoyage (lesson) {
  return scenesOf(lesson).some((s) => s?.kind === 'voyage')
}
