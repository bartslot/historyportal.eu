import { describe, it, expect } from 'vitest'
import { BalloonLayer } from '../BalloonLayer.js'

// Bart 2026-10-16: "balloons get bigger line width if you increase size, lines should be drawn by
// the same pencil so lines don't increase width or stroke size". The words grow with a balloon,
// the ink line does not: every balloon on a stage is drawn with one pencil.
const stage = () => {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 1920 })
  Object.defineProperty(host, 'clientHeight', { value: 1080 })
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1920, height: 1080, right: 1920, bottom: 1080 })
  document.body.appendChild(host)
  return host
}
const line = (scale, kind = 'speech') => ({ speaker: 'balloon', text: 'Moet ik daarboven klimmen?', kind, start: 0, at: [0.5, 0.3], scale, tail: { tip: [0.6, 0.7] } })
const strokes = (el) => [
  el.querySelector('.lp-balloon__bubble').style.borderWidth,
  ...[...el.querySelectorAll('.lp-balloon__cloud path, .lp-balloon__tail .ink, .lp-balloon__tail .trail')].map(n => n.getAttribute('stroke-width')),
]

describe('one pencil for every balloon', () => {
  for (const kind of ['speech', 'thought']) {
    it(`a ${kind} balloon at 2.5x draws the same line as one at 1x`, () => {
      const layer = new BalloonLayer(stage(), () => null, { editable: true })
      layer.setLines([line(1, kind), line(2.5, kind)])
      const [small, big] = [...layer.shown.values()]
      expect(strokes(big)).toEqual(strokes(small))
      expect(strokes(small).every(w => parseFloat(w) === 2)).toBe(true)
    })
  }

  it('the words still grow with the balloon', () => {
    const layer = new BalloonLayer(stage(), () => null, { editable: true })
    layer.setLines([line(1), line(2)])
    const [small, big] = [...layer.shown.values()].map(el => parseFloat(el.querySelector('.lp-balloon__bubble').style.fontSize))
    expect(big).toBeCloseTo(2 * small, 5)
  })
})

// Bart 2026-10-16: "the bubble doesn't pass yet, only the tail". It did move, but an absolutely
// placed box shrinks to the room left before its panel's edge, so the words wrapped into a column
// that ended at the border. The bubble sizes itself to its words, never to the panel.
describe('a balloon body crossing its panel border', () => {
  it('sizes to its words (max-content, capped by its max width), not to the room left in its panel', () => {
    const layer = new BalloonLayer(stage(), () => null, { editable: true })
    layer.setLines([{ ...line(1.6), at: [1.4, 0.3] }])
    const bubble = [...layer.shown.values()][0].querySelector('.lp-balloon__bubble')
    expect(bubble.style.width).toBe('max-content')
    expect(bubble.style.maxWidth).not.toBe('')
  })
})
