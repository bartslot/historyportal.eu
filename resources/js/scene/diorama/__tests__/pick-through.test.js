import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DioramaStage, BLOCKER_OPACITY } from '../DioramaStage.js'
import { alphaAt } from '../alpha-mask.js'

globalThis.ResizeObserver ??= class { observe () {} disconnect () {} }

// A plain level camera and one floor; two pictures, one straight behind the other.
const spec = {
  diorama: 1,
  camera: { width: 1600, height: 900, focal_px: 1000, principal_px: [800, 300], position_m: [0, 0, 1.6], level: true },
  floors: [{ id: 'floor', height_m: 0, cell_m: 1, cells: [[-10, 1], [10, 40]] }],
  items: [
    { id: 'near', asset: 'big', asset_version: 1, floor: 'floor', cell: [0, 4] },     // a big figure in front
    { id: 'far', asset: 'small', asset_version: 1, floor: 'floor', cell: [0, 8] },    // a smaller one behind it
  ],
}
const assets = {
  big: { url: 'big.png', px_per_m: 100, height_m: 2, frame_m: [2, 2] },
  small: { url: 'small.png', px_per_m: 100, height_m: 1, frame_m: [1, 1] },
}
// big.png is drawn only in its left third; small.png is drawn everywhere.
const leftThird = { w: 3, h: 1, alpha: new Uint8Array([255, 0, 0]) }
const solid = { w: 1, h: 1, alpha: new Uint8Array([255]) }

let host, stage
beforeEach(() => {
  host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 1600 })
  Object.defineProperty(host, 'clientHeight', { value: 900 })
  document.body.appendChild(host)
  stage = new DioramaStage(host)
  stage.show(spec, assets, { editable: true })
  stage._masks.set('big.png', leftThird)
  stage._masks.set('small.png', solid)
})
afterEach(() => { stage.destroy(); host.remove() })

const centreOf = id => { const b = stage._shown.get(id).box; return [b.x + b.w / 2, b.y + b.h / 2] }

describe('pick through transparent pixels', () => {
  it('alphaAt reads the mask, and nothing outside the picture', () => {
    expect(alphaAt(leftThird, 0.1, 0.5)).toBe(255)
    expect(alphaAt(leftThird, 0.9, 0.5)).toBe(0)
    expect(alphaAt(solid, 1.2, 0.5)).toBe(0)
  })

  it('a press on the front picture\'s empty part reaches the one behind it', () => {
    const [x, y] = centreOf('far')                  // inside both boxes, in big.png's empty middle
    expect(stage.pickAt(x, y)).toBe('far')
  })

  it('a press on the front picture\'s drawn part picks the front one', () => {
    const b = stage._shown.get('near').box
    expect(stage.pickAt(b.x + b.w * 0.1, b.y + b.h * 0.9)).toBe('near')
  })

  it('nothing drawn under the pointer picks nothing', () => {
    const b = stage._shown.get('near').box
    expect(stage.pickAt(b.x + b.w * 0.9, b.y + b.h * 0.05)).toBeNull()
  })

  it('a press that lands on the front element starts dragging the item behind it', () => {
    const [x, y] = centreOf('far')
    const ev = new Event('pointerdown', { bubbles: true, cancelable: true })
    Object.assign(ev, { clientX: x, clientY: y, pointerId: 1 })
    host.querySelector('[data-diorama-item="near"]').dispatchEvent(ev)
    expect(stage._drag.id).toBe('far')
  })
})

describe('what blocks the selected item fades', () => {
  const opacity = id => host.querySelector(`[data-diorama-item="${id}"]`).style.opacity

  it('selecting the item behind fades the one in front that covers it, only while selected', () => {
    stage._masks.set('big.png', solid)              // the front figure covers the back one
    stage.select('far')
    expect(opacity('near')).toBe(String(BLOCKER_OPACITY))
    expect(opacity('far')).toBe('')
    stage.select(null)
    expect(opacity('near')).toBe('')
  })

  it('a front picture whose drawn part misses the item does not fade', () => {
    stage._masks.set('big.png', leftThird)          // drawn only in its left third, the far one is in the middle
    stage.select('far')
    expect(opacity('near')).toBe('')
  })

  it('nothing behind the selected item fades', () => {
    stage._masks.set('big.png', solid)
    stage.select('near')
    expect(opacity('far')).toBe('')
  })

  it('selecting something else in the editor lets go of the item', () => {
    stage._masks.set('big.png', solid)
    stage.select('far')
    window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: 'txt_title' } }))
    expect(opacity('near')).toBe('')
  })
})

