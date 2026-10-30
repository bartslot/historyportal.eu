// The speaker stays readable. A figure's share of the frame depends on the CAMERA, not only on its depth: a wide shot
// that backs the camera up to z -3 makes a figure at fg (7 m) 18 % of the frame, a close push to z 2 fills the frame
// and cuts the feet. So the camera is held in a window around the speaker (figures.ts places the speaker at fg):
//   far limit: the speaker is still at least MAIN_MIN of the frame height;
//   near limit: no more than FILL_MAX of the frame height, and the feet (eye height over the distance) stay in frame;
// and its x keeps the speaker inside the frame's middle (balloons point at the head, so it must be on screen).
import { DEPTH_Z } from '../stage25d/layout'
import type { CamPose, Figure, Scene } from './types'

export const MAIN_MIN = 0.3
export const FILL_MAX = 0.85
const ASPECT = 16 / 9
const PITCH_UP_DEG = 2 // the house camera looks up a touch (stage25d HOUSE_PITCH_DEG): the frame's bottom edge is fov/2 - 2 degrees below the horizon
const MAX_EYE_Y = 1.6
const MAX_FOV = 50 // a wide lens makes the speaker a speck; the stage's house lens is 50
const FEET_MARGIN = 0.85 // the feet end this share of the way to the frame's bottom edge, at most
const MID_FRAME = 0.34 // the speaker's x stays within this share of the view width either side of the frame centre

/** The speaker's figure (first with a balloon, else the first). */
export function speakerFigure(scene: Scene): Figure | null {
  const figs = scene.figures ?? []
  const talk = (scene.balloons ?? []).find((b) => figs.some((f) => f.char === b.char))
  return figs.find((f) => f.char === talk?.char) ?? figs[0] ?? null
}

type Spot = { z: number; x: number; h: number }
const OTHER_EDGE = 0.85 // everyone else stays within this share of the half-width, when the speaker allows it

/** The camera x range that keeps a figure within `nx` (share of the half-width) of the frame centre. */
const xRange = (p: { z: number; fov: number }, f: Spot, nx: number): [number, number] => {
  const half = nx * (f.z - p.z) * Math.tan((p.fov * Math.PI) / 360) * ASPECT
  return [f.x - half, f.x + half]
}

/** A camera pose moved into the window where the speaker (height h, at z/x) reads; the others are kept in frame when that
 *  costs the speaker nothing (the intersection of their x ranges with the speaker's). */
export function holdPose(pose: CamPose, fig: Spot, others: Spot[] = []): CamPose {
  // the crane stays near eye height: a high camera needs the speaker far away to keep the feet in frame
  const p = { ...pose, y: Math.min(pose.y, MAX_EYE_Y), fov: Math.min(pose.fov, MAX_FOV) }
  const th = Math.tan((p.fov * Math.PI) / 360)
  const feet = p.y / Math.tan(((FEET_MARGIN * p.fov) / 2 - PITCH_UP_DEG) * (Math.PI / 180))
  const dzMin = Math.max(fig.h / (FILL_MAX * 2 * th), feet)
  const dzMax = Math.max(dzMin, fig.h / (MAIN_MIN * 2 * th))
  const z = Math.min(fig.z - dzMin, Math.max(fig.z - dzMax, p.z))
  const mine = { z, fov: p.fov }
  let [lo, hi] = xRange(mine, fig, 2 * MID_FRAME)
  for (const o of others) {
    const [a, b] = xRange(mine, o, OTHER_EDGE)
    if (Math.max(lo, a) <= Math.min(hi, b)) { lo = Math.max(lo, a); hi = Math.min(hi, b) }
  }
  const x = Math.min(hi, Math.max(lo, p.x))
  return { ...p, z: Math.round(z * 100) / 100, x: Math.round(x * 100) / 100 }
}

const spotOf = (f: Figure): Spot => {
  const z = DEPTH_Z[f.depth ?? 'fg']
  return { z, x: ((f.x ?? 0.5) - 0.5) * 2 * z * Math.tan((50 * Math.PI) / 360) * ASPECT, h: f.h_m ?? 1.7 }
}

/** The shot's two poses held on the scene's speaker; unchanged when nobody speaks. */
export function holdSpeaker(poses: { from: CamPose; to: CamPose }, scene: Scene): { from: CamPose; to: CamPose } {
  const f = speakerFigure(scene)
  if (!f || !f.h_m) return poses
  const others = (scene.figures ?? []).filter((o) => o !== f && o.h_m).map(spotOf)
  return { from: holdPose(poses.from, spotOf(f), others), to: holdPose(poses.to, spotOf(f), others) }
}
