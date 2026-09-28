import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { animationTimeline } from '../timeline-panel.js'

/**
 * Auto-keying: typing a number at the playhead records it.
 *
 * Bart: *"Timeline should register new keyframes upon value change. if the time has moved (not
 * same as previous keyframe)"*. Before this, changing a value only wrote to a keyframe that was
 * ALREADY under the playhead — so the common act, scrub forward and reposition, moved the layer
 * and recorded nothing. You had to remember the diamond, every time.
 *
 * The rule has one gate, and it is the one every keyframe editor uses: a property records only
 * once it is ANIMATED. Without that gate, nudging a title into place on an untouched scene starts
 * an animation nobody asked for, and there is no way left to simply position something.
 *
 * The component is a plain Alpine factory, so these drive the real object. `init()` is not called:
 * it wants $refs, a ResizeObserver and a live map, and none of that is what is under test here.
 */

const TEXT = 'text:1'

const panel = (tracks = []) => {
  const it = animationTimeline({ sceneId: 'scene-1', tracks, targets: [], duration: 8 })
  it.$wire = { setTimeline: vi.fn() }
  return it
}

const keys = (panel, target, property) => panel.keysOf(target, property)

beforeEach(() => {
  window.__lessonTextLayer = { _texts: [{ id: 1, kind: 'text', x: 12, y: 15 }], patch: vi.fn() }
})

afterEach(() => { delete window.__lessonTextLayer })

describe('setValue records a keyframe at the playhead', () => {
  it('adds one when the property is animated and the playhead has moved off the last key', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.time = 3.601

    p.setValue(TEXT, 'x', 40)

    expect(keys(p, TEXT, 'x').map((k) => [k.time, k.value])).toEqual([[1, 12], [3.601, 40]])
  })

  it('updates the key under the playhead instead of adding a second one', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.time = 1

    p.setValue(TEXT, 'x', 40)

    expect(keys(p, TEXT, 'x')).toHaveLength(1)
    expect(keys(p, TEXT, 'x')[0].value).toBe(40)
  })

  /** A playhead dropped by clicking the lane is a float. 1.0000000001 is the same moment. */
  it('updates rather than stacking when the playhead is a float hair off the key', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.time = 1 + 1e-9

    p.setValue(TEXT, 'x', 40)

    expect(keys(p, TEXT, 'x')).toHaveLength(1)
    expect(keys(p, TEXT, 'x')[0].value).toBe(40)
  })

  it('leaves an un-animated property alone, so a layer can still just be positioned', () => {
    const p = panel()
    p.time = 3.601

    p.setValue(TEXT, 'x', 40)

    expect(keys(p, TEXT, 'x')).toEqual([])
    expect(window.__lessonTextLayer.patch).toHaveBeenCalledWith('1', { x: 40 })
  })

  it('records on the edited property only, not on its siblings', () => {
    const p = panel([
      { target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] },
      { target: TEXT, property: 'y', keyframes: [{ time: 1, value: 15 }] },
    ])
    p.time = 3.601

    p.setValue(TEXT, 'x', 40)

    expect(keys(p, TEXT, 'x')).toHaveLength(2)
    expect(keys(p, TEXT, 'y')).toHaveLength(1)
  })

  it('moves the layer whether or not it keys', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.time = 3.601

    p.setValue(TEXT, 'x', 40)

    expect(window.__lessonTextLayer.patch).toHaveBeenCalledWith('1', { x: 40 })
  })

  it('saves the new key through Livewire', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.time = 3.601

    p.setValue(TEXT, 'x', 40)

    expect(p.$wire.setTimeline).toHaveBeenCalledTimes(1)
    const saved = p.$wire.setTimeline.mock.calls[0][0]
    expect(saved.tracks[0].keyframes).toHaveLength(2)
  })

  it('does nothing at all with a value that is not a number', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.time = 3.601

    p.setValue(TEXT, 'x', Number.NaN)

    expect(keys(p, TEXT, 'x')).toHaveLength(1)
    expect(p.$wire.setTimeline).not.toHaveBeenCalled()
  })

  /** Two keys make a movement. One is a stored position — see applyFrame's filter. */
  it('turns a single stored position into something that actually plays', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    expect(p.nothingToPlay).toBe(true)

    p.time = 3.601
    p.setValue(TEXT, 'x', 40)

    expect(p.nothingToPlay).toBe(false)
  })
})

describe('isAnimated', () => {
  it('is false for a property with no track and for one with an empty track', () => {
    expect(panel().isAnimated(TEXT, 'x')).toBe(false)
    expect(panel([{ target: TEXT, property: 'x', keyframes: [] }]).isAnimated(TEXT, 'x')).toBe(false)
  })

  it('is true from the first keyframe, which is what the diamond puts there', () => {
    expect(panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 1 }] }])
      .isAnimated(TEXT, 'x')).toBe(true)
  })
})

describe('auto-key can be switched off', () => {
  it('records nothing while autoKey is off, but still moves the layer', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 1, value: 12 }] }])
    p.autoKey = false
    p.time = 3.601

    p.setValue(TEXT, 'x', 40)

    expect(keys(p, TEXT, 'x')).toHaveLength(1)
    expect(window.__lessonTextLayer.patch).toHaveBeenCalledWith('1', { x: 40 })
  })
})

describe('spans — the bar a track draws', () => {
  const track = (kf) => ({ target: TEXT, property: 'x', keyframes: kf })

  it('runs from the first keyframe to the last', () => {
    const p = panel([track([{ time: 1, value: 0 }, { time: 2, value: 5 }, { time: 4.5, value: 9 }])])
    expect(p.spanOf(TEXT, 'x')).toEqual({ from: 1, to: 4.5 })
  })

  /** One key is a stored position, not a movement — the same rule applyFrame plays by. */
  it('is null under two keyframes, so a bar never claims a movement that will not happen', () => {
    expect(panel([track([{ time: 1, value: 0 }])]).spanOf(TEXT, 'x')).toBeNull()
    expect(panel().spanOf(TEXT, 'x')).toBeNull()
  })

  it('an object span covers every property it has', () => {
    const p = panel([
      { target: TEXT, property: 'x', keyframes: [{ time: 2, value: 0 }, { time: 3, value: 1 }] },
      { target: TEXT, property: 'y', keyframes: [{ time: 0.5, value: 0 }, { time: 6, value: 1 }] },
    ])
    expect(p.objectSpan(TEXT)).toEqual({ from: 0.5, to: 6 })
  })

  it('an object with nothing animated has no bar', () => {
    expect(panel([track([{ time: 1, value: 0 }])]).objectSpan(TEXT)).toBeNull()
  })

  // Absolute pixels, worked out by hand: zoom 100px/s, so 1s→100px plus the 10px lane pad that
  // keeps a key on 0 whole, and a 3.5s span is 350px wide.
  it('places the bar in pixels at the current zoom', () => {
    const p = panel()
    p.zoom = 100
    expect(p.barStyle({ from: 1, to: 4.5 })).toBe('left: 110px; width: 350px')
  })

  it('keeps a bar visible even when its span is far below a pixel', () => {
    const p = panel()
    p.zoom = 100
    expect(p.barStyle({ from: 1, to: 1.001 })).toBe('left: 110px; width: 2px')
  })

  it('hides the bar when there is no span at all', () => {
    expect(panel().barStyle(null)).toBe('display: none')
  })
})

describe('collapse all', () => {
  const twoObjects = (p) => {
    p.objects = [{ target: 'a' }, { target: 'b' }]
    p.openGroups = { a: true, b: true }
    return p
  }

  it('collapses every group when any is open', () => {
    const p = twoObjects(panel())
    p.toggleAllGroups()
    expect(p.openGroups).toEqual({ a: false, b: false })
  })

  it('opens every group when none is open', () => {
    const p = twoObjects(panel())
    p.openGroups = { a: false, b: false }
    p.toggleAllGroups()
    expect(p.openGroups).toEqual({ a: true, b: true })
  })

  it('one open group is enough to make the next press a collapse', () => {
    const p = twoObjects(panel())
    p.openGroups = { a: true, b: false }
    expect(p.anyGroupOpen).toBe(true)
    p.toggleAllGroups()
    expect(p.openGroups).toEqual({ a: false, b: false })
  })
})

describe('the eye', () => {
  it('hides EVERY node of the object, because a map scene draws each layer twice', () => {
    document.body.innerHTML = '<div data-text-id="1"></div><div data-text-id="1"></div>'
    const p = panel()

    p.toggleHidden(TEXT)

    const nodes = [...document.querySelectorAll('[data-text-id="1"]')]
    expect(p.isHidden(TEXT)).toBe(true)
    expect(nodes.map((n) => n.style.visibility)).toEqual(['hidden', 'hidden'])

    p.toggleHidden(TEXT)
    expect(p.isHidden(TEXT)).toBe(false)
    expect(nodes.map((n) => n.style.visibility)).toEqual(['', ''])
  })
})

describe('the diamond on a layer nobody has moved yet', () => {
  it('keys the value the row is showing rather than refusing in silence', () => {
    // x is absent, which is what a text layer positioned by the stylesheet actually stores.
    window.__lessonTextLayer = { _texts: [{ id: 1, kind: 'text', y: 15 }], patch: vi.fn() }
    const p = panel()
    p.time = 2

    p.toggleKey(TEXT, 'x')

    expect(keys(p, TEXT, 'x')).toEqual([{ time: 2, value: 0 }])
    expect(p.valueAt(TEXT, 'x'), 'and the field agrees with the keyframe').toBe(0)
  })

  it('still prefers the live value when there is one', () => {
    const p = panel()
    p.time = 2

    p.toggleKey(TEXT, 'x')

    expect(keys(p, TEXT, 'x')).toEqual([{ time: 2, value: 12 }])
  })
})

describe('canvas edits record keyframes, the way Figma auto-keyframe does', () => {
  const animated = () => panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 12 }] }])

  it('keys an animated property moved on the canvas, at the playhead', () => {
    const p = animated()
    p.time = 2
    p.recordCanvasEdit(TEXT, { x: 50, y: 99 })
    expect(keys(p, TEXT, 'x').map((k) => [k.time, k.value])).toEqual([[0, 12], [2, 50]])
    expect(keys(p, TEXT, 'y')).toEqual([])   // y was never animated: a move is just a move
  })

  it('ignores the timeline writing its own sample back', () => {
    const p = animated()
    p.time = 2
    p.recordCanvasEdit(TEXT, { x: 12 })
    expect(keys(p, TEXT, 'x')).toHaveLength(1)
  })

  it('records nothing with auto-key off', () => {
    const p = animated()
    p.autoKey = false
    p.time = 2
    p.recordCanvasEdit(TEXT, { x: 50 })
    expect(keys(p, TEXT, 'x')).toHaveLength(1)
  })
})

describe('Delete removes the selected keys, and only when nobody is typing', () => {
  const withKeys = () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 1 }, { time: 2, value: 2 }] }])
    p.$store = { view: { script: true, bottomTab: 'timeline' } }
    p.selected = ['text:1|x|2']
    return p
  }
  const key = (target, k = 'Delete') => ({ key: k, target, defaultPrevented: false })

  it('takes the key on the timeline and deletes the selection', () => {
    const p = withKeys()
    expect(p.isDeleteKey(key(document.body))).toBe(true)
    p.deleteSelected()
    expect(keys(p, TEXT, 'x').map((k) => k.time)).toEqual([0])
    expect(p.selected).toEqual([])
  })

  it('leaves Backspace alone in a field', () => {
    const p = withKeys()
    expect(p.isDeleteKey(key(document.createElement('input'), 'Backspace'))).toBe(false)
  })

  it('leaves it alone when the Timeline is not the tab on screen', () => {
    const p = withKeys()
    p.$store.view.bottomTab = 'script'
    expect(p.isDeleteKey(key(document.body))).toBe(false)
  })
})

describe('the canvas and the timeline agree on which layer is active', () => {
  it('maps a canvas selection id onto its timeline row', () => {
    const p = panel()
    p.objects = [{ target: 'art:231', kind: 'art' }, { target: 'text:txt_ab', kind: 'text' }, { target: 'rect:r1', kind: 'rect' }]
    expect(p.targetFromObjectId('art_231')).toBe('art:231')
    expect(p.targetFromObjectId('txt_ab')).toBe('text:txt_ab')
    expect(p.targetFromObjectId('r1')).toBe('rect:r1')
    expect(p.targetFromObjectId('')).toBeNull()        // background: nothing active
  })

  it('a row name selects the layer on the canvas AND its keys; a canvas click selects no keys', () => {
    const select = vi.fn()
    window.__lessonTextLayer.select = select
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 1 }, { time: 2, value: 3 }] }])
    p.objects = [{ target: TEXT, kind: 'text' }]
    p.$nextTick = () => {}
    p.$el = { querySelectorAll: () => [] }

    p.onObjectSelected('1')
    expect(p.activeTarget).toBe(TEXT)
    expect(p.selected).toEqual([])

    p.selectObject(TEXT)
    expect(select).toHaveBeenCalledWith('1')
    expect(p.selected).toEqual(['text:1|x|0', 'text:1|x|2'])
  })
})
