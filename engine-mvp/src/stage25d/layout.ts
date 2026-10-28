// Pure stage maths: where a layer stands, how big it is, and where the camera is at time t.
// Metres everywhere. The house camera stands at x 0, eye height, looking down +z with a small fixed tilt.
import type { Asset, CamPose, CameraMove, Depth, Ease, LayerKey, MotionKind, MotionSpec, Scene, SceneLayer } from './types'

/** Distance from the house camera to each depth plane. Wide gaps between them = strong parallax on a truck. */
export const DEPTH_Z: Record<Depth, number> = { sky: 380, bg: 70, mid: 22, fg: 7 }
export const DEPTH_RANK: Record<Depth, number> = { sky: 0, bg: 1, mid: 2, fg: 3 }
export const HOUSE: CamPose = { x: 0, y: 1.6, z: 0, fov: 50 }
export const HOUSE_PITCH_DEG = -2           // looking up a touch: more sky, the near ground line low in the frame
export const ASPECT = 16 / 9
/** set.horizon 'auto' (the default): the far strip's land line stands at this share of the frame from the top, so the
 *  sky takes at most ~40 % and the floor never takes over (art v3's stage_plate.py auto_horizon, same maths) */
export const LAND_TARGET = 0.42
export const COVER_MARGIN = 1.6             // wide strips (sky, tileable bg) span this much of the view, for camera moves
/** Draw slot of the floor: after every sky layer (slots 1..999), before the far landscape (1000+). */
export const GROUND_SLOT = 999
export const SAME_DEPTH_STEP_M = 0.05       // later layers at one depth stand this much nearer, so geometry agrees with draw order

/** fov in degrees (human-editable); a value that can only be radians is converted. */
export const fovRad = (fov: number) => (fov > Math.PI ? (fov * Math.PI) / 180 : fov)

/** Width of the house camera's view at distance z. */
export const viewWidthAt = (z: number, fov = HOUSE.fov, aspect = ASPECT) => 2 * z * Math.tan(fovRad(fov) / 2) * aspect

export interface Placement { x: number; y: number; z: number; w: number; h: number; uRepeat: number; alphaIndex: number }

/** Where a layer's anchor stands and the plane's size. x 0..1 = left..right edge of the house view at that depth. */
/** horizon: metres the far landscape (bg) stands higher (set.horizon, teacher-editable). Draw order leaves the even
 *  slot below each layer for its contact stain (stainIndex), so a stain is drawn after farther layers, before its own. */
export function placeLayer(asset: Asset, layer: Pick<SceneLayer, 'depth' | 'x' | 'scale'>, order: number, horizon = 0): Placement {
  const depth = layer.depth
  const z = DEPTH_Z[depth] - order * SAME_DEPTH_STEP_M
  const span = viewWidthAt(z)
  const alphaIndex = DEPTH_RANK[depth] * 1000 + order * 2 + 1
  if (asset.layer === 'sky') {
    // the backdrop, ALWAYS (tiled or one painting): covers the view box at its distance, horizon a little below the
    // frame's bottom edge. A tiled sky repeats across the box; one painting is cover-fit, never stretched (the box's
    // bottom edge stays put, the spare height goes up into the sky, the spare width splits left and right).
    const boxW = span * COVER_MARGIN
    const boxH = boxW / ASPECT
    const y = -boxH * 0.12
    if (asset.tileable_x) return { x: 0, y, z, w: boxW, h: boxH, uRepeat: boxW / (boxH * (asset.w / asset.h)), alphaIndex }
    const k = Math.max(boxW / asset.w, boxH / asset.h)
    return { x: 0, y, z, w: asset.w * k, h: asset.h * k, uRepeat: 1, alphaIndex }
  }
  // an untiled bg STRIP (asset layer bg, not a prop placed at depth bg) is one painting that must cover its depth's
  // view (COVER_MARGIN wide); never narrower
  const coverH = asset.layer === 'bg' && !asset.tileable_x ? (span * COVER_MARGIN * asset.h) / asset.w : 0
  const h = Math.max(asset.height_m * (layer.scale ?? 1), coverH)
  const natW = h * (asset.w / asset.h)
  const w = asset.tileable_x ? Math.max(natW, span * COVER_MARGIN) : natW
  const x = asset.tileable_x ? 0 : ((layer.x ?? 0.5) - 0.5) * span
  // sky-depth props (clouds) float: their anchor sits at 30-60 % of the view height at that distance
  const y = depth === 'sky' ? z * Math.tan(fovRad(HOUSE.fov) / 2) * 0.45 : depth === 'bg' ? horizon : 0
  return { x, y, z, w, h, uRepeat: asset.tileable_x ? w / natW : 1, alphaIndex }
}

/** set.horizon for 'auto': metres the far strip moves up (down if negative) so its land line (landTop: share of the
 *  picture's height, from the top, where its land starts) lands at `target` of the house frame. stripH = the strip's
 *  placed height in metres; order = its slot among the bg layers. Frame size cancels out; rounded to 0.1 m. */
export function autoHorizon(landTop: number, stripH: number, order = 0, target = LAND_TARGET, pitchDeg = HOUSE_PITCH_DEG): number {
  const f = 0.5 / Math.tan(fovRad(HOUSE.fov) / 2)                              // focal length in frame heights
  const cy = 0.5 + f * Math.tan((-pitchDeg * Math.PI) / 180)                   // the eye line, from the top (pitch + = down)
  const z = DEPTH_Z.bg - order * SAME_DEPTH_STEP_M
  const want = HOUSE.y + ((cy - target) * z) / f                              // world height seen at the target row
  return Math.round((want - stripH * (1 - landTop)) * 10) / 10
}

/** The draw slot of a layer's contact stain: just before the layer itself. */
export const stainIndex = (layerAlphaIndex: number) => layerAlphaIndex - 1

/** Named eases (camera moves, layer keys). Exported: the director adds its named ease here, not a copy. */
export const EASES: Record<Ease, (k: number) => number> = {
  linear: (k) => k,
  in: (k) => 1 - Math.cos((k * Math.PI) / 2),
  out: (k) => Math.sin((k * Math.PI) / 2),
  inOut: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
}
export const ease = (name: Ease | undefined, k: number) => (EASES[name ?? 'inOut'] ?? EASES.inOut)(Math.min(1, Math.max(0, k)))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Scene length: the director's dur_s, else the sum of its shots (where the last one ends), else the writer's estimate. */
export const sceneDuration = (s: Scene): number => s.dur_s ?? ((s.camera && shotsEnd(s)) || s.est_s || 8)

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

/** A copy of the scene with shot i (0 = camera, then camera_more) lasting `dur` s. Later shots and the scene's own
 *  length move by the same amount, so no shot is cut mid-move and none starts before the last one ends. */
export function setShotDuration(s: Scene, i: number, dur: number): Scene {
  const shots = [s.camera, ...(s.camera_more ?? [])]
  const shot = shots[i]
  if (!shot) return s
  const delta = dur - (shot.dur_s ?? sceneDuration(s))
  const moved = shots.map((c, k) => (!c ? c : k === i ? { ...c, dur_s: dur } : k > i ? { ...c, at_s: (c.at_s ?? 0) + delta } : c))
  return {
    ...s,
    camera: moved[0] ?? s.camera,
    ...(s.camera_more ? { camera_more: moved.slice(1) as CameraMove[] } : {}),
    ...(s.dur_s !== undefined ? { dur_s: Math.max(0.5, s.dur_s + delta) } : {}),
  }
}

/** When the last shot of a scene finishes moving: the shortest the scene may be without cutting a move. */
export function shotsEnd(s: Scene): number {
  return [s.camera, ...(s.camera_more ?? [])].reduce((end, c) => (c ? Math.max(end, (c.at_s ?? 0) + (c.dur_s ?? 0)) : end), 0)
}

const shotsOf = (s: Scene) => [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as CameraMove[]
const withShots = (s: Scene, shots: CameraMove[]): Scene => ({ ...s, camera: shots[0], ...(s.camera_more ? { camera_more: shots.slice(1) } : {}) })

/** A copy of the scene with one pose value of shot i changed. Shot boundaries stay joined: a shot's end pose IS the
 *  next shot's start pose, so editing either side moves both and the camera never jumps at a cut. */
export function setShotPose(s: Scene, i: number, end: 'from' | 'to', field: keyof CamPose, v: number): Scene {
  const shots = shotsOf(s)
  if (!shots[i]) return s
  const set = (c: CameraMove, e: 'from' | 'to'): CameraMove => ({ ...c, [e]: { ...HOUSE, ...c[e], [field]: v } })
  const next = shots.map((c, k) => {
    if (k === i) return set(c, end)
    if (end === 'to' && k === i + 1) return set(c, 'from')
    if (end === 'from' && k === i - 1) return set(c, 'to')
    return c
  })
  return withShots(s, next)
}

/** The held frame breathes: a slow, small figure-eight drift around the end pose, faded in over HOLD_FADE_S so the
 *  hold starts exactly where the shot ended. amp in metres, period in seconds (lesson.hold, teacher-editable). */
export const HOLD_DEFAULTS = { breath_m: 0.05, breath_s: 7 } as const
export const HOLD_FADE_S = 1.5
export function breathe(c: CamPose, holdT: number, hold: { breath_m?: number; breath_s?: number } = {}): CamPose {
  const amp = hold.breath_m ?? HOLD_DEFAULTS.breath_m
  const w = (2 * Math.PI) / Math.max(0.5, hold.breath_s ?? HOLD_DEFAULTS.breath_s)
  const k = Math.min(1, holdT / HOLD_FADE_S)
  const fade = k * k * (3 - 2 * k)
  return { ...c, x: c.x + amp * fade * Math.sin(w * holdT), y: c.y + amp * 0.5 * fade * Math.sin(2 * w * holdT) }
}
