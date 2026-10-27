// The clock: the narrator's timing sets every shot. One duration model for the whole pipeline,
// tools/lessongen/timing.json (PM 2026-10-27), read here and by S4's validate.py:
//   shot = max(shot_min_s, spoken + breath_s); spoken = measured tts_s, else words / words_per_s;
//   then the scene's class_action_s; an interaction adds its fixed interaction_s.
// HP_TIMING_JSON (an absolute path) replaces the file when running under Node (tests, tools).
import shared from '../../../tools/lessongen/timing.json'
import type { Balloon, Lesson, Scene } from './types'

type Timing = typeof shared
function loadTiming(): Timing {
  const path = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.HP_TIMING_JSON
  if (!path) return shared
  const fs = (globalThis as { process?: { getBuiltinModule?: (m: string) => { readFileSync: (p: string, e: string) => string } } }).process?.getBuiltinModule?.('node:fs')
  if (!fs) throw new Error(`HP_TIMING_JSON is set (${path}) but this runtime cannot read files`)
  return JSON.parse(fs.readFileSync(path, 'utf8')) as Timing
}
export const TIMING: Timing = loadTiming()

export const WORDS_PER_S = TIMING.narration.words_per_s
/** Air after the last spoken word before the cut. */
export const BREATH_S = TIMING.narration.breath_s
/** Shot length the house wants: a new shot every 6-12 s. */
export const SHOT_MIN_S = TIMING.shot_min_s
export const SHOT_MAX_S = TIMING.shot_max_s
/** Balloon and cold-text read time (story-director "Pace"): letters / 15 + 1.5 s. */
export const readTime = (text: string): number => (text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) / 15 + 1.5
export const BALLOON_GAP_S = 0.35

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

/** Spoken seconds: measured (S4's `tts_s`, or the TTS `timings`), else words / words_per_s. */
export function narrationSeconds(scene: Scene): number {
  const measured = (scene.tts_s as number | undefined) || scene.timings?.duration_s
  return measured || words(scene.narration) / WORDS_PER_S
}

/** The shared model's shot time for a scene (timing.json; same as validate.py shot_s). */
export function modelShotSeconds(scene: Scene): number {
  const measured = (scene.tts_s as number | undefined) || scene.timings?.duration_s
  if (!measured && !scene.narration.trim()) return SHOT_MIN_S
  return Math.max(SHOT_MIN_S, narrationSeconds(scene) + BREATH_S)
}
export const classActionSeconds = (scene: Scene): number => (scene.class_action_s as number | undefined) ?? 0
/** An interaction's play time: `type.format` when timing.json has that key, else `type`; a team
 *  activity (format 'team') plays its own class_action_s (validate.py interaction_s). */
export function interactionSeconds(scene: Scene): number {
  const it = scene.interaction as { type: string; format?: string; class_action_s?: number } | null | undefined
  if (!it) return 0
  if (it.format === 'team') return it.class_action_s ?? 0
  const times = TIMING.interaction_s as Record<string, number>
  return times[`${it.type}.${it.format}`] ?? times[it.type] ?? 0
}

/** Rounding of a lesson total (timing.json "rounding": "half_up_total", agreed with S4): sum the raw
 *  float seconds, round ONCE at the end with floor(x + 0.5); never per shot, never banker's rounding. */
export const roundTotal = (seconds: number): number => Math.floor(seconds + 0.5)
const ROUNDING = (TIMING as { rounding?: string }).rounding ?? 'half_up_total'
if (ROUNDING !== 'half_up_total') throw new Error(`timing.json rounding "${ROUNDING}" is not the one the director implements (half_up_total)`)

/** The shared model's lesson length in whole seconds, as validate.py --totals reports it. */
export const modelTotal = (lesson: Lesson): number =>
  roundTotal(lesson.scenes.reduce((t, s) => t + modelShotSeconds(s) + classActionSeconds(s) + interactionSeconds(s), 0))

/** The lesson's length as played: every scene's picture time plus its interaction. */
export const lessonSeconds = (lesson: Lesson): number =>
  lesson.scenes.reduce((t, s) => t + (s.dur_s ?? modelShotSeconds(s) + classActionSeconds(s)) + interactionSeconds(s), 0)

/** Balloons run one after another, after the narrator's first sentence has landed, so a balloon
 *  never lands on top of the line that sets it up. Returns new balloons with at_s/dur_s. */
export function scheduleBalloons(balloons: Balloon[], start: number): Balloon[] {
  let t = start
  return balloons.map((b) => {
    const dur = round(readTime(b.text))
    const out = { ...b, at_s: round(t), dur_s: dur }
    t += dur + BALLOON_GAP_S
    return out
  })
}

/** End of the first sentence in seconds: word timings when there are any, else proportional. */
export function firstSentenceEnd(scene: Scene, narrationAt: number): number {
  const words = scene.timings?.words
  if (words?.length) {
    const end = words.find((w) => /[.!?]$/.test(w.word))
    if (end) return narrationAt + end.end
  }
  const text = scene.narration
  const cut = text.search(/[.!?](\s|$)/)
  const share = cut < 0 ? 1 : (cut + 1) / Math.max(1, text.length)
  return narrationAt + narrationSeconds(scene) * share
}

/** Scene picture time: the shared model's shot, lengthened only by what the director adds (a silence
 *  before the narrator, balloons that need longer to read), then the class action. */
export function sceneSeconds(scene: Scene, narrationAt: number, balloons: Balloon[]): number {
  const shot = Math.max(modelShotSeconds(scene), narrationAt + narrationSeconds(scene) + BREATH_S)
  const last = balloons.at(-1)
  const read = last ? (last.at_s ?? 0) + (last.dur_s ?? 0) + BREATH_S : 0
  return round(Math.max(shot, read) + classActionSeconds(scene))
}

/** Split a scene into equal shots of at most `max` seconds. Returns the shot start times. */
export function shotStarts(dur: number, max = SHOT_MAX_S): number[] {
  const n = Math.max(1, Math.ceil(dur / max - 1e-9))
  return Array.from({ length: n }, (_, i) => round((dur / n) * i))
}

export const round = (v: number): number => Math.round(v * 100) / 100
