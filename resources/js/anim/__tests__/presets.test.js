import { describe, it, expect } from 'vitest'
import fixture from '../../../../tests/Fixtures/animations/expand.json'
import catalogue from '../../../animations/presets.json'
import { CLIPS, MOVE_MIN, applyClip, clipSpan, expandClip, legRoom, legShareOf } from '../presets.js'


describe('expandClip', () => {
  it('lays a clip out in scene seconds, the same as the server (shared fixture)', () => {
    expect(expandClip(fixture.clip, fixture.options)).toEqual(fixture.expected)
  })
  it('a figure whose legs are held to a shuffle (a long robe) travels and sinks only as far as its legs carry it', () => {
    const robe = { thigh_n: [-6, 6], shin_n: [0, 8] }
    expect(legRoom(robe)).toEqual({ travel: 12 / 45, sink: 8 / 120 })
    expect(legRoom({ thigh_n: [-25, 20], shin_n: [0, 120] })).toEqual({ travel: 1, sink: 1 })
    const full = expandClip(fixture.clip, fixture.options)
    const robed = expandClip(fixture.clip, { ...fixture.options, limits: robe })
    expect(Math.abs(robed.at(-1).x - 0.6)).toBeCloseTo(Math.abs(full.at(-1).x - 0.6) * 12 / 45, 3)
  })
  it('longer legs for the body travel further and sink deeper for the same turns', () => {
    const kit = [{ name: 'head', from: [260, 258], to: [301, 9] }, { name: 'thigh_n', from: [160, 607], to: [165, 984] }, { name: 'shin_n', from: [165, 984], to: [170, 1362] }, { name: 'foot_n', from: [170, 1362], to: [285, 1470] }]
    const share = legShareOf(kit)
    expect(share).toBeCloseTo(755 / 1461, 2)
    expect(legRoom({}, share).sink).toBeCloseTo(share / (607 / 1475), 3)
    expect(legShareOf([])).toBe(null)
  })
  it('a loop ends by settling into the drawn pose, not frozen mid-stride', () => {
    const keys = expandClip(fixture.clip, fixture.options)
    expect(keys.at(-1)).toEqual({ t: 3.7, 'bone:thigh_n': 0, 'bone:shin_n': 0, x: 0.5, y: 0 })
    expect(keys.at(-2).ease).toBe('smooth')
  })
  it('a bone the rig does not have is skipped, so one clip fits every rig', () => {
    expect(expandClip(fixture.clip, fixture.options).some((k) => 'bone:tail' in k)).toBe(false)
  })
  it('a loop fills its length with whole cycles; a move plays once at its pace', () => {
    expect(clipSpan({ loop: true, duration: 1 }, { length: 3.4 })).toEqual({ cycles: 3, cycle: 3.4 / 3 })
    expect(clipSpan({ loop: false, duration: 2 }, { speed: 2 })).toEqual({ cycles: 1, cycle: 1 })
  })
})

describe('applyClip', () => {
  const added = [{ t: 1, ease: 'smooth', 'bone:head': 5 }, { t: 2, 'bone:head': -5 }]
  it('takes over only the fields it moves, only in its stretch of time', () => {
    const keys = [{ t: 0, 'bone:head': 1 }, { t: 1.5, 'bone:head': 9, scale: 2 }, { t: 1.8, 'bone:head': 3 }, { t: 3, 'bone:head': 0 }]
    expect(applyClip(keys, added)).toEqual([{ t: 0, 'bone:head': 1 }, { t: 1, ease: 'smooth', 'bone:head': 5 }, { t: 1.5, scale: 2 }, { t: 2, 'bone:head': -5 }, { t: 3, 'bone:head': 0 }])
  })
  it('a clip in place leaves the teacher\'s own x keys exactly as they are; a walk replaces them', () => {
    const slide = [{ t: 0, x: 0.2 }, { t: 4, x: 0.6 }]
    const clip = [{ t: 1, x: 0.5, 'bone:head': 1, ease: 'smooth' }, { t: 2, x: 0.55, 'bone:head': 0 }]
    expect(applyClip(slide, clip, { inPlace: true }).filter((k) => 'x' in k)).toEqual(slide)
    expect(applyClip(slide, clip).filter((k) => 'x' in k).map((k) => k.x)).toEqual([0.2, 0.5, 0.55, 0.6])
    expect(applyClip(applyClip([], clip), clip).filter((k) => 'x' in k).map((k) => k.x)).toEqual([0.5, 0.55])   // added twice: no double distance
  })
  it('when it ends the figure shows the face it had before, not the clip\'s last one', () => {
    const faced = [{ t: 1, 'bone:head': 5, face: 'amazed' }, { t: 2, 'bone:head': 0 }]
    expect(applyClip([{ t: 0, face: 'sad', x: 0.1 }], faced).map((k) => k.face)).toEqual(['sad', 'amazed', 'sad'])
    expect(applyClip([], faced).pop().face).toBe('calm')
  })
  it('a clip that stays in place leaves the teacher\'s x keys alone', () => {
    const still = { id: 's', loop: false, duration: 1, travel: 0, keys: [{ t: 0, 'bone:head': 1, dx: 0, bob: 0 }, { t: 1, 'bone:head': 2, dx: MOVE_MIN / 2, bob: 0 }] }
    expect(expandClip(still, { bones: ['head'], xPerHeight: 1 }).some((k) => 'x' in k)).toBe(false)
  })
  it('leaves the keys it was given alone', () => {
    const keys = [{ t: 1, x: 0.2 }]
    applyClip(keys, added)
    expect(keys).toEqual([{ t: 1, x: 0.2 }])
  })
})

describe('the shipped presets', () => {
  it('every preset the picker lists has its clip', () => {
    expect(Object.keys(CLIPS).sort()).toEqual(catalogue.presets.map((p) => p.id).sort())
  })
  it('each is a clip the stage can play: keys from 0 to 1, turns in degrees, a loop closing on itself', () => {
    for (const clip of Object.values(CLIPS)) {
      expect(clip.keys[0].t).toBe(0)
      expect(clip.keys[clip.keys.length - 1].t).toBe(1)
      expect(clip.duration).toBeGreaterThan(0)
      if (clip.loop) {
        const bones = (k) => Object.fromEntries(Object.entries(k).filter(([f]) => f.startsWith('bone:')))
        expect(bones(clip.keys[clip.keys.length - 1])).toEqual(bones(clip.keys[0]))
      }
    }
  })
})
