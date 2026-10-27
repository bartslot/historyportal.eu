// Layer and figure motion: nothing on screen is ever still, and nothing moves in step with its
// neighbour (story-director "Performance": avoid twinning). Tracks use the timeline's shape
// ({target, property, keyframes}); targets are `layer:<index>` / `figure:<index>` in the scene,
// x/y in scene fractions, rot in degrees, opacity 0..1. The stage maps them; the teacher edits them.
import type { Library, Scene, Track } from './types'
import { round } from './timing'

type Motion = 'none' | 'sway' | 'drift' | 'ripple' | 'flicker'
const SWAY_PERIOD_S = 3.2
/** Each layer/figure is offset by this fraction of a period from the previous one. */
const PHASE_STEP = 0.37

const key = (time: number, value: number, easing = 'easeInOutQuad') => ({ time: round(time), value: round(value), easing })

/** A back-and-forth between two values, a key every half period, started at a phase offset. */
function oscillate(target: string, property: string, base: number, amp: number, period: number, dur: number, phase: number): Track {
  const half = period / 2
  const keys = [key(0, base + amp * Math.sin(phase * 2 * Math.PI))]
  let side = Math.sin(phase * 2 * Math.PI) >= 0 ? -1 : 1
  for (let t = half * (1 - (phase % 1)); t < dur; t += half, side = -side) keys.push(key(t, base + amp * side))
  keys.push(key(dur, keys.at(-1)!.value))
  return { target, property, keyframes: keys }
}

function motionOf(need: string | undefined, assetId: string | null | undefined, library: Library | null): Motion {
  const asset = assetId ? library?.assets.find((a) => a.id === assetId) : null
  if (asset?.motion) return asset.motion
  const tags = `${need ?? ''} ${asset?.tags.join(' ') ?? ''}`
  if (/cloud|smoke|mist/.test(tags)) return 'drift'
  if (/water|sea|wave|river/.test(tags)) return 'ripple'
  if (/fire|lantern|torch|candle/.test(tags)) return 'flicker'
  if (/tree|reed|grass|shrub|flag|sail|rope/.test(tags)) return 'sway'
  return 'none'
}

export function layerTracks(scene: Scene, dur: number, library: Library | null): Track[] {
  return scene.set.layers.flatMap((l, i): Track[] => {
    const t = `layer:${i}`
    const phase = (i * PHASE_STEP) % 1
    switch (motionOf(l.need, l.asset, library)) {
      case 'sway': return [oscillate(t, 'rot', 0, l.depth === 'fg' ? 1.6 : 0.8, SWAY_PERIOD_S * (1 + i * 0.13), dur, phase)]
      case 'drift': return [{ target: t, property: 'x', keyframes: [key(0, l.x ?? 0.5, 'easeInOutQuad'), key(dur, (l.x ?? 0.5) + 0.03)] }]
      case 'ripple': return [oscillate(t, 'y', 0, 0.004, 2.4, dur, phase)]
      case 'flicker': return [oscillate(t, 'opacity', 0.92, 0.08, 0.6, dur, phase)]
      default: return []
    }
  })
}

/** A walking figure crosses in its facing direction; every other figure breathes (a small bob),
 *  each at its own phase so a group never moves in unison. */
export function figureTracks(scene: Scene, dur: number): Track[] {
  return (scene.figures ?? []).map((f, i): Track => {
    const t = `figure:${i}`
    const x = f.x ?? 0.5
    if (f.pose === 'walk') {
      const dx = (f.facing === 'left' ? -1 : 1) * Math.min(0.25, dur * 0.02)
      return { target: t, property: 'x', keyframes: [key(0, x, 'easeOutCubic'), key(dur, x + dx)] }
    }
    return oscillate(t, 'y', 0, 0.003, 3.6 + i * 0.4, dur, ((i + 1) * PHASE_STEP) % 1)
  })
}
