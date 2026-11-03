import { afterEach, describe, expect, it, vi } from 'vitest'
import { BalloonLayer, STAGE25D_FIGURE } from '../BalloonLayer.js'

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
const line = { speaker: 'meisje', text: 'Hij zit muurvast!', start: 1, end: 3, figure: { asset_id: `${STAGE25D_FIGURE}meisje`, mouth: [0.5, 0.3], facing: 1 } }

afterEach(() => { delete window.__stage25d; vi.useRealTimers(); document.body.innerHTML = '' })

describe('a balloon on a stage25d figure', () => {
  it('asks the stage where the speaker\'s head is and points its tail there', () => {
    const asked = []
    window.__stage25d = { figureBox: (char) => { asked.push(char); return { left: 400, top: 100, width: 50, height: 40 } } }
    let tip = null
    const layer = new BalloonLayer(host(), undefined, { onPlace: (el, l, t) => { tip = t } })
    layer.setLines([line])
    layer.update(2)
    expect(asked).toContain('meisje')
    // mouth = box.left + 0.5 * width, box.top + 0.3 * height
    expect(tip).not.toBeNull()
  })

  it('has no tail when the speaker is out of frame (the stage has no box)', () => {
    window.__stage25d = { figureBox: () => null }
    let tip = 'unset'
    const layer = new BalloonLayer(host(), undefined, { onPlace: (el, l, t) => { tip = t } })
    layer.setLines([line])
    layer.update(2)
    expect(tip).toBeFalsy()
  })
})

describe('a balloon leaves the page when its time is up', () => {
  it('is removed even when the browser never finishes its exit animation (hidden tab)', () => {
    vi.useFakeTimers()
    const layer = new BalloonLayer(host(), () => null)
    const el0 = document.createElement('div')
    // an animation that never finishes, as in a background tab
    HTMLElement.prototype.animate = function () { return { onfinish: null } }
    layer.setLines([{ speaker: 'x', text: 'hi', start: 0, end: 2 }])
    layer.update(1)
    expect(document.querySelectorAll('.lp-balloon')).toHaveLength(1)
    layer.update(2.5)
    vi.advanceTimersByTime(300)
    expect(document.querySelectorAll('.lp-balloon')).toHaveLength(0)
    delete HTMLElement.prototype.animate
    void el0
  })
})

describe('a balloon grouped with its speaker (line.group)', () => {
  const grouped = { ...line, start: 0, end: null, group: true, at: [0.1, -0.2] }
  const headAt = (left) => { window.__stage25d = { figureBox: () => ({ left, top: 100, width: 50, height: 40 }) } }

  it('stands at its offset from the mouth, and moves when the figure moves', () => {
    headAt(400)   // mouth: (425, 112) of a 1000 x 500 host
    const layer = new BalloonLayer(host(), undefined, { editable: true })
    layer.setLines([grouped])
    const centre = () => layer.shown.get(0)._drawn.center
    expect(centre()[0]).toBeCloseTo(0.425 + 0.1, 2)
    headAt(600)
    layer._relayout()
    expect(centre()[0]).toBeCloseTo(0.625 + 0.1, 2)
  })

  it('stores a point on the stage as an offset from the mouth; a loose balloon stores it as it is', () => {
    headAt(400)
    const layer = new BalloonLayer(host(), undefined, { editable: true })
    layer.setLines([grouped, { ...grouped, group: false, figure: null, text: 'los' }])
    expect(layer.storedPoint('bal_0', [0.5, 0.1])).toEqual([0.075, -0.124])
    expect(layer.storedPoint('bal_1', [0.5, 0.1])).toEqual([0.5, 0.1])
  })

  it('hides while its speaker is out of frame', () => {
    window.__stage25d = { figureBox: () => null }
    const layer = new BalloonLayer(host(), undefined, { editable: true })
    layer.setLines([grouped])
    expect(layer.shown.get(0).style.visibility).toBe('hidden')
  })
})
