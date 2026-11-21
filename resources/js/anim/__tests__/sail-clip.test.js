import { describe, it, expect } from 'vitest'
import { defaultSailSeconds, sailClip, storedSail, sailProgressAt } from '../sail-clip.js'

const camera = (end) => ({ tracks: [{ target: 'camera', property: 'zoom', keyframes: [{ time: 0, value: 1 }, { time: end, value: 4 }] }] })

describe('a voyage leg as a clip on the timeline', () => {
  it('sails two seconds a month by default, between 6 and 26', () => {
    expect(defaultSailSeconds('1272-04-01', '1272-08-10')).toBeCloseTo(8.6, 1)   // Hormuz, four months
    expect(defaultSailSeconds('1271-06-01', '1271-06-10')).toBe(6)
    expect(defaultSailSeconds('1275-01-01', '1290-01-01')).toBe(26)
    expect(defaultSailSeconds(undefined, undefined)).toBe(6)
  })

  it('sets off when the camera keys are done when nobody has placed it', () => {
    expect(sailClip(camera(4.1), { depart: '1272-04-01', arrive: '1272-08-10' })).toEqual({ start: 4.1, end: 12.71 })
    expect(sailClip({ tracks: [] }, { depart: '1271-06-01', arrive: '1271-06-10' })).toEqual({ start: 0, end: 6 })
  })

  it('plays the clip the teacher dragged, whatever the dates say', () => {
    const timeline = { ...camera(4.1), sail: { start: 2, end: 5.5 } }
    expect(sailClip(timeline, { depart: '1272-04-01', arrive: '1272-08-10' })).toEqual({ start: 2, end: 5.5 })
  })

  it('ignores a clip that is not one', () => {
    expect(storedSail({ sail: { start: 3, end: 3.1 } })).toBeNull()
    expect(storedSail({ sail: { start: -1, end: 3 } })).toBeNull()
    expect(storedSail({ sail: { start: 'a', end: 3 } })).toBeNull()
    expect(storedSail({})).toBeNull()
  })

  it('says how far the ship is at a moment of the scene', () => {
    const clip = { start: 2, end: 6 }
    expect(sailProgressAt(clip, 0)).toBe(0)
    expect(sailProgressAt(clip, 4)).toBe(0.5)
    expect(sailProgressAt(clip, 9)).toBe(1)
  })
})
