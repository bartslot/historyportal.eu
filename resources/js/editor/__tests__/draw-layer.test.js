import { describe, it, expect, vi } from 'vitest'
import { thin, shape, isStroke, distanceTo, mountDraw, drawTool, eraserSize, drawMapView } from '../draw-layer.js'
import { geoZoomFactor } from '../../scene/ArtworkOverlay.js'

describe('drawing over the lesson: strokes as data', () => {
  it('keeps a pen trail light but never loses its end', () => {
    const pts = Array.from({ length: 100 }, (_, i) => [i * 0.01, 0])
    const out = thin(pts)
    expect(out.length).toBeLessThan(10)
    expect(out.at(-1)).toEqual([0.99, 0])
  })

  it('a line and an arrow keep only their two ends', () => {
    const pts = [[1, 1], [2, 5], [9, 9]]
    expect(shape('line', pts)).toEqual([[1, 1], [9, 9]])
    expect(shape('arrow', pts)).toEqual([[1, 1], [9, 9]])
  })

  it('a click is not a stroke', () => {
    expect(isStroke({ points: [[5, 5], [5.1, 5]] })).toBe(false)
    expect(isStroke({ points: [[5, 5], [9, 5]] })).toBe(true)
  })

  it('measures how near a tap is to a stroke, for picking it', () => {
    const s = { points: [[0, 50], [100, 50]] }
    expect(distanceTo(s, [50, 50], 200, 100)).toBeCloseTo(0)
    expect(distanceTo(s, [50, 60], 200, 100)).toBeCloseTo(10)
  })
})

describe('drawing over the lesson: in class', () => {
  const host = () => { const h = document.createElement('div'); document.body.appendChild(h); return h }
  const ev = (type, x, y) => new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true })

  it('keeps strokes, selects one with a tap and deletes it; the editor just hands them over', () => {
    HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} })
    const got = vi.fn()
    const d = mountDraw(host(), { keep: true, onStroke: got })
    d.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 })
    d.setTool('line')
    d.canvas.dispatchEvent(ev('pointerdown', 20, 50))
    d.canvas.dispatchEvent(ev('pointermove', 180, 50))
    d.canvas.dispatchEvent(ev('pointerup', 180, 50))
    expect(got).toHaveBeenCalledTimes(1)
    expect(d.strokes).toHaveLength(1)
    expect(d.strokes[0]).toMatchObject({ tool: 'line', points: [[10, 50], [90, 50]] })

    d.canvas.dispatchEvent(ev('pointerdown', 100, 52))   // a tap on it
    d.canvas.dispatchEvent(ev('pointerup', 100, 52))
    expect(d.selected).toBe(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(d.strokes).toHaveLength(0)
    d.destroy()

    const editor = mountDraw(host(), { onStroke: got })
    expect(editor.strokes).toHaveLength(0)
    editor.destroy()
  })
})

describe('drawing over the lesson: in the editor', () => {
  const host = () => { const h = document.createElement('div'); h.className = 'wizard-artwork-host'; document.body.appendChild(h); return h }
  const ev = (type, x, y) => new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true })
  const drag = (canvas, from, to) => {
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 })
    canvas.dispatchEvent(ev('pointerdown', ...from))
    canvas.dispatchEvent(ev('pointermove', ...to))
    canvas.dispatchEvent(ev('pointerup', ...to))
  }

  it('the eraser draws nothing and hands over its path and size', () => {
    HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} })
    const stroke = vi.fn(), erase = vi.fn()
    const d = mountDraw(host(), { onStroke: stroke, onErase: erase })
    d.setTool('eraser')
    d.setWidth(8)
    drag(d.canvas, [20, 50], [180, 50])
    expect(stroke).not.toHaveBeenCalled()
    expect(erase).toHaveBeenCalledWith([[10, 50], [90, 50]], eraserSize(8))
    expect(d.strokes).toHaveLength(0)
    d.destroy()
  })

  it('every stroke of a session goes onto the layer the first one made, until Klaar', async () => {
    HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} })
    document.body.innerHTML = ''
    host()
    let made = 41
    const calls = []
    const t = drawTool()
    t.$wire = {
      addDrawing: vi.fn(async (stroke, aspect, into) => {
        calls.push(into)
        await new Promise((r) => setTimeout(r, 5))   // a slow save: the second stroke must wait for it
        return { ok: true, id: into ?? ++made }
      }),
      eraseDrawing: vi.fn(async () => ({ ok: true })),
    }
    t.start()
    drag(t.surface.canvas, [20, 20], [60, 20])
    drag(t.surface.canvas, [20, 60], [60, 60])
    expect(t.surface.strokes).toHaveLength(2)   // both shown while they save
    await t._queue
    expect(calls).toEqual([null, 42])
    t.stop()
    t.start()
    drag(t.surface.canvas, [20, 20], [60, 20])
    await t._queue
    expect(calls).toEqual([null, 42, null])

    // Klaar while a stroke still saves: the next session does not draw on that layer
    drag(t.surface.canvas, [20, 40], [60, 40])
    t.stop()
    t.start()
    drag(t.surface.canvas, [20, 80], [60, 80])
    await t._queue
    expect(calls.slice(3)).toEqual([43, null])
    t.stop()
  })
})

describe('a drawing on a map sticks to the map', () => {
  const projector = { zoom: () => 6, unproject: (x, y) => ({ lng: x / 10, lat: y / 10 }) }
  const overlay = {
    _projector: projector,
    host: { getBoundingClientRect: () => ({ height: 600 }) },
    _layers: [{ asset_id: 7, anchor: 'map', x: 40, y: 50 }, { asset_id: 8, anchor: 'screen', x: 1, y: 1 }],
    _mapFactor: () => 2,
  }

  it('sends the zoom, the stage height, every pinned layer and the place under a new line', () => {
    expect(drawMapView(overlay, [[10, 20], [30, 40]])).toEqual({
      zoom: 6, px: 600, pins: { 7: { x: 40, y: 50, f: 2 } }, centre: { x: 20, y: 30, lng: 2, lat: 3 },
    })
    expect(drawMapView({ ...overlay, _projector: null })).toBeNull()
  })

  it('scales exactly with the map: double per zoom step, smaller on a taller stage', () => {
    const item = { geo_zoom: 5, geo_px: 600 }
    expect(geoZoomFactor(projector, item, 600)).toBe(2)
    expect(geoZoomFactor(projector, item, 1200)).toBe(1)
    expect(geoZoomFactor({ zoom: () => 3 }, item, 600)).toBe(0.25)
    expect(geoZoomFactor(projector, {}, 600)).toBe(1)
  })
})
