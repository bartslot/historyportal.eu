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
const ROLL_RANGE = [-45, 45]

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
export const withoutCameraKey = (keys, t) => keys.filter((k) => Math.abs(k.t - t) >= SAME_S)

export const withCameraKey = (keys, t, pose) =>
  [...withoutCameraKey(keys, t), { t, pose: clampPose(pose) }].sort((a, b) => a.t - b.t)

/** How close two camera keys may be, seconds: a shot between them keeps a length. */
const KEY_GAP_S = 0.05

/** The key at `from` dragged to `to`, inside the scene: it passes other keys freely and hops over one it would land on
 *  (two keys at one time would be one). The keys stay in time order. Returns them and where it landed. */
export const movedCameraKey = (keys, from, to, dur) => {
  const moving = keys.find((k) => Math.abs(k.t - from) < SAME_S)
  if (!moving) return { keys, t: from }
  const others = keys.filter((k) => k !== moving)
  const wanted = Math.round(Math.max(0, Math.min(dur, to)) * 1000) / 1000
  const under = others.find((k) => Math.abs(k.t - wanted) < KEY_GAP_S)
  const past = under ? under.t + (wanted >= from ? KEY_GAP_S : -KEY_GAP_S) : wanted
  const t = Math.round((past < 0 || past > dur ? under.t - Math.sign(past) * KEY_GAP_S : past) * 1000) / 1000
  return { keys: [...others, { ...moving, t }].sort((p, q) => p.t - q.t), t }
}

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

/** The camera panel's preview: a wider view of the set with the start and end frames drawn on it (Bart, 2026-11-10,
 *  Figma 2775:2902). Both frames are measured on one plane GRAB_M past the camera furthest in, so a frame further in
 *  draws smaller. ponytail: the house pitch is left out (every pose shares it, it shifts both frames alike). */
const OVERVIEW_MARGIN = 1.4
const OVERVIEW_FOV_MAX = 75

/** Half the height and width a pose sees on the plane at zRef, grown to hold its roll. */
const halfFrame = (p, zRef, aspect) => {
  const hh = (zRef - p.z) * Math.tan(fovRad(p.fov) / 2)
  const r = Math.abs(((p.roll ?? 0) * Math.PI) / 180)
  return { w: hh * aspect * Math.cos(r) + hh * Math.sin(r), h: hh * aspect * Math.sin(r) + hh * Math.cos(r) }
}

/** Where the preview camera stands to see every pose with room around it: `{ x, y, z, fov (degrees), zRef }`. */
export const cameraOverview = (poses, aspect) => {
  const shots = poses.map(clampPose)
  const zRef = Math.max(...shots.map((p) => p.z)) + GRAB_M
  const boxes = shots.map((p) => ({ p, half: halfFrame(p, zRef, aspect) }))
  const x0 = Math.min(...boxes.map(({ p, half }) => p.x - half.w))
  const x1 = Math.max(...boxes.map(({ p, half }) => p.x + half.w))
  const y0 = Math.min(...boxes.map(({ p, half }) => p.y - half.h))
  const y1 = Math.max(...boxes.map(({ p, half }) => p.y + half.h))
  const halfH = Math.max((y1 - y0) / 2, (x1 - x0) / (2 * aspect)) * OVERVIEW_MARGIN
  // stand with the nearest camera; step back only when even the widest lens cannot hold it all
  const z = Math.min(Math.min(...shots.map((p) => p.z)), zRef - halfH / Math.tan(fovRad(OVERVIEW_FOV_MAX) / 2))
  const fov = (2 * Math.atan(halfH / (zRef - z)) * 180) / Math.PI
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, fov, zRef }
}

/** A pose's frame in the preview, as fractions of it: centre x/y (y down), width, height, and its roll in degrees. */
export const frameIn = (view, pose, aspect) => {
  const p = clampPose(pose)
  const H = (view.zRef - view.z) * Math.tan(fovRad(view.fov) / 2)
  const hh = (view.zRef - p.z) * Math.tan(fovRad(p.fov) / 2)
  return { x: 0.5 + (p.x - view.x) / (2 * H * aspect), y: 0.5 - (p.y - view.y) / (2 * H), w: hh / H, h: hh / H, roll: p.roll ?? 0 }
}

/** A frame's Size in the camera panel: how wide it is on a far plane, 100 = the house camera's. A scroll (closer) and
 *  a pinch (lens) both change it; typing it changes the lens and keeps the camera where it stands. */
const SIZE_PLANE_Z = CAM_RANGE.z[1] + GRAB_M
const sizeRef = SIZE_PLANE_Z * Math.tan(fovRad(HOUSE.fov) / 2)

export const frameSize = (pose) => {
  const p = clampPose(pose)
  return round3(((SIZE_PLANE_Z - p.z) * Math.tan(fovRad(p.fov) / 2) * 100) / sizeRef)
}

export const withFrameSize = (pose, size) => {
  const p = clampPose(pose)
  const half = Math.atan(((Number(size) || 100) / 100) * sizeRef / (SIZE_PLANE_Z - p.z))
  return clampPose({ ...p, fov: (2 * half * 180) / Math.PI })
}
