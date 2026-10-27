// The clock: the narrator's timing sets every shot. Real TTS timings win over the writer's estimate,
// the estimate wins over a word count.
import type { Balloon, Scene } from './types'

/** Narrator speed when nothing better is known (Dutch/English narrator, measured on Tasman). */
export const WORDS_PER_S = 2.5
/** Balloon and cold-text read time (story-director "Pace"): letters / 15 + 1.5 s. */
export const readTime = (text: string): number => (text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) / 15 + 1.5
export const BALLOON_GAP_S = 0.35
/** Shot length the house wants: a new shot every 6-12 s. */
export const SHOT_MIN_S = 6
export const SHOT_MAX_S = 12
/** Air after the last spoken word before the cut. */
const TAIL_PAD_S = 0.6

export function narrationSeconds(scene: Scene): number {
  if (scene.timings?.duration_s) return scene.timings.duration_s
  if (scene.est_s) return scene.est_s
  const words = scene.narration.trim().split(/\s+/).filter(Boolean).length
  return words / WORDS_PER_S
}

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

/** Scene length: narration (plus any silence before it) or the balloons, whichever runs longer. */
export function sceneSeconds(scene: Scene, narrationAt: number, balloons: Balloon[]): number {
  const spoken = narrationAt + narrationSeconds(scene) + TAIL_PAD_S
  const last = balloons.at(-1)
  const read = last ? (last.at_s ?? 0) + (last.dur_s ?? 0) + TAIL_PAD_S : 0
  return round(Math.max(spoken, read, SHOT_MIN_S))
}

/** Split a scene into equal shots of at most `max` seconds. Returns the shot start times. */
export function shotStarts(dur: number, max = SHOT_MAX_S): number[] {
  const n = Math.max(1, Math.ceil(dur / max - 1e-9))
  return Array.from({ length: n }, (_, i) => round((dur / n) * i))
}

export const round = (v: number): number => Math.round(v * 100) / 100
