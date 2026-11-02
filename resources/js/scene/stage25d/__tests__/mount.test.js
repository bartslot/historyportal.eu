import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = { built: [], posed: [], disposed: 0, looks: [] }
let frame = () => {}

vi.mock('@stage25d/stage25d/stage', () => ({
  STAGE_LOOK: {},
  Stage: class {
    constructor (canvas, lib) {
      this.lib = lib
      calls.stage = this
      this.engine = { runRenderLoop: (fn) => { frame = fn }, stopRenderLoop () {}, dispose: () => { calls.disposed++ } }
      this.scene = { render () {}, dispose () {} }
    }
    setLook (look) { calls.looks.push(look) }
    async build (scene) { calls.built.push(scene) }
    tick () {}
    worldXAt (x) { return (x - 200) / 10 }
    pointerRay (x) { return { origin: [0, 1.6, 0], dir: [(x - 200) / 200, -0.2, 1] } }   // meets the ground 8 m out
    layerBox () { return this.box ?? null }
    rebind (scene) { calls.rebound = scene }
    pose (scene, t) { calls.posed.push([scene.id, t]) }
  },
}))
vi.mock('@stage25d/stage25d/look', () => ({ LOOK_RANGE: {}, lookNum: (look, key) => look[key] }))
vi.mock('@stage25d/stage25d/library', () => ({
  resolveAsset: (lib, ref) => lib.assets.find((a) => a.id === ref.asset) ?? null,
  loadLibrary: vi.fn(async (url) => ({ bundle: 'b', assets: [{ id: 'fig-meisje-push-01', height_m: 1.4 }], base: url })),
}))

import { loadLibrary } from '@stage25d/stage25d/library'
import { viewWidthAt } from '@stage25d/stage25d/layout'
import { mountStage25d } from '../mount.js'
import { isStage25d, libraryUrl } from '../config.js'

const cfg = (over = {}) => ({ id: 'sc01', bundle: 'nl-prehistory', set: { layers: [{ asset: 'a', depth: 'mid' }] }, camera: null, dur_s: 8, ...over })

describe('stage25d live edits', () => {
  beforeEach(() => { Object.assign(calls, { built: [], posed: [], disposed: 0, looks: [] }); document.body.innerHTML = '<div id="h"></div>' })

  const two = () => cfg({ set: { layers: [{ asset: 'a', depth: 'mid', x: 0.5 }, { asset: 'b', depth: 'fg', figure: 'meisje' }] } })

  it('lists layers, the figure by name, then the camera', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(two())
    expect(stage.items().map((i) => [i.id, i.label])).toEqual([['layer-0', 'A'], ['layer-1', 'Meisje'], ['camera', 'Camera']])
  })

  it('a moved or keyed layer redraws without a rebuild and is the same set', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(two())
    stage.setLayerProp('layer-0', 'x', 0.9)
    stage.setLayerKeys('layer-1', [{ t: 0, x: 0.1 }, { t: 2, x: 0.7 }])
    expect(calls.built).toHaveLength(1)
    expect(calls.rebound.set.layers[0].x).toBe(0.9)
    expect(stage.readLayerProp('layer-0', 'x')).toBe(0.9)
    stage.update(1)
    expect(stage.readLayerProp('layer-1', 'x')).toBeGreaterThan(0.1)
    expect(stage.matches(cfg({ set: { layers: [{ asset: 'a', depth: 'mid', x: 0.2 }, { asset: 'b', depth: 'fg', figure: 'meisje' }] } }))).toBe(true)
  })

  it('the eye hides one layer for the canvas only', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(two())
    stage.setHidden('layer-0', true)
    expect(calls.rebound.set.layers[0].opacity).toBe(0)
    stage.setHidden('layer-0', false)
    expect(calls.rebound.set.layers[0].opacity).toBeUndefined()
  })

  it('a base value is saved through onCommit with its layer index', async () => {
    const saved = []
    const stage = await mountStage25d(document.getElementById('h'), { onCommit: (i, p, scene) => saved.push(scene === undefined ? [i, p] : [i, p, scene]) })
    await stage.show(two())
    stage.commitLayerProp('layer-1', 'y', 0.3)
    expect(saved).toEqual([])   // no scene stamped yet: a save must not go out without knowing which scene it is for
    stage.sceneId = 5
    stage.commitLayerProp('layer-1', 'y', 0.3)
    expect(saved).toEqual([[1, { y: 0.3 }, 5]])
    expect(stage.config).toBeTruthy()
  })

  it('adopts the server copy once when it changes (undo) and ignores a repeat', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(two())
    const back = cfg({ set: { layers: [{ asset: 'a', depth: 'mid', x: 0.1 }, { asset: 'b', depth: 'fg', figure: 'meisje' }] } })
    expect(stage.adopt(two())).toBe(false)
    expect(stage.adopt(back)).toBe(true)
    expect(stage.readLayerProp('layer-0', 'x')).toBe(0.1)
    expect(stage.adopt(back)).toBe(false)
  })
})

describe('stage25d drop from the Assets tab', () => {
  beforeEach(() => { Object.assign(calls, { built: [], posed: [], disposed: 0, looks: [] }); document.body.innerHTML = '<div id="h"></div>' })

  const drop = (canvas, id, clientX) => {
    const e = Object.assign(new Event('drop', { bubbles: true, cancelable: true }), {
      clientX, clientY: 90, dataTransfer: { getData: (type) => (type === 'application/x-lp-stage25d' ? id : ''), types: ['application/x-lp-stage25d'] },
    })
    canvas.dispatchEvent(e)
    return e
  }

  it('a dropped picture becomes a layer standing where the pointer is', async () => {
    const saved = []
    const stage = await mountStage25d(document.getElementById('h'), { editable: true, onCommit: (i, p, scene) => saved.push([i, p, scene]) })
    stage.sceneId = 4
    await stage.show(cfg({ set: { layers: [{ asset: 'a', depth: 'mid' }] } }))
    stage.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 225 })
    const e = drop(stage.canvas, 'fig-meisje-push-01', 300)
    await new Promise((r) => setTimeout(r, 0))
    expect(e.defaultPrevented).toBe(true)
    expect(stage.items().filter((i) => i.id !== 'camera')).toHaveLength(2)
    expect(saved[0][1].add.asset).toBe('fig-meisje-push-01')
    // it stands on the ground where it was dropped: 4 m right, 8 m out (the fg band), snapped; x a share of the view there
    expect(saved[0][1].add).toMatchObject({ z: 8, depth: 'fg' })
    expect(saved[0][1].add.x).toBeCloseTo(0.5 + 4 / viewWidthAt(8), 3)
  })

  it('anything else dropped is left alone', async () => {
    const stage = await mountStage25d(document.getElementById('h'), { editable: true })
    await stage.show(cfg())
    const e = drop(stage.canvas, '', 100)
    expect(e.defaultPrevented).toBe(false)
  })
})

describe('stage25d sky', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="h"></div>' })

  it('lists the sky as its own row, however the scene names it, and swaps it', async () => {
    const saved = []
    const stage = await mountStage25d(document.getElementById('h'), { onCommit: (i, p, scene) => saved.push([i, p, scene]) })
    stage.sceneId = 3
    await stage.show(cfg({ set: { sky: 'fig-meisje-push-01', layers: [{ asset: 'a', depth: 'mid' }] } }))
    expect(stage.items().map((i) => i.id)).toEqual(['layer-0', 'sky', 'camera'])
    expect(stage.layerInfo('sky').asset).toBe('fig-meisje-push-01')
    stage.select('sky')
    expect(stage.skySelected).toBe(true)
    expect(stage.selection).toBeNull()
  })
})

describe('stage25d distance on the ground', () => {
  beforeEach(() => { Object.assign(calls, { built: [], posed: [], disposed: 0, looks: [] }); document.body.innerHTML = '<div id="h"></div>' })
  const fig = (over = {}) => ({ asset: 'fig-meisje-push-01', depth: 'mid', ...over })

  it('reads a layer without z at its band distance; a distance saves on its own; a figure has no Scale row', async () => {
    const saved = []
    const stage = await mountStage25d(document.getElementById('h'), { onCommit: (i, p, scene) => saved.push([i, p, scene]) })
    stage.sceneId = 9
    await stage.show(cfg({ set: { layers: [fig({ x: 0.5 })] } }))
    expect(stage.readLayerProp('layer-0', 'z')).toBe(22)
    stage.commitLayerProp('layer-0', 'z', 10)
    expect(saved).toEqual([[0, { z: 10 }, 9]])
    expect(stage.layerInfo('layer-0')).toMatchObject({ ground: true, showScale: false })
  })

  it('a picture moved into another distance band takes its name after the drag (one rebuild, one save)', async () => {
    const saved = []
    const stage = await mountStage25d(document.getElementById('h'), { onCommit: (i, p, scene) => saved.push([i, p, scene]) })
    stage.sceneId = 9
    await stage.show(cfg({ set: { layers: [fig({ x: 0.5, z: 22 })] } }))
    stage.setLayerProp('layer-0', 'z', 6)
    await stage.settleBand(0)
    expect(calls.built).toHaveLength(2)
    expect(saved).toEqual([[0, { depth: 'fg' }, 9]])
    await stage.settleBand(0)
    expect(saved).toHaveLength(1)   // already named right: nothing to do
  })

  it('dragged in front of a nearer one in the list, it stands nearer, the same size and column on screen', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(cfg({ set: { layers: [fig({ x: 0.7, z: 20 }), fig({ x: 0.5, z: 8 })] } }))
    const call = vi.fn()
    stage.reorderLayers([0, 1], 0, call)   // layer 0 to the front, ahead of the one at 8 m
    const [, , , x, z, scale] = call.mock.calls[0]
    expect(z).toBe(6.4)                 // 8 / 1.25, not snapped: a snap could carry it past its neighbour
    expect(x).toBeCloseTo(0.7, 3)       // the camera stands at the middle: the same share of the view is the same column
    expect(scale).toBeCloseTo(6.4 / 20)
    call.mockClear()
    stage.reorderLayers([1, 0], 0, call)   // already behind it: only the order changes, its place is saved as it is
    expect(call.mock.calls[0].slice(3)).toEqual([0.7, 20, 1])
  })

  it('a strip in the list between two ground pictures is skipped: the neighbours on the ground decide', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    const lib = calls.stage.lib
    lib.assets.push({ id: 'strip', layer: 'bg', height_m: 20 })
    await stage.show(cfg({ set: { layers: [fig({ x: 0.5, z: 30 }), { asset: 'strip', depth: 'bg', x: 0.5 }, fig({ x: 0.5, z: 10 })] } }))
    const call = vi.fn()
    stage.reorderLayers([2, 0, 1], 0, call)   // layer 0 dropped between the 10 m one and the strip, at the back of the ground
    expect(call.mock.calls[0].slice(3)).toEqual([0.5, 30, 1])   // already behind the 10 m one: nothing changes but the order
    call.mockClear()
    stage.reorderLayers([0, 1, 2], 1, call)   // the strip itself restacks by its band, as before
    expect(call.mock.calls[0].slice(3)).toEqual([null, null, null])
  })
})

describe('stage25d undo after own edits', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="h"></div>' })

  it('the server going back to the loaded state is adopted after the teacher edited since', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    const loaded = cfg({ set: { layers: [{ asset: 'a', depth: 'mid', x: 0.5 }] } })
    await stage.show(loaded)
    stage.setLayerKeys('layer-0', [{ t: 0, x: 0.1 }, { t: 2, x: 0.9 }])   // saved by the timeline: the server now holds this
    expect(stage.adopt(loaded)).toBe(true)                                 // undo: the server is back at the loaded state
    expect(stage.items()[0].keys).toEqual([])
  })
})

describe('stage25d mount', () => {
  beforeEach(() => { Object.assign(calls, { built: [], posed: [], disposed: 0, looks: [] }); document.body.innerHTML = '<div id="h"></div>' })

  it('puts a canvas in the host, builds the scene from the config and marks the host ready', async () => {
    const host = document.getElementById('h')
    const stage = await mountStage25d(host)
    expect(host.querySelector('canvas.stage25d-canvas')).not.toBeNull()
    await stage.show(cfg())
    expect(calls.built).toHaveLength(1)
    expect(calls.built[0].set.layers[0].asset).toBe('a')
    expect(host.dataset.stage25dReady).toBe('1')
    expect(loadLibrary).toHaveBeenCalledWith('/storage/library/nl-prehistory/library.json')
  })

  it('matches() is true for the same config and false after an edit', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(cfg())
    expect(stage.matches(cfg())).toBe(true)
    expect(stage.matches(cfg({ dur_s: 9 }))).toBe(false)
  })

  it('poses at the editor time, then follows the narration clock plus the lead-in', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(cfg({ narration_at_s: 1.5 }))
    stage.update(2)
    frame()
    expect(calls.posed.at(-1)).toEqual(['sc01', 2])
    stage.play(() => 3)
    frame()
    expect(calls.posed.at(-1)).toEqual(['sc01', 4.5])
  })

  it('knows where a figure\'s head is, for the balloon tail, and nothing for a char that is not drawn', async () => {
    const host = document.getElementById('h')
    const stage = await mountStage25d(host)
    const layers = [{ asset: 'fig-meisje-push-01', figure: 'meisje', depth: 'fg', x: 0.5, scale: 1 }]
    stage.canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 1000, height: 500 })
    await stage.show(cfg({ set: { layers }, figures: [{ char: 'meisje' }] }))
    expect(calls.built[0].figures).toEqual([{ char: 'meisje' }])
    const box = stage.figureBox('meisje')
    expect(box).not.toBeNull()
    expect(box.left).toBeGreaterThan(10)
    expect(box.left).toBeLessThan(1010)
    expect(box.top).toBeGreaterThan(20)
    expect(stage.figureBox('opa')).toBeNull()
    expect(stage.config.bundle).toBe('nl-prehistory')
  })

  it('lists its layers for the object list', async () => {
    const stage = await mountStage25d(document.getElementById('h'))
    await stage.show(cfg())
    expect(stage.items().map((i) => i.id)).toEqual(['layer-0', 'camera'])
  })

  it('destroy() disposes the engine and removes the canvas', async () => {
    const host = document.getElementById('h')
    const stage = await mountStage25d(host)
    await stage.show(cfg())
    stage.destroy()
    expect(calls.disposed).toBe(1)
    expect(host.querySelector('canvas')).toBeNull()
    expect(host.dataset.stage25dReady).toBeUndefined()
  })
})

describe('stage25d config helpers', () => {
  it('knows a stage scene by kind and block', () => {
    expect(isStage25d({ kind: 'stage25d', config: { stage25d: {} } })).toBe(true)
    expect(isStage25d({ kind: 'stage25d', config: {} })).toBe(false)
    expect(isStage25d({ kind: 'narration', config: { stage25d: {} } })).toBe(false)
  })
  it('builds a library url from the bundle', () => {
    expect(libraryUrl('nl-prehistory')).toBe('/storage/library/nl-prehistory/library.json')
  })
})
