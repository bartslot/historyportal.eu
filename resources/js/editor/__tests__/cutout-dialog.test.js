import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openCutout, wireFor, eraserRange } from '../cutout-dialog.js'

const mask = {
  size: { w: 300, h: 450 },
  setMode: vi.fn(), setBrushSize: vi.fn(), setClean: vi.fn(), setEdges: vi.fn(), setEverywhere: vi.fn(), undo: vi.fn(), redo: vi.fn(), destroy: vi.fn(),
  setBrush: vi.fn(), setTolerance: vi.fn(), setCompare: vi.fn(),
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
  wire = { saveEditedImage: vi.fn(async () => ({ ok: true })), resetEditedImage: vi.fn(async () => {}), saveCutout: vi.fn(async () => ({ ok: true, id: 9 })) }
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
    const forErase = $('[data-cut-for="erase restore"]'), forColour = $('[data-cut-for="colour"]')
    expect([forErase.hidden, forColour.hidden]).toEqual([false, true])
    $('[data-cut-tool="colour"] input').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('colour')
    expect([forErase.hidden, forColour.hidden]).toEqual([true, false])
    $('[data-cut-tool="restore"] input').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('restore')
    expect(forErase.hidden).toBe(false)
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
