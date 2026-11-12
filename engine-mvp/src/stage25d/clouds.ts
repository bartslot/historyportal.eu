// Which clouds a scene's own sky gets (set.daylight.clouds), pure: seeded by the scene id like the grass (strew.ts),
// so a scene always shows the same sky and a higher Amount only adds clouds, never moves the ones already there.
import { CLOUDS_MAX } from './daylight'
import { rng, seedOf } from './scatter'
import type { Asset } from './types'

/** The painted cloud cut-outs every scene can use, shipped with the app (public/stage25d/clouds/, the History Lines
 *  sheet of nl-prehistory and tasman-1642). A bundle's own `cloud` assets win when it has any. */
export const BUILT_IN_CLOUDS: Asset[] = [
  { id: 'cloud-cumulus-large-01', layer: 'cloud', tags: ['cloud', 'cumulus', 'fair'], file: 'cloud-cumulus-large-01.webp', w: 514, h: 329, anchor: [0.339, 1], height_m: 80, motion: 'drift' },
  { id: 'cloud-cumulus-small-01', layer: 'cloud', tags: ['cloud', 'cumulus', 'fair'], file: 'cloud-cumulus-small-01.webp', w: 204, h: 126, anchor: [0.456, 1], height_m: 35, motion: 'drift' },
  { id: 'cloud-bank-01', layer: 'cloud', tags: ['cloud', 'bank', 'low'], file: 'cloud-bank-01.webp', w: 564, h: 109, anchor: [0.653, 1], height_m: 45, motion: 'drift' },
  { id: 'cloud-cirrus-01', layer: 'cloud', tags: ['cloud', 'cirrus', 'high'], file: 'cloud-cirrus-01.webp', w: 390, h: 151, anchor: [0.006, 1], height_m: 25, motion: 'drift' },
  { id: 'cloud-rain-01', layer: 'cloud', tags: ['cloud', 'rain', 'weather'], file: 'cloud-rain-01.webp', w: 442, h: 249, anchor: [0.496, 1], height_m: 90, motion: 'drift' },
]
/** Where the built-in clouds are served from (the Laravel app's public folder). */
export const BUILT_IN_CLOUD_BASE = '/stage25d/clouds/'

/** The cut-outs a scene can choose from: the bundle's own clouds, else the built-in ones. */
export const cloudArt = (lib: { assets: Asset[] }): Asset[] => {
  const own = lib.assets.filter((a) => a.layer === 'cloud')
  return own.length ? own : BUILT_IN_CLOUDS
}

/** One cloud of the sky: which cut-out, x across the sky (0..1 of the house view, a little past both sides), its
 *  bottom's height over the horizon (share of the view's height), its size, and its slot (0 = farthest back). */
export interface CloudSpot { asset: Asset; x: number; lift: number; scale: number; slot: number }

/** Where high and low clouds float: their bottom's height over the horizon, a share of the frame. */
const LIFT: Record<string, [number, number]> = { high: [0.5, 0.8], low: [0.22, 0.34], default: [0.26, 0.64] }
const liftOf = (a: Asset) => (a.tags.includes('high') ? LIFT.high : a.tags.includes('low') ? LIFT.low : LIFT.default)

/** The clouds of a scene: `amount` 0..1 of CLOUDS_MAX, picked from `chosen` (ids; null = every one of `art`). */
export function cloudPlan(o: { sceneId: string; art: Asset[]; chosen: string[] | null; amount: number }): CloudSpot[] {
  const pool = o.chosen ? o.art.filter((a) => o.chosen!.includes(a.id)) : o.art
  if (!pool.length) return []
  const count = Math.round(Math.min(1, Math.max(0, o.amount)) * CLOUDS_MAX)
  const out: CloudSpot[] = []
  for (let i = 0; i < count; i++) {
    // each slot draws from its own seed: slot i is the same cloud whatever the Amount
    const r = rng(seedOf(`${o.sceneId}:cloud:${i}`))
    const asset = pool[Math.floor(r() * pool.length) % pool.length]
    const [lo, hi] = liftOf(asset)
    // spread across: slot i keeps to its own strip of the sky, jittered, so clouds never pile up
    const x = -0.15 + 1.3 * ((i * 0.618034 + r() * 0.35) % 1)
    out.push({ asset, x, lift: lo + r() * (hi - lo), scale: 0.65 + r() * 0.7, slot: i })
  }
  return out
}
