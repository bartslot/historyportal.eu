// The director's rules as checks. Run on any lesson (directed or teacher-edited): an empty list means
// it passes. The studio can show these as notes; the tests hold the director to them.
import { EASING } from '@hp/easing.js'
import { MIN_MOVE_KINDS, MIN_SILENCES, MIN_SOUND_CUTS } from './direct'
import { peakIndex } from './camera'
import { BALLOON_GAP_S, SHOT_MAX_S, readTime } from './timing'
import type { Camera, Lesson } from './types'

export const HOOK_S = 3
const EPS = 0.02

const camerasOf = (l: Lesson): Camera[] => l.scenes.flatMap((s) => [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as Camera[])

/** How far (0..1) an eased move has travelled at time t. */
export function progressAt(c: Camera, t: number): number {
  const u = Math.min(1, Math.max(0, (t - (c.at_s ?? 0)) / c.dur_s))
  const fn = (EASING as Record<string, (x: number) => number>)[c.ease]
  return fn ? fn(u) : u
}

export function audit(lesson: Lesson): string[] {
  const problems: string[] = []
  const first = lesson.scenes[0]
  if (!first) return ['no scenes']

  const hook = first.camera
  if (!hook || (hook.at_s ?? 0) > EPS || progressAt(hook, HOOK_S) < 0.5) problems.push('hook: the first shot must be well under way inside 3 s')
  if (first.sound?.silence) problems.push('hook: no silence on the opening')

  const cams = camerasOf(lesson)
  const kinds = new Set(cams.map((c) => c.move))
  if (kinds.size < MIN_MOVE_KINDS) problems.push(`camera: ${kinds.size} kinds of move, need ${MIN_MOVE_KINDS}`)
  const natives = lesson.scenes.filter((s) => s.camera?.native)
  if (lesson.scenes.length > 1) {
    if (natives.length !== 1) problems.push(`camera: ${natives.length} native moves, need exactly 1`)
    else if (lesson.scenes.indexOf(natives[0]) !== peakIndex(lesson.scenes.map((s) => s.beat))) problems.push('camera: the native move is not on the peak beat')
  }
  for (const c of cams) {
    if (c.ease === 'linear' || !c.ease) problems.push(`camera: linear ease on a ${c.move}`)
    if (c.dur_s > SHOT_MAX_S + EPS) problems.push(`camera: a ${c.dur_s}s shot, max ${SHOT_MAX_S}`)
  }
  lesson.scenes.forEach((s, i) => {
    const prev = lesson.scenes[i - 1]?.camera
    if (prev && s.camera && prev.move === s.camera.move) problems.push(`camera: ${s.id} repeats the ${s.camera.move} of the scene before`)
    for (const t of s.motion ?? []) if (t.keyframes.some((k) => k.easing === 'linear')) problems.push(`motion: linear ease on ${s.id} ${t.target}`)
    let end = -Infinity
    for (const b of s.balloons ?? []) {
      if ((b.dur_s ?? 0) + EPS < readTime(b.text)) problems.push(`balloon: "${b.text}" held ${b.dur_s}s, needs ${readTime(b.text).toFixed(2)}s`)
      if ((b.at_s ?? 0) + EPS < end + BALLOON_GAP_S) problems.push(`balloon: "${b.text}" overlaps the one before`)
      end = (b.at_s ?? 0) + (b.dur_s ?? 0)
    }
  })

  const silences = lesson.scenes.filter((s) => (s.sound?.silence?.dur_s ?? 0) >= 1).length
  if (silences < MIN_SILENCES) problems.push(`sound: ${silences} silences, need ${MIN_SILENCES}`)
  const cuts = lesson.scenes.filter((s, i) => i > 0 && s.sound && (s.sound.lead_in_s > 0 || s.sound.tail_s > 0)).length
  if (lesson.scenes.length > 2 && cuts < MIN_SOUND_CUTS) problems.push(`sound: ${cuts} J/L-cuts, need ${MIN_SOUND_CUTS}`)
  return problems
}
