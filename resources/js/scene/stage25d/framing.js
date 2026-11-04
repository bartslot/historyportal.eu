/**
 * stage25d/framing: a teacher frames the camera on the canvas. The Camera row is selected, the canvas shows the shot at
 * the playhead, a drag moves the camera sideways and up, a scroll moves it forward, a pinch changes the lens. Each frame
 * is a key at the playhead; the player glides from key to key, one shot per pair (layout.ts shotAt + cameraAt). Pure, so
 * the engine and the tests share one rule.
 */
import { HOUSE, cameraAt, fovRad, shotAt } from '@stage25d/stage25d/layout'

/** How far the camera may go (metres, lens in degrees): the dev tool's ranges, so a shot never leaves the set. */
export const CAM_RANGE = { x: [-8, 8], y: [0.3, 6], z: [-4, 15], fov: [20, 75] }

/** How far the camera may lean, degrees. Kept apart from CAM_RANGE: a pose without it is level. */
export const ROLL_RANGE = [-45, 45]

/** A drag moves the picture as if held at this distance (metres): the middle ground follows the pointer. */
const GRAB_M = 10
const DOLLY_M_PER_PX = 0.01
const LENS_PER_PX = 0.01

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))
const round3 = (n) => Math.round(n * 1000) / 1000

/** A pose held to the camera's range, every field present (the house pose fills the gaps). */
export const clampPose = (p) => {
  const full = { ...HOUSE, ...p }
  const pose = Object.fromEntries(Object.keys(CAM_RANGE).map((k) => [k, round3(clamp(Number(full[k]) || HOUSE[k], CAM_RANGE[k]))]))
  const roll = round3(clamp(Number(full.roll) || 0, ROLL_RANGE))
  return roll ? { ...pose, roll } : pose
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

const SAME_S = 0.001

/** The scene's shots as keys in time, `{ t, pose }`: each shot's start and end (a later shot's start replaces an end there). */
export const cameraKeys = (cam, more, dur) => {
  const keys = []
  for (const shot of [cam, ...(more ?? [])].filter(Boolean)) {
    const at = Number(shot.at_s) || 0
    const put = (t, pose) => { const i = keys.findIndex((k) => Math.abs(k.t - t) < SAME_S); if (i >= 0) keys[i] = { t, pose }; else keys.push({ t, pose }) }
    const from = clampPose(shot.from ?? HOUSE)
    const to = clampPose(shot.to ?? shot.from ?? HOUSE)
    put(at, from)
    // a still shot with no length of its own is one framed moment, not a pair
    if (Number(shot.dur_s) || JSON.stringify(from) !== JSON.stringify(to)) put(at + (Number(shot.dur_s) || Math.max(0, dur - at)), to)
  }
  return keys.sort((a, b) => a.t - b.t)
}

/** Keys with a pose at t: the key there replaced, or a new one. */
export const withCameraKey = (keys, t, pose) =>
  [...keys.filter((k) => Math.abs(k.t - t) >= SAME_S), { t, pose: clampPose(pose) }].sort((a, b) => a.t - b.t)

export const withoutCameraKey = (keys, t) => keys.filter((k) => Math.abs(k.t - t) >= SAME_S)

/** The key nearest t, for an edit with auto-key off. */
export const nearestCameraKey = (keys, t) => keys.reduce((best, k) => (Math.abs(k.t - t) < Math.abs(best.t - t) ? k : best), keys[0])

/** Keys back to shots, `[camera, ...camera_more]`: none is no move, one is a still shot. */
export const shotsOfKeys = (keys) => {
  const shot = (from, to, at, dur) => ({ move: 'framed', ease: 'inOut', at_s: at, ...(dur ? { dur_s: dur } : {}), from, to })
  if (keys.length < 2) return keys.map((k) => shot(k.pose, k.pose, 0))
  return keys.slice(0, -1).map((k, i) => shot(k.pose, keys[i + 1].pose, k.t, keys[i + 1].t - k.t))
}

/** The pose the camera holds at t (the lens in degrees, as the shots store it). */
export const cameraPoseAt = (cam, more, t, dur) => {
  const { cam: shot, t: into } = shotAt({ camera: cam, camera_more: more }, t)
  const p = cameraAt(shot, Math.max(0, into), dur)
  return clampPose({ x: p.x, y: p.y, z: p.z, fov: (p.fov * 180) / Math.PI, roll: p.roll })
}
