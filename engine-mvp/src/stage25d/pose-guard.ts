// The posing rules (Bart, ~/.claude/rules/posing.md), checked on where the joints really are, never on the sign of a
// turn: a knee never bends backwards, an elbow folds to the front of the body, and which way is front comes from the
// feet (ankle to toe), not from what a rig claims. 2D port of resources/js/pose-guards.js. Screen px, y down.
type Pt = readonly [number, number]

/** Below this bend (degrees) a limb counts as straight: nothing to guard. */
export const STRAIGHT_DEG = 3
/** A thigh raised past this many degrees from hanging down is sitting or squatting: its knee must be in front of the hip. */
export const RAISED_THIGH_DEG = 45

/** Which way a foot points on screen: 1 right, -1 left, 0 when it points straight down or up. */
export const forwardOf = (ankle: Pt, toe: Pt): 1 | -1 | 0 => (toe[0] > ankle[0] ? 1 : toe[0] < ankle[0] ? -1 : 0)

/** How far, in degrees, and to which side the second segment turns from the first: positive clockwise on screen. */
export function bendOf(a: Pt, joint: Pt, b: Pt): number {
  const u = [joint[0] - a[0], joint[1] - a[1]], v = [b[0] - joint[0], b[1] - joint[1]]
  return (Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) * 180) / Math.PI
}

/**
 * A knee folds backwards: the shin swings to the back of the thigh, away from where the toes point. Clockwise on screen
 * (y down) carries a hanging shin to the left, so for a figure facing right a good knee bends clockwise.
 */
export function kneeIsRight(hip: Pt, knee: Pt, ankle: Pt, forward: 1 | -1 | 0): boolean {
  const bend = bendOf(hip, knee, ankle)
  return !forward || Math.abs(bend) < STRAIGHT_DEG || Math.sign(bend) === forward
}

/** An elbow folds to the front of the body: the other way round from a knee. */
export function elbowIsRight(shoulder: Pt, elbow: Pt, hand: Pt, forward: 1 | -1 | 0): boolean {
  const bend = bendOf(shoulder, elbow, hand)
  return !forward || Math.abs(bend) < STRAIGHT_DEG || Math.sign(bend) === -forward
}

/** Sitting or squatting, the knee ends up in front of the hip. A thigh that hangs is not asked. */
export function kneeInFront(hip: Pt, knee: Pt, forward: 1 | -1 | 0): boolean {
  const fromDown = (Math.atan2(Math.abs(knee[0] - hip[0]), knee[1] - hip[1]) * 180) / Math.PI
  return !forward || fromDown < RAISED_THIGH_DEG || Math.sign(knee[0] - hip[0]) === forward
}

/** Signed distance of p from the line a -> b (screen px), positive on the right of the line seen from a. */
const sideOf = (a: Pt, b: Pt, p: Pt): number => {
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1
  return ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / n
}

/** How far past the far shoulder (along the torso's width) a point of an arm may go: a hand in front of the chest is
 *  natural, one out beyond the far side has passed through the body (posing rule: an arm never passes through it). */
export const ARM_PAST_PX = 0.15

/**
 * An arm stays on its own side of the torso: measured across the torso's axis (waist to neck), the point (an elbow, a
 * hand) never reaches beyond the other shoulder by more than ARM_PAST_PX of the shoulders' width. Works for either
 * arm and any facing: which side is "own" comes from where this arm's shoulder is, never from the sign of a turn.
 */
export function armOnItsSide(waist: Pt, neck: Pt, ownShoulder: Pt, otherShoulder: Pt, point: Pt): boolean {
  const own = sideOf(waist, neck, ownShoulder), other = sideOf(waist, neck, otherShoulder)
  if (Math.sign(own) === Math.sign(other) || own === 0) return true   // shoulders not either side of the axis: no rule to read
  const s = Math.sign(own), width = Math.abs(own - other)
  return sideOf(waist, neck, point) * s >= other * s - ARM_PAST_PX * width
}

/** Height of p along the torso's axis, waist 0 and neck 1. */
const heightOf = (waist: Pt, neck: Pt, p: Pt): number => {
  const dx = neck[0] - waist[0], dy = neck[1] - waist[1]
  return ((p[0] - waist[0]) * dx + (p[1] - waist[1]) * dy) / (dx * dx + dy * dy || 1)
}

/**
 * An arm drawn in front of the body may reach across the chest (a point or a reach in a 3/4 view), but never up across
 * the face: once a point of it (elbow, hand) is past the torso's axis, it stays below the neck.
 */
export function armClearOfFace(waist: Pt, neck: Pt, ownShoulder: Pt, point: Pt): boolean {
  const own = sideOf(waist, neck, ownShoulder)
  if (own === 0) return true
  const across = sideOf(waist, neck, point) * Math.sign(own) < 0
  return !across || heightOf(waist, neck, point) <= 1
}
