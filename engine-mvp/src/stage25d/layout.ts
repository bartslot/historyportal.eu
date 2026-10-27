// Pure stage maths: where a layer stands, how big it is, and where the camera is at time t.
// Metres everywhere. The house camera stands at x 0, eye height, looking down +z with a small fixed tilt.
import type { Asset, CamPose, CameraMove, Depth, Ease, LayerKey, MotionKind, MotionSpec, Scene, SceneLayer } from './types'

/** Distance from the house camera to each depth plane. Wide gaps between them = strong parallax on a truck. */
export const DEPTH_Z: Record<Depth, number> = { sky: 380, bg: 70, mid: 22, fg: 7 }
export const DEPTH_RANK: Record<Depth, number> = { sky: 0, bg: 1, mid: 2, fg: 3 }
export const HOUSE: CamPose = { x: 0, y: 1.6, z: 0, fov: 50 }
export const HOUSE_PITCH_DEG = -2           // looking up a touch: more sky, the near ground line low in the frame
export const ASPECT = 16 / 9
export const COVER_MARGIN = 1.6             // wide strips (sky, tileable bg) span this much of the view, for camera moves
export const SAME_DEPTH_STEP_M = 0.05       // later layers at one depth stand this much nearer, so geometry agrees with draw order

/** fov in degrees (human-editable); a value that can only be radians is converted. */
export const fovRad = (fov: number) => (fov > Math.PI ? (fov * Math.PI) / 180 : fov)

/** Width of the house camera's view at distance z. */
export const viewWidthAt = (z: number, fov = HOUSE.fov, aspect = ASPECT) => 2 * z * Math.tan(fovRad(fov) / 2) * aspect

export interface Placement { x: number; y: number; z: number; w: number; h: number; uRepeat: number; alphaIndex: number }

/** Where a layer's anchor stands and the plane's size. x 0..1 = left..right edge of the house view at that depth. */
export function placeLayer(asset: Asset, layer: Pick<SceneLayer, 'depth' | 'x' | 'scale'>, order: number): Placement {
  const depth = layer.depth
  const z = DEPTH_Z[depth] - order * SAME_DEPTH_STEP_M
  const span = viewWidthAt(z)
  const alphaIndex = DEPTH_RANK[depth] * 1000 + order
  if (depth === 'sky' && asset.layer === 'sky' && asset.tileable_x !== false && asset.height_m >= 100) {
    // the backdrop sky: fills the view at its distance, horizon a little below the frame's bottom edge
    const w = span * COVER_MARGIN
    const h = w / ASPECT
    const tileW = h * (asset.w / asset.h)
    return { x: 0, y: -h * 0.12, z, w, h, uRepeat: asset.tileable_x ? w / tileW : 1, alphaIndex }
  }
  const h = asset.height_m * (layer.scale ?? 1)
  const natW = h * (asset.w / asset.h)
  const w = asset.tileable_x ? Math.max(natW, span * COVER_MARGIN) : natW
  const x = asset.tileable_x ? 0 : ((layer.x ?? 0.5) - 0.5) * span
  // sky props (clouds) float: their anchor sits at 30-60 % of the view height at that distance
  const y = depth === 'sky' ? z * Math.tan(fovRad(HOUSE.fov) / 2) * 0.45 : 0
  return { x, y, z, w, h, uRepeat: asset.tileable_x ? w / natW : 1, alphaIndex }
}

const EASES: Record<Ease, (k: number) => number> = {
  linear: (k) => k,
  in: (k) => 1 - Math.cos((k * Math.PI) / 2),
  out: (k) => Math.sin((k * Math.PI) / 2),
  inOut: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
}
export const ease = (name: Ease | undefined, k: number) => (EASES[name ?? 'inOut'] ?? EASES.inOut)(Math.min(1, Math.max(0, k)))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

export const sceneDuration = (s: Scene) => s.dur_s ?? s.camera?.dur_s ?? s.est_s ?? 8

/** The shot playing t s into a scene, with its own clock (`camera` then `camera_more`, each from its at_s).
 *  Same rule as the director's shotAt (S5, director/camera.ts). */
export function shotAt(scene: Scene, t: number): { cam: CameraMove | null; t: number } {
  const shots = [scene.camera, ...(scene.camera_more ?? [])].filter(Boolean) as CameraMove[]
  const cam = [...shots].reverse().find((c) => (c.at_s ?? 0) <= t) ?? shots[0] ?? null
  return { cam, t: cam ? t - (cam.at_s ?? 0) : t }
}

/** Camera pose t seconds into a scene; a scene without a move holds the house pose. */
export function cameraAt(cam: CameraMove | null | undefined, t: number, dur: number): CamPose {
  if (!cam) return { ...HOUSE, fov: fovRad(HOUSE.fov) }
  const k = ease(cam.ease, dur > 0 ? t / (cam.dur_s ?? dur) : 1)
  const f = { ...HOUSE, ...cam.from }
  const to = { ...f, ...cam.to }
  return { x: lerp(f.x, to.x, k), y: lerp(f.y, to.y, k), z: lerp(f.z, to.z, k), fov: lerp(fovRad(f.fov), fovRad(to.fov), k) }
}

/** A layer's x/scale/opacity at time t: its own values, moved by keyframes (eased in-out between keys). */
export function layerAt(layer: SceneLayer, t: number): { x: number; scale: number; opacity: number } {
  const base = { x: layer.x ?? 0.5, scale: layer.scale ?? 1, opacity: 1 }
  const keys = [...(layer.keys ?? [])].sort((a, b) => a.t - b.t)
  if (!keys.length) return base
  const val = (k: LayerKey, f: 'x' | 'scale' | 'opacity') => k[f] ?? base[f]
  const out = { ...base }
  for (const f of ['x', 'scale', 'opacity'] as const) {
    if (!keys.some((k) => k[f] !== undefined)) continue
    if (t <= keys[0].t) { out[f] = val(keys[0], f); continue }
    const last = keys[keys.length - 1]
    if (t >= last.t) { out[f] = val(last, f); continue }
    const i = keys.findIndex((k) => k.t > t)
    const a = keys[i - 1], b = keys[i]
    out[f] = lerp(val(a, f), val(b, f), ease('inOut', (t - a.t) / (b.t - a.t)))
  }
  return out
}

export const MOTION_CODE: Record<MotionKind, number> = { none: 0, sway: 1, drift: 2, ripple: 3, flicker: 4 }

/** The asset's motion, overridden by the layer's (a bare kind or { kind, amount, speed }). */
export function motionOf(asset: Asset, layer: SceneLayer): Required<MotionSpec> {
  const o: MotionSpec = typeof layer.motion === 'string' ? { kind: layer.motion } : layer.motion ?? {}
  return { kind: o.kind ?? asset.motion ?? 'none', amount: o.amount ?? 1, speed: o.speed ?? 1 }
}

/** Render size steps: the cap on the longest side (device px), and the adaptive drop below it. */
export const RENDER_CAPS = [1280, 1920, 2560] as const
export const RENDER_STEP = 0.25        // one adaptive notch = a quarter of a CSS pixel per pixel
export const ADAPT_WINDOW_MS = 2000
export const ADAPT_STALL_MS = 250      // a frame gap this long (a load, a hidden tab) voids the window: not slowness

/** Render tier rules (PM 2026-10-27): classroom laptops must never see the sharpness jump back and forth. */
export const ADAPT = {
  downFps: 50,          // a window under this steps one notch down
  upFps: 58,            // up only after `upWindows` windows in a row at this or more,
  upWindows: 3,
  upAfterChangeMs: 20000,  // and at least this long since the last change,
  upEveryMs: 60000,     // and at most one step up per this,
  lockFlips: 2,         // after this many reversals of direction: locked at the lower tier for the session
} as const

export interface Tier { notches: number; fast: number; lastChange: number; lastUp: number; lastDir: 0 | 1 | -1; flips: number; locked: boolean }
export const TIER0: Tier = { notches: 0, fast: 0, lastChange: -Infinity, lastUp: -Infinity, lastDir: 0, flips: 0, locked: false }

/** One finished 2 s window -> the next tier. canDrop: a lower notch still changes the render size. */
export function nextTier(t: Tier, fps: number, now: number, canDrop: boolean): Tier {
  const change = (dir: 1 | -1): Tier => {
    const flips = t.lastDir && t.lastDir !== dir ? t.flips + 1 : t.flips
    return {
      ...t, notches: t.notches + dir, fast: 0, lastChange: now, lastDir: dir, flips,
      lastUp: dir === -1 ? now : t.lastUp, locked: t.locked || (flips >= ADAPT.lockFlips && dir === 1),
    }
  }
  if (fps < ADAPT.downFps) return canDrop ? change(1) : { ...t, fast: 0 }
  if (fps < ADAPT.upFps) return { ...t, fast: 0 }
  const fast = t.fast + 1
  const may = t.notches > 0 && !t.locked && fast >= ADAPT.upWindows
    && now - t.lastChange >= ADAPT.upAfterChangeMs && now - t.lastUp >= ADAPT.upEveryMs
  return may ? change(-1) : { ...t, fast }
}

/** Device pixels per CSS pixel: the device's own, under the cap, minus adaptive notches, never below 1x CSS. */
export function renderScale(cssLongest: number, dpr: number, cap: number, notches: number): number {
  const top = Math.min(dpr, cap / Math.max(cssLongest, 1))
  return Math.max(Math.min(1, dpr), top - notches * RENDER_STEP)
}
