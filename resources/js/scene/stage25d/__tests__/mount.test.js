import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = { built: [], posed: [], disposed: 0, looks: [] }
let frame = () => {}

vi.mock('@stage25d/stage25d/stage', () => ({
  Stage: class {
    constructor (canvas, lib) {
      this.lib = lib
      this.engine = { runRenderLoop: (fn) => { frame = fn }, stopRenderLoop () {}, dispose: () => { calls.disposed++ } }
      this.scene = { render () {}, dispose () {} }
    }
    setLook (look) { calls.looks.push(look) }
    async build (scene) { calls.built.push(scene) }
    tick () {}
    pose (scene, t) { calls.posed.push([scene.id, t]) }
  },
}))
vi.mock('@stage25d/stage25d/library', () => ({
  loadLibrary: vi.fn(async (url) => ({ bundle: 'b', assets: [{ id: 'fig-meisje-push-01', height_m: 1.4 }], base: url })),
}))

import { loadLibrary } from '@stage25d/stage25d/library'
import { mountStage25d } from '../mount.js'
import { isStage25d, libraryUrl } from '../config.js'

const cfg = (over = {}) => ({ id: 'sc01', bundle: 'nl-prehistory', set: { layers: [{ asset: 'a', depth: 'mid' }] }, camera: null, dur_s: 8, ...over })

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
    expect(stage.items()).toEqual([{ id: 'layer-0', label: 'a', depth: 'mid' }])
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
