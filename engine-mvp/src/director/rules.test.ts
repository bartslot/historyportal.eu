// The rules measured from outside the director: with the ease the stage plays, the shot on screen at
// the cut, the sound events the schedule really makes, and real lessons from S4 (when present).
// Several cases come from the checker session's report (critiques/2026-10-27_check-director.md).
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { direct } from './direct'
import { audit } from './audit'
import { regionOf } from './cues'
import { LESSON, LIBRARY } from './fixture'
import { FADE_S, schedule, sceneStarts } from '../sound/schedule'
import { ease as stageEase } from '../stage25d/layout'
import type { Ease } from '../stage25d/types'
import type { Camera, Lesson, Scene } from './types'

const shots = (s: Scene) => [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as Camera[]

describe('rules on the stage', () => {
  it('a long hook is still more than half done at 3 s with the sine ease the stage plays', () => {
    for (const est of [7, 9, 11, 14]) {
      const l: Lesson = { ...LESSON, scenes: LESSON.scenes.map((s, i) => (i === 0 ? { ...s, est_s: est } : s)) }
      const hook = direct(l, LIBRARY).scenes[0].camera!
      expect(stageEase(hook.ease as Ease, 3 / hook.dur_s)).toBeGreaterThan(0.5)
    }
  })

  it('never cuts from a move into the same move, counting the last shot of a split scene', () => {
    const d = direct(LESSON, LIBRARY)
    d.scenes.slice(1).forEach((s, i) => expect(s.camera!.move).not.toBe(shots(d.scenes[i]).at(-1)!.move))
  })

  it('every counted J/L-cut really puts sound across the cut', () => {
    const d = direct(LESSON, LIBRARY)
    const ev = schedule(d)
    const starts = sceneStarts(d)
    d.scenes.forEach((s, i) => {
      if (i === 0 || !(s.sound!.lead_in_s > 0 || s.sound!.tail_s > 0)) return
      const cut = starts[i]
      const j = ev.some((e) => e.kind === 'bed-start' && e.t < cut - FADE_S / 2 - 0.01 && e.t > starts[i - 1] && !d.scenes[i - 1].sound!.ambience.some((a) => a.id === e.id))
        || ev.some((e) => e.kind === 'sfx' && e.t < cut && e.t >= cut - 2)
      const l = ev.some((e) => e.kind === 'bed-gain' && e.gain === 0 && e.t > cut - FADE_S / 2 + 0.01 && e.t < cut + 3 && !s.sound!.ambience.some((a) => a.id === e.id))
      expect(j || l, `cut into ${s.id}`).toBe(true)
    })
  })
})

describe('short lessons and teacher edits', () => {
  it('a one-scene lesson: no impossible minimums, hook ok', () => {
    const out = direct({ ...LESSON, scenes: [LESSON.scenes[0]] }, LIBRARY)
    expect(audit(out)).toEqual([])
    expect(out.scenes[0].sound!.silence).toBeNull()
  })

  it('a locked camera that copies the next move: the next scene picks another', () => {
    const d = direct(LESSON, LIBRARY)
    const next = d.scenes[3].camera!.move
    const edited = { ...d, scenes: d.scenes.map((s, i) => (i === 2 ? { ...s, camera: { ...d.scenes[3].camera!, at_s: 0, dur_s: 6, why: 'teacher', move: next } } : s)) }
    const again = direct(edited, LIBRARY)
    expect(again.scenes[2].camera!.why).toBe('teacher')
    expect(audit(again).filter((p) => p.includes('cut came out of'))).toEqual([])
  })

  it('a locked camera on the peak: the native move goes to the next candidate', () => {
    const d = direct(LESSON, LIBRARY)
    const plain: Camera = { move: 'push', from: { x: 0, y: 1.6, z: 0, fov: 50 }, to: { x: 0, y: 1.6, z: 2, fov: 46 }, ease: 'inOut', dur_s: 8, at_s: 0 }
    const again = direct({ ...d, scenes: d.scenes.map((s, i) => (i === 5 ? { ...s, camera: plain } : s)) }, LIBRARY)
    expect(again.scenes[5].camera).toEqual(plain)
    expect(again.scenes.filter((s) => s.camera?.native).map((s) => s.beat)).toEqual(['turn'])
    expect(audit(again)).toEqual([])
  })

  it('a teacher edit stays theirs on every later run, not only the next one', () => {
    const d = direct(LESSON, LIBRARY)
    const edited = { ...d, scenes: d.scenes.map((s, i) => (i === 2 ? { ...s, camera: { ...s.camera!, why: 'teacher' }, dur_s: 20 } : s)) }
    const twice = direct(direct(edited, LIBRARY), LIBRARY)
    const third = direct({ ...twice, scenes: twice.scenes.map((s, i) => (i === 1 ? { ...s, beat: 'cause' as const } : s)) }, LIBRARY)
    for (const l of [twice, third]) { expect(l.scenes[2].camera!.why).toBe('teacher'); expect(l.scenes[2].dur_s).toBe(20) }
  })

  it('a balloon the teacher adds gets a time after the ones already there', () => {
    const d = direct(LESSON, LIBRARY)
    const s1 = d.scenes[1]
    const moved = { ...s1.balloons![0], at_s: 3 } // the teacher also moved the first one
    const edited = { ...d, scenes: d.scenes.map((s, i) => (i === 1 ? { ...s, balloons: [moved, { char: 'boer-vrouw', text: 'Naar het water, waar anders.' }] } : s)) }
    const b = direct(edited, LIBRARY).scenes[1].balloons!
    expect(b[0].at_s).toBe(3)
    expect(b[1].at_s!).toBeGreaterThanOrEqual(3 + b[0].dur_s! + 0.35 - 0.01)
    expect(audit(direct(edited, LIBRARY)).filter((p) => p.startsWith('balloon'))).toEqual([])
  })
})

describe('place-aware sound', () => {
  it('reads the !region tag and leaves the Dutch-only beds out abroad', () => {
    const abroad = { ...LESSON, scenes: LESSON.scenes.map((s) => ({ ...s, set: { ...s.set, sky: 'sky morning !mesopotamia' } })) }
    expect(regionOf(abroad.scenes[0])).toBe('mesopotamia')
    const out = direct(abroad, LIBRARY)
    out.scenes.forEach((s) => expect(s.sound!.ambience.map((a) => a.id)).not.toContain('heath-birds'))
    expect(out.scenes[0].sound_note).toBeTruthy()
  })
})

// Real lessons from S4 (vault). Skipped where the vault is not on this machine.
const VAULT = '/Users/bartslot/BartsAutomation/BartsDev/Memory/historyportal/topics/autonomous-lessons/lessons'
for (const id of ['eerste-boeren', 'hunebedden', 'voc']) {
  const file = `${VAULT}/${id}/lesson.json`
  describe.skipIf(!existsSync(file))(`real lesson ${id}`, () => {
    const lesson = JSON.parse(existsSync(file) ? readFileSync(file, 'utf8') : '{"scenes":[]}') as Lesson
    const d = direct(lesson, null)
    const total = d.scenes.reduce((a, s) => a + s.dur_s!, 0)

    it('passes every rule', () => expect(audit(d)).toEqual([]))

    it('does not shoot one beat the same way every time', () => {
      const byBeat = new Map<string, Set<string>>()
      d.scenes.forEach((s) => byBeat.set(s.beat, (byBeat.get(s.beat) ?? new Set()).add(s.camera!.move)))
      for (const [beat, moves] of byBeat) {
        const n = d.scenes.filter((s) => s.beat === beat && !s.camera!.native).length
        if (n >= 3) expect(moves.size, beat).toBeGreaterThanOrEqual(n >= 6 ? 3 : 2)
      }
    })

    it('scales the silences with length: about one per 2.5 minutes', () => {
      expect(d.scenes.filter((s) => s.sound!.silence).length).toBeGreaterThanOrEqual(Math.max(2, Math.round(total / 150) - 1))
    })

    it('does not flip the ambience on most cuts', () => {
      const swaps = d.scenes.slice(1).filter((s, i) => s.sound!.ambience.map((a) => a.id).join() !== d.scenes[i].sound!.ambience.map((a) => a.id).join()).length
      expect(swaps / (d.scenes.length - 1)).toBeLessThan(0.3)
    })

    it('every split scene is longer than its first shot (stage must play dur_s, see docs)', () => {
      d.scenes.filter((s) => s.camera_more?.length).forEach((s) => expect(s.dur_s!).toBeGreaterThan(s.camera!.dur_s))
    })
  })
}

describe('with the stage (S1)', () => {
  it('plays a split scene to its full length and every shot in turn', async () => {
    const { sceneDuration, shotAt } = await import('../stage25d/layout')
    const s = direct(LESSON, LIBRARY).scenes[3]
    expect(sceneDuration(s as never)).toBeCloseTo(s.dur_s!, 2)
    expect(shotAt(s as never, s.dur_s! - 0.5).cam).toBe(s.camera_more!.at(-1))
  })
})
