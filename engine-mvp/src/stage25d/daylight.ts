// The time of day (Bart 11-12: "day, dusk, dawn, night... the position of the sun too, which casts shadows"): one
// light for the whole scene. A scene with set.daylight paints its own sky (sky-gl.ts) and clouds (clouds.ts); a scene
// with only a painted sky picture keeps it, and takes its light from the time the picture's tags name. Pure.
import { hexRgb } from './ground'
import type { Asset, Daylight, Scene, TimeOfDay } from './types'

export type RGB = [number, number, number]
export const TIMES: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night']

export interface Preset {
  /** the sky's gradient, top of the frame to the horizon */
  sky: { top: string; mid: string; horizon: string }
  /** the light every picture is multiplied by (colour times strength) */
  ambient: RGB
  /** the lit side and the shaded side of a picture (layer.ts sunColour / shadeColour) */
  sun: RGB
  shade: RGB
  /** the colour a shadow on the ground is painted in, and how strong shadows are at this time */
  shadow: RGB
  shadowK: number
  /** clouds: their lit tops, their washes, and their lower edge; tone = how far painted white clouds go toward them */
  cloud: { light: RGB; shade: RGB; under: RGB; tone: number }
  /** where the sun (the moon at night) stands by default */
  sunAt: { x: number; height: number }
  stars: number
}

/** The four skies, sampled from our own painted skies (sky-morning-02, sky-clear-01, sky-dusk-01, sky-night-01). */
export const PRESETS: Record<TimeOfDay, Preset> = {
  dawn: {
    sky: { top: '#93c4ec', mid: '#d9d3e6', horizon: '#f6d3b2' },
    ambient: [1.0, 0.95, 0.93], sun: [1.08, 0.98, 0.88], shade: [0.86, 0.9, 1.05],
    shadow: [0.33, 0.27, 0.38], shadowK: 0.9,
    cloud: { light: [1.0, 0.94, 0.89], shade: [0.78, 0.76, 0.86], under: [0.96, 0.74, 0.64], tone: 0.55 },
    sunAt: { x: 0.18, height: 0.12 }, stars: 0,
  },
  day: {
    sky: { top: '#a3d6fc', mid: '#c4e6fb', horizon: '#e2eff6' },
    ambient: [1, 1, 1], sun: [1.05, 1.0, 0.9], shade: [0.88, 0.93, 1.05],
    shadow: [0.27, 0.23, 0.18], shadowK: 1,
    cloud: { light: [1, 1, 1], shade: [0.8, 0.86, 0.93], under: [0.76, 0.8, 0.86], tone: 0 },
    sunAt: { x: 0.28, height: 0.72 }, stars: 0,
  },
  dusk: {
    sky: { top: '#4a6a8c', mid: '#c79ab0', horizon: '#f6a86a' },
    ambient: [1.0, 0.86, 0.76], sun: [1.15, 0.92, 0.75], shade: [0.8, 0.8, 1.0],
    shadow: [0.3, 0.2, 0.32], shadowK: 0.9,
    cloud: { light: [1.0, 0.84, 0.7], shade: [0.56, 0.5, 0.62], under: [0.94, 0.54, 0.36], tone: 0.75 },
    sunAt: { x: 0.8, height: 0.08 }, stars: 0,
  },
  night: {
    sky: { top: '#0f1f4f', mid: '#1f4b98', horizon: '#4f78b8' },
    ambient: [0.5, 0.57, 0.8], sun: [0.92, 0.96, 1.1], shade: [0.72, 0.76, 0.95],
    shadow: [0.05, 0.08, 0.2], shadowK: 0.55,
    cloud: { light: [0.78, 0.83, 0.94], shade: [0.24, 0.3, 0.5], under: [0.16, 0.2, 0.36], tone: 0.85 },
    sunAt: { x: 0.74, height: 0.6 }, stars: 1,
  },
}

/** Most clouds a scene's Amount 1 makes. */
export const CLOUDS_MAX = 14
/** A shadow is at most this many times as long as what casts it (a low sun would throw one across the whole frame). */
export const SHADOW_REACH_MAX = 3
/** Overcast, rain, storm, mist: the sun is behind cloud, shadows are this much of their strength. */
export const DULL_SHADOW = 0.35
/** The sun's height 0..1 as degrees over the horizon. */
const ELEVATION = { low: 4, high: 70 }
/** How far from straight toward the camera the light turns when the sun stands at the frame's side (degrees). */
const SIDEWAYS_DEG = 70

const has = (tags: string[], words: string[]) => tags.some((t) => words.includes(t))

/** The time a painted sky shows, read off its tags. */
export function timeOfTags(tags: string[] = []): TimeOfDay {
  if (has(tags, ['night', 'moon', 'stars'])) return 'night'
  if (has(tags, ['dusk', 'evening', 'sunset'])) return 'dusk'
  if (has(tags, ['dawn', 'morning', 'sunrise'])) return 'dawn'
  return 'day'
}

/** Is the sun behind cloud in this sky? */
export const isDull = (tags: string[] = []) => has(tags, ['overcast', 'storm', 'rain', 'mist', 'fog'])

/** The scene draws its own sky (sky-gl.ts) instead of a picture. */
export const isDynamic = (set: Pick<Scene['set'], 'daylight'> | undefined): boolean => !!set?.daylight && !set.daylight.painted

/** The scene has a sky at all: its own, or a painted picture. */
export const hasSky = (set: Pick<Scene['set'], 'daylight' | 'sky'> | undefined): boolean => isDynamic(set) || !!set?.sky

const clamp01 = (v: unknown, fallback: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback }
const hexOr = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback)

/** Everything the stage needs to light a scene, its defaults filled in. */
export interface Light {
  time: TimeOfDay
  dynamic: boolean
  /** the sun follows the time (no override) */
  auto: boolean
  sky: { top: RGB; mid: RGB; horizon: RGB }
  hex: { top: string; mid: string; horizon: string }
  clouds: { assets: string[] | null; amount: number }
  sun: { x: number; height: number }
  /** the direction the light travels, unit length (y < 0: down) */
  dir: [number, number, number]
  /** metres of shadow per metre of height */
  reach: number
  /** how strong the shadows are, 0..1 */
  shadowK: number
  preset: Preset
}

/** The scene's light: its set.daylight, else what its painted sky picture shows (its tags). */
export function daylightOf(set: Pick<Scene['set'], 'daylight' | 'sky'> | undefined, skyAsset?: Pick<Asset, 'tags'> | null): Light {
  const d: Partial<Daylight> = set?.daylight ?? {}
  const time: TimeOfDay = TIMES.includes(d.time as TimeOfDay) ? (d.time as TimeOfDay) : timeOfTags(skyAsset?.tags)
  const preset = PRESETS[time]
  const dynamic = isDynamic(set)
  const hex = {
    top: hexOr(d.colours?.top, preset.sky.top), mid: hexOr(d.colours?.mid, preset.sky.mid), horizon: hexOr(d.colours?.horizon, preset.sky.horizon),
  }
  const auto = !d.sun
  const sun = { x: clamp01(d.sun?.x, preset.sunAt.x), height: clamp01(d.sun?.height, preset.sunAt.height) }
  const amount = dynamic ? clamp01(d.clouds?.amount, 0.4) : 0
  const dull = !dynamic && isDull(skyAsset?.tags)
  const dir = sunDirOf(sun)
  return {
    time, dynamic, auto, preset, hex, sun, dir,
    sky: { top: hexRgb(hex.top), mid: hexRgb(hex.mid), horizon: hexRgb(hex.horizon) },
    clouds: { assets: Array.isArray(d.clouds?.assets) && d.clouds.assets.length ? d.clouds.assets.map(String) : null, amount },
    reach: shadowReach(sun),
    // more cloud, softer sun: a full sky keeps half its shadows
    shadowK: preset.shadowK * (dull ? DULL_SHADOW : 1) * (1 - 0.5 * amount),
  }
}

const elevationOf = (height: number) => ((ELEVATION.low + height * (ELEVATION.high - ELEVATION.low)) * Math.PI) / 180

/** The direction the light travels from a sun at (x across the frame, height over the horizon). The sun stands in the
 *  sky in front of the camera, so the light always comes toward the viewer: shadows fall forward, where they show,
 *  and away from the sun's side (sun on the left: shadows fall right). */
export function sunDirOf(sun: { x: number; height: number }): [number, number, number] {
  const e = elevationOf(sun.height)
  const turn = ((0.5 - sun.x) * 2 * SIDEWAYS_DEG * Math.PI) / 180   // + = the light travels right
  return [Math.cos(e) * Math.sin(turn), -Math.sin(e), -Math.cos(e) * Math.cos(turn)]
}

/** Metres of shadow on the ground per metre of height: the sun's run over its fall, capped. */
export function shadowReach(sun: { height: number }): number {
  const e = elevationOf(sun.height)
  return Math.min(SHADOW_REACH_MAX, Math.cos(e) / Math.max(Math.sin(e), 1e-3))
}

/** Where a point h metres above the ground at (x, z) falls on the ground in this light: [x, z]. */
export function castPoint(x: number, z: number, h: number, dir: [number, number, number], reach: number): [number, number] {
  const run = Math.hypot(dir[0], dir[2]) || 1
  return [x + (dir[0] / run) * h * reach, z + (dir[2] / run) * h * reach]
}

/** The sky's colour at a height share of the frame (0 at the horizon, 1 at the top): the gradient sky-gl.ts paints. */
export function skyAt(light: Pick<Light, 'sky'>, k: number): RGB {
  const t = Math.min(1, Math.max(0, k))
  const [a, b, f] = t < 0.45 ? [light.sky.horizon, light.sky.mid, t / 0.45] : [light.sky.mid, light.sky.top, (t - 0.45) / 0.55]
  return a.map((v, i) => v + (b[i] - v) * f) as RGB
}
