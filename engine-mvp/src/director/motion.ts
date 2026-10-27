// Layer and figure motion: nothing on screen is ever still, and nothing moves in step with its
// neighbour (story-director "Performance": avoid twinning). Layers get the stage's own motion spec;
// figures get timeline tracks ({target: `figure:<index>`, property x|y, keyframes}, x/y in scene
// fractions) for whoever poses them (S3). The teacher edits both.
import type { Library, Scene, Track } from './types'
import { round } from './timing'

type Motion = 'none' | 'sway' | 'drift' | 'ripple' | 'flicker'
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

export type LayerMotion = { kind: Motion; amount: number; speed: number }

/** Per layer, the motion the stage plays (S1 reads set.layers[i].motion = { kind, amount, speed }).
 *  Foreground moves more than the far planes; each layer gets its own speed so neighbours never
 *  move in step. null = nothing to move. */
export function layerMotion(scene: Scene, library: Library | null): (LayerMotion | null)[] {
  return scene.set.layers.map((l, i) => {
    const kind = motionOf(l.need, l.asset, library)
    if (kind === 'none') return null
    return { kind, amount: l.depth === 'fg' ? 1.2 : l.depth === 'mid' ? 1 : 0.7, speed: round(1 + ((i * PHASE_STEP) % 1) * 0.4) }
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
