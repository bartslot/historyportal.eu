import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { keyStateAt, toggleKeyframe, baseOf } from '../keyframes.js'
import { INTERPOLATE, sampleFrame } from '../properties.js'
import { animationTimeline } from '../timeline-panel.js'
import { frameAt, applyFrameTo, hasAnimation } from '../scene-animation.js'
import { fieldToValue, valueToField } from '../../ui/keyed-fields.js'

/**
 * Keyframing a property from the diamond after it (Bart, 2026-10-16: "the whole functionality is
 * missing"): the diamond toggles a key at the playhead, an edit on an animated property becomes a
 * keyframe, Reset takes the property back to what it was, undo hands the panel the restored
 * tracks, and the player samples the same tracks.
 */

const ART = 'art:7'
const track = (keyframes, extra = {}) => ({ target: ART, property: 'x', keyframes, ...extra })

describe('the diamond state at a moment', () => {
  it('is none without keys, here on a key, elsewhere between keys', () => {
    expect(keyStateAt(null, 0)).toBe('none')
    expect(keyStateAt(track([]), 0)).toBe('none')
    const t = track([{ time: 0, value: 10 }, { time: 3, value: 60 }])
    expect(keyStateAt(t, 0)).toBe('here')
    expect(keyStateAt(t, 3 + 1e-9)).toBe('here')
    expect(keyStateAt(t, 1.5)).toBe('elsewhere')
  })
})

describe('toggleKeyframe', () => {
  it('adds a key at the time, and records the un-keyed value as base on the first one', () => {
    const t = toggleKeyframe(track([]), 0, 25)
    expect(t.keyframes).toEqual([{ time: 0, value: 25 }])
    expect(t.base).toBe(25)
  })

  it('keeps the first base when a later key is added', () => {
    const t = toggleKeyframe(toggleKeyframe(track([]), 0, 25), 3, 80)
    expect(t.keyframes.map((k) => [k.time, k.value])).toEqual([[0, 25], [3, 80]])
    expect(t.base).toBe(25)
  })

  it('removes the key under the time instead of adding a second one', () => {
    const t = toggleKeyframe(track([{ time: 0, value: 25 }, { time: 3, value: 80 }], { base: 25 }), 3, 99)
    expect(t.keyframes).toEqual([{ time: 0, value: 25 }])
  })

  it('never mutates the track it is given', () => {
    const before = track([{ time: 0, value: 25 }])
    toggleKeyframe(before, 2, 40)
    expect(before.keyframes).toHaveLength(1)
  })

  it('falls back to the first key as base for a track saved before base existed', () => {
    expect(baseOf(track([{ time: 2, value: 9 }, { time: 0, value: 4 }]))).toBe(4)
    expect(baseOf(track([], { base: 1 }))).toBe(1)
    expect(baseOf(null)).toBeNull()
  })
})

describe('interpolation between two keys', () => {
  it('eases a single segment in and out (never linear by default): halfway in time is halfway in value', () => {
    const frame = sampleFrame([track([{ time: 0, value: 0 }, { time: 3, value: 60 }])], 1.5)
    expect(frame[ART].x).toBeCloseTo(30, 6)
    // eased, so a quarter of the way in time is well short of a quarter of the way in value
    expect(sampleFrame([track([{ time: 0, value: 0 }, { time: 3, value: 60 }])], 0.75)[ART].x).toBeLessThan(15)
  })

  it('mixes colours per channel, and cuts when one side has no colour', () => {
    expect(INTERPOLATE.color('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(INTERPOLATE.color('#ff0000', '#0000ff', 0)).toBe('#ff0000')
    expect(INTERPOLATE.color('', '#0000ff', 0.5)).toBe('')
    expect(INTERPOLATE.color('', '#0000ff', 1)).toBe('#0000ff')
  })
})

// ── The Timeline component, driven as a plain object (as timeline-panel.test.js does) ──

const panel = (tracks = []) => {
  const p = animationTimeline({ sceneId: 'keying', tracks, targets: [], duration: 8 })
  p.$wire = { setTimeline: vi.fn(), updateArtworkLayer: vi.fn() }
  return p
}

let layer
beforeEach(() => {
  layer = { asset_id: 7, x: 25, y: 50, tint: '' }
  window.__lessonArtworkLayer = { _layers: [layer] }
  window.__setLayerProp = vi.fn((id, property, value) => { layer[property] = value })
  window.dispatchEvent = vi.fn()
})
afterEach(() => {
  delete window.__lessonArtworkLayer
  delete window.__setLayerProp
  vi.restoreAllMocks()
})

describe('pressing a property diamond', () => {
  it('keys the current value at the playhead, then removes that key on the second press', () => {
    const p = panel()
    p.time = 0
    p.toggleKey(ART, 'x')
    expect(p.keyState(ART, 'x')).toBe('here')
    expect(p.trackFor(ART, 'x').base).toBe(25)

    p.time = 3
    expect(p.keyState(ART, 'x')).toBe('elsewhere')
    p.toggleKey(ART, 'x')
    p.toggleKey(ART, 'x')
    expect(p.keysOf(ART, 'x').map((k) => k.time)).toEqual([0])
    expect(p.$wire.setTimeline).toHaveBeenCalled()
  })

  it('keys a colour as a colour', () => {
    layer.tint = '#112233'
    const p = panel()
    p.toggleKey(ART, 'tint')
    expect(p.keysOf(ART, 'tint')[0].value).toBe('#112233')
  })
})

describe('editing an animated property from the Format panel', () => {
  it('is refused on a property with no keys, so the panel saves the plain value', () => {
    expect(panel().editKeyed(ART, 'x', 40)).toBe(false)
  })

  it('updates the key under the playhead', () => {
    const p = panel([track([{ time: 0, value: 25 }, { time: 3, value: 80 }], { base: 25 })])
    p.time = 3
    expect(p.editKeyed(ART, 'x', 90)).toBe(true)
    expect(p.keysOf(ART, 'x').map((k) => [k.time, k.value])).toEqual([[0, 25], [3, 90]])
  })

  it('adds a key between keys (After Effects)', () => {
    const p = panel([track([{ time: 0, value: 25 }, { time: 3, value: 80 }], { base: 25 })])
    p.time = 1.5
    p.editKeyed(ART, 'x', 10)
    expect(p.keysOf(ART, 'x').map((k) => [k.time, k.value])).toEqual([[0, 25], [1.5, 10], [3, 80]])
    expect(layer.x).toBe(10)
  })
})

describe('Reset', () => {
  it('restores the value before keying, clears the keys and saves the layer value', () => {
    const p = panel([track([{ time: 0, value: 30 }, { time: 3, value: 80 }], { base: 25 })])
    layer.x = 61   // somewhere along the animation
    expect(p.canReset(ART, 'x')).toBe(true)

    p.resetProperty(ART, 'x')

    expect(p.trackFor(ART, 'x')).toBeNull()
    expect(p.canReset(ART, 'x')).toBe(false)
    expect(layer.x).toBe(25)
    expect(p.$wire.updateArtworkLayer).toHaveBeenCalledWith(7, 'x', 25)
    expect(p.$wire.setTimeline).toHaveBeenLastCalledWith(expect.objectContaining({ tracks: [] }))
  })

  it('Reset all takes every property of the layer back in one save', () => {
    const p = panel([
      track([{ time: 0, value: 30 }, { time: 3, value: 80 }], { base: 25 }),
      { target: ART, property: 'y', base: 50, keyframes: [{ time: 0, value: 10 }] },
      { target: 'art:8', property: 'x', keyframes: [{ time: 0, value: 1 }] },
    ])
    p.resetObject(ART)
    expect(p.tracks.map((t) => t.target)).toEqual(['art:8'])
    expect(layer.y).toBe(50)
    expect(p.$wire.setTimeline).toHaveBeenCalledTimes(1)
  })

  it('removing the last key with the diamond is a reset: back to the value before keying', () => {
    const p = panel([track([{ time: 0, value: 30 }], { base: 25 })])
    p.time = 0
    p.toggleKey(ART, 'x')
    expect(p.trackFor(ART, 'x')).toBeNull()
    expect(layer.x).toBe(25)
  })
})

describe('undo', () => {
  it('replaces the remembered tracks with the ones the server restored', () => {
    const p = panel([])
    p.refreshObjects = () => {}
    p.toggleKey(ART, 'x')
    expect(p.tracks).toHaveLength(1)

    p.restore({ duration: 8, targets: [], tracks: [] })

    expect(p.tracks).toEqual([])
    expect(p.keyState(ART, 'x')).toBe('none')
  })
})

describe('the player plays the same keys', () => {
  const timeline = { tracks: [track([{ time: 0, value: 20 }, { time: 3, value: 80 }]), { target: ART, property: 'y', keyframes: [{ time: 0, value: 5 }] }] }

  it('only tracks with two keys move, and a frame lands on the art layer', () => {
    expect(hasAnimation(timeline)).toBe(true)
    expect(hasAnimation({ tracks: [timeline.tracks[1]] })).toBe(false)
    const frame = frameAt(timeline, 3)
    expect(frame).toEqual({ [ART]: { x: 80 } })

    const art = { setLayerProp: vi.fn() }
    applyFrameTo(frameAt(timeline, 1.5), { art })
    expect(art.setLayerProp).toHaveBeenCalledWith('7', 'x', expect.closeTo(50, 6))
  })
})

describe('keyed fields', () => {
  it('reads a percentage field as a fraction, and a colour as a colour', () => {
    expect(fieldToValue('40', 100)).toBe(0.4)
    expect(fieldToValue('#AABBCC')).toBe('#aabbcc')
    expect(fieldToValue('x')).toBeNull()
    expect(valueToField(0.4, 100)).toBe('40')
    expect(valueToField('#aabbcc')).toBe('#aabbcc')
  })
})
