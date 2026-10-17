import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { animationTimeline } from '../timeline-panel.js'

/**
 * Bart, 2026-10-16: "if I try to delete a keyframe the whole layer with all keyframes gets
 * deleted. I only want to delete the keyframe." The editor's object-delete key and the Timeline's
 * keyframe-delete key both listen on window; selected keyframes are the selection, so they win.
 */

const ART = 'art:7'
const track = (keyframes, extra = {}) => ({ target: ART, property: 'x', keyframes, ...extra })

const panel = (tracks = []) => {
  const p = animationTimeline({ sceneId: 'delete-key', tracks, targets: [], duration: 8 })
  p.$wire = { setTimeline: vi.fn() }
  return p
}

beforeEach(() => {
  window.__lessonArtworkLayer = { _layers: [{ asset_id: 7, x: 25, y: 50 }] }
  window.__setLayerProp = vi.fn()
  window.dispatchEvent = vi.fn()
})
afterEach(() => {
  delete window.__lessonArtworkLayer
  delete window.__setLayerProp
  vi.restoreAllMocks()
})

describe('Delete on a selected keyframe', () => {
  const twoKeys = () => panel([
    track([{ time: 0, value: 25 }, { time: 1.5, value: 40 }, { time: 3, value: 80 }], { base: 25 }),
    { target: ART, property: 'y', base: 50, keyframes: [{ time: 0, value: 50 }, { time: 3, value: 10 }] },
  ])
  const onTimeline = (p) => { p.$store = { view: { script: true, bottomTab: 'timeline' } }; return p }

  it('removes only that keyframe: the layer, its other keys and its other properties stay', () => {
    const p = onTimeline(twoKeys())
    p.selected = [`${ART}|x|1.5`]
    const event = { key: 'Backspace', target: document.body, preventDefault: vi.fn() }

    p.onKeydown(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(p.keysOf(ART, 'x').map((k) => k.time)).toEqual([0, 3])
    expect(p.keysOf(ART, 'y').map((k) => k.time)).toEqual([0, 3])
    expect(p.selected).toEqual([])
  })

  it('still takes the key when the editor key handler already cancelled the event', () => {
    const p = onTimeline(twoKeys())
    p.selected = [`${ART}|x|1.5`]
    p.onKeydown({ key: 'Delete', defaultPrevented: true, target: document.body, preventDefault: vi.fn() })
    expect(p.keysOf(ART, 'x')).toHaveLength(2)
  })

  it('tells the editor that keyframes own the key, so the object-delete handler stands down', () => {
    const p = onTimeline(twoKeys())
    Object.assign(p, { $el: document.createElement('div'), $watch: () => {}, $nextTick: () => {}, $refs: {} })
    globalThis.ResizeObserver ??= class { observe () {} }
    p.init()
    expect(window.__timelineKeying.hasKeySelection()).toBe(false)
    p.selected = [`${ART}|x|1.5`]
    expect(window.__timelineKeying.hasKeySelection()).toBe(true)
  })

  it('selecting a layer (canvas or row) clears the keyframe selection', () => {
    const p = onTimeline(twoKeys())
    Object.assign(p, { $el: { querySelectorAll: () => [] }, $nextTick: () => {}, objects: [] })
    p.selected = [`${ART}|x|1.5`]
    p.onObjectSelected('art_7')
    expect(p.selected).toEqual([])
    p.selected = [`${ART}|x|1.5`]
    p.selectObject(ART)
    expect(p.selected).toEqual([])
  })

  it('the right-click menu removes only that keyframe', () => {
    const p = onTimeline(twoKeys())
    p.openKeyMenu({ clientX: 10, clientY: 10 }, ART, 'x', 1.5)
    expect(p.keyMenu).not.toBeNull()
    p.removeMenuKey()
    expect(p.keyMenu).toBeNull()
    expect(p.keysOf(ART, 'x').map((k) => k.time)).toEqual([0, 3])
  })
})

describe('undo and redo of a removed keyframe', () => {
  it('Cmd-Z hands back the server copy: the key returns with its time, value and easing; redo takes it again', () => {
    const before = [
      track([{ time: 0, value: 25 }, { time: 1.5, value: 40, easing: 'hold' }, { time: 3, value: 80 }]),
      { target: ART, property: 'y', keyframes: [{ time: 0, value: 50 }, { time: 3, value: 10 }] },
    ]
    const p = panel(structuredClone(before))
    Object.assign(p, { $store: { view: { script: true, bottomTab: 'timeline' } }, refreshObjects: () => {} })
    p.selected = [`${ART}|x|1.5`]
    p.onKeydown({ key: 'Backspace', target: document.body, preventDefault: vi.fn() })
    const after = structuredClone(p.$wire.setTimeline.mock.calls.at(-1)[0].tracks)
    expect(p.keysOf(ART, 'x').map((k) => k.time)).toEqual([0, 3])

    // undo: the server restored the scene and dispatched its timeline (timeline-restored)
    p.restore({ duration: 8, targets: [], tracks: structuredClone(before) })
    expect(p.keysOf(ART, 'x')[1]).toEqual({ time: 1.5, value: 40, easing: 'hold' })
    expect(p.keysOf(ART, 'y').map((k) => k.time)).toEqual([0, 3])

    // redo
    p.restore({ duration: 8, targets: [], tracks: after })
    expect(p.keysOf(ART, 'x').map((k) => k.time)).toEqual([0, 3])
    expect(p.keysOf(ART, 'y').map((k) => k.time)).toEqual([0, 3])
  })
})
