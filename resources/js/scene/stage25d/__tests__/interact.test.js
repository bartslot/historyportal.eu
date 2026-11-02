import { describe, it, expect, vi, beforeEach } from 'vitest'
// the house view: 2 m wide per metre of distance, to keep the numbers readable
vi.mock('@stage25d/stage25d/layout', () => ({ GROUND_NEAR_M: 2, GROUND_FAR_M: 120, viewWidthAt: (z) => 2 * z }))

const { attachInteraction } = await import('../interact.js')

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
  const onChange = vi.fn()
  const opaque = over.opaque ?? (() => true)
  const onSettled = vi.fn()
  const values = { x: 0.5, scale: 1, rotation: 0, z: 10, ...over.values }
  const api = attachInteraction({
    canvas, host, stage: () => stage, valueOf: (i, prop) => values[prop], alpha: { opaque }, onChange, onSettled,
    onGround: over.onGround ?? (() => false), byDistance: over.byDistance ?? (() => false), groundUnder: over.groundUnder ?? (() => null),
  })
  return { canvas, host, stage, onChange, onSettled, api }
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
    const { canvas, onChange, stage } = setup()
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))   // world x = 1.0 - 0.0 (client minus canvas left = 100)
    stage.worldXAt.mockImplementation((x) => x / 10)
    canvas.dispatchEvent(pointer('pointermove', 260, 100))   // 60 css px further
    expect(onChange).toHaveBeenCalledTimes(1)
    const [index, prop, x] = onChange.mock.calls[0]
    expect([index, prop]).toEqual([2, 'x'])
    expect(x).toBeGreaterThan(0.5)   // moved right of where it started
    canvas.dispatchEvent(pointer('pointerup', 260, 100))
    canvas.dispatchEvent(pointer('pointermove', 300, 100))
    expect(onChange).toHaveBeenCalledTimes(1)   // released: no more moves
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

  it('has the artwork layer chrome: sky ring, eight handles and the rotate grip', () => {
    const { host, api } = setup()
    api.select(2)
    const box = host.querySelector('[data-stage25d-selection]')
    expect(box.style.boxShadow).toContain('#38bdf8')
    expect(box.querySelectorAll('[data-scale-handle]')).toHaveLength(8)
    expect(box.querySelector('[data-rotate-handle]')).not.toBeNull()
  })

  it('a corner handle scales about the middle, in step with the pointer distance', () => {
    const { host, api, onChange } = setup()
    api.select(2)   // box: left 40, top 45, 80 x 90 wide in canvas px -> middle (80, 90)
    const handle = host.querySelector('[data-scale-handle]')
    handle.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { clientX: 100 + 120, clientY: 50 + 90, button: 0, pointerId: 1 }))   // 40 px right of the middle
    handle.dispatchEvent(Object.assign(new Event('pointermove', { bubbles: true }), { clientX: 100 + 160, clientY: 50 + 90, pointerId: 1 }))     // 80 px: twice as far
    expect(onChange).toHaveBeenLastCalledWith(2, 'scale', 2)
  })

  it('the grip turns it clockwise by the angle swept about the middle', () => {
    const { host, api, onChange } = setup()
    api.select(2)
    const grip = host.querySelector('[data-rotate-handle]')
    grip.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { clientX: 100 + 80, clientY: 50 + 10, button: 0, pointerId: 1 }))   // straight above the middle
    grip.dispatchEvent(Object.assign(new Event('pointermove', { bubbles: true }), { clientX: 100 + 130, clientY: 50 + 90, pointerId: 1 }))              // swept to the right of it
    const [, prop, deg] = onChange.mock.calls.at(-1)
    expect(prop).toBe('rotation')
    expect(deg).toBeCloseTo(90, 0)
  })

  it('lets go when another object is selected elsewhere', () => {
    const { api } = setup()
    api.select(2)
    window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: 'art_9' } }))
    expect(api.selected).toBeNull()
  })

  it('on the ground, a drag slides the picture along it: up is farther, grabbed offset kept, snapped to quarter steps', () => {
    // the ground point under the pointer (canvas px: page minus the canvas' left 100, top 50); up the canvas = farther
    const groundUnder = (x, y) => [x / 20, 30 - y / 10]
    const { canvas, onChange, onSettled } = setup({ onGround: () => true, groundUnder, values: { x: 0.6, z: 10 } })   // stands at [2, 10] m
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))   // grabbed at [5, 25]
    canvas.dispatchEvent(pointer('pointermove', 221, 81))    // pointer at [6.05, 26.9]: +1.05 sideways, +1.9 farther
    expect(onChange.mock.calls).toEqual([[2, 'x', 0.625], [2, 'z', 12]])   // [3.05, 11.9] on the 1 m grid: [3, 12]
    canvas.dispatchEvent(pointer('pointermove', 241, 1))     // +2.05, +9.9: [4.05, 19.9] on the 5 m grid, 1.25 m steps
    expect(onChange.mock.calls.slice(2)).toEqual([[2, 'x', 0.5938], [2, 'z', 20]])   // [3.75, 20]
    canvas.dispatchEvent(pointer('pointermove', 241, 101))   // pulled back down: nearer again
    expect(onChange.mock.calls.slice(4)[1][2]).toBeLessThan(20)
    canvas.dispatchEvent(pointer('pointerup', 241, 101))
    expect(onSettled).toHaveBeenCalledWith(2)
  })

  it('no ground under the pointer (above the horizon): the picture stays put', () => {
    const { canvas, onChange } = setup({ onGround: () => true, groundUnder: (x, y) => (y < 30 ? null : [0, 5]) })
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))
    canvas.dispatchEvent(pointer('pointermove', 200, 60))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('resizing on the ground changes the distance, not the size: twice as big is half as far, same column', () => {
    const { canvas, onChange } = setup({ onGround: () => true, byDistance: () => true, values: { x: 0.6, z: 10 } })
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))   // select layer 2: box 40..120 x 45..135 in canvas px
    const corner = document.querySelectorAll('[data-scale-handle]')[3]   // bottom right
    corner.setPointerCapture = vi.fn()
    corner.dispatchEvent(pointer('pointerdown', 220, 185))   // box middle (80, 90) = page (180, 140)
    corner.dispatchEvent(pointer('pointermove', 260, 230))   // twice as far from the middle
    expect(onChange.mock.calls).toEqual([[2, 'x', 0.6], [2, 'z', 5]])   // [2, 10] m -> [1, 5] m: x share unchanged
  })

  it('draws the ground grid over the canvas while editing', () => {
    const { api, host } = setup({ stage: { screenOf: ([x, , z]) => ({ x: 0.5 + x / z, y: 0.5 + 1 / z }), cameraKey: () => 'k' } })
    api.place()
    const path = host.querySelector('[data-stage25d-grid] path')
    expect(path.getAttribute('d').length).toBeGreaterThan(100)
  })
})
