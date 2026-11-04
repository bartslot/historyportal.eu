/**
 * stage25d/framing: a teacher frames the camera on the canvas. The Camera row is selected, the canvas shows the shot's
 * start or end, a drag moves the camera sideways and up, a scroll moves it forward, a pinch changes the lens. The
 * player glides from the start to the end (layout.ts cameraAt). Pure, so the engine and the tests share one rule.
 */
import { HOUSE, fovRad } from '@stage25d/stage25d/layout'

/** How far the camera may go (metres, lens in degrees): the dev tool's ranges, so a shot never leaves the set. */
export const CAM_RANGE = { x: [-8, 8], y: [0.3, 6], z: [-4, 15], fov: [20, 75] }

/** A drag moves the picture as if held at this distance (metres): the middle ground follows the pointer. */
const GRAB_M = 10
const DOLLY_M_PER_PX = 0.01
const LENS_PER_PX = 0.01

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))
const round3 = (n) => Math.round(n * 1000) / 1000

/** A pose held to the camera's range, every field present (the house pose fills the gaps). */
export const clampPose = (p) => {
  const full = { ...HOUSE, ...p }
  return Object.fromEntries(Object.keys(CAM_RANGE).map((k) => [k, round3(clamp(Number(full[k]) || HOUSE[k], CAM_RANGE[k]))]))
}

/** A drag of dx, dy CSS px on a canvas heightPx tall: the picture follows the pointer, so the camera goes the other way. */
export const panPose = (pose, dx, dy, heightPx) => {
  const p = clampPose(pose)
  const mPerPx = (2 * GRAB_M * Math.tan(fovRad(p.fov) / 2)) / Math.max(1, heightPx)
  return clampPose({ ...p, x: p.x - dx * mPerPx, y: p.y + dy * mPerPx })
}

/** A wheel event: scroll forward/back (and sideways on a trackpad); a pinch (ctrlKey) zooms the lens. */
export const wheelPose = (pose, { deltaX = 0, deltaY = 0, ctrlKey = false }) => {
  const p = clampPose(pose)
  if (ctrlKey) return clampPose({ ...p, fov: p.fov * Math.exp(deltaY * LENS_PER_PX) })
  return clampPose({ ...p, z: p.z - deltaY * DOLLY_M_PER_PX, x: p.x + deltaX * DOLLY_M_PER_PX })
}

/** The scene's camera move with one end ('from' | 'to') set to a pose. No move yet: both ends start at the house pose. */
export const withEnd = (cam, end, pose) => {
  const base = cam ?? { move: 'framed', from: { ...HOUSE }, to: { ...HOUSE }, ease: 'inOut', at_s: 0 }
  return { ...base, [end]: clampPose(pose) }
}

/** One end of a move as a full pose (the house pose when there is no move). */
export const endOf = (cam, end) => clampPose(cam?.[end] ?? cam?.from ?? HOUSE)
