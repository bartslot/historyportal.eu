// A directed lesson's sound as a flat list of timed events, lesson time in seconds. Pure, so the rules
// (crossfades, J/L-cuts, ducking, silences) are tested without a browser; player.ts only applies it.
import { narrationSeconds } from '../director/timing'
import type { Lesson } from '../director/types'

export const FADE_S = 1.5
/** A near-silence is not zero: the place stays, barely. */
export const SILENCE_GAIN = 0.12

export type SoundEvent =
  | { t: number; kind: 'bed-start'; id: string; stop: number }
  | { t: number; kind: 'bed-gain'; id: string; gain: number; ramp: number }
  | { t: number; kind: 'sfx'; id: string; gain: number }
  | { t: number; kind: 'amb-bus'; gain: number; ramp: number; why: 'duck' | 'unduck' | 'silence' | 'after-silence' }

export const dbToGain = (db: number): number => 10 ** (db / 20)

/** Lesson time at which each scene starts. */
export const sceneStarts = (lesson: Lesson): number[] => {
  let t = 0
  return lesson.scenes.map((s) => { const at = t; t += s.dur_s ?? narrationSeconds(s); return at })
}

export function schedule(lesson: Lesson): SoundEvent[] {
  const starts = sceneStarts(lesson)
  const end = (i: number) => starts[i] + (lesson.scenes[i].dur_s ?? 0)
  const ev: SoundEvent[] = []

  // Beds: one looping source per run of consecutive scenes that use it; gain follows each scene.
  const beds = new Set(lesson.scenes.flatMap((s) => s.sound?.ambience.map((a) => a.id) ?? []))
  for (const id of beds) {
    let i = 0
    while (i < lesson.scenes.length) {
      if (!lesson.scenes[i].sound?.ambience.some((a) => a.id === id)) { i++; continue }
      const first = i
      while (i < lesson.scenes.length && lesson.scenes[i].sound?.ambience.some((a) => a.id === id)) i++
      const last = i - 1
      const lead = first > 0 ? lesson.scenes[first].sound?.lead_in_s ?? 0 : 0
      const inAt = Math.max(0, starts[first] - lead - (first > 0 ? FADE_S / 2 : 0))
      const tail = lesson.scenes[last + 1]?.sound?.tail_s ?? 0
      const outAt = end(last) + tail - (last + 1 < lesson.scenes.length ? FADE_S / 2 : 0)
      ev.push({ t: inAt, kind: 'bed-start', id, stop: outAt + FADE_S })
      for (let k = first; k <= last; k++) {
        const gain = lesson.scenes[k].sound!.ambience.find((a) => a.id === id)!.gain
        ev.push({ t: k === first ? inAt : starts[k], kind: 'bed-gain', id, gain, ramp: k === first ? (first === 0 ? 0.3 : FADE_S) : FADE_S })
      }
      ev.push({ t: outAt, kind: 'bed-gain', id, gain: 0, ramp: FADE_S })
    }
  }

  // Per scene: silence, ducking under the narrator, SFX at cue times (negative = before the cut).
  lesson.scenes.forEach((s, i) => {
    const t0 = starts[i]
    const plan = s.sound
    if (!plan) return
    const talkAt = t0 + (s.narration_at_s ?? 0)
    const duck = dbToGain(plan.duck_db)
    if (plan.silence) {
      ev.push({ t: t0 + plan.silence.at_s, kind: 'amb-bus', gain: SILENCE_GAIN, ramp: 0.4, why: 'silence' })
      ev.push({ t: t0 + plan.silence.at_s + plan.silence.dur_s, kind: 'amb-bus', gain: duck, ramp: 0.15, why: 'after-silence' })
    } else ev.push({ t: talkAt, kind: 'amb-bus', gain: duck, ramp: 0.25, why: 'duck' })
    ev.push({ t: talkAt + narrationSeconds(s), kind: 'amb-bus', gain: 1, ramp: 0.6, why: 'unduck' })
    for (const x of plan.sfx) ev.push({ t: Math.max(0, t0 + x.at_s), kind: 'sfx', id: x.id, gain: x.gain ?? 1 })
  })
  return ev.sort((a, b) => a.t - b.t)
}
