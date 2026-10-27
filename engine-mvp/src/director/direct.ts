// The auto-director: lesson.json in, lesson.json out with camera, motion, balloon timing and sound
// proposed per scene. Pure: no DOM, no Babylon, the input is never changed.
//
// It only PROPOSES. It keeps a fingerprint of every field it writes in `scene.director`; a re-run
// replaces a field only while it is empty or still matches that fingerprint. Whatever a teacher
// changed, by any editor and any path, no longer matches and is kept as it is.
import { J_CUT_S, L_CUT_S, DUCK_DB, SILENCE_S, pickBeds, pickSfx, sameBeds } from './cues'
import { PLAIN_MOVES, makeCamera, peakIndex, pickMove } from './camera'
import { figureTracks, layerMotion } from './motion'
import { firstSentenceEnd, round, sceneSeconds, scheduleBalloons, shotStarts } from './timing'
import type { Beat, Camera, Lesson, Library, MoveKind, Scene, SoundPlan } from './types'

export const MIN_MOVE_KINDS = 4
export const MIN_SILENCES = 2
export const MIN_SOUND_CUTS = 2

/** A short stable fingerprint of a JSON value (djb2 over its JSON). */
export const fingerprint = (v: unknown): string => {
  const str = JSON.stringify(v) ?? ''
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
type Marks = { camera?: string; camera_more?: string; sound?: string; balloons?: string; motion?: string; timing?: string; layers?: (string | null)[] }
const marks = (s: Scene): Marks => (s.director as Marks | undefined) ?? {}
/** True when the director may (re)write this field: empty, or untouched since it last wrote it. */
const owns = (s: Scene, key: 'camera' | 'camera_more' | 'sound' | 'balloons' | 'motion' | 'timing', v: unknown) => v == null || marks(s)[key] === fingerprint(v)
const balloonsOwned = (s: Scene) => (s.balloons ?? []).every((b) => b.at_s === undefined) || owns(s, 'balloons', s.balloons)

/** Where the near-silences go: before the turn and before the peak, never on the hook. */
export function silenceIndices(beats: Beat[]): number[] {
  const want = [beats.indexOf('turn'), beats.indexOf('climax'), peakIndex(beats)]
  const out = [...new Set(want.filter((i) => i > 0))]
  for (let i = beats.length - 2; out.length < MIN_SILENCES && i > 0; i--) if (!out.includes(i)) out.push(i)
  return out.sort((a, b) => a - b).slice(0, Math.max(MIN_SILENCES, out.length))
}

type Plan = { scene: Scene; dur: number; narrationAt: number; native: boolean }

function timeScene(scene: Scene, silent: boolean, native: boolean): Plan {
  const narrationAt = !owns(scene, 'sound', scene.sound) ? (scene.sound?.silence?.dur_s ?? 0) : silent ? SILENCE_S : 0
  const balloons = balloonsOwned(scene)
    ? scheduleBalloons(scene.balloons ?? [], firstSentenceEnd(scene, narrationAt) + 0.3)
    : (scene.balloons ?? [])
  // a scene length or narrator start the teacher set is theirs
  const timing = scene.dur_s === undefined && scene.narration_at_s === undefined ? null : { dur_s: scene.dur_s, narration_at_s: scene.narration_at_s }
  if (!owns(scene, 'timing', timing)) {
    const dur = scene.dur_s ?? sceneSeconds(scene, scene.narration_at_s ?? narrationAt, balloons)
    const at = scene.narration_at_s ?? narrationAt
    return { scene: { ...scene, balloons, narration_at_s: at, dur_s: dur }, dur, narrationAt: at, native }
  }
  const dur = sceneSeconds(scene, narrationAt, balloons)
  return { scene: { ...scene, balloons, narration_at_s: narrationAt, dur_s: dur }, dur, narrationAt, native }
}

function shootScene(p: Plan, firstMove: MoveKind, isHook: boolean): Camera[] {
  const starts = shotStarts(p.dur)
  let prev: MoveKind | null = null
  return starts.map((at, i) => {
    const end = starts[i + 1] ?? p.dur
    const move = i === 0 ? firstMove : pickMove(p.scene.beat, prev, p.native ? ['through'] : [])
    prev = move
    return makeCamera(p.scene, move, at, end - at, { hook: isHook && i === 0 })
  })
}

/** Make sure the lesson uses at least MIN_MOVE_KINDS kinds of move: swap the first shot of calm
 *  scenes (setup/cause/effect) to a kind not used yet, never repeating a neighbour's move. */
function enforceVariety(firsts: MoveKind[], beats: Beat[], locked: boolean[]): MoveKind[] {
  const out = [...firsts]
  const used = () => new Set(out)
  for (const beat of ['setup', 'cause', 'effect', 'turn', 'recap'] as Beat[]) {
    for (let i = 0; i < out.length && used().size < MIN_MOVE_KINDS; i++) {
      if (beats[i] !== beat || locked[i] || out[i] === 'through') continue
      const missing = PLAIN_MOVES.find((m) => !used().has(m) && m !== out[i - 1] && m !== out[i + 1])
      if (missing && out.filter((m) => m === out[i]).length > 1) out[i] = missing
    }
  }
  return out
}

function soundFor(p: Plan, lesson: Lesson, library: Library | null, silent: boolean): SoundPlan {
  return {
    ambience: pickBeds(p.scene, lesson.bundle, library),
    lead_in_s: 0, tail_s: 0,
    silence: silent ? { at_s: 0, dur_s: SILENCE_S } : null,
    sfx: pickSfx(p.scene, p.narrationAt, p.dur, p.native),
    duck_db: DUCK_DB,
  }
}

/** Where the place changes: a J-cut (the next beds start under the last shot), or out of the peak an
 *  L-cut (the departing beds ring on over the cut; schedule.ts applies tail_s to the beds that leave).
 *  Topped up with early foley (a real J-cut on a cut where the place stays) until MIN_SOUND_CUTS. */
function linkCuts(sounds: (SoundPlan | null)[], ours: boolean[], natives: boolean[]): (SoundPlan | null)[] {
  const out = sounds.map((s, i) => (s && ours[i] ? { ...s } : s))
  const cuts = () => out.filter((s, i) => i > 0 && s && (s.lead_in_s > 0 || s.tail_s > 0)).length
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i]
    if (!a || !b || !ours[i]) continue
    if (sameBeds(a.ambience, b.ambience)) continue
    if (natives[i - 1]) b.tail_s = L_CUT_S
    else b.lead_in_s = J_CUT_S
  }
  for (let i = 1; i < out.length && cuts() < MIN_SOUND_CUTS; i++) {
    const b = out[i]
    if (!b || !ours[i] || b.lead_in_s > 0 || b.tail_s > 0) continue
    if (!b.sfx.length) continue // nothing to pull across the cut: the audit will say so
    b.sfx = [{ ...b.sfx[0], at_s: round(-J_CUT_S * 0.6) }, ...b.sfx.slice(1)]
    b.lead_in_s = round(J_CUT_S * 0.6)
  }
  return out
}

export function direct(lesson: Lesson, library: Library | null = null): Lesson {
  const src = structuredClone(lesson)
  const beats = src.scenes.map((s) => s.beat)
  const peak = src.scenes.length > 1 ? peakIndex(beats) : -1
  const silences = new Set(src.scenes.length > 2 ? silenceIndices(beats) : [])

  const plans = src.scenes.map((s, i) => timeScene(s, silences.has(i), i === peak))
  const locked = plans.map((p) => !owns(p.scene, 'camera', p.scene.camera))

  let prev: MoveKind | null = null
  const firsts = plans.map((p, i) => {
    const m: MoveKind = locked[i] ? p.scene.camera!.move : i === peak ? 'through' : pickMove(p.scene.beat, prev)
    prev = m
    return m
  })
  const moves = enforceVariety(firsts, beats, locked)

  const ours = plans.map((p) => owns(p.scene, 'sound', p.scene.sound))
  const sounds = linkCuts(
    plans.map((p, i) => (ours[i] ? soundFor(p, src, library, silences.has(i)) : p.scene.sound)),
    ours, plans.map((p) => p.native),
  )

  const scenes = plans.map((p, i): Scene => {
    const s = p.scene
    const m = marks(s)
    const shots = locked[i] ? null : shootScene(p, moves[i], i === 0)
    const camera = shots ? shots[0] : s.camera
    const camera_more = shots && owns(s, 'camera_more', s.camera_more) ? shots.slice(1) : s.camera_more
    const motion = owns(s, 'motion', s.motion) ? figureTracks(s, p.dur) : s.motion
    // layer motion goes where the stage reads it (set.layers[i].motion); a layer's own motion is kept
    const proposals = layerMotion(s, library)
    const layerMarks: (string | null)[] = []
    const layers = s.set.layers.map((l, k) => {
      const ownsIt = l.motion == null || m.layers?.[k] === fingerprint(l.motion)
      const next = ownsIt && proposals[k] ? { ...l, motion: proposals[k] } : l
      layerMarks.push(ownsIt && proposals[k] ? fingerprint(proposals[k]) : null)
      return next
    })
    const sound = sounds[i]
    return {
      ...s,
      set: { ...s.set, layers },
      camera, ...(camera_more ? { camera_more } : {}),
      motion, sound,
      director: {
        camera: fingerprint(camera), camera_more: fingerprint(camera_more), sound: fingerprint(sound),
        balloons: fingerprint(s.balloons), motion: fingerprint(motion), layers: layerMarks,
        timing: fingerprint({ dur_s: s.dur_s, narration_at_s: s.narration_at_s }),
      },
    }
  })
  return { ...src, scenes }
}
