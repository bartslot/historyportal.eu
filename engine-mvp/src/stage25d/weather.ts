// Snow and rain on the stage (Bart 11-24: "it has to snow, and it has to rain"): a scene's set.daylight.weather. Pure:
// the values the Sky panel sends, held to their ranges, and the slabs of air the flakes fall in (weather-gl.ts).
//
// The flakes live in the world, not on the screen: they fall in boxes of air in front of the camera, so a camera move
// passes through them with the right parallax and a zoom makes them bigger. A close-up and a wide shot of the same
// scene therefore need no settings of their own (Bart 11-24: "different shots have different effects because some are
// more zoomed in"): the camera does it, the way a real lens would.
import type { Weather, WeatherKind } from './types'

export const WEATHER_KINDS: WeatherKind[] = ['snow', 'rain']

/** The panel's ranges: amount 0..1 of the most flakes, wind -1 (to the left) .. 1, size and speed as factors. */
export const WEATHER_RANGE = { amount: [0, 1], wind: [-1, 1], size: [0.4, 2.5], speed: [0.25, 2.5] } as const
export const WEATHER_DEFAULTS = { amount: 0.5, wind: 0.15, size: 1, speed: 1 } as const

/** What the stage draws: always every field, held to its range. */
export interface WeatherNow { kind: WeatherKind; amount: number; wind: number; size: number; speed: number }

const held = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
  const n = Number(v)
  return v !== null && v !== '' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/** The scene's weather as the stage draws it; null when it has none (or an amount of 0). */
export function weatherOf(raw: Partial<Weather> | null | undefined): WeatherNow | null {
  if (!raw || !WEATHER_KINDS.includes(raw.kind as WeatherKind)) return null
  const w: WeatherNow = {
    kind: raw.kind as WeatherKind,
    amount: held(raw.amount, WEATHER_RANGE.amount, WEATHER_DEFAULTS.amount),
    wind: held(raw.wind, WEATHER_RANGE.wind, WEATHER_DEFAULTS.wind),
    size: held(raw.size, WEATHER_RANGE.size, WEATHER_DEFAULTS.size),
    speed: held(raw.speed, WEATHER_RANGE.speed, WEATHER_DEFAULTS.speed),
  }
  return w.amount > 0 ? w : null
}

/** One box of air: metres in front of the camera, and how many flakes it holds at amount 1. The edges sit just in
 *  front of the stage's depths (layout.ts DEPTH_Z: near 3.5, fg 7, mid 22, bg 70), so a slab is drawn over what stands
 *  behind it and under what stands in front (each slab draws as if at its far edge, like the grass, scatter-gl.ts). */
export interface Slab { near: number; far: number; count: number }

const SLABS: Record<WeatherKind, Slab[]> = {
  // snow: few big flakes close to the lens, many fine ones far out: the far air reads as a soft veil
  snow: [{ near: 0.7, far: 3.4, count: 260 }, { near: 3.4, far: 6.9, count: 700 }, { near: 6.9, far: 21.5, count: 1800 }, { near: 21.5, far: 68, count: 2600 }],
  // rain: thin streaks; the far air holds fewer, they would only grey the picture
  rain: [{ near: 0.9, far: 3.4, count: 160 }, { near: 3.4, far: 6.9, count: 450 }, { near: 6.9, far: 21.5, count: 1100 }, { near: 21.5, far: 68, count: 1500 }],
}
export const slabsOf = (kind: WeatherKind): Slab[] => SLABS[kind]

/** The widest view a box has to fill (degrees, wider than any shot's lens) and the frame's widest proportion. */
const FOV_COVER_DEG = 62
const ASPECT_COVER = 2

/** The size of a slab's box (metres): wide and high enough to fill the frame at its far edge, with room for the wind
 *  to carry flakes in from the side. */
export function boxOf(s: Slab): [number, number, number] {
  const half = Math.tan((FOV_COVER_DEG * Math.PI) / 360) * s.far
  return [2 * half * ASPECT_COVER, 2 * half * 1.15, s.far - s.near]
}

/** How a kind moves at speed 1 and wind 1 (m/s), how big one flake or streak is at size 1 (m), how long a streak is
 *  (s of its fall), how far a snowflake sways (m), and how much bigger a flake is drawn per metre away (`grow`): a far
 *  flake true to size is under a pixel and vanishes, so the far air is painted in bigger, fainter dabs, as an
 *  illustrator would. */
export const MOTION: Record<WeatherKind, { fall: number; wind: number; size: number; streak: number; sway: number; grow: number }> = {
  snow: { fall: 1.1, wind: 1.6, size: 0.032, streak: 0, sway: 0.18, grow: 0.07 },
  rain: { fall: 9, wind: 4, size: 0.007, streak: 0.06, sway: 0, grow: 0.04 },
}

/** The velocity the flakes fall with (m/s, y down). */
export function velocityOf(w: WeatherNow): [number, number, number] {
  const m = MOTION[w.kind]
  return [w.wind * m.wind * w.speed, -m.fall * w.speed, 0]
}
