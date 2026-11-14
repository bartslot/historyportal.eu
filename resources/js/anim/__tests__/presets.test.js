import { describe, it, expect } from 'vitest'
import fixture from '../../../../tests/Fixtures/animations/expand.json'
import catalogue from '../../../animations/presets.json'
import { CLIPS, MOVE_MIN, applyClip, clipSpan, expandClip, legRoom } from '../presets.js'


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
