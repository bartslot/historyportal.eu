import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { groupsFor, sectionKey, displayOf, toShown, fromShown, nudged, summaryTimes } from '../timeline-groups.js'
import { keyframeKinds, propertiesFor } from '../properties.js'
import { animationTimeline } from '../timeline-panel.js'

/**
 * The After Effects model: layer > group > property. The grouping decides where each registry row
 * sits; the display model decides how its stored number is read (opacity 0.5 shows 50 %). The
 * scrub/type tests drive the real component, as timeline-panel.test.js does.
 */

describe('groupsFor', () => {
  it('puts every registry row of every kind in exactly one group', () => {
    for (const kind of keyframeKinds()) {
      const keys = groupsFor(kind).flatMap((g) => g.props.map((p) => p.key))
      expect(keys.sort()).toEqual(propertiesFor(kind).map((p) => p.key).sort())
    }
  })

  it('names a text layer Transform then Appearance, the inspector section names', () => {
    const groups = groupsFor('text')
    expect(groups.map((g) => g.id)).toEqual(['transform', 'appearance'])
    expect(groups[0].props.map((p) => p.key)).toEqual(['x', 'y', 'w', 'scale', 'rotation'])
    expect(groups[1].props.map((p) => p.key)).toEqual(['blur', 'opacity', 'color', 'colorOpacity'])
  })

  it('keeps the kind-specific shapes as their own groups: Arrow and Tail', () => {
    const arrow = groupsFor('arw').find((g) => g.id === 'arrow')
    expect(arrow.props.map((p) => p.key)).toEqual(['end_x', 'end_y', 'bend', 'shaft', 'head'])
    const tail = groupsFor('bal').find((g) => g.id === 'tail')
    expect(tail.props.map((p) => p.key)).toEqual(['tip_x', 'tip_y', 'root', 'bend'])
  })

  it('splits a camera into where it is and where it looks', () => {
    const groups = groupsFor('camera')
    expect(groups.map((g) => g.id)).toEqual(['position', 'view'])
    expect(groups[1].props.map((p) => p.key)).toEqual(['heading', 'tilt'])
  })

  it('has no groups for a kind it has never heard of', () => {
    expect(groupsFor('nothing')).toEqual([])
  })

  it('remembers open state under the object and the group', () => {
    expect(sectionKey('text:1', 'transform')).toBe('text:1#transform')
  })
})

describe('shown values', () => {
  it('reads opacity, scale and the colour opacity as percent', () => {
    expect(toShown(0.5, displayOf('text', 'opacity'))).toBe(50)
    expect(toShown(1.25, displayOf('art', 'scale'))).toBe(125)
    expect(displayOf('art', 'tint_opacity').unit).toBe('%')
  })

  it('leaves positions and angles as stored, with their unit', () => {
    expect(toShown(12.5, displayOf('text', 'x'))).toBe(12.5)
    expect(displayOf('text', 'x').unit).toBe('%')
    expect(displayOf('text', 'rotation').unit).toBe('°')
    expect(displayOf('camera', 'tilt').unit).toBe('°')
  })

  it('turns what was typed back into the stored value, and refuses non-numbers', () => {
    expect(fromShown('50', displayOf('text', 'opacity'))).toBe(0.5)
    expect(fromShown('0,5', displayOf('text', 'blur'))).toBe(0.5)
    expect(fromShown('', displayOf('text', 'x'))).toBeNull()
    expect(fromShown('-', displayOf('text', 'x'))).toBeNull()
  })

  it('steps by one, ten with Shift, a tenth with Alt, without float noise', () => {
    const d = displayOf('text', 'x')
    expect(nudged(10, 1, d)).toBe(11)
    expect(nudged(10, -1, d, { shift: true })).toBe(0)
    expect(nudged(0.3, 1, d, { alt: true })).toBe(0.4)
  })
})

describe('summaryTimes', () => {
  it('merges the keys of a group into its distinct moments', () => {
    const a = [{ time: 1 }, { time: 3 }]
    const b = [{ time: 3.0000001 }, { time: 2 }]
    expect(summaryTimes([a, b, null])).toEqual([1, 2, 3])
  })
})

describe('the value field on the component', () => {
  const TEXT = 'text:1'
  const panel = (tracks = []) => {
    const it = animationTimeline({ sceneId: 's', tracks, targets: [], duration: 8 })
    it.$wire = { setTimeline: vi.fn() }
    return it
  }
  beforeEach(() => { window.__lessonTextLayer = { _texts: [{ id: 1, kind: 'text', x: 12, y: 15, opacity: 1 }], patch: vi.fn() } })
  afterEach(() => { delete window.__lessonTextLayer })

  it('shows the interpolated value at the playhead', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 0 }, { time: 2, value: 100 }] }])
    p.time = 1
    expect(p.shownValue(TEXT, 'x')).toBeCloseTo(50, 0)
  })

  it('a scrubbed live value keys the playhead once the property is animated, saving only on release', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 12 }] }])
    p.time = 2
    p.commitShown(TEXT, 'x', 30, { flush: false })
    p.commitShown(TEXT, 'x', 31, { flush: false })
    expect(p.keysOf(TEXT, 'x').map((k) => [k.time, k.value])).toEqual([[0, 12], [2, 31]])
    expect(p.$wire.setTimeline).not.toHaveBeenCalled()
    p.commitShown(TEXT, 'x', 32)
    expect(p.$wire.setTimeline).toHaveBeenCalledTimes(1)
  })

  it('typing percent into an animated opacity stores the fraction', () => {
    const p = panel([{ target: TEXT, property: 'opacity', keyframes: [{ time: 0, value: 1 }] }])
    p.time = 1
    p.commitShown(TEXT, 'opacity', '40')
    expect(p.keysOf(TEXT, 'opacity').at(-1)).toMatchObject({ time: 1, value: 0.4 })
  })

  it('does not key a property nobody has animated', () => {
    const p = panel()
    p.time = 1
    p.commitShown(TEXT, 'x', 40)
    expect(p.keysOf(TEXT, 'x')).toEqual([])
  })

  it('ignores a half-typed number', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 12 }] }])
    p.commitShown(TEXT, 'x', '-')
    expect(p.keysOf(TEXT, 'x')).toHaveLength(1)
  })

  it('arrow keys step and Shift steps ten, each press one save', () => {
    const p = panel([{ target: TEXT, property: 'x', keyframes: [{ time: 0, value: 12 }] }])
    const field = { value: '' }
    p.valueKey({ key: 'ArrowUp', shiftKey: true, altKey: false, preventDefault () {}, target: field }, TEXT, 'x')
    expect(field.value).toBe('22')
    expect(p.keysOf(TEXT, 'x')[0].value).toBe(22)
    expect(p.$wire.setTimeline).toHaveBeenCalledTimes(1)
  })

  it('the stopwatch animates a plain property and stops an animated one', () => {
    const p = panel()
    p.time = 1
    p.toggleAnimated(TEXT, 'x')
    expect(p.isAnimated(TEXT, 'x')).toBe(true)
    p.toggleAnimated(TEXT, 'x')
    expect(p.isAnimated(TEXT, 'x')).toBe(false)
  })
})

describe('twirling groups', () => {
  const panel = () => {
    const it = animationTimeline({ sceneId: 's', tracks: [], targets: [], duration: 8 })
    it.objects = [{ target: 'text:1', kind: 'text', label: 'T' }]
    it.openGroups = { 'text:1': true }
    return it
  }

  it('groups start open, close one at a time, and remember it', () => {
    const p = panel()
    expect(p.isSectionOpen('text:1', 'transform')).toBe(true)
    p.toggleSection('text:1', 'transform')
    expect(p.isSectionOpen('text:1', 'transform')).toBe(false)
    expect(p.isSectionOpen('text:1', 'appearance')).toBe(true)
  })

  it('Alt-click flips every group of the layer', () => {
    const p = panel()
    p.toggleSection('text:1', 'transform', { altKey: true })
    expect(['transform', 'appearance'].map((g) => p.isSectionOpen('text:1', g))).toEqual([false, false])
    p.toggleSection('text:1', 'transform', { altKey: true })
    expect(['transform', 'appearance'].map((g) => p.isSectionOpen('text:1', g))).toEqual([true, true])
  })

  it('Alt-click on the layer opens it with all its groups, or closes it when everything was open', () => {
    const p = panel()
    p.toggleSection('text:1', 'appearance')
    p.openGroups['text:1'] = false
    p.toggleGroup('text:1', { altKey: true })
    expect(p.openGroups['text:1']).toBe(true)
    expect(p.isSectionOpen('text:1', 'appearance')).toBe(true)
    p.toggleGroup('text:1', { altKey: true })
    expect(p.openGroups['text:1']).toBe(false)
  })

  it('a closed group summarises where its rows are keyed', () => {
    const p = panel()
    p.tracks = [
      { target: 'text:1', property: 'x', keyframes: [{ time: 1, value: 1 }, { time: 3, value: 2 }] },
      { target: 'text:1', property: 'y', keyframes: [{ time: 2, value: 1 }] },
    ]
    expect(p.sectionKeyTimes('text:1', 'transform')).toEqual([1, 2, 3])
    expect(p.sectionKeyTimes('text:1', 'appearance')).toEqual([])
  })
})
