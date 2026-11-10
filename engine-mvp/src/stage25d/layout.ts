// Pure stage maths: where a layer stands, how big it is, and where the camera is at time t.
// Metres everywhere. The house camera stands at x 0, eye height, looking down +z with a small fixed tilt.
import type { Asset, CamPose, CameraMotion, CameraMotionKind, CameraMove, Depth, Ease, GroundBand, LayerKey, MotionKind, MotionSpec, Scene, SceneLayer } from './types'

/** Distance from the house camera to each depth plane. Wide gaps between them = strong parallax on a truck. */
/** near: framing tufts, reeds and stones at the frame's bottom edge (partly out of frame), in front of fg */
export const DEPTH_Z: Record<Depth, number> = { sky: 380, bg: 70, mid: 22, fg: 7, near: 3.5 }
export const DEPTH_RANK: Record<Depth, number> = { sky: 0, bg: 1, mid: 2, fg: 3, near: 4 }
export const HOUSE: CamPose = { x: 0, y: 1.6, z: 0, fov: 50 }
export const HOUSE_PITCH_DEG = -2           // looking up a touch: more sky, the near ground line low in the frame
export const ASPECT = 16 / 9
/** set.horizon 'auto' (the default): the far strip's land line stands at this share of the frame from the top, so the
 *  sky takes at most ~40 % and the floor never takes over (art v3's stage_plate.py auto_horizon, same maths) */
export const LAND_TARGET = 0.42
export const COVER_MARGIN = 1.6             // wide strips (sky, tileable bg) span this much of the view, for camera moves
/** A ground band (set.groundBands) is wide enough for a truck of about ±5 m to find it painted at any depth: three
 *  views wide, its height from the picture's own aspect. */
export const BAND_VIEWS = 3
export const bandWidth = (z: number) => BAND_VIEWS * viewWidthAt(z)
/** A band's height in metres: the look's band height (k, a share of its distance) times its distance. Stands the hill
 *  crest a little above the one behind (k ~0.15), so the hunebed at 22 m shows and the 40 m crest sits near the horizon. */
export const bandHeight = (z: number, k: number) => k * z
/** Where a band's picture stands: its skyline (share of its height from the top, f) sits at the crest, bandHeight above the
 *  floor; the body below the skyline runs toward the camera (covered by the nearer bands, or off the frame bottom). */
export const bandBottom = (z: number, k: number, h: number, f: number) => bandHeight(z, k) - (1 - f) * h
/** Draw slot of anything at distance z (ground bands, props, strips): the further out, the earlier. 1010 at 2000 m,
 *  about 1900 at 2 m; always above the floor (999) and the decals (1000). */
export const bandSlot = (z: number) => 1010 + (Math.log10(2000) - Math.log10(Math.max(z, 1))) * 290

/** Draw slot of the floor: after every sky layer (slots 1..999), before the far landscape (1000+). */
export const GROUND_SLOT = 999
/** Ground decals (layer.flat) draw right after the floor, before the far landscape and everything standing. */
export const DECAL_SLOT = 1000
/** ...lifted this much off the floor so they never flicker into it */
export const DECAL_LIFT_M = 0.02
/** How near and how far a picture can stand on the ground (layer.z), in metres. */
export const GROUND_NEAR_M = 2
export const GROUND_FAR_M = 120
export const SAME_DEPTH_STEP_M = 0.05       // later layers at one depth stand this much nearer, so geometry agrees with draw order

/** fov in degrees (human-editable); a value that can only be radians is converted. */
export const fovRad = (fov: number) => (fov > Math.PI ? (fov * Math.PI) / 180 : fov)

/** Width of the house camera's view at distance z. */
export const viewWidthAt = (z: number, fov = HOUSE.fov, aspect = ASPECT) => 2 * z * Math.tan(fovRad(fov) / 2) * aspect

/** The depth band a distance belongs to (the nearest tier in log distance): its name for line weight and haze. */
export function bandOf(z: number): Exclude<Depth, 'sky'> {
  return z < 4.9 ? 'near' : z < 12.4 ? 'fg' : z < 39.2 ? 'mid' : 'bg'
}

/** A layer's distance from the camera in metres: its own z, else its depth band's (scenes saved before z look the same). */
export const distanceOf = (layer: Pick<SceneLayer, 'depth' | 'z'>): number => layer.z ?? DEPTH_Z[layer.depth]

/** How much of set.horizon a picture on the ground stands higher at distance z: none up to the middle band (22 m), all
 *  of it at the far band (70 m) and beyond. A picture without z sits at its band, so old scenes stand where they did. */
export const horizonLift = (z: number): number => Math.min(1, Math.max(0, (z - DEPTH_Z.mid) / (DEPTH_Z.bg - DEPTH_Z.mid)))

/** The height of the ground pictures stand on at distance z. `land`: how high the far landscape's land line stands at
 *  its distance (DEPTH_Z.bg), in metres. The floor up to the middle band, rising onto that land line by the far band
 *  (horizonLift); past it the ground stays on the land line as seen from the house camera, so farther is never lower
 *  on screen and the land line is the ground's horizon. Without a far landscape (land 0) the floor is flat. */
export function groundHeight(z: number, land: number): number {
  if (z <= DEPTH_Z.bg || land === 0) return horizonLift(z) * land
  return HOUSE.y + ((land - HOUSE.y) * z) / DEPTH_Z.bg
}

/** How high the far landscape's land line stands (metres, at DEPTH_Z.bg): the strip's bottom (`horizon`) plus its
 *  height above its land line; with no strip, `horizon` itself. */
export const landHeight = (horizon: number, strip: { top: number; h: number } | null): number => (strip ? horizon + strip.h * (1 - strip.top) : horizon)

/** A painted strip of ground (a meadow, a heath, a path, a quay, a ramp): a picture of the ground from its distance
 *  toward the camera, so it stands like a ground band and never up into the sky. Its tags say what it is; a tuft
 *  (heather, 0.5 m) is too low to be one. */
const GROUND_STRIP_TAGS = ['ground', 'path', 'field', 'ramp', 'water']
export const isGroundStrip = (a: Asset): boolean =>
  !['bg', 'sky', 'figure', 'ground'].includes(a.layer) && !a.tileable_x && a.height_m >= 2 && (a.tags ?? []).some((t) => GROUND_STRIP_TAGS.includes(t))

/** The least width-to-height a ground band's picture has: a band is three views wide, so a narrower picture would stand
 *  as tall as the whole view and fill the stage (a reed plant, a far plate's close-up). */
export const BAND_MIN_ASPECT = 2

/** Can a picture be a ground band (set.groundBands)? A wide painted strip of ground: not a far plate, not a plant. */
export const isBandPicture = (a: Asset): boolean => isGroundStrip(a) && a.w / Math.max(1, a.h) >= BAND_MIN_ASPECT

/** Where a ground strip's picture stands: like a ground band (its skyline on the crest, k x z up, the body below the
 *  floor where the floor hides it), but its bottom edge never above the floor line at its distance. */
export const stripBottom = (z: number, k: number, h: number, skyline: number): number => Math.min(0, bandBottom(z, k, h, skyline))

/** How far a ground band may stand (types.ts: 2..2000 m). */
export const BAND_Z = [2, 2000] as const
/** How far in front of the camera a ground band's plane stands at the least (metres). Bart 11-03 (lesson 94, scene
 *  2951): Distance 1.75 m put the band behind a shot's camera (z 2.42), and even in front of the house camera a band
 *  nearer than about 3 m sinks under the frame (its crest is k x z up): either way only the floor showed. */
export const BAND_NEAR_M = 4

/** How far forward a scene's camera ever stands (metres): the largest z of its shots, the house camera's when none. */
export const cameraFront = (s: Pick<Scene, 'camera' | 'camera_more'>): number =>
  [s.camera, ...(s.camera_more ?? [])].reduce((z, c) => Math.max(z, c?.from?.z ?? HOUSE.z, c?.to?.z ?? HOUSE.z), HOUSE.z)

/**
 * A ground band at t seconds with the teacher's values (Distance, Size, X, Opacity, keys). It is three views wide at any
 * distance (`w0`: its width as built, `h0` its height then); Size scales width and height together like any picture (Bart
 * 11-03: "cannot be changed (width), only height"), and being three views wide it covers the view down to about 34 %;
 * it always stands on the floor: a small band never lifts off into the sky (stripBottom). k: the look's band height.
 * front: the scene's cameraFront. Its plane stands at least BAND_NEAR_M in front of that camera, so it is always in the
 * frame; its draw slot stays at the teacher's distance, so it still covers what stands behind that.
 */
export function bandPose(band: GroundBand, t: number, k: number, w0: number, h0: number, skyline: number, front = HOUSE.z) {
  const now = layerAt({ ...band, depth: 'bg' }, t)
  const set = Math.min(BAND_Z[1], Math.max(BAND_Z[0], now.z ?? band.z))
  const z = Math.max(set, front + BAND_NEAR_M)
  const across = bandWidth(z) / w0
  const h = h0 * across * now.scale
  return {
    z, h, w: w0 * across * now.scale, sx: across * now.scale, sy: across * now.scale,
    x: (now.x - 0.5) * viewWidthAt(z), y: stripBottom(z, k, h, skyline), alphaIndex: bandSlot(set), opacity: now.opacity,
  }
}

/** A 'ground' picture (a floor tile: sand, grass) placed as a layer lies flat on the floor, like a decal. */
export const liesFlat = (layer: Pick<SceneLayer, 'flat'>, asset: Pick<Asset, 'layer'>): boolean => !!layer.flat || asset.layer === 'ground'

export interface Placement { x: number; y: number; z: number; w: number; h: number; uRepeat: number; alphaIndex: number; rotation: number }

/** Where a layer's anchor stands and the plane's size. x 0..1 = left..right edge of the house view at that depth. */
/** horizon: metres the far landscape (bg) stands higher (set.horizon, teacher-editable). Draw order leaves the even
 *  slot below each layer for its contact stain (stainIndex), so a stain is drawn after farther layers, before its own. */
export function placeLayer(asset: Asset, layer: Pick<SceneLayer, 'depth' | 'x' | 'y' | 'scale' | 'rotation' | 'z'>, order: number, horizon = 0, land = horizon): Placement {
  const depth = layer.depth
  const z = distanceOf(layer) - order * SAME_DEPTH_STEP_M
  const span = viewWidthAt(z)
  // one depth order for everything standing and every ground band (bandSlot): nearer draws later, so grass in front
  // of a band covers the props behind it, and a prop in front of a band covers the band
  const alphaIndex = depth === 'sky' ? order * 2 + 1 : bandSlot(z)
  if (asset.layer === 'sky') {
    // the backdrop, ALWAYS (tiled or one painting): covers the view box at its distance, horizon a little below the
    // frame's bottom edge. A tiled sky repeats across the box; one painting is cover-fit, never stretched (the box's
    // bottom edge stays put, the spare height goes up into the sky, the spare width splits left and right).
    const boxW = span * COVER_MARGIN
    const boxH = boxW / ASPECT
    const y = -boxH * 0.12 + (layer.y ?? 0)   // the teacher's Height lifts (or lowers) the whole sky
    if (asset.tileable_x) return { x: 0, y, z, w: boxW, h: boxH, uRepeat: boxW / (boxH * (asset.w / asset.h)), alphaIndex, rotation: 0 }
    const k = Math.max(boxW / asset.w, boxH / asset.h)
    return { x: 0, y, z, w: asset.w * k, h: asset.h * k, uRepeat: 1, alphaIndex, rotation: 0 }
  }
  // an untiled bg STRIP (asset layer bg, not a prop placed at depth bg) is one painting that must cover its depth's
  // view (COVER_MARGIN wide); never narrower
  const coverH = asset.layer === 'bg' && !asset.tileable_x ? (span * COVER_MARGIN * asset.h) / asset.w : 0
  const h = Math.max(asset.height_m * (layer.scale ?? 1), coverH)
  const natW = h * (asset.w / asset.h)
  const w = asset.tileable_x ? Math.max(natW, span * COVER_MARGIN) : natW
  const x = asset.tileable_x ? 0 : ((layer.x ?? 0.5) - 0.5) * span
  // sky-depth props (clouds) float: their anchor sits at 30-60 % of the view height at that distance; the far landscape
  // strip stands `horizon` higher, and a picture on the ground stands on the ground there (groundHeight): rising onto
  // the strip's land line (`land`) with its distance, never in a jump. A ground strip stays on the floor itself and
  // stands from there like a ground band (stripBottom): lifted, its crest would stand up into the sky.
  const ground = asset.layer === 'bg' ? (depth === 'bg' ? horizon : 0) : isGroundStrip(asset) ? 0 : groundHeight(distanceOf(layer), land)
  const y = depth === 'sky' ? z * Math.tan(fovRad(HOUSE.fov) / 2) * 0.45 : ground
  return { x, y: y + (layer.y ?? 0), z, w, h, uRepeat: asset.tileable_x ? w / natW : 1, alphaIndex, rotation: layer.rotation ?? 0 }
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
export const stainIndex = (layerAlphaIndex: number) => layerAlphaIndex - STAIN_SLOT_GAP
/** How far below its layer a stain draws: less than one layer step (placeLayer's SAME_DEPTH_STEP_M), so it lands between. */
export const STAIN_SLOT_GAP = 0.002

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
  return { x: lerp(f.x, to.x, k), y: lerp(f.y, to.y, k), z: lerp(f.z, to.z, k), fov: lerp(fovRad(f.fov), fovRad(to.fov), k), roll: lerp(f.roll ?? 0, to.roll ?? 0, k) }
}

/** Peak size of each kind at amount 1, and how fast it goes: metres sideways and up, degrees of roll, cycles a second. */
const CAMERA_WOBBLE: Record<Exclude<CameraMotionKind, 'none'>, { x: number; y: number; roll: number; hz: number }> = {
  sway: { x: 0.08, y: 0.05, roll: 1.6, hz: 0.18 },       // a ship in a swell: slow, mostly a lean
  handheld: { x: 0.02, y: 0.02, roll: 0.25, hz: 0.35 },  // someone holding it: small and restless
  shake: { x: 0.05, y: 0.05, roll: 0.6, hz: 6 },         // a blow, a quake
}

/** Sines at unrelated rates: never quite repeats, and the same clock gives the same frame (a saved scene plays alike). */
const unsteady = (t: number, seed: number) => (Math.sin(t * 1.0 + seed) + 0.6 * Math.sin(t * 2.17 + seed * 2.3) + 0.3 * Math.sin(t * 3.71 + seed * 4.1)) / 1.9

/** What the camera's own motion adds at this moment. */
export function cameraWobble(motion: CameraMotion | null | undefined, clock: number): { x: number; y: number; roll: number } {
  const kind = motion?.kind
  if (!kind || kind === 'none') return { x: 0, y: 0, roll: 0 }
  const size = CAMERA_WOBBLE[kind]
  const amount = motion.amount ?? 1
  const t = clock * size.hz * (motion.speed ?? 1) * 2 * Math.PI
  return { x: size.x * amount * unsteady(t, 1), y: size.y * amount * unsteady(t, 2), roll: size.roll * amount * unsteady(t, 3) }
}

export interface LayerNow { z?: number; x: number; y: number; scale: number; opacity: number; rotation: number }
const LAYER_FIELDS = ['x', 'y', 'z', 'scale', 'opacity', 'rotation'] as const

/** A layer's x/y/scale/opacity/rotation at time t: its own values, moved by keyframes (eased in-out between keys).
 *  Each field moves along the keys that name it, so a key that only sets x leaves y's own run alone. */
export function layerAt(layer: SceneLayer, t: number): LayerNow {
  const base: LayerNow = { z: layer.z, x: layer.x ?? 0.5, y: layer.y ?? 0, scale: layer.scale ?? 1, opacity: layer.opacity ?? 1, rotation: layer.rotation ?? 0 }
  const all = layer.keys ?? []
  if (!all.length) return base
  const out = { ...base }
  for (const f of LAYER_FIELDS) {
    const keyed = keyedAt(all, f, t)
    if (keyed !== null) out[f] = keyed
  }
  return out
}

/** One field along the keys that name it, eased in-out between them; null when no key names it. */
function keyedAt(all: readonly LayerKey[], field: keyof LayerKey, t: number): number | null {
  const keys = all.filter((k) => k[field] !== undefined).sort((a, b) => a.t - b.t)
  if (!keys.length) return null
  const first = keys[0], last = keys[keys.length - 1]
  if (t <= first.t) return first[field] as number
  if (t >= last.t) return last[field] as number
  const i = keys.findIndex((k) => k.t > t)
  const a = keys[i - 1], b = keys[i]
  return lerp(a[field] as number, b[field] as number, ease('inOut', (t - a.t) / (b.t - a.t)))
}

/** A bone's turn is a field like x or scale: `bone:head` on the layer, and on its keys. */
export const BONE_PREFIX = 'bone:'

/** Each bone's turn at time t, by name: degrees clockwise on screen from the painted pose. */
export function bonesAt(layer: SceneLayer, t: number): Record<string, number> {
  const all = layer.keys ?? []
  const fields = new Set([...Object.keys(layer), ...all.flatMap((k) => Object.keys(k))].filter((f) => f.startsWith(BONE_PREFIX)))
  const out: Record<string, number> = {}
  for (const f of fields) {
    out[f.slice(BONE_PREFIX.length)] = keyedAt(all, f as keyof LayerKey, t) ?? (layer[f as keyof SceneLayer] as number | undefined) ?? 0
  }
  return out
}

export const MOTION_CODE: Record<MotionKind, number> = { none: 0, sway: 1, drift: 2, ripple: 3, flicker: 4, breathe: 5 }

/** A figure breathes unless the teacher stills it, so a held frame never looks frozen. The library marks every
 *  figure 'none', which only meant "no sway", so for a figure that counts as not set. */
export const defaultMotion = (asset?: Pick<Asset, 'layer' | 'motion'>): MotionKind => {
  // Bart 11-10: no sway unless the teacher picks it; a library 'sway' is not a default any more
  const own = asset?.motion === 'sway' ? 'none' : asset?.motion ?? 'none'
  return asset?.layer === 'figure' && own === 'none' ? 'breathe' : own
}

/** The asset's motion, overridden by the layer's (a bare kind or { kind, amount, speed }). */
export function motionOf(asset: Asset, layer: SceneLayer): Required<MotionSpec> {
  const o: MotionSpec = typeof layer.motion === 'string' ? { kind: layer.motion } : layer.motion ?? {}
  return { kind: o.kind ?? defaultMotion(asset), amount: o.amount ?? 1, speed: o.speed ?? 1 }
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
