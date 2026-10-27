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

export const sceneDuration = (s: Scene) => s.camera?.dur_s ?? s.est_s ?? 8

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
export const ADAPT_MIN_FPS = 50
export const ADAPT_UP_FPS = 58         // this fast for ADAPT_UP_WINDOWS windows in a row: one notch back up
export const ADAPT_UP_WINDOWS = 3
export const ADAPT_STALL_MS = 250      // a frame gap this long (a load, a hidden tab) voids the window: not slowness

/** Device pixels per CSS pixel: the device's own, under the cap, minus adaptive notches, never below 1x CSS. */
export function renderScale(cssLongest: number, dpr: number, cap: number, notches: number): number {
  const top = Math.min(dpr, cap / Math.max(cssLongest, 1))
  return Math.max(Math.min(1, dpr), top - notches * RENDER_STEP)
}
