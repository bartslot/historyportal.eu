import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openMaskView } from '../photo-editor-mask.js'
import { editSource } from '../../scene/ArtworkOverlay.js'

const mask = { undo: vi.fn(), reset: vi.fn(), setEdges: vi.fn(), destroy: vi.fn(), toDataURL: () => 'data:image/webp;base64,M' }
let report = null
vi.mock('../../scene/quick-mask.js', () => ({
  MAX_FEATHER: 20,
  MAX_SHIFT: 10,
  mountQuickMask: vi.fn(async (art, film, src, onChange) => { report = onChange; mask.src = src; return mask }),
}))

const t = (en) => ({ 'Soft edge': 'Zachte rand', Edge: 'Rand', Save: 'Opslaan' }[en] ?? en)

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('requestAnimationFrame', (fn) => { fn(); return 1 })
  Object.values(mask).forEach((f) => typeof f === 'function' && f.mockClear?.())
})

describe('quick mask in the image editor', () => {
  const open = async (onSave = vi.fn(async () => true), onBack = vi.fn()) => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    await openMaskView(root, { src: 'data:image/png;base64,EDIT', t, onSave, onBack })
    return { root, onSave, onBack, $: (s) => root.querySelector(s) }
  }

  it('masks the picture as it is edited now, in the teacher\'s words', async () => {
    const { $ } = await open()
    expect(mask.src).toBe('data:image/png;base64,EDIT')
    expect($('[data-photo-editor-mask]').textContent).toContain('Zachte rand')
    expect($('[data-mask-save]').textContent).toBe('Opslaan')
    expect($('[data-mask-save]').disabled).toBe(true)   // nothing to save yet
  })

  it('moves the edge live and lets that alone be saved', async () => {
    const { $, onSave } = await open()
    const feather = $('[data-mask-feather]')
    feather.value = '6'
    feather.dispatchEvent(new Event('input'))
    expect(mask.setEdges).toHaveBeenLastCalledWith({ feather: 6, shift: 0 })
    expect($('[data-mask-feather-value]').textContent).toBe('6')
    expect($('[data-mask-save]').disabled).toBe(false)
    $('[data-mask-save]').click()
    await Promise.resolve(); await Promise.resolve()
    expect(onSave).toHaveBeenCalledWith('data:image/webp;base64,M')
    expect($('[data-photo-editor-mask]')).toBeNull()
  })

  it('a cut enables Save and Undo; Back leaves without saving', async () => {
    const { $, onSave, onBack } = await open()
    report({ tolerance: 40, canUndo: true })
    expect($('[data-mask-undo]').disabled).toBe(false)
    expect($('[data-mask-tolerance]').textContent).toBe('Tolerance 40')
    $('[data-mask-back]').click()
    expect(onBack).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
    expect(mask.destroy).toHaveBeenCalled()
  })

  it('stays open when the save is refused', async () => {
    const { $ } = await open(vi.fn(async () => false))
    report({ canUndo: true })
    $('[data-mask-save]').click()
    await Promise.resolve(); await Promise.resolve()
    expect($('[data-mask-save]').disabled).toBe(false)
  })
})

describe('which picture the editor opens', () => {
  it('replays a saved state on the file it was drawn on, else shows what is on screen', () => {
    expect(editSource({ url: '/edit.webp' })).toBe('/edit.webp')                                         // never edited
    expect(editSource({ url: '/e.webp', original_url: '/o.png', edit_state: { a: 1 } })).toBe('/o.png')   // state on the original
    expect(editSource({ url: '/m.webp', original_url: '/o.png' })).toBe('/m.webp')                        // a baked mask
    expect(editSource({ url: '/e2.webp', original_url: '/o.png', edit_state: { a: 1 }, edit_base_url: '/m.webp' })).toBe('/m.webp')
  })
})
