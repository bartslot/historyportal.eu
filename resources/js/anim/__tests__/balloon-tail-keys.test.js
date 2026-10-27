import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { animationTimeline } from '../timeline-panel.js'
import { frameAt } from '../scene-animation.js'
import { INTERPOLATE, propertyFor } from '../properties.js'

/**
 * A balloon's tail is ONE shape: its tip, where it leaves the outline and its bend key together.
 *
 * Bart, 2026-10-27, prod scene 1589 ("Wat betekent dat?"): "De staartvorming werkt niet bij het
 * animeren". He keyed the tip at 0 s and dragged the tail's root at 1.2 s. Keyed row by row, each
 * tail row held ONE key, a row with one key is a stored position, and the tail never moved in the
 * editor or the player.
 */

const BAL = 'bal:1'
const now = { tip_x: 46, tip_y: 41, root: 0.3, bend: -0.348 }

const panel = (tracks = []) => {
  const it = animationTimeline({ sceneId: 'scene-1589', tracks, targets: [], duration: 8 })
  it.$wire = { setTimeline: vi.fn(), changeBalloon: vi.fn() }
  return it
}

beforeEach(() => {
  window.__balloons = { value: (id, p) => now[p], patch: vi.fn() }
})

afterEach(() => { delete window.__balloons })

describe('keying a balloon tail', () => {
  it('a key on one tail row keys the whole tail at that time', () => {
    const p = panel()
    p.time = 0

    p.toggleKey(BAL, 'tip_x')

    for (const property of ['tip_x', 'tip_y', 'root', 'bend']) {
      expect(p.keysOf(BAL, property).map((k) => [k.time, k.value])).toEqual([[0, now[property]]])
    }
  })

  it('Bart\'s sequence: tip keyed at 0, root dragged at 1.2 s, and the tail moves', () => {
    const p = panel()
    p.time = 0
    p.toggleKey(BAL, 'tip_x')
    p.toggleKey(BAL, 'tip_y')

    p.time = 1.2
    p.recordCanvasEdit(BAL, { root: 0.5865 })

    const at = (t) => frameAt({ tracks: p.tracks }, t)[BAL] ?? {}
    expect(at(0).root).toBe(0.3)
    expect(at(1.2).root).toBe(0.5865)
    // The rest of the tail holds where it was, keyed at the same moments.
    expect(p.keysOf(BAL, 'tip_x').map((k) => k.time)).toEqual([0, 1.2])
    expect(at(1.2).bend).toBe(-0.348)
  })

  it('removing a key with the diamond does not put it straight back', () => {
    const p = panel()
    p.time = 0
    p.toggleKey(BAL, 'root')
    p.time = 2
    p.toggleKey(BAL, 'root')

    p.toggleKey(BAL, 'root')

    expect(p.keysOf(BAL, 'root').map((k) => k.time)).toEqual([0])
  })

  it('leaves other balloon rows, and other objects, keyed one row at a time', () => {
    const p = panel()
    p.time = 0

    p.toggleKey(BAL, 'x')

    expect(p.keysOf(BAL, 'y')).toEqual([])
    expect(p.keysOf(BAL, 'root')).toEqual([])
  })
})

describe('the root runs round the outline the short way', () => {
  it('from just before the top-left corner to just after it, through the corner', () => {
    const loop = INTERPOLATE[propertyFor('bal', 'root').interpolate]
    expect(loop(0.95, 0.05, 0.5)).toBeCloseTo(0, 6)
    expect(loop(0.95, 0.05, 0.25)).toBeCloseTo(0.975, 6)
    expect(loop(0.2, 0.4, 0.5)).toBeCloseTo(0.3, 6)
  })
})
