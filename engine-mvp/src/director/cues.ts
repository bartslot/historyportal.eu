// Sound per scene (story-director "Sound"): an ambience bed for the place, foley for what moves,
// near-silences before the turn and the peak, and sound carried over the cuts (J/L-cuts).
import bank from '../sound/bank.json'
import type { Library, Scene, SoundPlan } from './types'
import { round } from './timing'

type Bed = { id: string; bundle: string; base?: boolean; local?: boolean; gain: number; tags: string[] }
const BEDS = bank.beds as Bed[]
const BUNDLES = bank.bundles as Record<string, { regions: string[] }>

export const SILENCE_S = 1.2
export const J_CUT_S = 1.2
export const L_CUT_S = 1.0
export const DUCK_DB = -12

const text = (v: unknown): string => (Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : '')
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9\u00c0-\u024f-]+/).filter(Boolean)

/** The scene's place tag (`!mesopotamia` in a need or the sky), or null when it names none. */
export function regionOf(scene: Scene): string | null {
  const all = [scene.set.sky, ...scene.set.layers.map((l) => l.need)].map(text).join(' ')
  return all.match(/!([a-z][a-z-]*)/i)?.[1].toLowerCase() ?? null
}

/** True when a scene plays somewhere its bundle's local beds do not belong (Dutch heath birds in Uruk). */
export const isAbroad = (scene: Scene, bundle: string): boolean => {
  const r = regionOf(scene)
  return !!r && !(BUNDLES[bundle]?.regions ?? []).includes(r)
}

/** Everything a scene says about its place: layer needs, the assets' tags, the sky, the narration. */
function sceneTags(scene: Scene, library: Library | null): Set<string> {
  const out = new Set<string>()
  const add = (s?: string | null) => s && words(s).forEach((w) => out.add(w))
  add(text(scene.set.sky))
  for (const l of scene.set.layers) {
    add(text(l.need))
    library?.assets.find((a) => a.id === l.asset)?.tags.forEach((t) => out.add(t))
  }
  for (const f of scene.figures ?? []) add(f.pose)
  add(scene.narration)
  return out
}

/** The bundle's base bed plus the one extra bed that matches the scene best. Abroad (a `!region` the
 *  bundle does not cover) the local beds are left out. The extra bed is sticky: the previous scene's
 *  stays while it still fits, and changes only for a clearly better match, so the bed does not flip
 *  on every cut (a change of place is what a J-cut is for). */
export function pickBeds(scene: Scene, bundle: string, library: Library | null, prev: SoundPlan['ambience'] = []): SoundPlan['ambience'] {
  const abroad = isAbroad(scene, bundle)
  const beds = BEDS.filter((b) => b.bundle === bundle && !(abroad && b.local))
  if (!beds.length) return []
  const base = beds.find((b) => b.base) ?? beds[0]
  const tags = sceneTags(scene, library)
  const score = (b: Bed) => b.tags.filter((t) => tags.has(t)).length
  const scored = beds
    .filter((b) => b !== base)
    .map((b) => ({ b, score: score(b) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  const before = beds.find((b) => b !== base && prev.some((a) => a.id === b.id))
  const best = scored[0]
  // keep the bed of the scene before (same place) unless another fits clearly better
  const extra = before && (!best || best.score < score(before) + 2) ? before : best?.b
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
