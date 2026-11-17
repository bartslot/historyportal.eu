import { describe, it, expect, vi, afterEach } from 'vitest'
import { canHide } from '../scene-objects.js'
import { animationTimeline } from '../timeline-panel.js'

/**
 * The Object list's icon hides a layer through the timeline's eye (Bart 2026-11-17): one hidden
 * state, so the eye and the icon always agree.
 */

afterEach(() => { delete window.__lessonTextLayer; delete window.__backgrounds; delete window.__stage25d })

describe('canHide: kinds the eye can actually take off the canvas', () => {
  it('text, panels, pictures, arrows, balloons, backgrounds, stage layers and ground bands', () => {
    for (const t of ['text:1', 'rect:2', 'art:3', 'arw:4', 'bal:5', 'bg:0', 's25:layer-0', 's25:band-2']) expect(canHide(t)).toBe(true)
  })

  it('not the camera, the sky, the terrain or a diorama item (setObjectHidden has nothing to hide there)', () => {
    for (const t of ['camera', 's25cam', 's25sky:sky', 's25:terrain', 'dio:a', null]) expect(canHide(t)).toBe(false)
  })
})

describe('hideTargetOf: an Object list id as the timeline row it hides', () => {
  const panel = () => {
    window.__lessonTextLayer = { _texts: [{ id: 'txt_1', kind: 'text', text: 'Hi' }], patch: vi.fn() }
    window.__backgrounds = { list: () => [{ id: '0' }], hide: vi.fn() }
    window.__stage25d = { items: () => [{ id: 'layer-0' }, { id: 'sky' }, { id: 'camera' }], setHidden: vi.fn() }
    const p = animationTimeline({ sceneId: 's', tracks: [], targets: [], duration: 8 })
    p.refreshObjects()
    return p
  }

  it('maps rows that have a hideable timeline row', () => {
    const p = panel()
    expect(p.hideTargetOf('txt_1')).toBe('text:txt_1')
    expect(p.hideTargetOf('s25_layer-0')).toBe('s25:layer-0')
    expect(p.hideTargetOf('__bg__')).toBe('bg:0')
  })

  it('null for rows the eye cannot hide or the timeline does not list', () => {
    const p = panel()
    for (const id of ['s25_camera', 's25_sky', 's25_world', 'art_99', 'txt_404']) expect(p.hideTargetOf(id)).toBe(null)
  })

  it('a split scene has two backgrounds: the single Background row hides neither', () => {
    const p = panel()
    window.__backgrounds = { list: () => [{ id: '0' }, { id: '1' }] }
    p.refreshObjects()
    expect(p.hideTargetOf('__bg__')).toBe(null)
  })

  it('toggling from the list is the eye: same state, same stage call', () => {
    const p = panel()
    p.toggleHidden(p.hideTargetOf('s25_layer-0'))
    expect(p.isHidden('s25:layer-0')).toBe(true)
    expect(window.__stage25d.setHidden).toHaveBeenCalledWith('layer-0', true)
  })
})
