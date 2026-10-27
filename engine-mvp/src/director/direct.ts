// The auto-director: lesson.json in, lesson.json out with camera, motion, balloon timing and sound
// proposed per scene. Pure: no DOM, no Babylon, the input is never changed.
//
// It only PROPOSES. It keeps a fingerprint of every field it writes in `scene.director`; a re-run
// replaces a field only while it is empty or still matches that fingerprint. Whatever a teacher
// changed, by any editor and any path, no longer matches and is kept as it is.
import { J_CUT_S, L_CUT_S, DUCK_DB, SILENCE_S, isAbroad, pickBeds, pickSfx, regionOf, sameBeds } from './cues'
import { PLAIN_MOVES, SHOT_MAX_BY_BEAT, makeCamera, peakIndex, pickMove } from './camera'
import { figureTracks, layerMotion } from './motion'
import { BALLOON_GAP_S, firstSentenceEnd, round, sceneSeconds, scheduleBalloons, shotStarts } from './timing'
import type { Balloon, Beat, Camera, Lesson, Library, MoveKind, Scene, SoundPlan } from './types'

/** One silence per this many seconds of lesson (at least 2), spaced at least SILENCE_GAP_S apart. */
const SILENCE_EVERY_S = 150
const SILENCE_GAP_S = 60

/** The rule minimums for a lesson of this many scenes: a short one cannot meet a long one's. */
export function minimums(scenes: number): { kinds: number; silences: number; cuts: number } {
  return { kinds: Math.min(4, scenes), silences: scenes >= 4 ? 2 : 0, cuts: scenes >= 4 ? 2 : 0 }
}

/** A short stable fingerprint of a JSON value (djb2 over its JSON). */
export const fingerprint = (v: unknown): string => {
  const str = JSON.stringify(v) ?? ''
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
type Key = 'camera' | 'camera_more' | 'sound' | 'balloons' | 'motion' | 'timing'
type Marks = Partial<Record<Key, string>> & { layers?: (string | null)[] }
const marks = (s: Scene): Marks => (s.director as Marks | undefined) ?? {}
/** True when the director may (re)write this field: empty, or untouched since it last wrote it. */
const owns = (s: Scene, key: Key, v: unknown) => v == null || marks(s)[key] === fingerprint(v)
/** The teacher owns this scene's camera (it changed since the director wrote it, or was hand-made). */
export const cameraLocked = (s: Scene): boolean => !owns(s, 'camera', s.camera)

const shotsOf = (s: Scene): Camera[] => [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as Camera[]

/** Silences go on turns and climaxes (never the hook), one per SILENCE_EVERY_S, spaced apart; topped
 *  up from the end when the beats offer too few. `starts` = rough scene start times. */
export function silenceIndices(beats: Beat[], starts: number[], total: number): number[] {
  const want = Math.max(minimums(beats.length).silences, Math.round(total / SILENCE_EVERY_S))
  const out: number[] = []
  const fits = (i: number) => i > 0 && !out.includes(i) && out.every((k) => Math.abs(starts[k] - starts[i]) >= SILENCE_GAP_S)
  for (const beat of ['turn', 'climax'] as Beat[]) {
    beats.forEach((b, i) => { if (b === beat && out.length < want && fits(i)) out.push(i) })
  }
  for (let i = beats.length - 2; out.length < want && i > 0; i--) if (!out.includes(i)) out.push(i)
  return out.sort((a, b) => a - b)
}

/** Balloon times: all of them when the director owns them; else the teacher's stay and any new
 *  balloon (no time yet) follows the last timed one. */
function timeBalloons(scene: Scene, narrationAt: number): Balloon[] {
  const all = scene.balloons ?? []
  const first = firstSentenceEnd(scene, narrationAt) + 0.3
  if (all.every((b) => b.at_s === undefined) || owns(scene, 'balloons', all)) return scheduleBalloons(all, first)
  const timed = all.filter((b) => b.at_s !== undefined)
  const after = Math.max(first, ...timed.map((b) => (b.at_s ?? 0) + (b.dur_s ?? 0) + BALLOON_GAP_S))
  const fresh = scheduleBalloons(all.filter((b) => b.at_s === undefined), after)
  let k = 0
  return all.map((b) => (b.at_s === undefined ? fresh[k++] : b))
}

type Plan = { scene: Scene; dur: number; narrationAt: number; ownsTiming: boolean; ownsBalloons: boolean }

function timeScene(scene: Scene, silent: boolean): Plan {
  const narrationAt = !owns(scene, 'sound', scene.sound) ? (scene.sound?.silence?.dur_s ?? 0) : silent ? SILENCE_S : 0
  // a scene length or narrator start the teacher set is theirs
  const timing = scene.dur_s === undefined && scene.narration_at_s === undefined ? null : { dur_s: scene.dur_s, narration_at_s: scene.narration_at_s }
  const mine = owns(scene, 'timing', timing)
  const at = mine ? narrationAt : (scene.narration_at_s ?? narrationAt)
  const balloons = timeBalloons(scene, at)
  const ownsBalloons = (scene.balloons ?? []).every((b) => b.at_s === undefined) || owns(scene, 'balloons', scene.balloons)
  const dur = mine ? sceneSeconds(scene, at, balloons) : (scene.dur_s ?? sceneSeconds(scene, at, balloons))
  return { scene: { ...scene, balloons, narration_at_s: at, dur_s: dur }, dur, narrationAt: at, ownsTiming: mine, ownsBalloons }
}

/** Every shot of a scene, the first given; later shots avoid the shot before and the next cut's move. */
function shootScene(p: Plan, first: MoveKind, turn: number, nextLocked: MoveKind | null, native: boolean): Camera[] {
  const hook = p.scene.beat === 'hook'
  const starts = shotStarts(p.dur, SHOT_MAX_BY_BEAT[p.scene.beat] ?? 12)
  const moves: MoveKind[] = []
  starts.forEach((_, i) => {
    const last = i === starts.length - 1
    moves.push(i === 0 ? first : pickMove(p.scene.beat, [moves[i - 1], 'through', last ? nextLocked : null], turn + i))
  })
  return starts.map((at, i) => makeCamera(p.scene, moves[i], at, (starts[i + 1] ?? p.dur) - at, { hook: hook && i === 0 && !native }))
}

function soundFor(p: Plan, lesson: Lesson, library: Library | null, silent: boolean, native: boolean, prev: SoundPlan['ambience']): SoundPlan {
  return {
    ambience: pickBeds(p.scene, lesson.bundle, library, prev),
    lead_in_s: 0, tail_s: 0,
    silence: silent ? { at_s: 0, dur_s: SILENCE_S } : null,
    sfx: pickSfx(p.scene, p.narrationAt, p.dur, native),
    duck_db: DUCK_DB,
  }
}

/** Where the place changes: a J-cut (the next beds start under the last shot), or out of the peak an
 *  L-cut (the departing beds ring on over the cut; schedule.ts applies tail_s to the beds that leave).
 *  Topped up with early foley (a real J-cut on a cut where the place stays) until the minimum. */
function linkCuts(sounds: (SoundPlan | null)[], ours: boolean[], natives: boolean[], min: number): (SoundPlan | null)[] {
  const out = sounds.map((s, i) => (s && ours[i] ? { ...s } : s))
  const cuts = () => out.filter((s, i) => i > 0 && s && (s.lead_in_s > 0 || s.tail_s > 0)).length
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i]
    if (!a || !b || !ours[i] || sameBeds(a.ambience, b.ambience)) continue
    if (natives[i - 1]) b.tail_s = L_CUT_S
    else b.lead_in_s = J_CUT_S
  }
  for (let i = 1; i < out.length && cuts() < min; i++) {
    const b = out[i]
    if (!b || !ours[i] || b.lead_in_s > 0 || b.tail_s > 0 || !b.sfx.length) continue
    b.sfx = [{ ...b.sfx[0], at_s: round(-J_CUT_S * 0.6) }, ...b.sfx.slice(1)]
    b.lead_in_s = round(J_CUT_S * 0.6)
  }
  return out
}

/** Shots for every scene, in order. A free scene's first move comes from its beat's pool rotated by
 *  how often the beat came before, never the move on screen before the cut (the previous scene's LAST
 *  shot) nor a locked next scene's first move. */
function shootAll(plans: Plan[], locked: boolean[], peak: number): Camera[][] {
  const seen: Partial<Record<Beat, number>> = {}
  const all: Camera[][] = []
  plans.forEach((p, i) => {
    const turn = seen[p.scene.beat] ?? 0
    seen[p.scene.beat] = turn + 1
    if (locked[i]) { all.push(shotsOf(p.scene)); return }
    const before = all[i - 1]?.at(-1)?.move
    const nextLocked = locked[i + 1] ? plans[i + 1].scene.camera!.move : null
    const first: MoveKind = i === peak ? 'through' : pickMove(p.scene.beat, [before, nextLocked, 'through'], turn)
    all.push(shootScene(p, first, turn, nextLocked, i === peak))
  })
  return all
}

/** Too few kinds of move: re-shoot calm scenes with a kind not used yet, where it repeats no neighbour. */
function enforceVariety(all: Camera[][], plans: Plan[], locked: boolean[], min: number): Camera[][] {
  const out = all.map((s) => [...s])
  const kinds = () => new Set(out.flat().map((c) => c.move))
  for (let i = 0; i < out.length && kinds().size < min; i++) {
    if (locked[i] || out[i][0]?.native || !['setup', 'cause', 'effect', 'recap', 'turn'].includes(plans[i].scene.beat)) continue
    const avoid = [out[i - 1]?.at(-1)?.move, out[i][1]?.move, out[i + 1]?.[0]?.move]
    const used = kinds()
    const missing = PLAIN_MOVES.find((m) => !used.has(m) && !avoid.includes(m))
    if (!missing || out.flat().filter((c) => c.move === out[i][0].move).length < 2) continue
    out[i] = [makeCamera(plans[i].scene, missing, 0, out[i][0].dur_s), ...out[i].slice(1)]
  }
  return out
}

export function direct(lesson: Lesson, library: Library | null = null): Lesson {
  const src = structuredClone(lesson)
  const n = src.scenes.length
  const min = minimums(n)
  const beats = src.scenes.map((s) => s.beat)
  const locked = src.scenes.map(cameraLocked)
  const peak = n > 1 ? peakIndex(beats, locked) : -1

  // a rough clock first (no silences) to space the silences in time, then the real timing
  const rough = src.scenes.map((s) => timeScene(s, false).dur)
  const roughStarts = rough.map((_, i) => rough.slice(0, i).reduce((a, b) => a + b, 0))
  const silences = new Set(n >= 4 ? silenceIndices(beats, roughStarts, rough.reduce((a, b) => a + b, 0)) : [])
  const plans = src.scenes.map((s, i) => timeScene(s, silences.has(i)))

  const shots = enforceVariety(shootAll(plans, locked, peak), plans, locked, min.kinds)

  const ours = plans.map((p) => owns(p.scene, 'sound', p.scene.sound))
  // the place: a scene without a !region tag is where the scene before it was
  const regions: (string | null)[] = []
  plans.forEach((p, i) => regions.push(regionOf(p.scene) ?? regions[i - 1] ?? null))
  const proposed: (SoundPlan | null)[] = []
  plans.forEach((p, i) => {
    const prev = i > 0 && regions[i] === regions[i - 1] ? (proposed[i - 1]?.ambience ?? []) : []
    proposed.push(ours[i] ? soundFor(p, src, library, silences.has(i), i === peak, prev) : p.scene.sound)
  })
  const sounds = linkCuts(proposed, ours, plans.map((_, i) => i === peak), min.cuts)

  const scenes = plans.map((p, i): Scene => {
    const s = p.scene
    const m = marks(s)
    const camera = locked[i] ? s.camera : shots[i][0]
    const camera_more = locked[i] || !owns(s, 'camera_more', s.camera_more) ? s.camera_more : shots[i].slice(1)
    const ownsMotion = owns(s, 'motion', s.motion)
    const motion = ownsMotion ? figureTracks(s, p.dur) : s.motion
    // layer motion goes where the stage reads it (set.layers[i].motion); a layer's own motion is kept
    const layerProposals = layerMotion(s, library)
    const layerMarks: (string | null)[] = []
    const layers = s.set.layers.map((l, k) => {
      const free = l.motion == null || m.layers?.[k] === fingerprint(l.motion)
      layerMarks.push(free && layerProposals[k] ? fingerprint(layerProposals[k]) : null)
      return free && layerProposals[k] ? { ...l, motion: layerProposals[k] } : l
    })
    return {
      ...s,
      set: { ...s.set, layers },
      camera, ...(camera_more !== undefined ? { camera_more } : {}),
      motion, sound: sounds[i],
      ...(ours[i] && isAbroad(s, src.bundle) ? { sound_note: `${src.bundle} has no bed for this place: its local beds are left out` } : {}),
      // a field the teacher owns keeps its OLD mark, so it stays theirs on every later run
      director: {
        camera: locked[i] ? m.camera : fingerprint(camera),
        camera_more: locked[i] || !owns(s, 'camera_more', s.camera_more) ? m.camera_more : fingerprint(camera_more),
        sound: ours[i] ? fingerprint(sounds[i]) : m.sound,
        balloons: p.ownsBalloons ? fingerprint(s.balloons) : m.balloons,
        motion: ownsMotion ? fingerprint(motion) : m.motion,
        timing: p.ownsTiming ? fingerprint({ dur_s: s.dur_s, narration_at_s: s.narration_at_s }) : m.timing,
        layers: layerMarks,
      },
    }
  })
  return { ...src, scenes }
}
