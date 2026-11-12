import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openCutout, wireFor, eraserRange } from '../cutout-dialog.js'

const mask = {
  size: { w: 300, h: 450 },
  setMode: vi.fn(), setBrushSize: vi.fn(), setClean: vi.fn(), setEdges: vi.fn(), setEverywhere: vi.fn(), undo: vi.fn(), redo: vi.fn(), destroy: vi.fn(),
  setBrush: vi.fn(), setTolerance: vi.fn(), setCompare: vi.fn(), cancelPress: vi.fn(() => false), setPaint: vi.fn(),
  resultDataURL: () => 'data:image/webp;base64,CLEAN',
  cutout: () => ({ dataUrl: 'data:image/webp;base64,CUT', box: { x: 0, y: 40, w: 100, h: 150 }, width: 400, height: 600 }),
}
vi.mock('../../scene/quick-mask.js', () => ({
  MAX_FEATHER: 20, MAX_SHIFT: 10, CLEAN_DEFAULTS: { white: 50, fringe: 3, fade: 0 },
  mountQuickMask: vi.fn(async () => mask),
}))

const flush = () => new Promise((r) => setTimeout(r, 0))
let wire

beforeEach(() => {
  document.body.innerHTML = ''
  Object.values(mask).forEach((f) => f?.mockClear?.())
  vi.stubGlobal('requestAnimationFrame', (fn) => { fn(); return 1 })
  const root = document.createElement('div')
  root.setAttribute('wire:id', 'w1')
  root.innerHTML = '<div id="stage"></div>'
  document.body.appendChild(root)
  wire = { saveStage25dLayer: vi.fn(async () => {}), saveEditedImage: vi.fn(async () => ({ ok: true })), resetEditedImage: vi.fn(async () => {}), saveCutout: vi.fn(async () => ({ ok: true, id: 9 })) }
  window.Livewire = { find: vi.fn(() => wire) }
})

const open = async (extra = {}) => {
  const done = openCutout({ id: 's25_band-0', title: 'Meadow', original: '/m.webp', el: document.getElementById('stage'), ...extra })
  await flush()
  return { done, $: (s) => document.querySelector(s) }
}

describe('double-click: the picture cleans itself', () => {
  it('finds the editor component that owns the canvas', () => {
    expect(wireFor(document.getElementById('stage'))).toBe(wire)
  })

  it('opens already cleaned, and the sliders change it live', async () => {
    const { $ } = await open()
    expect(mask.setClean).toHaveBeenLastCalledWith({ white: 50, fringe: 3, fade: 0 })
    const fade = $('[data-cut-fade]')
    fade.value = '40'
    fade.dispatchEvent(new Event('input'))
    expect(mask.setClean).toHaveBeenLastCalledWith({ white: 50, fringe: 3, fade: 40 })
    expect($('[data-cut-fade-value]').textContent).toBe('40')
    $('[data-cut-back]').click()
    $('[data-cut-ask-discard]').click()   // a slider moved: there was something to lose
  })

  it('Before shows the picture as it came in while held', async () => {
    const { $ } = await open()
    $('[data-cut-compare]').dispatchEvent(new Event('pointerdown'))
    expect(mask.setCompare).toHaveBeenLastCalledWith(true)
    $('[data-cut-compare]').dispatchEvent(new Event('pointerup'))
    expect(mask.setCompare).toHaveBeenLastCalledWith(false)
    $('[data-cut-back]').click()
  })

  it('Save puts the clean picture on the item and closes', async () => {
    const { $, done } = await open()
    $('[data-cut-save]').click()
    await done
    expect(wire.saveEditedImage).toHaveBeenCalledWith('s25_band-0', 'data:image/webp;base64,CLEAN', {})
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })

  it('a picture larger than the server takes is not sent: the editor says so with both sizes and keeps the work', async () => {
    const limit = Object.assign(document.createElement('div'), { hidden: true })
    limit.dataset.cutoutLimit = '10'
    document.body.appendChild(limit)
    const toasts = []
    window.addEventListener('toast', (e) => toasts.push(e.detail))
    const { $ } = await open()
    $('[data-cut-save]').click()
    await flush()
    expect(wire.saveEditedImage).not.toHaveBeenCalled()
    expect(toasts.at(-1).type).toBe('error')
    expect(toasts.at(-1).message).toMatch(/MB/)
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    limit.remove()
    $('[data-cut-back]').click()
  })

  it('a picture too big at its first quality is saved as a smaller WebP that fits', async () => {
    const limit = Object.assign(document.createElement('div'), { hidden: true })
    limit.dataset.cutoutLimit = '90'
    document.body.appendChild(limit)
    const was = mask.resultDataURL
    mask.resultDataURL = (q) => `data:image/webp;base64,${'A'.repeat(Math.round(q * 100))}`   // 23 + 85 or 75 chars: over 90; 23 + 60: fits
    const { $ } = await open()
    $('[data-cut-save]').click()
    await flush()
    const sent = wire.saveEditedImage.mock.calls[0][1]
    expect(sent.startsWith('data:image/webp')).toBe(true)
    expect(sent.length).toBeLessThanOrEqual(90)
    mask.resultDataURL = was
    limit.remove()
  })

  it('Save as asset sends the cut-out and what it was cut from, and stays with the work', async () => {
    const { $ } = await open({ from: { bundle: 'nl-prehistory', asset: 'meadow-band-01' } })
    $('[data-cut-asset]').click()
    await flush()
    expect(wire.saveCutout).toHaveBeenCalledWith('data:image/webp;base64,CUT', 'Meadow', { bundle: 'nl-prehistory', asset: 'meadow-band-01', box_h: 150, height: 600 })
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    expect($('[data-cut-asset]').disabled).toBe(false)
    $('[data-cut-back]').click()
  })

  it('offers Back to the original only on a picture edited before', async () => {
    let { $ } = await open()
    expect($('[data-cut-original]').hidden).toBe(true)
    $('[data-cut-back]').click()
    ;({ $ } = await open({ edited: true }))
    expect($('[data-cut-original]').hidden).toBe(false)
    $('[data-cut-back]').click()
  })

  it('stays open and says so when a save is refused', async () => {
    wire.saveEditedImage.mockResolvedValueOnce({ ok: false })
    const toasts = []
    window.addEventListener('toast', (e) => toasts.push(e.detail))
    const { $ } = await open()
    $('[data-cut-save]').click()
    await flush()
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    expect(toasts.at(-1).type).toBe('error')
    $('[data-cut-back]').click()
  })
})

describe('the eraser and its tools', () => {
  const key = (el, init) => el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))

  it('opens on Erase with a brush that suits the size of the picture', async () => {
    const { $ } = await open()
    expect(mask.setMode).toHaveBeenLastCalledWith('erase')
    expect($('[data-cut-tool="erase"] input').checked).toBe(true)
    expect($('[data-cut-tool-name]').textContent).toBe('Erase')
    expect(mask.setBrush).toHaveBeenCalledWith({ size: 15 })
    expect($('[data-cut-esize]').max).toBe('90')
    expect(mask.setTolerance).toHaveBeenCalledWith(30)
    $('[data-cut-back]').click()
  })

  it('a small figure gets a small brush', () => {
    expect(eraserRange(265, 355)).toEqual({ size: 12, max: 71 })
    expect(eraserRange(24, 24).size).toBe(3)
  })

  it('shows the size and softness for Erase and Bring back, the tolerance for Remove colour', async () => {
    const { $ } = await open()
    const forErase = $('[data-cut-for="erase restore paint clone"]'), forColour = $('[data-cut-for="colour"]')
    expect([forErase.hidden, forColour.hidden]).toEqual([false, true])
    $('[data-cut-tool="colour"] input').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('colour')
    expect([forErase.hidden, forColour.hidden]).toEqual([true, false])
    $('[data-cut-tool="restore"] input').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('restore')
    expect(forErase.hidden).toBe(false)
    $('[data-cut-back]').click()
  })

  it('paint: the swatch is a colour picker, the pipette fills it and goes back to the brush', async () => {
    const { mountQuickMask } = await import('../../scene/quick-mask.js')
    const { $ } = await open()
    $('[data-cut-tool="paint"] input').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('paint')
    const swatch = $('[data-cut-colour]')
    expect(swatch.type).toBe('color')
    expect($('[data-cut-for="paint"]').hidden).toBe(false)
    swatch.value = '#336699'
    swatch.dispatchEvent(new Event('input'))
    expect(mask.setPaint).toHaveBeenLastCalledWith({ colour: [51, 102, 153] })
    $('[data-cut-tool="pipette"] input').click()
    mountQuickMask.mock.lastCall[4].onPick([10, 20, 30])   // a click in the picture with the pipette
    expect(swatch.value).toBe('#0a141e')
    expect(mask.setMode).toHaveBeenLastCalledWith('paint')
    $('[data-cut-back]').click()
  })

  it('the clone stamp without a source says so on its tool, a moment after the press', async () => {
    const { mountQuickMask } = await import('../../scene/quick-mask.js')
    const { $ } = await open()
    vi.useFakeTimers()
    mountQuickMask.mock.lastCall[4].onNeedSource()
    vi.runOnlyPendingTimers()
    const tip = document.querySelector('.lp-tip')
    expect(tip?.textContent).toContain('Option/Alt-click where to copy from first.')
    expect($('[data-cut-tool="clone"]').dataset.tooltip).toBe('Clone stamp')   // its own tooltip comes back
    vi.useRealTimers()
    $('[data-cut-back]').click()
  })

  it('the sliders set the brush and the tolerance', async () => {
    const { $ } = await open()
    const set = (name, value) => { const el = $(`[data-cut-${name}]`); el.value = value; el.dispatchEvent(new Event('input')) }
    set('esize', '30')
    expect(mask.setBrush).toHaveBeenLastCalledWith({ size: 30 })
    set('soft', '50')
    expect(mask.setBrush).toHaveBeenLastCalledWith({ softness: 0.5 })
    set('tol', '64')
    expect(mask.setTolerance).toHaveBeenLastCalledWith(64)
    $('[data-cut-back]').click()
  })

  it('undo and redo: the buttons follow the history, and Cmd+Z stays inside the dialog', async () => {
    const { mountQuickMask } = await import('../../scene/quick-mask.js')
    const { $ } = await open()
    const report = mountQuickMask.mock.lastCall[3]
    expect($('[data-cut-undo]').disabled).toBe(true)
    report({ canUndo: true, canRedo: false })
    expect($('[data-cut-undo]').disabled).toBe(false)
    expect($('[data-cut-redo]').disabled).toBe(true)
    const outside = vi.fn()
    window.addEventListener('keydown', outside)
    key($('[data-cut-save]'), { key: 'z', metaKey: true })
    expect(mask.undo).toHaveBeenCalledTimes(1)
    key($('[data-cut-save]'), { key: 'z', metaKey: true, shiftKey: true })
    expect(mask.redo).toHaveBeenCalledTimes(1)
    expect(outside).not.toHaveBeenCalled()
    window.removeEventListener('keydown', outside)
    report({ canUndo: false })
    $('[data-cut-back]').click()
  })

  it('[ and ] change the eraser size', async () => {
    const { $ } = await open()
    key($('[data-cut-save]'), { key: ']' })
    expect($('[data-cut-esize]').value).toBe('17')
    key($('[data-cut-save]'), { key: '[' })
    expect($('[data-cut-esize]').value).toBe('14')
    $('[data-cut-back]').click()
  })

  const withWork = async () => {
    const { mountQuickMask } = await import('../../scene/quick-mask.js')
    const opened = await open()
    mountQuickMask.mock.lastCall[3]({ canUndo: true })
    return opened
  }

  it('without work the back arrow and Esc leave at once', async () => {
    let { $, done } = await open()
    $('[data-cut-back]').click()
    await done
    expect(document.querySelector('[data-cutout]')).toBeNull()
    ;({ done } = await open())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await done
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })

  it('with work the back arrow asks: Keep editing stays, and nothing was saved', async () => {
    const { $ } = await withWork()
    $('[data-cut-back]').click()
    expect($('[data-cut-ask]').hidden).toBe(false)
    $('[data-cut-ask-stay]').click()
    expect($('[data-cut-ask]').hidden).toBe(true)
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    expect(wire.saveEditedImage).not.toHaveBeenCalled()
    $('[data-cut-back]').click()
    $('[data-cut-ask-discard]').click()
  })

  it('Esc does what the back arrow does, and Esc again keeps editing', async () => {
    const { $ } = await withWork()
    const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    esc()
    expect($('[data-cut-ask]').hidden).toBe(false)
    esc()
    expect($('[data-cut-ask]').hidden).toBe(true)
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    esc()
    $('[data-cut-ask-discard]').click()
  })

  it('Discard leaves without saving', async () => {
    const { $, done } = await withWork()
    $('[data-cut-back]').click()
    $('[data-cut-ask-discard]').click()
    await done
    expect(wire.saveEditedImage).not.toHaveBeenCalled()
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })

  it('Save in the question saves and leaves', async () => {
    const { $, done } = await withWork()
    $('[data-cut-back]').click()
    $('[data-cut-ask-save]').click()
    await done
    expect(wire.saveEditedImage).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })

  it('a refused save stays in the editor with the work, says so, and the question is gone', async () => {
    wire.saveEditedImage.mockResolvedValueOnce({ ok: false })
    const { $ } = await withWork()
    $('[data-cut-back]').click()
    $('[data-cut-ask-save]').click()
    await flush()
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    expect($('[data-cut-ask]').hidden).toBe(true)
    $('[data-cut-back]').click()
    $('[data-cut-ask-discard]').click()
  })

  it('a request that fails stays in the editor, ready to try again, with the one toast', async () => {
    let failHook
    window.Livewire.hook = (_name, cb) => { failHook = cb; return () => {} }
    wire.saveEditedImage.mockImplementationOnce(() => new Promise(() => {}))   // what Livewire does on a failed request
    const toasts = []
    const listen = (e) => toasts.push(e.detail)
    window.addEventListener('toast', listen)
    const { $ } = await open()
    $('[data-cut-save]').click()
    await flush()
    const preventDefault = vi.fn()
    failHook({ fail: (cb) => cb({ preventDefault }) })
    await flush()
    expect(preventDefault).toHaveBeenCalled()
    expect(toasts.at(-1).type).toBe('error')
    expect($('[data-cut-save]').disabled).toBe(false)
    window.removeEventListener('toast', listen)
    delete window.Livewire.hook
    $('[data-cut-back]').click()
  })

  it('while the question is up the editor behind it takes no focus', async () => {
    const { $ } = await withWork()
    $('[data-cut-back]').click()
    expect($('header').inert).toBe(true)
    $('[data-cut-ask-stay]').click()
    expect($('header').inert).toBe(false)
    $('[data-cut-back]').click()
    $('[data-cut-ask-discard]').click()
  })

  it('the app behind is inert while it is up and comes back after', async () => {
    const behind = document.body.firstElementChild
    const { $ } = await open()
    expect(behind.inert).toBe(true)
    $('[data-cut-back]').click()
    expect(behind.inert).toBe(false)
  })
})

describe('one window for every mode of a picture', () => {
  const fire = { cols: 4, rows: 2, frames: 8, fps: 12, w: 100, h: 200, loop: true, play: null }
  const stageApi = () => ({ canvas: document.createElement('canvas'), time: 3, sceneId: 77, setLayerProp: vi.fn(), commitLayerProp: vi.fn(), setPeeking: vi.fn(), showPicture: vi.fn(), update: vi.fn() })
  const openAnimation = async (stage = stageApi()) => ({ stage, ...(await open({ frames: fire, stage, stageId: 'layer-1' })) })
  const pickMode = ($, value) => { const r = $(`[name="cut-mode"][value="${value}"]`); r.checked = true; r.dispatchEvent(new Event('change')) }

  beforeEach(() => { vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)) })

  it('a plain picture shows no tabs and no Show scene outside the stage', async () => {
    const { $ } = await open()
    expect($('[name="cut-mode"]')).toBeNull()
    expect($('[data-cut-scene]').hidden).toBe(true)
    expect($('[data-cut-view]').hidden).toBe(false)
    $('[data-cut-back]').click()
  })

  it('an animation opens on its frames, and its picture loads only when asked for', async () => {
    const { $ } = await openAnimation()
    expect($('[name="cut-mode"][value="frames"]').checked).toBe(true)
    expect($('[data-slot-strip="frames"]').hidden).toBe(false)
    expect($('[data-cut-view]').hidden).toBe(true)
    expect(mask.setClean).not.toHaveBeenCalled()
    pickMode($, 'picture')
    await flush()
    expect(mask.setClean).toHaveBeenLastCalledWith({ white: 0, fringe: 0, fade: 0 })   // a sheet is not cleaned as one picture
    expect($('[data-cut-view]').hidden).toBe(false)
    expect($('[data-slot-strip="frames"]').hidden).toBe(true)
    $('[data-cut-back]').click()
  })

  it('undo follows the tab: Cmd-Z in Frames undoes a frame, not a stroke', async () => {
    const { $ } = await openAnimation()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }))
    expect($('[data-cut-undo]').disabled).toBe(false)
    expect(document.querySelectorAll('[data-frame]')).toHaveLength(9)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }))
    expect(document.querySelectorAll('[data-frame]')).toHaveLength(8)
    expect(mask.undo).not.toHaveBeenCalled()
    $('[data-cut-back]').click()
  })

  it('one Save: frames go to the layer, an untouched picture is not saved, a toast says so', async () => {
    const { $, stage, done } = await openAnimation()
    const toast = vi.fn()
    window.addEventListener('toast', toast, { once: true })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }))
    $('[data-cut-save]').click()
    await done
    expect(wire.saveStage25dLayer).toHaveBeenCalledWith(1, { play: expect.objectContaining({ frames: [0, 0, 1, 2, 3, 4, 5, 6, 7] }) }, 77)
    expect(wire.saveEditedImage).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalled()
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })

  it('leaving with work asks; Discard puts the stage back', async () => {
    const { $, stage, done } = await openAnimation()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }))
    $('[data-cut-back]').click()
    expect($('[data-cut-ask]').hidden).toBe(false)
    $('[data-cut-ask-discard]').click()
    await done
    expect(stage.setLayerProp).toHaveBeenLastCalledWith('layer-1', 'play', undefined)
    expect(wire.saveStage25dLayer).not.toHaveBeenCalled()
  })

  it('a save of the frames that fails says so and stays, with the work', async () => {
    const { $ } = await openAnimation()
    wire.saveStage25dLayer = vi.fn(async () => { throw new Error('offline') })
    const toast = vi.fn()
    window.addEventListener('toast', toast, { once: true })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }))
    $('[data-cut-save]').click()
    await flush()
    expect(toast.mock.calls[0][0].detail.type).toBe('error')
    expect($('[data-cut-undo]').disabled).toBe(false)
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    wire.saveStage25dLayer = vi.fn(async () => {})
    $('[data-cut-back]').click()
    $('[data-cut-ask-discard]').click()
  })

  it('an undo all the way back gives the stage its own picture again', async () => {
    vi.useFakeTimers()
    const stage = stageApi()
    const done = openCutout({ id: 's25_layer-1', title: 'Pieter', original: '/m.webp', el: document.getElementById('stage'), stage, stageId: 'layer-1', plain: true })
    await vi.advanceTimersByTimeAsync(1)
    const onChange = (await import('../../scene/quick-mask.js')).mountQuickMask.mock.lastCall[3]
    const $ = (s) => document.querySelector(s)
    $('[data-cut-scene]').click()
    expect(stage.showPicture).not.toHaveBeenCalled()   // a sky with no work on it: nothing to show yet
    onChange({ canUndo: true })
    await vi.advanceTimersByTimeAsync(400)
    expect(stage.showPicture).toHaveBeenLastCalledWith('layer-1', 'data:image/webp;base64,CLEAN')
    onChange({ canUndo: false })
    await vi.advanceTimersByTimeAsync(400)
    expect(stage.showPicture).toHaveBeenLastCalledWith('layer-1', null)
    vi.useRealTimers()
    $('[data-cut-back]').click()
    await done
  })

  it('a sky opens with its white as it is, and Save without work changes nothing', async () => {
    const { $, done } = await open({ plain: true })
    expect(mask.setClean).toHaveBeenLastCalledWith({ white: 0, fringe: 0, fade: 0 })
    $('[data-cut-save]').click()
    await done
    expect(wire.saveEditedImage).not.toHaveBeenCalled()
  })

  it('Show scene puts the scene beside the work; the stage gets its picture back when nothing was saved', async () => {
    const stage = stageApi()
    const done = openCutout({ id: 's25_layer-1', title: 'Pieter', original: '/m.webp', el: document.getElementById('stage'), stage, stageId: 'layer-1' })
    await flush()
    const $ = (s) => document.querySelector(s)
    expect($('[data-cut-scene]').hidden).toBe(false)
    $('[data-cut-scene]').click()
    expect($('[data-cut-scene-pane]').hidden).toBe(false)
    expect($('[data-cut-view]').hidden).toBe(false)
    expect($('[data-cut-scene]').getAttribute('aria-pressed')).toBe('true')
    expect(stage.setPeeking).toHaveBeenCalledWith(true)
    expect(stage.showPicture).toHaveBeenCalledWith('layer-1', 'data:image/webp;base64,CLEAN')   // a picture that opens cleaned: what Save would give
    $('[data-cut-back]').click()
    await done
    expect(stage.showPicture).toHaveBeenLastCalledWith('layer-1', null)
    expect(stage.setPeeking).toHaveBeenLastCalledWith(false)
  })
})
