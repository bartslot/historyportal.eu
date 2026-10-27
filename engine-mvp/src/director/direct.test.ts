import { describe, expect, it } from 'vitest'
import { direct } from './direct'
import { audit, progressAt, HOOK_S } from './audit'
import { readTime } from './timing'
import { DEPTH_Z } from './camera'
import { LESSON, LIBRARY } from './fixture'
import type { Camera, Lesson } from './types'

const directed = direct(LESSON, LIBRARY)
const cams = (l: Lesson) => l.scenes.flatMap((s) => [s.camera, ...(s.camera_more ?? [])]) as Camera[]

describe('direct()', () => {
  it('passes every director rule on a plain lesson', () => {
    expect(audit(directed)).toEqual([])
  })

  it('never changes its input', () => {
    const copy = structuredClone(LESSON)
    direct(LESSON, LIBRARY)
    expect(LESSON).toEqual(copy)
  })

  it('hooks inside 3 s: the opening move starts at 0 and is mostly done by 3 s', () => {
    const c = directed.scenes[0].camera!
    expect(c.at_s).toBe(0)
    expect(progressAt(c, HOOK_S)).toBeGreaterThan(0.5)
    expect(directed.scenes[0].sound!.silence).toBeNull()
  })

  it('uses at least 4 kinds of move and never repeats a move across a cut', () => {
    expect(new Set(cams(directed).map((c) => c.move)).size).toBeGreaterThanOrEqual(4)
    const firsts = directed.scenes.map((s) => s.camera!.move)
    firsts.slice(1).forEach((m, i) => expect(m).not.toBe(firsts[i]))
  })

  it('only the native move passes through the foreground plane', () => {
    cams(directed).filter((c) => !c.native).forEach((c) => expect(Math.max(c.from.z, c.to.z)).toBeLessThan(DEPTH_Z.fg))
    expect(directed.scenes.find((s) => s.camera?.native)!.camera!.to.z).toBeGreaterThan(DEPTH_Z.fg)
  })

  it('puts the one native move on the climax', () => {
    const natives = directed.scenes.filter((s) => s.camera?.native)
    expect(natives.map((s) => s.beat)).toEqual(['climax'])
    expect(natives[0].sound!.sfx.map((s) => s.id)).toContain('ink-whoosh')
  })

  it('finds a peak without a climax beat', () => {
    const l = { ...LESSON, scenes: LESSON.scenes.map((s) => ({ ...s, beat: s.beat === 'climax' ? 'effect' as const : s.beat })) }
    const out = direct(l, LIBRARY)
    expect(out.scenes.filter((s) => s.camera?.native).map((s) => s.beat)).toEqual(['turn'])
    expect(audit(out)).toEqual([])
  })

  it('places two silences, before the turn and the peak, with the narrator waiting', () => {
    const silent = directed.scenes.filter((s) => s.sound?.silence)
    expect(silent.map((s) => s.beat)).toEqual(['turn', 'climax'])
    silent.forEach((s) => expect(s.narration_at_s).toBe(s.sound!.silence!.dur_s))
  })

  it('carries sound over at least two cuts (J/L)', () => {
    const cuts = directed.scenes.slice(1).filter((s) => s.sound!.lead_in_s > 0 || s.sound!.tail_s > 0)
    expect(cuts.length).toBeGreaterThanOrEqual(2)
  })

  it('holds balloons for letters/15 + 1.5 s, one after another, after the first sentence', () => {
    const s = directed.scenes[3]
    const [a, b] = s.balloons!
    expect(a.dur_s).toBeCloseTo(readTime(a.text), 2)
    expect(readTime('Ja, ja.')).toBeCloseTo(4 / 15 + 1.5, 5)
    expect(b.at_s!).toBeGreaterThanOrEqual(a.at_s! + a.dur_s! + 0.35 - 0.01)
    expect(a.at_s!).toBeGreaterThan(0)
  })

  it('cuts a long scene into shots of 6-12 s', () => {
    const s = directed.scenes[3] // 14 s of narration
    const shots = [s.camera!, ...s.camera_more!]
    expect(shots.length).toBe(2)
    shots.forEach((c) => { expect(c.dur_s).toBeGreaterThanOrEqual(6); expect(c.dur_s).toBeLessThanOrEqual(12) })
  })

  it('times shots from real TTS timings when present', () => {
    const l = { ...LESSON, scenes: LESSON.scenes.map((s, i) => (i === 1 ? { ...s, timings: { duration_s: 11.5 } } : s)) }
    expect(direct(l, LIBRARY).scenes[1].dur_s).toBeGreaterThan(11.5)
  })

  it('eases by intent, never linear', () => {
    cams(directed).forEach((c) => expect(c.ease).not.toBe('linear'))
    directed.scenes.flatMap((s) => s.motion ?? []).flatMap((t) => t.keyframes).forEach((k) => expect(k.easing).not.toBe('linear'))
    expect(directed.scenes[0].camera!.curve).toBe('easeOutQuart')
    cams(directed).forEach((c) => expect(['in', 'out', 'inOut']).toContain(c.ease)) // the stage's names
    expect(directed.scenes[0].camera!.ease).toBe('out')
  })

  it('moves the set: the oak sways, figures never move in step', () => {
    expect(directed.scenes[0].set.layers[2].motion).toMatchObject({ kind: 'sway' })
    expect(directed.scenes[0].set.layers[0].motion).toBeUndefined() // far heath: nothing to move
    const bobs = directed.scenes[2].motion!.filter((t) => t.target.startsWith('figure:'))
    expect(bobs.length).toBe(2)
    expect(bobs[0].keyframes[1].time).not.toBe(bobs[1].keyframes[1].time)
  })

  it('picks the bundle base bed plus a matching bed (fire at the hearth)', () => {
    expect(directed.scenes[0].sound!.ambience[0].id).toBe('heath-wind')
    expect(directed.scenes[3].sound!.ambience.map((a) => a.id)).toEqual(['heath-wind', 'camp-fire'])
    expect(directed.scenes[5].sound!.sfx.map((s) => s.id)).toContain('meter-rise')
  })

  it('keeps a teacher edit made by path (the stage editor keeps no marks)', () => {
    const s2 = directed.scenes[2]
    const edited = { ...directed, scenes: directed.scenes.map((s, i) => (i === 2 ? {
      ...s, camera: { ...s2.camera!, from: { ...s2.camera!.from, x: 9 } }, dur_s: 20,
      set: { ...s.set, layers: s.set.layers.map((l, k) => (k === 2 ? { ...l, motion: { kind: 'sway', amount: 3, speed: 1 } } : l)) },
    } : s)) }
    const again = direct(edited, LIBRARY).scenes[2]
    expect(again.camera!.from.x).toBe(9)
    expect(again.dur_s).toBe(20)
    expect(again.set.layers[2].motion).toEqual({ kind: 'sway', amount: 3, speed: 1 })
    expect(direct(directed, LIBRARY)).toEqual(directed) // untouched: a re-run proposes the same
  })

  it('keeps what the teacher changed on a re-run', () => {
    const teacherCam: Camera = { move: 'pan', from: { x: 0, y: 1.6, z: 0, fov: 50 }, to: { x: 1, y: 1.6, z: 0, fov: 50 }, ease: 'easeInOutCubic', dur_s: 7 }
    const edited = { ...directed, scenes: directed.scenes.map((s, i) => (i === 2 ? { ...s, camera: teacherCam, sound: { ...s.sound!, by: undefined, ambience: [] } } : s)) }
    const again = direct(edited, LIBRARY)
    expect(again.scenes[2].camera).toEqual(teacherCam)
    expect(again.scenes[2].sound!.ambience).toEqual([])
    expect(again.scenes[0].camera).toEqual(directed.scenes[0].camera) // stable: same input, same proposal
  })
})

describe('shotAt()', () => {
  it('hands the stage the shot playing at t, on its own clock', async () => {
    const { shotAt } = await import('./camera')
    const s = directed.scenes[3]
    expect(shotAt(s, 1).cam).toBe(s.camera)
    const late = shotAt(s, s.dur_s! - 1)
    expect(late.cam).toBe(s.camera_more![0])
    expect(late.t).toBeCloseTo(s.dur_s! - 1 - s.camera_more![0].at_s!, 5)
  })
})
