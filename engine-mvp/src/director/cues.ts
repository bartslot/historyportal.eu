// Sound per scene (story-director "Sound"): an ambience bed for the place, foley for what moves,
// near-silences before the turn and the peak, and sound carried over the cuts (J/L-cuts).
import bank from '../sound/bank.json'
import type { Library, Scene, SoundPlan } from './types'
import { round } from './timing'

type Bed = { id: string; bundle: string; base?: boolean; gain: number; tags: string[] }
const BEDS = bank.beds as Bed[]

export const SILENCE_S = 1.2
export const J_CUT_S = 1.2
export const L_CUT_S = 1.0
export const DUCK_DB = -12

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9À-ɏ-]+/).filter(Boolean)

/** Everything a scene says about its place: layer needs, the assets' tags, the sky, the narration. */
function sceneTags(scene: Scene, library: Library | null): Set<string> {
  const out = new Set<string>()
  const add = (s?: string | null) => s && words(s).forEach((w) => out.add(w))
  add(scene.set.sky)
  for (const l of scene.set.layers) {
    add(l.need)
    library?.assets.find((a) => a.id === l.asset)?.tags.forEach((t) => out.add(t))
  }
  for (const f of scene.figures ?? []) add(f.pose)
  add(scene.narration)
  return out
}

/** The bundle's base bed plus the one extra bed that matches the scene best (if any matches). */
export function pickBeds(scene: Scene, bundle: string, library: Library | null): SoundPlan['ambience'] {
  const beds = BEDS.filter((b) => b.bundle === bundle)
  if (!beds.length) return []
  const base = beds.find((b) => b.base) ?? beds[0]
  const tags = sceneTags(scene, library)
  const scored = beds
    .filter((b) => b !== base)
    .map((b) => ({ b, score: b.tags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  const extra = scored[0]?.b
  return [{ id: base.id, gain: base.gain }, ...(extra ? [{ id: extra.id, gain: extra.gain }] : [])]
}

const FOLEY: Record<string, string> = { walk: 'step-grass', kneel: 'wood-knock', carry: 'rope-creak' }
const UI: Record<string, string> = { quiz: 'reveal', 'power-meter': 'meter-rise', choice: 'reveal' }

/** Foley on the figures' actions (staggered, never on top of each other), the interaction's cue,
 *  and the ink whoosh on the native move. */
export function pickSfx(scene: Scene, start: number, dur: number, native: boolean): SoundPlan['sfx'] {
  const out: SoundPlan['sfx'] = []
  if (native) out.push({ id: 'ink-whoosh', at_s: round(start) })
  ;(scene.figures ?? []).forEach((f, i) => {
    const id = FOLEY[f.pose ?? '']
    if (id && !out.some((s) => s.id === id)) out.push({ id, at_s: round(start + 0.4 + i * 0.7) })
  })
  const ui = scene.interaction ? UI[scene.interaction.type] : null
  if (ui) out.push({ id: ui, at_s: round(Math.max(0, dur - 1.5)) })
  return out
}

/** True when two ambience lists play the same beds (a continuous place across the cut). */
export const sameBeds = (a: SoundPlan['ambience'], b: SoundPlan['ambience']): boolean =>
  a.length === b.length && a.every((x, i) => x.id === b[i].id)
