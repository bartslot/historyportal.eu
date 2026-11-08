import { describe, it, expect, vi, beforeEach } from 'vitest'
// the house view: 2 m wide per metre of distance, to keep the numbers readable
vi.mock('@stage25d/stage25d/layout', async (importOriginal) => ({ ...(await importOriginal()), GROUND_NEAR_M: 2, GROUND_FAR_M: 120, viewWidthAt: (z) => 2 * z }))

const { attachInteraction, figureInView, inFrontOf, pickOf } = await import('../interact.js')

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
    footY: over.footY ?? (() => 0), onEmpty: over.onEmpty,
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

  it('a press in the selected box drags the selected picture, also with a nearer picture painted there; a plain click goes on to that one', () => {
    const { canvas, api, onChange, stage } = setup()
    api.select(5)
    stage.worldXAt.mockImplementation((x) => x / 10)
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))   // layer 2 is painted here, in front of the selected 5
    expect(api.selected).toBe(5)
    canvas.dispatchEvent(pointer('pointermove', 260, 100))
    expect(onChange.mock.calls[0][0]).toBe(5)
    canvas.dispatchEvent(pointer('pointerup', 260, 100))
    expect(api.selected).toBe(5)
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))
    canvas.dispatchEvent(pointer('pointerup', 200, 100))
    expect(api.selected).toBe(2)
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

  describe('a figure of parts', () => {
    // the neck's joint at canvas (80, 90), its handle straight above it at (80, 67.5)
    const joints = (mirrored = false) => vi.fn(() => ({ mirrored, joints: [{ name: 'head', at: [0.2, 0.4], tip: [0.2, 0.3] }] }))
    const bone = (over = {}) => setup({ ...over, stage: { jointsOnScreen: joints(over.mirrored), boneLimit: vi.fn((i, name, deg) => deg), ...over.stage }, values: { 'bone:head': 0, ...over.values } })
    const drag = (el, from, to) => {
      el.dispatchEvent(pointer('pointerdown', 100 + from[0], 50 + from[1]))
      el.dispatchEvent(pointer('pointermove', 100 + to[0], 50 + to[1]))
    }

    it('shows a 32 px handle at the far end of each bone it can turn', () => {
      const { host, api } = bone()
      api.select(2)
      const dot = host.querySelector('[data-bone-handle="head"]')
      expect(dot.style.display).toBe('grid')
      expect([dot.style.left, dot.style.top, dot.style.width]).toEqual(['80px', '67.5px', '32px'])
    })

    it('a drag on the handle turns the bone round its joint, clockwise on screen, and never moves the figure', () => {
      const { host, api, onChange } = bone()
      api.select(2)
      drag(host.querySelector('[data-bone-handle="head"]'), [80, 67.5], [102.5, 90])   // swept a quarter round to the right
      expect(onChange.mock.calls.map(([, prop]) => prop)).toEqual(['bone:head'])
      expect(onChange.mock.calls[0][2]).toBeCloseTo(90, 0)
      expect(onChange.mock.calls[0][3]).toEqual({ hold: true })   // shown, not saved while it moves
    })

    it('letting go saves the last turn once', () => {
      const { host, api, onChange } = bone()
      api.select(2)
      const dot = host.querySelector('[data-bone-handle="head"]')
      drag(dot, [80, 67.5], [102.5, 90])
      dot.dispatchEvent(pointer('pointerup', 100 + 102.5, 50 + 90))
      const saves = onChange.mock.calls.filter(([, , , opts]) => opts?.done)
      expect(saves).toHaveLength(1)
      expect(saves[0][2]).toBeCloseTo(90, 0)
    })

    it('turns the other way on a figure that shows mirrored', () => {
      const { host, api, onChange } = bone({ mirrored: true })
      api.select(2)
      drag(host.querySelector('[data-bone-handle="head"]'), [80, 67.5], [102.5, 90])
      expect(onChange.mock.calls.at(-1)[2]).toBeCloseTo(-90, 0)
    })

    it('stops at the joint\'s limit, and turning back moves at once', () => {
      const { host, api, onChange } = bone({ stage: { boneLimit: vi.fn((i, name, deg) => Math.min(30, deg)) } })
      api.select(2)
      const dot = host.querySelector('[data-bone-handle="head"]')
      drag(dot, [80, 67.5], [102.5, 90])                              // 90 asked, 30 allowed
      expect(onChange.mock.calls.at(-1)[2]).toBe(30)
      dot.dispatchEvent(pointer('pointermove', 100 + 80 + 22.5 * Math.sin(Math.PI / 4), 50 + 90 - 22.5 * Math.cos(Math.PI / 4)))   // back by 45
      expect(onChange.mock.calls.at(-1)[2]).toBeCloseTo(-15, 0)
    })

    it('Shift snaps to 15 degrees without passing the joint\'s limit', () => {
      const { host, api, onChange } = bone({ stage: { boneLimit: vi.fn((i, name, deg) => Math.max(-25, Math.min(25, deg))) } })
      api.select(2)
      const dot = host.querySelector('[data-bone-handle="head"]')
      dot.dispatchEvent(pointer('pointerdown', 100 + 80, 50 + 67.5))
      dot.dispatchEvent(Object.assign(pointer('pointermove', 100 + 102.5, 50 + 90), { shiftKey: true }))   // 90 asked, 25 allowed; 30 snapped
      expect(onChange.mock.calls.at(-1)[2]).toBe(25)
    })

    it('hides the side scale handles while the bone handles show: a figure scales by its corners', () => {
      const { host, api } = bone()
      api.select(2)
      const sides = [...host.querySelectorAll('[data-scale-handle]')].slice(4)
      expect(sides.map((h) => h.style.display)).toEqual(['none', 'none', 'none', 'none'])
    })

    it('a picture that is no figure of parts gets no bone handles', () => {
      const { host, api } = setup({ stage: { jointsOnScreen: vi.fn(() => null) } })
      api.select(2)
      expect(host.querySelectorAll('[data-bone-handle]')).toHaveLength(0)
    })
  })

  it('lets go when another object is selected elsewhere', () => {
    const { api } = setup()
    api.select(2)
    window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: 'art_9' } }))
    expect(api.selected).toBeNull()
  })

  it('on the ground, a drag moves the feet with the pointer: up is farther, snapped to quarter steps', () => {
    // the ground point under a canvas point (page minus the canvas' left 100, top 50); its box puts the feet at (80, 135),
    // which is [2, 10] m: where the picture stands. Up the canvas is farther.
    const groundUnder = (x, y) => [(x - 80) / 20 + 2, (135 - y) / 5 + 10]
    const { canvas, onChange, onSettled } = setup({ onGround: () => true, groundUnder, values: { x: 0.6, z: 10 } })
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))   // grabbed by the body, well above the feet
    canvas.dispatchEvent(pointer('pointermove', 221, 90))    // feet to (101, 125): [3.05, 12]
    expect(onChange.mock.calls).toEqual([[2, 'x', 0.625], [2, 'z', 12]])   // on the 1 m grid: [3, 12]
    canvas.dispatchEvent(pointer('pointermove', 241, 50))    // feet to (121, 85): [4.05, 20], the 5 m grid, 1.25 m steps
    expect(onChange.mock.calls.slice(2)).toEqual([[2, 'x', 0.5938], [2, 'z', 20]])   // [3.75, 20]
    canvas.dispatchEvent(pointer('pointermove', 241, 150))   // pulled down past the start: nearer than it was
    expect(onChange.mock.calls[5][2]).toBeLessThan(10)
    canvas.dispatchEvent(pointer('pointerup', 241, 150))
    expect(onSettled).toHaveBeenCalledWith(2)
  })

  it('a picture standing higher (in the far landscape) is moved on the plane its feet stand on', () => {
    const lifts = []
    const { canvas } = setup({ onGround: () => true, footY: () => 3.5, groundUnder: (x, y, lift) => { lifts.push(lift); return [0, 50] } })
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))
    canvas.dispatchEvent(pointer('pointermove', 200, 90))
    expect(lifts).toEqual([3.5])
  })

  it('no ground under the feet (above the horizon): the picture stays put', () => {
    const { canvas, onChange } = setup({ onGround: () => true, groundUnder: (x, y) => (y < 100 ? null : [0, 5]) })
    canvas.dispatchEvent(pointer('pointerdown', 200, 100))
    canvas.dispatchEvent(pointer('pointermove', 200, 60))     // feet from y 135 to 95
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

  it('a press on no standing picture asks for the backdrop there; the scene is not selected when it found one', () => {
    const onEmpty = vi.fn(() => true)
    const { canvas } = setup({ stage: { pickLayers: () => [] }, onEmpty })
    const down = pointer('pointerdown', 150, 80)
    const stop = vi.spyOn(down, 'stopPropagation')
    canvas.dispatchEvent(down)
    expect(onEmpty).toHaveBeenCalledWith(50, 30)
    expect(stop).toHaveBeenCalled()
  })

  it('asks the stage to draw the ground grid while editing, and takes it away when done', () => {
    const setGrid = vi.fn()
    const { api } = setup({ stage: { setGrid } })
    expect(setGrid).toHaveBeenCalledTimes(1)
    const [pieces, rgb] = setGrid.mock.calls[0]
    expect(pieces.length).toBeGreaterThan(5)
    expect(rgb).toHaveLength(3)
    api.destroy()
    expect(setGrid).toHaveBeenLastCalledWith(null)
  })
})

describe('with something selected', () => {
  const hits = [{ index: 1 }, { index: 2 }, { index: 3 }]

  it('a press takes the selected layer even behind another; its click goes to the next one down, and round', () => {
    expect(pickOf(hits, 2)).toEqual({ hit: hits[1], next: 3 })
    expect(pickOf(hits, 3)).toEqual({ hit: hits[2], next: 1 })
  })

  it('nothing selected there: the nearest, and a lone picture has nothing to go to', () => {
    expect(pickOf(hits, 9)).toEqual({ hit: hits[0], next: null })
    expect(pickOf(hits, null).hit).toBe(hits[0])
    expect(pickOf([hits[0]], 1).next).toBe(null)
    expect(pickOf([], 1).hit).toBe(null)
  })

  it('fades only nearer layers that overlap the selected one', () => {
    const box = (x0, x1, z) => ({ x0, x1, y0: 0, y1: 1, z })
    const boxes = [
      { index: 0, box: box(0.2, 0.4, 10) },
      { index: 1, box: box(0.3, 0.5, 5) },    // nearer, overlapping
      { index: 2, box: box(0.6, 0.8, 5) },    // nearer, beside it
      { index: 3, box: box(0.3, 0.5, 20) },   // behind it
      { index: 4, box: null },                // hidden
    ]
    expect(inFrontOf(boxes, 0)).toEqual([1])
    expect(inFrontOf(boxes, 7)).toEqual([])
  })
})

describe('figureInView', () => {
  const box = (x0, x1) => ({ x0, x1, y0: 0.3, y1: 0.7, z: 5 })

  it('takes the selected character, else the one nearest the middle, never one off screen', () => {
    const boxes = [{ index: 1, box: box(0, 0.2) }, { index: 2, box: box(0.4, 0.6) }, { index: 3, box: box(1.2, 1.5) }, { index: 4, box: null }]
    expect(figureInView(boxes, 1)).toBe(1)
    expect(figureInView(boxes, null)).toBe(2)
    expect(figureInView(boxes, 3)).toBe(2)
    expect(figureInView([{ index: 3, box: box(1.2, 1.5) }], null)).toBe(null)
  })
})
