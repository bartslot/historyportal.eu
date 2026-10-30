// The director's rules as checks. Run on any lesson (directed or teacher-edited): an empty list means
// it passes. The studio can show these as notes; the tests hold the director to them.
// Moves are measured with the ease the STAGE plays (stage25d/layout.ts `ease`), not the finer curve.
import { ease as stageEase } from '../stage25d/layout'
import type { Ease } from '../stage25d/types'
import { cameraLocked, minimums } from './direct'
import { pairRepeat, peakIndex } from './camera'
import { BALLOON_GAP_S, SHOT_MAX_S, readTime } from './timing'
import type { Camera, Lesson, Scene } from './types'

export const HOOK_S = 3
const SILENCE_PER_S = 180
const EPS = 0.02

const shotsOf = (s: Scene): Camera[] => [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as Camera[]

/** How far (0..1) a move has travelled at time t, as the stage plays it. */
export function progressAt(c: Camera, t: number): number {
  const u = Math.min(1, Math.max(0, (t - (c.at_s ?? 0)) / c.dur_s))
  return stageEase(c.ease as Ease, u)
}

export function audit(lesson: Lesson): string[] {
  const problems: string[] = []
  const scenes = lesson.scenes
  const first = scenes[0]
  if (!first) return ['no scenes']
  const min = minimums(scenes.length)

  const hook = first.camera
  if (!hook || (hook.at_s ?? 0) > EPS || progressAt(hook, HOOK_S) < 0.5) problems.push('hook: the first shot must be well under way inside 3 s')
  if (first.sound?.silence) problems.push('hook: no silence on the opening')

  const cams = scenes.flatMap(shotsOf)
  const kinds = new Set(cams.map((c) => c.move))
  if (kinds.size < min.kinds) problems.push(`camera: ${kinds.size} kinds of move, need ${min.kinds}`)
  if (scenes.length > 1) {
    const natives = scenes.filter((s) => s.camera?.native)
    const peak = peakIndex(scenes.map((s) => s.beat), scenes.map(cameraLocked))
    // peak -1: every candidate camera is the teacher's, so there is nowhere to put the native move
    if (peak >= 0 && natives.length !== 1) problems.push(`camera: ${natives.length} native moves, need exactly 1`)
    else if (peak >= 0 && scenes.indexOf(natives[0]) !== peak) problems.push('camera: the native move is not on the peak beat')
  }
  for (const c of cams) {
    if (c.ease === 'linear' || !c.ease) problems.push(`camera: linear ease on a ${c.move}`)
    if (c.dur_s > SHOT_MAX_S + EPS) problems.push(`camera: a ${c.dur_s}s shot, max ${SHOT_MAX_S}`)
  }
  const seq = cams.map((c) => c.move)
  seq.forEach((m, k) => { if (k >= 3 && pairRepeat(seq.slice(0, k)) === m) problems.push(`camera: ${seq.slice(k - 3, k + 1).join(' ')} repeats a pair of moves`) })
  cams.forEach((c, k) => { if (k > 0 && c.scale && c.scale === cams[k - 1].scale && !c.native && !cams[k - 1].native) problems.push(`camera: two ${c.scale} shots in a row`) })
  scenes.forEach((s, i) => {
    const before = i > 0 ? shotsOf(scenes[i - 1]).at(-1) : null // the shot on screen at the cut
    if (before && s.camera && before.move === s.camera.move) problems.push(`camera: ${s.id} opens on the ${s.camera.move} the cut came out of`)
    const shots = shotsOf(s)
    shots.slice(1).forEach((c, k) => { if (c.move === shots[k].move) problems.push(`camera: ${s.id} repeats a ${c.move} inside the scene`) })
    for (const t of s.motion ?? []) if (t.keyframes.some((k) => k.easing === 'linear')) problems.push(`motion: linear ease on ${s.id} ${t.target}`)
    let end = -Infinity
    for (const b of s.balloons ?? []) {
      if (b.at_s === undefined || b.dur_s === undefined) { problems.push(`balloon: "${b.text}" has no time`); continue }
      if (b.dur_s + EPS < readTime(b.text)) problems.push(`balloon: "${b.text}" held ${b.dur_s}s, needs ${readTime(b.text).toFixed(2)}s`)
      if (b.at_s + EPS < end + BALLOON_GAP_S) problems.push(`balloon: "${b.text}" overlaps the one before`)
      end = b.at_s + b.dur_s
    }
  })

  const silences = scenes.filter((s) => (s.sound?.silence?.dur_s ?? 0) >= 1).length
  const total = scenes.reduce((a, s) => a + (s.dur_s ?? 0), 0)
  const wantSilences = Math.max(min.silences, Math.floor(total / SILENCE_PER_S)) // at least one per ~3 min (PM)
  if (silences < wantSilences) problems.push(`sound: ${silences} silences in ${Math.round(total / 60)} min, need ${wantSilences}`)
  const cuts = scenes.filter((s, i) => i > 0 && s.sound && (s.sound.lead_in_s > 0 || s.sound.tail_s > 0)).length
  if (cuts < min.cuts) problems.push(`sound: ${cuts} J/L-cuts, need ${min.cuts}`)
  return problems
}
