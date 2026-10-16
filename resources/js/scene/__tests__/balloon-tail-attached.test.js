import { describe, it, expect } from 'vitest'
import { BalloonLayer } from '../BalloonLayer.js'

// Bart 2026-10-16: "we are able to dismantle the tail. that shouldn't be the case". The tail was
// drawn from the bubble's box as measured BEFORE it was placed; a bubble that reflowed once placed
// (it was squeezed against its panel's edge) left the tail's root on an edge that was not there.
// The tail is drawn from the box the bubble actually has where it stands.
const sized = (el) => {
  Object.defineProperty(el, 'clientWidth', { value: 1000 })
  Object.defineProperty(el, 'clientHeight', { value: 500 })
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500 })
  return el
}
const host = () => {
  const stage = sized(document.createElement('div'))
  const el = sized(document.createElement('div'))
  stage.appendChild(el)
  document.body.appendChild(stage)
  return el
}

/** A bubble that is 300 x 40 at the left edge but wraps to 120 x 100 once placed further right. */
const reflowing = (bubble) => {
  const placedRight = () => parseFloat(bubble.style.left) > 100
  Object.defineProperty(bubble, 'offsetWidth', { get: () => (placedRight() ? 120 : 300), configurable: true })
  Object.defineProperty(bubble, 'offsetHeight', { get: () => (placedRight() ? 100 : 40), configurable: true })
}

describe('the tail stays on the bubble', () => {
  it('is drawn from the box the bubble has once placed, not the one measured before', () => {
    let geom = null
    const layer = new BalloonLayer(host(), () => null, { editable: true, onPlace: (el, line, tip, g) => { geom = g } })
    layer.setLines([{ speaker: 'balloon', text: 'Peper en kruidnagels.', kind: 'speech', start: 0, at: [0.5, 0.3], tail: { tip: [0.9, 0.9] } }])
    const el = [...layer.shown.values()][0]
    const bubble = el.querySelector('.lp-balloon__bubble')
    reflowing(bubble)
    layer.patchLine(layer.lines[0].id, { at: [0.5, 0.3] })   // redraw with the reflowing bubble

    expect(geom.rect.w).toBe(120)
    expect(geom.rect.h).toBe(100)
    // The root lies on that box's outline.
    const [x, y] = geom.shape.root
    const { left, top, w, h } = geom.rect
    const onEdge = Math.min(Math.abs(x - left), Math.abs(x - (left + w)), Math.abs(y - top), Math.abs(y - (top + h)))
    expect(x).toBeGreaterThanOrEqual(left - 0.5)
    expect(x).toBeLessThanOrEqual(left + w + 0.5)
    expect(onEdge).toBeLessThan(1)
  })
})
