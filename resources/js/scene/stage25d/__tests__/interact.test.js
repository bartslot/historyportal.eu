import { describe, it, expect, vi, beforeEach } from 'vitest'
import { attachInteraction } from '../interact.js'

const rect = { left: 100, top: 50, width: 400, height: 225, right: 500, bottom: 275, x: 100, y: 50 }

function setup (over = {}) {
  document.body.innerHTML = '<div id="host"><canvas id="c"></canvas></div>'
  const host = document.getElementById('host')
  const canvas = document.getElementById('c')
  canvas.getBoundingClientRect = () => rect
  host.getBoundingClientRect = () => rect
  canvas.setPointerCapture = vi.fn()
  canvas.releasePointerCapture = vi.fn()
  const stage = {
    pickLayers: vi.fn(() => [{ index: 2, asset: { file: 'a.webp' }, u: 0.5, v: 0.5 }]),
    layerBox: vi.fn(() => ({ x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.6, z: 22 })),
    worldXAt: vi.fn((x) => x / 100),
    ...over.stage,
  }
  const onMove = vi.fn()
  const opaque = over.opaque ?? (() => true)
  const api = attachInteraction({ canvas, host, stage: () => stage, xOf: () => 0.5, alpha: { opaque }, onMove })
  return { canvas, host, stage, onMove, api }
}

const pointer = (type, x, y) => Object.assign(new Event(type, { bubbles: true }), { clientX: x, clientY: y, button: 0, pointerId: 1 })

describe('stage25d canvas interaction', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('a press on paint selects the layer, announces it and stops the editor taking it for an empty press', () => {
    const { canvas, api } = setup()
    const heard = []
    window.addEventListener('scene-object-selected', (e) => heard.push(e.detail.id), { once: true })
    const down = pointer('pointerdown', 200, 100)
    const stop = vi.spyOn(down, 'stopPropagation')
    canvas.dispatchEvent(down)
    expect(api.selected).toBe(2)
    expect(heard).toEqual(['s25_layer-2'])
    expect(stop).toHaveBeenCalled()
  })

  it('a press on the transparent margin of a picture picks nothing', () => {
    const { canvas, api } = setup({ opaque: () => false })
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))
    expect(api.selected).toBeNull()
  })

  it('dragging moves x by the world distance in views of that depth', () => {
    const { canvas, onMove, stage } = setup()
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))   // world x = 1.0 - 0.0 (client minus canvas left = 100)
    stage.worldXAt.mockImplementation((x) => x / 10)
    canvas.dispatchEvent(pointer('pointermove', 260, 100))   // 60 css px further
    expect(onMove).toHaveBeenCalledTimes(1)
    const [index, x] = onMove.mock.calls[0]
    expect(index).toBe(2)
    expect(x).toBeGreaterThan(0.5)   // moved right of where it started
    canvas.dispatchEvent(pointer('pointerup', 260, 100))
    canvas.dispatchEvent(pointer('pointermove', 300, 100))
    expect(onMove).toHaveBeenCalledTimes(1)   // released: no more moves
  })

  it('draws its box from the layer box as shares of the canvas, and hides it when nothing is selected', () => {
    const { host, api } = setup()
    api.select(2)
    const box = host.querySelector('[data-stage25d-selection]')
    expect(box.style.display).toBe('block')
    expect(parseFloat(box.style.left)).toBeCloseTo(0.1 * 400)
    expect(parseFloat(box.style.width)).toBeCloseTo(0.2 * 400)
    api.select(null)
    expect(box.style.display).toBe('none')
  })

  it('lets go when another object is selected elsewhere', () => {
    const { api } = setup()
    api.select(2)
    window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: 'art_9' } }))
    expect(api.selected).toBeNull()
  })
})
