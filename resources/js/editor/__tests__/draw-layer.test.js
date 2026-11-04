import { describe, it, expect, vi } from 'vitest'
import { thin, shape, isStroke, distanceTo, mountDraw } from '../draw-layer.js'

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
