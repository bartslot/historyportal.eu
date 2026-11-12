import { describe, expect, test } from 'vitest'
import { MAX_ZOOM, MIN_ZOOM, installStageZoom, panBy, zoomAround } from './stage-zoom.js'

const rect = { left: 200, top: 100, width: 800, height: 450, right: 1000, bottom: 550 }
const area = { left: 100, top: 64, right: 1100, bottom: 700 }
const one = { z: 1, x: 0, y: 0 }

// the stage box a view gives, from the same unpanned centre and base size as `rect`
const boxOf = (v) => {
  const w = 800 * v.z, h = 450 * v.z
  return { left: 600 - w / 2 + v.x, top: 325 - h / 2 + v.y, width: w, height: h }
}

describe('stage zoom', () => {
  test('keeps the stage point under the pointer where it is', () => {
    const v = zoomAround(one, 2, 400, 200, rect, area)
    const b = boxOf(v)
    expect(v.z).toBe(2)
    // (400, 200) was 25% across, 22.2% down; it still is
    expect((400 - b.left) / b.width).toBeCloseTo(0.25)
    expect((200 - b.top) / b.height).toBeCloseTo(100 / 450)
  })

  test('zooming in and back out returns to where it started', () => {
    const v = zoomAround(one, 1.5, 700, 300, rect, area)
    const back = zoomAround(v, 1 / 1.5, 700, 300, { ...boxOf(v), right: 0, bottom: 0 }, area)
    expect(back.z).toBeCloseTo(1)
    expect(back.x).toBeCloseTo(0)
    expect(back.y).toBeCloseTo(0)
  })

  test('stays between the smallest and largest zoom', () => {
    expect(zoomAround(one, 100, 600, 325, rect, area).z).toBe(MAX_ZOOM)
    expect(zoomAround(one, 0.001, 600, 325, rect, area).z).toBe(MIN_ZOOM)
  })

  test('a pan never pushes the whole stage out of the work area', () => {
    const v = panBy(one, -5000, 5000, rect, area)
    const b = boxOf(v)
    expect(b.left + b.width).toBeGreaterThanOrEqual(area.left + 80 - 1e-6)
    expect(b.top).toBeLessThanOrEqual(area.bottom - 80 + 1e-6)
  })
})

describe('stage zoom: where the wheel counts', () => {
  test('a wheel over a panel above the work area scrolls the panel, never the stage', () => {
    document.body.innerHTML = '<div id="area"></div><div id="root"></div><aside id="panel"><div id="row"></div></aside>'
    const root = document.getElementById('root'), area = document.getElementById('area')
    const zoom = installStageZoom(root, area)
    const pinch = (el) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: -50, ctrlKey: true, bubbles: true, cancelable: true }))
    pinch(document.getElementById('row'))
    expect(zoom.view.z).toBe(1)
    pinch(area)
    expect(zoom.view.z).toBeGreaterThan(1)
    const before = zoom.view
    const scroll = new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true })
    document.getElementById('row').dispatchEvent(scroll)
    expect(zoom.view).toBe(before)   // untouched: the panel scrolls
    expect(scroll.defaultPrevented).toBe(false)
    zoom.destroy()
  })
})
