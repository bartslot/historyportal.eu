// What a lesson.json interaction becomes on screen, and when. Pure: the card UI and the player read it.
// Shapes: tools/lessongen/lesson.schema.json ($defs quiz, choice, power_meter). Time: timing.json via
// the director's interactionSeconds, so the card's clock is the same model validate.py counts.
import { interactionSeconds } from '../director/timing'
import type { Scene } from '../director/types'

export type Quiz = {
  type: 'quiz'; format?: 'mc' | 'true-false' | 'sort' | 'open' | 'team'
  question: string; options: string[]; correct: number | number[] | null; explain: string; class_action_s?: number
}
export type Choice = {
  type: 'choice'; format?: 'class' | 'vote' | 'team'; prompt: string
  options: { text: string; outcome: string }[]; history?: string; class_action_s?: number
}
export type PowerMeter = {
  type: 'power-meter'; name: string; prompt: string; payoff: string; right: string[]; wrong: string[]; input?: string
}
export type Interaction = Quiz | Choice | PowerMeter

/** The card to draw: one per way the class takes part. */
export type CardKind = 'answer' | 'sort' | 'discuss' | 'team' | 'choose' | 'vote' | 'meter'

export function cardKind(it: Interaction): CardKind {
  if (it.type === 'power-meter') return 'meter'
  if (it.format === 'team') return 'team'
  if (it.type === 'choice') return it.format === 'vote' ? 'vote' : 'choose'
  if (it.format === 'open') return 'discuss'
  if (it.format === 'sort') return 'sort'
  return 'answer' // mc, true-false, or no format
}

/** Seconds the card is planned for (timing.json): the clock the teacher sees, never a hard stop. */
export const cardSeconds = (scene: Scene): number => interactionSeconds(scene)

/** Where the picture holds for the card, in scene seconds. A power meter holds at 55 %, so the class's
 *  right words play the rest of the scene ("the world moves"); every other card holds on the last
 *  frame, just before the cut. */
export const METER_HOLD = 0.55
export const HOLD_BEFORE_CUT_S = 0.15
export const holdAt = (scene: Scene, dur: number): number =>
  scene.interaction?.type === 'power-meter' ? dur * METER_HOLD : Math.max(0, dur - HOLD_BEFORE_CUT_S)

/** The right words of a meter, mixed with the wrong ones in a fixed order (the same every time the
 *  lesson plays; no Math.random so a re-run and a test see the same card). */
export function meterWords(m: PowerMeter): { word: string; right: boolean }[] {
  const all = [...m.right.map((word) => ({ word, right: true })), ...m.wrong.map((word) => ({ word, right: false }))]
  return all.map((w, i) => ({ w, k: (i * 7 + 3) % all.length })).sort((a, b) => a.k - b.k).map((x) => x.w)
}

/** The answer options of a quiz marked right or wrong (`correct` is an index, a list, or null). */
export const isCorrect = (q: Quiz, i: number): boolean =>
  Array.isArray(q.correct) ? q.correct.includes(i) : q.correct === i

/** A sort quiz's options in the right order (`correct` lists the option indices in order). */
export const sortedOptions = (q: Quiz): string[] =>
  Array.isArray(q.correct) ? q.correct.map((i) => q.options[i]) : q.options
