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
/** `lens`: a zoom (the lens changes, the camera does not travel) is free of the feet rule: the camera only backs off
 *  when the narrower lens would make the speaker overfill the frame, it never moves nearer. */
export function holdPose(pose: CamPose, fig: Spot, others: Spot[] = [], lens = false): CamPose {
  // the crane stays near eye height: a high camera needs the speaker far away to keep the feet in frame
  const p = { ...pose, y: Math.min(pose.y, MAX_EYE_Y), fov: Math.min(pose.fov, MAX_FOV) }
  const th = Math.tan((p.fov * Math.PI) / 360)
  const feet = p.y / Math.tan(((FEET_MARGIN * p.fov) / 2 - PITCH_UP_DEG) * (Math.PI / 180))
  const dzMin = Math.max(fig.h / (FILL_MAX * 2 * th), feet)
  const dzMax = Math.max(dzMin, fig.h / (MAIN_MIN * 2 * th))
  const z = lens ? Math.min(p.z, fig.z - fig.h / (FILL_MAX * 2 * th)) : Math.min(fig.z - dzMin, Math.max(fig.z - dzMax, p.z))
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
export function holdSpeaker(poses: { from: CamPose; to: CamPose }, scene: Scene, lens = false): { from: CamPose; to: CamPose } {
  if (hasBust(scene)) return holdBust(poses)
  const f = speakerFigure(scene)
  if (!f || !f.h_m) return poses
  const others = (scene.figures ?? []).filter((o) => o !== f && o.h_m).map(spotOf)
  return { from: holdPose(poses.from, spotOf(f), others, lens), to: holdPose(poses.to, spotOf(f), others, lens) }
}

// Close-ups (comic busts): a figure whose pose starts with `bust` is a head-and-shoulders cutout cut off straight at the
// chest. It stands on a plane (near, or fg behind an over-the-shoulder piece) sized from the camera so the head sits in
// the upper part of the frame and the frame's bottom edge cuts through the chest: its own bottom edge never shows.
// The camera of a bust shot stays near the house pose (BUST_CAM) with only a small push or truck, so the sizing holds.
export const isBust = (pose: string | undefined): boolean => !!pose?.startsWith('bust')
/** The camera busts are sized from: the house pose (stage25d HOUSE). */
export const BUST_CAM: CamPose = { x: 0, y: MAX_EYE_Y, z: 0, fov: MAX_FOV }
/** headTop: where the head's top ends, share of the frame height from the bottom; cut: share of the bust below the frame. */
export type BustFit = { headTop: number; cut: number }
export const BUST_FIT = {
  close: { headTop: 0.85, cut: 0.15 }, // the one bust of the shot, on the near plane
  back: { headTop: 0.75, cut: 0.35 }, // over the shoulder: bigger, lower, partly out of frame
  far: { headTop: 0.7, cut: 0.15 }, // the face seen over that shoulder, at fg
} satisfies Record<string, BustFit>
const BUST_PUSH_M = 0.4 // a bust shot pushes in at most this far (nearer only raises the frame's bottom edge)
const BUST_DRIFT_M = 0.2 // and trucks at most this far either side of the house x
const BUST_FOV_MIN = 46 // a narrower lens would cut the head once the camera has pushed in (camera.ts may zoom to 42 at the house z)

const deg = (d: number) => (d * Math.PI) / 180
/** World heights of the frame's bottom and top edges on the plane at z, seen from cam (the house pitch included). */
export function frameEdges(z: number, cam: CamPose = BUST_CAM): { bottom: number; top: number } {
  const d = z - cam.z
  return { bottom: cam.y - d * Math.tan(deg(cam.fov / 2 - PITCH_UP_DEG)), top: cam.y + d * Math.tan(deg(cam.fov / 2 + PITCH_UP_DEG)) }
}
/** Scale and y lift (metres) for a bust of library height hM on the plane at z:
 *  drawn h = headTop * (top - bottom) / (1 - cut); y = bottom - cut * h. */
export function bustFit(hM: number, z: number, fit: BustFit, cam: CamPose = BUST_CAM): { scale: number; y: number } {
  const { bottom, top } = frameEdges(z, cam)
  const h = (fit.headTop * (top - bottom)) / (1 - fit.cut)
  return { scale: Math.round((h / hM) * 1000) / 1000, y: Math.round((bottom - fit.cut * h) * 1000) / 1000 }
}

/** A scene that draws a bust: a figure layer whose `need` (figures.ts: "char:<id> pose:<drawn pose>") is a bust pose. */
export const hasBust = (scene: Scene): boolean => scene.set.layers.some((l) => l.figure && / pose:bust/.test(l.need ?? ''))

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const bustPose = (p: CamPose): CamPose => ({
  ...p, x: clamp(p.x, BUST_CAM.x - BUST_DRIFT_M, BUST_CAM.x + BUST_DRIFT_M), y: BUST_CAM.y,
  z: clamp(p.z, BUST_CAM.z, BUST_CAM.z + BUST_PUSH_M), fov: clamp(p.fov, BUST_FOV_MIN, BUST_CAM.fov),
})
/** A bust shot's poses: held near the house pose, never lower, farther or wider than the pose the bust was sized from;
 *  a move that clamps to nothing becomes a slow push. */
export function holdBust(poses: { from: CamPose; to: CamPose }): { from: CamPose; to: CamPose } {
  const from = bustPose(poses.from), to = bustPose(poses.to)
  if (Math.abs(to.x - from.x) + Math.abs(to.z - from.z) > 0.05) return { from, to }
  return { from: { ...from, z: BUST_CAM.z }, to: { ...to, z: BUST_CAM.z + BUST_PUSH_M } }
}
