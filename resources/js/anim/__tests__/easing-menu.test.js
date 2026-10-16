import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { animationTimeline } from '../timeline-panel.js'

/**
 * The Easing menu on a stretch between two keys. Bart, 2026-10-16: "when I select this, it should
 * show the animation how it animates. And clicking out of that selection it should hide."
 */

const ART = 'art:7'
const RECT = { top: 100, bottom: 120, left: 100, width: 40 }

const panel = () => {
  const p = animationTimeline({
    sceneId: 'easing-menu',
    tracks: [{ target: ART, property: 'y', keyframes: [{ time: 0, value: 10 }, { time: 1, value: 90 }] }],
    targets: [],
    duration: 8,
  })
  p.$wire = { setTimeline: vi.fn() }
  return p
}

let layer
let frames
beforeEach(() => {
  layer = { asset_id: 7, y: 10 }
  window.__lessonArtworkLayer = { _layers: [layer] }
  window.__setLayerProp = vi.fn((id, property, value) => { layer[property] = value })
  window.dispatchEvent = vi.fn()
  window.matchMedia = vi.fn(() => ({ matches: false }))
  frames = []
  vi.stubGlobal('requestAnimationFrame', (fn) => { frames.push(fn); return frames.length })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => {
  delete window.__lessonArtworkLayer
  delete window.__setLayerProp
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const easingOf = (p) => p.keysOf(ART, 'y')[0].easing

describe('open and close', () => {
  it('opens on a stretch, and a click outside (closeEasing) closes it', () => {
    const p = panel()
    p.openEasing(ART, 'y', 0, RECT)
    expect(p.easingMenu).not.toBeNull()
    p.closeEasing()
    expect(p.easingMenu).toBeNull()
  })

  it('Esc closes it', () => {
    const p = panel()
    p.openEasing(ART, 'y', 0, RECT)
    p.onEscape()
    expect(p.easingMenu).toBeNull()
  })

  it('choosing an option applies it, saves, and closes', () => {
    const p = panel()
    p.openEasing(ART, 'y', 0, RECT)
    p.chooseEasing('easeOutBack')
    expect(easingOf(p)).toBe('easeOutBack')
    expect(p.$wire.setTimeline).toHaveBeenCalled()
    expect(p.easingMenu).toBeNull()
  })
})

describe('preview', () => {
  it('plays the stretch on the stage with the hovered curve, then returns to the playhead', () => {
    const p = panel()
    p.time = 0
    p.openEasing(ART, 'y', 0, RECT)
    const now = vi.spyOn(performance, 'now').mockReturnValue(0)
    p.previewEasing('linear')
    expect(p.previewName).toBe('linear')

    now.mockReturnValue(500)
    frames.shift()()
    expect(layer.y).toBeCloseTo(50, 6)   // linear: halfway in time is halfway in value

    now.mockReturnValue(1000)
    frames.shift()()
    expect(p.previewU).toBe(1)
    expect(layer.y).toBe(10)             // back to what the playhead (0 s) says
  })

  it('does not move the stage under reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }))
    const p = panel()
    p.openEasing(ART, 'y', 0, RECT)
    p.previewEasing('linear')
    expect(frames).toHaveLength(0)
    expect(p.previewName).toBe('linear')
  })
})

describe('cancel restores the curve', () => {
  it('leaving without choosing puts back the curve the stretch had, with no preview left running', () => {
    const p = panel()
    p.openEasing(ART, 'y', 0, RECT)
    p.setSegmentEasing('hold')         // e.g. a custom bezier drag that was never committed
    p.previewEasing('easeInBack')
    p.closeEasing()
    expect(easingOf(p)).toBeUndefined()
    expect(p.previewName).toBeNull()
  })

  it('a chosen curve stays', () => {
    const p = panel()
    p.openEasing(ART, 'y', 0, RECT)
    p.chooseEasing('hold')
    expect(easingOf(p)).toBe('hold')
  })
})
