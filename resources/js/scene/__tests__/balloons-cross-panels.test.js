import { describe, it, expect, afterEach, vi } from 'vitest'
import { SplitStage } from '../SplitStage.js'
import { BalloonLayer } from '../BalloonLayer.js'
import { toFraction } from '../balloon-edit.js'

// Bart 2026-10-16: "the text tail is stuck to the side. can we move over the frame? this way we
// have more control how we design the plates." On a split scene a balloon and its tail may cross
// the panel border and the gutter into the next panel, drawn above every panel and frame.
const W = 1000
const H = 500

const sized = (el, rect) => {
  Object.defineProperty(el, 'clientWidth', { value: rect.width, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: rect.height, configurable: true })
  el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height })
}

afterEach(() => { document.body.innerHTML = '' })

describe('split panels keep their balloons above every panel', () => {
  it("a panel's balloons live in a stage-level box the size of the panel, over the frames and grips", () => {
    const host = document.createElement('div')
    sized(host, { left: 0, top: 0, width: W, height: H })
    document.body.appendChild(host)
    const s = new SplitStage(host, { editable: true })
    s.show({ split: { layout: 'cols2', at: [0.5] }, shots: [{}, {}] })

    const talk = host.querySelector('[data-split-talk="0"]')
    expect(s.panels[0].el.contains(talk)).toBe(false)
    expect(talk.parentElement).toBe(host.querySelector('.lp-split'))
    expect(Number(talk.style.zIndex)).toBeGreaterThan(Number(host.querySelector('[data-split-divider]').style.zIndex))
    expect(talk.style.width).toBe(s.panels[0].el.style.width)
    expect(talk.style.overflow).toBe('visible')
  })
})

describe('a roaming balloon layer is bounded by the stage, not its panel', () => {
  // The right panel of a two-column split: x 505..1000 on a 1000 wide stage.
  const layer = () => {
    const stage = document.createElement('div')
    sized(stage, { left: 0, top: 0, width: W, height: H })
    const host = document.createElement('div')
    sized(host, { left: 505, top: 0, width: 495, height: H })
    stage.appendChild(host)
    document.body.appendChild(stage)
    return new BalloonLayer(host, () => null, { roam: true })
  }

  it('reaches across the left panel to the stage edge', () => {
    const b = layer().fractionBounds()
    expect(b.x[0]).toBeCloseTo(-505 / 495, 6)
    expect(b.x[1]).toBeCloseTo(1, 6)
  })

  it('a tail dragged past the panel border keeps its tip there', () => {
    const l = layer()
    expect(toFraction(l, 300, 250)[0]).toBeCloseTo((300 - 505) / 495, 3)
    // …but never off the stage.
    expect(toFraction(l, -400, 250)[0]).toBeCloseTo(-505 / 495, 3)
  })

  it('without roaming a balloon stays on its host, as before', () => {
    const stage = document.createElement('div')
    sized(stage, { left: 0, top: 0, width: W, height: H })
    const host = document.createElement('div')
    sized(host, { left: 0, top: 0, width: W, height: H })
    stage.appendChild(host)
    expect(toFraction(new BalloonLayer(host, () => null), 1200, 250)[0]).toBe(1)
  })
})

// Bart 2026-10-16: "give changing the tail the priority when close to the drawer, not interaction
// with the drawer". A balloon handle on or beside a divider takes the press; the divider never does.
describe('a balloon handle beats the divider it sits on', () => {
  it('has a hit area wider than the visible dot, on a layer above the grips', async () => {
    const { editableBalloons, selectBalloon } = await import('../balloon-edit.js')
    const host = document.createElement('div')
    sized(host, { left: 0, top: 0, width: W, height: H })
    document.body.appendChild(host)
    const onChange = vi.fn()
    const onSplitChange = vi.fn()
    const s = new SplitStage(host, { editable: true, onSplitChange, balloons: editableBalloons(onChange) })
    // A balloon in the left panel whose tail tip sits right on the divider at x = 500.
    s.show({
      split: { layout: 'cols2', at: [0.5] },
      shots: [{}, {}],
      lines: [{ speaker: 'balloon', text: 'Hoi', kind: 'speech', start: 0, end: null, figure: null, at: [0.4, 0.3], panel: 0, tail: { tip: [1.0, 0.6] } }],
    })
    s.setTime(0.1)
    selectBalloon('bal_0')
    s.setTime(0.2)
    const handle = host.querySelector('[data-balloon-handle="tail"]')
    expect(handle).not.toBeNull()
    const pad = handle.querySelector('[data-hit-pad]')
    expect(pad).not.toBeNull()
    expect(parseFloat(getComputedStyle(pad).inset || pad.style.inset)).toBeLessThanOrEqual(-8)

    // Pressing the handle drags the tail; the divider under it never moves.
    const fire = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }))
    fire(pad, 'pointerdown', 248, 300)
    fire(handle, 'pointermove', 300, 320)
    fire(handle, 'pointerup', 300, 320)
    expect(onSplitChange).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('bal_0', expect.objectContaining({ tail: expect.objectContaining({ tip: expect.any(Array) }) }))
  })
})
