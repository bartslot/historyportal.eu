import { describe, it, expect, vi } from 'vitest'
import { Avatar3DPlayer } from '../avatar-3d.js'

// Bart 2026-10-16: dragging the dock grip flickered the stage black. Each step resized the WebGL
// canvas from a ResizeObserver, which runs AFTER the frame's render loop and BEFORE paint, and
// setSize clears the drawing buffer — so every step painted an empty canvas.
const fakePlayer = (w, h) => {
  const size = { x: w, y: h }
  const renderer = {
    getSize: (v) => Object.assign(v, size),
    setSize: vi.fn((nw, nh) => { size.x = nw; size.y = nh }),
    render: vi.fn(),
  }
  return { _renderer: renderer, _scene: {}, _camera: { aspect: 1, updateProjectionMatrix: vi.fn() } }
}

describe('Avatar3DPlayer.resize', () => {
  it('repaints in the same frame as the resize, so the cleared canvas is never shown', () => {
    const p = fakePlayer(800, 450)
    Avatar3DPlayer.prototype.resize.call(p, 700, 394)
    expect(p._renderer.setSize).toHaveBeenCalledWith(700, 394, false)
    expect(p._renderer.render).toHaveBeenCalledWith(p._scene, p._camera)
  })

  it('leaves the canvas alone when the box did not change', () => {
    const p = fakePlayer(800, 450)
    Avatar3DPlayer.prototype.resize.call(p, 800, 450)
    expect(p._renderer.setSize).not.toHaveBeenCalled()
  })
})
