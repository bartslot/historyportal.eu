// The auto-director: lesson.json in, lesson.json out with camera, motion, balloon timing and sound
// proposed per scene. Pure: no DOM, no Babylon, the input is never changed.
//
// It only PROPOSES. Every field it writes carries `by: 'director'` (motion: `motion_by`); a field a
// teacher changed (the mark gone) or wrote by hand is kept as it is on every re-run.
import { J_CUT_S, L_CUT_S, DUCK_DB, SILENCE_S, pickBeds, pickSfx, sameBeds } from './cues'
import { PLAIN_MOVES, makeCamera, peakIndex, pickMove } from './camera'
import { figureTracks, layerTracks } from './motion'
import { firstSentenceEnd, round, sceneSeconds, scheduleBalloons, shotStarts } from './timing'
import type { Beat, Camera, Lesson, Library, MoveKind, Scene, SoundPlan } from './types'

export const MIN_MOVE_KINDS = 4
export const MIN_SILENCES = 2
export const MIN_SOUND_CUTS = 2

const mine = (v: { by?: string } | null | undefined) => v == null || v.by === 'director'
const balloonsOwned = (s: Scene) => (s.balloons ?? []).every((b) => b.at_s === undefined || s.balloons_by === 'director')

/** Where the near-silences go: before the turn and before the peak, never on the hook. */
export function silenceIndices(beats: Beat[]): number[] {
  const want = [beats.indexOf('turn'), beats.indexOf('climax'), peakIndex(beats)]
  const out = [...new Set(want.filter((i) => i > 0))]
  for (let i = beats.length - 2; out.length < MIN_SILENCES && i > 0; i--) if (!out.includes(i)) out.push(i)
  return out.sort((a, b) => a - b).slice(0, Math.max(MIN_SILENCES, out.length))
}

type Plan = { scene: Scene; dur: number; narrationAt: number; native: boolean }

function timeScene(scene: Scene, silent: boolean, native: boolean): Plan {
  const narrationAt = !mine(scene.sound) ? (scene.sound?.silence?.dur_s ?? 0) : silent ? SILENCE_S : 0
  const balloons = balloonsOwned(scene)
    ? scheduleBalloons(scene.balloons ?? [], firstSentenceEnd(scene, narrationAt) + 0.3)
    : (scene.balloons ?? [])
  const dur = sceneSeconds(scene, narrationAt, balloons)
  const next: Scene = { ...scene, balloons, narration_at_s: narrationAt, dur_s: dur, ...(scene.balloons?.length && balloonsOwned(scene) ? { balloons_by: 'director' } : {}) }
  return { scene: next, dur, narrationAt, native }
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
    duck_db: DUCK_DB, by: 'director',
  }
}

/** J-cut where the place changes (the next bed starts under the last shot); L-cut out of the peak
 *  (its sound rings over the cut). Topped up with early foley until MIN_SOUND_CUTS cuts carry sound. */
function linkCuts(sounds: (SoundPlan | null)[], natives: boolean[]): (SoundPlan | null)[] {
  const out = sounds.map((s) => (s && s.by === 'director' ? { ...s } : s))
  const cuts = () => out.filter((s, i) => i > 0 && s && (s.lead_in_s > 0 || s.tail_s > 0)).length
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i]
    if (!a || !b || b.by !== 'director') continue
    if (!sameBeds(a.ambience, b.ambience)) b.lead_in_s = J_CUT_S
    else if (natives[i - 1]) b.tail_s = L_CUT_S
  }
  for (let i = 1; i < out.length && cuts() < MIN_SOUND_CUTS; i++) {
    const b = out[i]
    if (!b || b.by !== 'director' || b.lead_in_s > 0 || b.tail_s > 0) continue
    if (b.sfx.length) {
      b.sfx = [{ ...b.sfx[0], at_s: round(-J_CUT_S * 0.6) }, ...b.sfx.slice(1)]
      b.lead_in_s = round(J_CUT_S * 0.6)
    } else b.tail_s = L_CUT_S
  }
  return out
}

export function direct(lesson: Lesson, library: Library | null = null): Lesson {
  const src = structuredClone(lesson)
  const beats = src.scenes.map((s) => s.beat)
  const peak = src.scenes.length > 1 ? peakIndex(beats) : -1
  const silences = new Set(src.scenes.length > 2 ? silenceIndices(beats) : [])

  const plans = src.scenes.map((s, i) => timeScene(s, silences.has(i), i === peak))
  const locked = plans.map((p) => !mine(p.scene.camera))

  let prev: MoveKind | null = null
  const firsts = plans.map((p, i) => {
    const m: MoveKind = locked[i] ? p.scene.camera!.move : i === peak ? 'through' : pickMove(p.scene.beat, prev)
    prev = m
    return m
  })
  const moves = enforceVariety(firsts, beats, locked)

  const sounds = linkCuts(
    plans.map((p, i) => (mine(p.scene.sound) ? soundFor(p, src, library, silences.has(i)) : p.scene.sound)),
    plans.map((p) => p.native),
  )

  const scenes = plans.map((p, i): Scene => {
    const shots = locked[i] ? null : shootScene(p, moves[i], i === 0)
    const motionMine = !p.scene.motion || p.scene.motion_by === 'director'
    return {
      ...p.scene,
      camera: shots ? shots[0] : p.scene.camera,
      ...(shots ? { camera_more: shots.slice(1) } : {}),
      ...(motionMine ? { motion: [...layerTracks(p.scene, p.dur, library), ...figureTracks(p.scene, p.dur)], motion_by: 'director' } : {}),
      sound: sounds[i],
    }
  })
  return { ...src, scenes }
}
