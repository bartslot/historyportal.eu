// Close-ups blink: the closed eyelid SLIDES DOWN over the open eye, never fades (Bart 11-12: "if it fades it looks
// fake"). The library gives a bust a pixel-aligned closed-eye picture and per eye a box and the closed lash line
// (Asset.blink); the layer shader (layer.ts BLINK) moves the lid, this file decides WHEN: a random schedule per figure.
import type { Asset, BlinkEye, SceneLayer } from './types'

export const BLINK_CLOSE_S = 0.07     // the lid falls, ease-in (cubic)
export const BLINK_HOLD_S = 0.04      // closed
export const BLINK_OPEN_S = 0.11      // it lifts, ease-out (cubic)
export const BLINK_S = BLINK_CLOSE_S + BLINK_HOLD_S + BLINK_OPEN_S
export const BLINK_GAP_MIN_S = 3      // the next blink comes 3..7 s after the last one
export const BLINK_GAP_MAX_S = 7
export const DOUBLE_RATE = 0.2        // one blink in five is a double blink
export const DOUBLE_GAP_S = 0.12      // its second blink starts this long after the first one opened
/** an eye box bigger than this share of the picture is no eye (a failed detection: the whole picture) */
const EYE_MAX_W = 0.4, EYE_MAX_H = 0.25
const MAX_EYES = 2                    // the shader has room for two

/** Is this picture a close-up (a bust)? */
export const isBust = (asset?: Partial<Pick<Asset, 'id' | 'tags'>>): boolean =>
  !!asset && (/(^|-)bust(-|$)/.test(asset.id ?? '') || (asset.tags ?? []).some((t) => t === 'closeup' || t.startsWith('pose:bust')))

const fraction = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1

/** The usable eyes of a blink entry: real boxes only (library data is not trusted: a box of the whole picture is dropped). */
export function blinkEyes(eyes: unknown): BlinkEye[] {
  if (!Array.isArray(eyes)) return []
  return eyes.filter((e): e is BlinkEye => {
    const { x0, x1, y0, y1, lash } = (e ?? {}) as Partial<BlinkEye>
    return [x0, x1, y0, y1].every(fraction) && Array.isArray(lash) && lash.length === 3 && lash.every(fraction)
      && x1! > x0! && y1! > y0! && x1! - x0! <= EYE_MAX_W && y1! - y0! <= EYE_MAX_H
  }).slice(0, MAX_EYES)
}

/** The closed-eye picture's url and eyes for a layer of this asset, or null: no blink data, no usable eye, or a picture
 *  the closed one is not aligned with (the teacher's edited copy, a figure of parts). */
export function blinkOf(asset: Asset, layer: Pick<SceneLayer, 'src' | 'puppet'>, base: string): { url: string; eyes: BlinkEye[] } | null {
  if (!asset.blink?.file || layer.src || layer.puppet || asset.puppet) return null
  const eyes = blinkEyes(asset.blink.eyes)
  return eyes.length ? { url: base + asset.blink.file, eyes } : null
}

/** Seeded random numbers 0..1 (mulberry32): the same seed, the same blinks. */
function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A string's seed (FNV-1a), so each figure gets its own schedule. */
export function seedOf(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/** The blinks of one figure, in order: when each starts (seconds of blink time) and whether it is a double blink. */
export function* blinks(seed: number): Generator<{ start: number; twice: boolean }> {
  const rng = random(seed)
  let at = 0
  for (;;) {
    const start = at + BLINK_GAP_MIN_S + rng() * (BLINK_GAP_MAX_S - BLINK_GAP_MIN_S)
    const twice = rng() < DOUBLE_RATE
    yield { start, twice }
    at = start + (twice ? 2 * BLINK_S + DOUBLE_GAP_S : BLINK_S)
  }
}

/** How closed the lid is u seconds into one blink: 0 open .. 1 closed. */
export function lidAt(u: number): number {
  if (u <= 0 || u >= BLINK_S) return 0
  if (u < BLINK_CLOSE_S) return (u / BLINK_CLOSE_S) ** 3
  if (u < BLINK_CLOSE_S + BLINK_HOLD_S) return 1
  return (1 - (u - BLINK_CLOSE_S - BLINK_HOLD_S) / BLINK_OPEN_S) ** 3
}

/** One figure's lid over time: a function of blink time (which only runs forward) to 0 open .. 1 closed.
 *  `calm` (prefers-reduced-motion): never blinks. */
export function blinker(seed: number, calm = false): (time: number) => number {
  if (calm) return () => 0
  const all = blinks(seed)
  let now = all.next().value!
  return (time) => {
    while (time >= now.start + (now.twice ? 2 * BLINK_S + DOUBLE_GAP_S : BLINK_S)) now = all.next().value!
    const u = time - now.start
    return now.twice && u >= BLINK_S + DOUBLE_GAP_S ? lidAt(u - BLINK_S - DOUBLE_GAP_S) : lidAt(u)
  }
}
