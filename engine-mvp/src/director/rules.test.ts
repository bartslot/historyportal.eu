// The rules measured from outside the director: with the ease the stage plays, the shot on screen at
// the cut, the sound events the schedule really makes, and real lessons from S4 (when present).
// Several cases come from the checker session's report (critiques/2026-10-27_check-director.md).
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { classActionSeconds, interactionSeconds, lessonSeconds, modelShotSeconds } from './timing'
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

  // one place all lesson long: no bed changes, so every counted cut comes from the foley top-up
  const SAME_PLACE: Lesson = { ...LESSON, scenes: LESSON.scenes.map((s) => ({ ...s, set: LESSON.scenes[0].set, narration: 'Hij loopt verder.', figures: LESSON.scenes[0].figures })) }

  for (const [name, lesson] of [['the fixture', LESSON], ['a one-place lesson (foley top-up)', SAME_PLACE]] as const) {
    it(`every counted J/L-cut really puts sound across the cut: ${name}`, () => {
      const d = direct(lesson, LIBRARY)
      const ev = schedule(d)
      const starts = sceneStarts(d)
      const counted = d.scenes.filter((s, i) => i > 0 && (s.sound!.lead_in_s > 0 || s.sound!.tail_s > 0))
      expect(counted.length).toBeGreaterThanOrEqual(2)
      d.scenes.forEach((s, i) => {
        if (i === 0 || !(s.sound!.lead_in_s > 0 || s.sound!.tail_s > 0)) return
        const cut = starts[i]
        const j = ev.some((e) => e.kind === 'bed-start' && e.t < cut - FADE_S / 2 - 0.01 && e.t > starts[i - 1] && !d.scenes[i - 1].sound!.ambience.some((a) => a.id === e.id))
          // or one of THIS scene's own sfx cued before its cut (a negative at_s): not any sfx that happens to be near
          || ev.some((e) => e.kind === 'sfx' && e.t < cut && e.t >= cut - 2 && s.sound!.sfx.some((x) => x.id === e.id && x.at_s < 0))
        const l = ev.some((e) => e.kind === 'bed-gain' && e.gain === 0 && e.t > cut - FADE_S / 2 + 0.01 && e.t < cut + 3 && !s.sound!.ambience.some((a) => a.id === e.id))
        expect(j || l, `cut into ${s.id}`).toBe(true)
      })
    })
  }

  it('the one-place lesson really takes the top-up path (no bed changes at all)', () => {
    const d = direct(SAME_PLACE, LIBRARY)
    d.scenes.slice(1).forEach((s, i) => expect(s.sound!.ambience).toEqual(d.scenes[i].sound!.ambience))
    expect(d.scenes.filter((s) => s.sound!.sfx.some((x) => x.at_s < 0)).length).toBeGreaterThanOrEqual(2)
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

  it('a locked camera on the peak: the native move goes to another climax, never to a turn', () => {
    const two = { ...LESSON, scenes: LESSON.scenes.map((s, i) => (i === 3 ? { ...s, beat: 'climax' as const } : s)) }
    const d = direct(two, LIBRARY)
    expect(d.scenes.findIndex((s) => s.camera?.native)).toBe(5) // the climax nearest 70 %
    const plain: Camera = { move: 'push', from: { x: 0, y: 1.6, z: 0, fov: 50 }, to: { x: 0, y: 1.6, z: 2, fov: 46 }, ease: 'inOut', dur_s: 8, at_s: 0 }
    const again = direct({ ...d, scenes: d.scenes.map((s, i) => (i === 5 ? { ...s, camera: plain } : s)) }, LIBRARY)
    expect(again.scenes[5].camera).toEqual(plain)
    expect(again.scenes.findIndex((s) => s.camera?.native)).toBe(3)
    expect(audit(again)).toEqual([])
    const only = direct({ ...direct(LESSON, LIBRARY), scenes: direct(LESSON, LIBRARY).scenes.map((s, i) => (i === 5 ? { ...s, camera: plain } : s)) }, LIBRARY)
    expect(only.scenes.filter((s) => s.camera?.native)).toEqual([]) // the only climax is the teacher's
    expect(audit(only)).toEqual([])
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
  it('no Dutch heath under Mesopotamia: a neutral bed, and the missing bed on the shopping list', () => {
    const abroad = { ...LESSON, scenes: LESSON.scenes.map((s, i) => ({ ...s, set: { ...s.set, sky: i === 2 ? 'sky noon' : 'sky morning !mesopotamia' } })) }
    expect(regionOf(abroad.scenes[0])).toBe('mesopotamia')
    const out = direct(abroad, LIBRARY)
    out.scenes.forEach((s) => {
      const ids = s.sound!.ambience.map((a) => a.id)
      expect(ids[0]).toBe('neutral-air') // sc03 has no tag: it inherits the place before it
      expect(ids).not.toContain('heath-wind'); expect(ids).not.toContain('heath-birds')
    })
    expect(out.needed_assets).toEqual([{ tags: 'ambience bed !mesopotamia', layer: 'sound', why: out.scenes.map((s) => s.id).join(' ') }])
    expect(direct(out, LIBRARY).needed_assets).toEqual(out.needed_assets) // a re-run does not pile up
  })

  it('at sea (!ocean) the sea beds play and nothing goes on the shopping list', () => {
    const l = { ...LESSON, bundle: 'nl-golden-age', scenes: LESSON.scenes.map((s) => ({ ...s, set: { ...s.set, sky: 'sky !ocean' } })) }
    const out = direct(l, LIBRARY)
    expect(out.scenes[0].sound!.ambience.map((a) => a.id)).toEqual(['sea-waves', 'rigging-creak'])
    expect(out.needed_assets ?? []).toEqual([])
  })

  it('scene.bundle overrides the lesson bundle for its ambience', () => {
    const l = { ...LESSON, scenes: LESSON.scenes.map((s, i) => (i === 2 ? { ...s, bundle: 'nl-golden-age' } : s)) }
    const out = direct(l, LIBRARY)
    expect(out.scenes[2].sound!.ambience[0].id).toBe('harbour-water')
    expect(out.scenes[1].sound!.ambience[0].id).toBe('heath-wind')
  })
})

// Real lessons from S4 (vault; HP_LESSONS_DIR overrides the path). Rules:
// - vault mounted: every lesson below MUST be there; a missing one FAILS (a renamed or split lesson
//   must be renamed here too, never skipped silently)
// - vault not mounted: skipped with a warning, except in CI (CI=1), where that fails too
const VAULT = process.env.HP_LESSONS_DIR ?? '/Users/bartslot/BartsAutomation/BartsDev/Memory/historyportal/topics/autonomous-lessons/lessons'
const REAL_LESSONS = ['eerste-boeren-1', 'eerste-boeren-2', 'hunebedden', 'voc']
const mounted = existsSync(VAULT)
describe('real lessons are where the tests expect them', () => {
  // a named test, so an unmounted vault shows up in the output and not only as "N skipped"
  it.runIf(!mounted && !process.env.CI)(`WARNING: no lesson vault at ${VAULT}, real-lesson tests SKIPPED`, () => {
    // vitest 4 swallows console output of passing tests: write past it
    process.stderr.write(`\n[rules.test] WARNING: lesson vault not found at ${VAULT}: real-lesson tests skipped\n`)
  })
  it.runIf(!mounted && !!process.env.CI)('CI has the lesson vault', () => expect(mounted, `no lesson vault at ${VAULT}`).toBe(true))
  it.runIf(mounted).each(REAL_LESSONS)('%s/lesson.json exists', (id) => expect(existsSync(`${VAULT}/${id}/lesson.json`), `${VAULT}/${id}/lesson.json missing`).toBe(true))
})

// S4's totals: live from tools/lessongen/validate.py when it is in this checkout (the integration
// branch), else the numbers S4 reported for feat/lessongen c7d302cc.
const VALIDATE = new URL('../../../tools/lessongen/validate.py', import.meta.url).pathname
const S4_TOTALS_C7D302CC: Record<string, number> = { 'eerste-boeren-1': 633, 'eerste-boeren-2': 577, hunebedden: 666, voc: 872 }
function s4Total(id: string, file: string): number {
  if (!existsSync(VALIDATE)) return S4_TOTALS_C7D302CC[id]
  const out = spawnSync('python3', [VALIDATE, file], { encoding: 'utf8' })
  const stats = JSON.parse(out.stdout.split('\n').find((l) => l.startsWith('{')) ?? 'null')
  if (!stats) throw new Error(`validate.py gave no stats for ${id}: ${out.stderr}`)
  return stats.total_s
}

for (const id of REAL_LESSONS) {
  const file = `${VAULT}/${id}/lesson.json`
  describe.skipIf(!existsSync(file))(`real lesson ${id}`, () => {
    const lesson = JSON.parse(existsSync(file) ? readFileSync(file, 'utf8') : '{"scenes":[]}') as Lesson
    const d = direct(lesson, null)
    const total = d.scenes.reduce((a, s) => a + s.dur_s!, 0)

    it('passes every rule', () => expect(audit(d)).toEqual([]))

    it('has the same length as S4\'s validate.py (one timing model, tools/lessongen/timing.json)', () => {
      const model = lesson.scenes.reduce((t, s) => t + modelShotSeconds(s) + classActionSeconds(s) + interactionSeconds(s), 0)
      expect(Math.round(model)).toBe(s4Total(id, file))
      // the director's own additions: a 1.2 s silence or balloons that need longer than the line; nothing else
      const extras = d.scenes.map((s, i) => s.dur_s! - modelShotSeconds(lesson.scenes[i]) - classActionSeconds(lesson.scenes[i]))
      extras.forEach((x, i) => {
        expect(x).toBeGreaterThanOrEqual(-0.01)
        if (x > 0.01) expect(!!d.scenes[i].sound!.silence || !!d.scenes[i].balloons?.length, d.scenes[i].id).toBe(true)
      })
      expect(lessonSeconds(d)).toBeCloseTo(model + extras.reduce((a, b) => a + b, 0), 1)
      expect(lessonSeconds(d) - model).toBeLessThan(model * 0.03)
    })

    it('does not shoot one beat the same way every time', () => {
      const byBeat = new Map<string, Set<string>>()
      d.scenes.forEach((s) => byBeat.set(s.beat, (byBeat.get(s.beat) ?? new Set()).add(s.camera!.move)))
      for (const [beat, moves] of byBeat) {
        const n = d.scenes.filter((s) => s.beat === beat && !s.camera!.native).length
        if (n >= 3) expect(moves.size, beat).toBeGreaterThanOrEqual(n >= 6 ? 3 : 2)
      }
    })

    it('silences scale with length: one in every full 3-minute window (never bunched), never two within 60 s', () => {
      const starts = sceneStarts(d)
      const at = d.scenes.map((s, i) => (s.sound!.silence ? starts[i] : -1)).filter((t) => t >= 0)
      expect(at.length).toBeGreaterThanOrEqual(Math.max(2, Math.floor(total / 180)))
      at.slice(1).forEach((t, k) => expect(t - at[k]).toBeGreaterThanOrEqual(60))
      // every full window, measured on the real starts (silences shift the clock a little: 15 s slack)
      for (let w = 0; (w + 1) * 180 <= total; w++) expect(at.some((t) => t >= w * 180 - 15 && t < (w + 1) * 180 + 15), `window ${w * 3}-${w * 3 + 3} min`).toBe(true)
      d.scenes.forEach((s) => { if (s.beat === 'hook') expect(s.sound!.silence).toBeNull() })
    })

    it('varies the shot scale: all three used, never two of one scale in a row', () => {
      const all = d.scenes.flatMap(shots)
      expect(new Set(all.map((c) => c.scale))).toEqual(new Set(['wide', 'medium', 'close']))
      all.slice(1).forEach((c, k) => { if (!c.native && !all[k].native) expect(c.scale).not.toBe(all[k].scale) })
    })

    it('never repeats a pair of moves (A B A B) and rarely a triple (A B C A B C)', () => {
      const seq = d.scenes.flatMap(shots).map((c) => c.move)
      seq.slice(3).forEach((m, k) => expect(seq[k] === seq[k + 2] && seq[k + 1] === m, seq.slice(k, k + 4).join(' ')).toBe(false))
      const triples = seq.slice(5).filter((m, k) => seq[k] === seq[k + 3] && seq[k + 1] === seq[k + 4] && seq[k + 2] === m).length
      expect(triples / seq.length).toBeLessThan(0.05) // only where a locked camera or the native move forces it
    })

    it('the native move only on a climax, exactly once when there is one', () => {
      const natives = d.scenes.filter((s) => s.camera?.native)
      expect(natives.map((s) => s.beat)).toEqual(d.scenes.some((s) => s.beat === 'climax') ? ['climax'] : [])
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
  // fails on feat/studio-25d 8717525c (stage played sc04 for 7.3 s), passes from 03f3f12f on
  it('plays a split scene to its full length and every shot in turn, with the sound in sync', async () => {
    const { sceneDuration, shotAt } = await import('../stage25d/layout')
    const d = direct(LESSON, LIBRARY)
    const s = d.scenes[3]
    expect(s.camera_more!.length).toBeGreaterThan(0)
    expect(sceneDuration(s as never)).toBeCloseTo(s.dur_s!, 2) // 14.6 s, not the first shot's 7.3
    expect(shotAt(s as never, s.dur_s! - 0.5).cam).toBe(s.camera_more!.at(-1))
    let t = 0
    const stageStarts = d.scenes.map((x) => { const at = t; t += sceneDuration(x as never); return at })
    sceneStarts(d).forEach((at, i) => expect(at).toBeCloseTo(stageStarts[i], 2)) // the sound clock = the picture clock
  })
})

describe('timing model source', () => {
  it('reads tools/lessongen/timing.json, and HP_TIMING_JSON replaces it', async () => {
    const { vi } = await import('vitest')
    const { writeFileSync, mkdtempSync } = await import('node:fs')
    const shared = JSON.parse(readFileSync(new URL('../../../tools/lessongen/timing.json', import.meta.url), 'utf8'))
    const t1 = await import('./timing')
    expect(t1.WORDS_PER_S).toBe(shared.narration.words_per_s)
    const dir = mkdtempSync('/tmp/hp-timing-')
    writeFileSync(`${dir}/timing.json`, JSON.stringify({ ...shared, narration: { ...shared.narration, words_per_s: 1 } }))
    vi.resetModules()
    process.env.HP_TIMING_JSON = `${dir}/timing.json`
    try {
      const t2 = await import('./timing')
      expect(t2.WORDS_PER_S).toBe(1)
      expect(t2.modelShotSeconds({ ...LESSON.scenes[0], narration: 'een twee drie vier vijf zes zeven acht' })).toBeCloseTo(8.6, 5)
    } finally {
      delete process.env.HP_TIMING_JSON
      vi.resetModules()
    }
  })
})
