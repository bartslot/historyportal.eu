import { describe, it, expect, vi, afterEach } from 'vitest'
import { SplitStage } from '../SplitStage.js'

// Bart 2026-10-16: the divider on the stage is the Position setting, and a pane's picture moves
// with a drag and zooms with the wheel. Driven with pointer events, the way a hand does it.
const W = 1000
const H = 500

function stage (split = { dir: 'v', at: 0.5 }, opts = {}) {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: W })
  Object.defineProperty(host, 'clientHeight', { value: H })
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H })
  document.body.appendChild(host)
  const onSplitChange = vi.fn()
  const onViewChange = vi.fn()
  const s = new SplitStage(host, { editable: true, onSplitChange, onViewChange, ...opts })
  const cover = { url: '/bay.png', kind: 'cover', depth: 1 }
  s.show({ split, shots: [{ layers: [cover] }, { layers: [cover] }] })
  for (const p of s.panels) {
    Object.defineProperty(p.el, 'clientWidth', { value: 500 })
    Object.defineProperty(p.el, 'clientHeight', { value: 500 })
  }
  return { s, host, onSplitChange, onViewChange }
}

const fire = (el, type, init) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, ...init }))

afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers() })

describe('the split divider on the stage', () => {
  it('drags the split and reports where it was let go', () => {
    const { s, host, onSplitChange } = stage()
    const d = host.querySelector('[data-split-divider]')
    // The dock's own grip (.lp-grip): same pill, cursor and hover. Upright for side by side.
    expect(d.classList.contains('lp-grip')).toBe(true)
    expect(d.querySelector('.lp-grip-pill')).not.toBeNull()
    expect(d.getAttribute('aria-orientation')).toBe('vertical')

    fire(d, 'pointerdown', { clientX: 500 })
    expect(d.hasAttribute('data-dragging')).toBe(true)   // held: the pill stays lit
    fire(d, 'pointermove', { clientX: 580 })
    fire(d, 'pointermove', { clientX: 610 })
    // The server's echo of the old position arrives mid-drag: it must not snap the divider back.
    s.setSplit({ dir: 'v', at: 0.5 })
    fire(d, 'pointerup', { clientX: 610 })

    expect(d.hasAttribute('data-dragging')).toBe(false)
    expect(onSplitChange).toHaveBeenCalledOnce()
    expect(onSplitChange).toHaveBeenCalledWith(0.61)
    expect(parseFloat(s.panels[0].el.style.width)).toBeCloseTo(610 - 2.6, 0)   // minus half the gutter
  })

  it('a stacked split drags up and down', () => {
    const { host, onSplitChange } = stage({ dir: 'h', at: 0.5 })
    const d = host.querySelector('[data-split-divider]')
    expect(d.getAttribute('aria-orientation')).toBe('horizontal')
    fire(d, 'pointerdown', { clientY: 250 })
    fire(d, 'pointermove', { clientY: 175 })
    fire(d, 'pointerup', { clientY: 175 })
    expect(onSplitChange).toHaveBeenCalledWith(0.35)
  })
})

describe('a pane picture', () => {
  it('follows a drag and reports the new crop on release', () => {
    const { s, onViewChange } = stage()
    const pane = s.panels[1]
    const img = pane.plate.querySelector('.px-layer-bg img')

    fire(img, 'pointerdown', { clientX: 700, clientY: 250 })
    fire(img, 'pointermove', { clientX: 750, clientY: 250 })
    fire(img, 'pointermove', { clientX: 800, clientY: 300 })
    fire(img, 'pointerup', { clientX: 800, clientY: 300 })

    expect(onViewChange).toHaveBeenCalledWith(1, { x: 30, y: 40, zoom: 1 })
    expect(img.style.objectPosition).toBe('30% 40%')
  })

  it('a click without a drag saves nothing', () => {
    const { s, onViewChange } = stage()
    const img = s.panels[0].plate.querySelector('.px-layer-bg img')
    fire(img, 'pointerdown', { clientX: 100, clientY: 100 })
    fire(img, 'pointerup', { clientX: 101, clientY: 100 })
    expect(onViewChange).not.toHaveBeenCalled()
  })

  it('zooms with the wheel and saves once the wheel stops', () => {
    vi.useFakeTimers()
    const { s, onViewChange } = stage()
    const pane = s.panels[0]
    const img = pane.plate.querySelector('.px-layer-bg img')
    for (let i = 0; i < 3; i++) {
      const e = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
      img.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)   // the page does not scroll under a pane
    }
    expect(onViewChange).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)

    expect(onViewChange).toHaveBeenCalledOnce()
    const [, focus] = onViewChange.mock.calls[0]
    expect(focus.zoom).toBeGreaterThan(1.5)
    expect(img.style.transform).toBe(`scale(${focus.zoom})`)
  })
})

describe('a panel colour', () => {
  it('fills that panel only; the other keeps the scene matte', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const s = new SplitStage(host)
    s.show({ split: { dir: 'v', at: 0.5 }, matte: '#123456', shots: [{ layers: [] }, { layers: [], background_color: '#000000' }] })
    expect(s.panels[0].el.style.background).toBe('rgb(18, 52, 86)')
    expect(s.panels[1].el.style.background).toBe('rgb(0, 0, 0)')
  })
})
