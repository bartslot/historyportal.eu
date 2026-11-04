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
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
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
    $('[data-cut-cancel]').click()   // a slider moved: the second press leaves
    $('[data-cut-cancel]').click()
  })

  it('Before shows the picture as it came in while held', async () => {
    const { $ } = await open()
    $('[data-cut-compare]').dispatchEvent(new Event('pointerdown'))
    expect(mask.setCompare).toHaveBeenLastCalledWith(true)
    $('[data-cut-compare]').dispatchEvent(new Event('pointerup'))
    expect(mask.setCompare).toHaveBeenLastCalledWith(false)
    $('[data-cut-cancel]').click()
  })

  it('Apply puts the clean picture on the item and closes', async () => {
    const { $, done } = await open()
    $('[data-cut-apply]').click()
    await done
    expect(wire.saveEditedImage).toHaveBeenCalledWith('s25_band-0', 'data:image/webp;base64,CLEAN', {})
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })

  it('Save as asset sends the cut-out and what it was cut from, for its size in metres', async () => {
    const { $, done } = await open({ from: { bundle: 'nl-prehistory', asset: 'meadow-band-01' } })
    $('[data-cut-asset]').click()
    await done
    expect(wire.saveCutout).toHaveBeenCalledWith('data:image/webp;base64,CUT', 'Meadow', { bundle: 'nl-prehistory', asset: 'meadow-band-01', box_h: 150, height: 600 })
  })

  it('offers Back to the original only on a picture edited before', async () => {
    let { $ } = await open()
    expect($('[data-cut-original]').hidden).toBe(true)
    $('[data-cut-cancel]').click()
    ;({ $ } = await open({ edited: true }))
    expect($('[data-cut-original]').hidden).toBe(false)
    $('[data-cut-cancel]').click()
  })

  it('stays open and says so when a save is refused', async () => {
    wire.saveEditedImage.mockResolvedValueOnce({ ok: false })
    const toasts = []
    window.addEventListener('toast', (e) => toasts.push(e.detail))
    const { $ } = await open()
    $('[data-cut-apply]').click()
    await flush()
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    expect(toasts.at(-1).type).toBe('error')
    $('[data-cut-cancel]').click()
  })
})

describe('the eraser and its tools', () => {
  const key = (el, init) => el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))

  it('opens on Erase with a brush that suits the size of the picture', async () => {
    const { $ } = await open()
    expect(mask.setMode).toHaveBeenLastCalledWith('erase')
    expect($('[data-cut-tool="erase"]').classList.contains('btn-primary')).toBe(true)
    expect(mask.setBrush).toHaveBeenCalledWith({ size: 15 })
    expect($('[data-cut-esize]').max).toBe('90')
    expect(mask.setTolerance).toHaveBeenCalledWith(30)
    $('[data-cut-cancel]').click()
  })

  it('a small figure gets a small brush', () => {
    expect(eraserRange(265, 355)).toEqual({ size: 12, max: 71 })
    expect(eraserRange(24, 24).size).toBe(3)
  })

  it('shows the size and softness for Erase and Bring back, the tolerance for Remove colour', async () => {
    const { $ } = await open()
    const forErase = $('[data-cut-for="erase restore"]'), forColour = $('[data-cut-for="colour"]')
    expect([forErase.hidden, forColour.hidden]).toEqual([false, true])
    $('[data-cut-tool="colour"]').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('colour')
    expect([forErase.hidden, forColour.hidden]).toEqual([true, false])
    $('[data-cut-tool="restore"]').click()
    expect(mask.setMode).toHaveBeenLastCalledWith('restore')
    expect(forErase.hidden).toBe(false)
    $('[data-cut-cancel]').click()
  })

  it('the sliders set the brush and the tolerance', async () => {
    const { $ } = await open()
    const set = (name, value) => { const el = $(`[data-cut-${name}]`); el.value = value; el.dispatchEvent(new Event('input')) }
    set('esize', '30')
    expect(mask.setBrush).toHaveBeenLastCalledWith({ size: 30 })
    set('soft', '50')
    expect(mask.setBrush).toHaveBeenLastCalledWith({ softness: 0.5 })
    set('tol', '64')
    expect(mask.setTolerance).toHaveBeenLastCalledWith('64')
    $('[data-cut-cancel]').click()
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
    key($('[data-cut-apply]'), { key: 'z', metaKey: true })
    expect(mask.undo).toHaveBeenCalledTimes(1)
    key($('[data-cut-apply]'), { key: 'z', metaKey: true, shiftKey: true })
    expect(mask.redo).toHaveBeenCalledTimes(1)
    expect(outside).not.toHaveBeenCalled()
    window.removeEventListener('keydown', outside)
    report({ canUndo: false })
    $('[data-cut-cancel]').click()
  })

  it('[ and ] change the eraser size', async () => {
    const { $ } = await open()
    key($('[data-cut-apply]'), { key: ']' })
    expect($('[data-cut-esize]').value).toBe('17')
    key($('[data-cut-apply]'), { key: '[' })
    expect($('[data-cut-esize]').value).toBe('14')
    $('[data-cut-cancel]').click()
  })

  it('work done takes a second press to throw away', async () => {
    const { mountQuickMask } = await import('../../scene/quick-mask.js')
    const { $ } = await open()
    mountQuickMask.mock.lastCall[3]({ canUndo: true })
    const cancel = $('[data-cut-cancel]')
    cancel.click()
    expect(document.querySelector('[data-cutout]')).not.toBeNull()
    expect(cancel.classList.contains('btn-error')).toBe(true)
    cancel.click()
    expect(document.querySelector('[data-cutout]')).toBeNull()
  })
})
