import { describe, it, expect, vi, afterEach } from 'vitest'
import labels from '../photo-editor-labels.json'
import { translations, wireFor, openPhotoEditor, nameFilters, tameFilters, FILTERS } from '../photo-editor.js'
import { ArtworkOverlay } from '../../scene/ArtworkOverlay.js'

vi.mock('filerobot-image-editor', () => {
  class Fake {
    static TABS = { ADJUST: 'Adjust', FINETUNE: 'Finetune', FILTERS: 'Filters', ANNOTATE: 'Annotate' }
    static TOOLS = { CROP: 'Crop' }
    constructor (el, config) { Fake.last = this; this.el = el; this.config = config }
    render () { this.rendered = true }
    terminate () { this.terminated = true }
  }
  return { default: Fake }
})

vi.mock('konva', () => ({ default: { Filters: {} } }))
vi.mock('react-filerobot-image-editor/lib/custom/filters', () => ({}))

vi.stubGlobal('Image', class { set src (_) { queueMicrotask(() => { this.naturalHeight = 1200; this.onload?.() }) } })

const flush = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => { document.body.innerHTML = '' })

describe('photo editor: words', () => {
  it('hands Filerobot every label, translated where the page has it, English where not', () => {
    const t = translations({ Save: 'Opslaan', Crop: 'Uitsnede' })
    expect(Object.keys(t)).toEqual(Object.keys(labels))
    expect(t.save).toBe('Opslaan')
    expect(t.cropTool).toBe('Uitsnede')
    expect(t.cancel).toBe('Cancel')
  })

  it('never shows the library\'s clumsy defaults', () => {
    expect(Object.values(labels)).not.toContain('Un-Flip X')
    expect(labels.annotateTabLabel).toBe('Draw')
  })
})

describe('photo editor: the chosen filter survives a save', () => {
  it('gives every filter its real name, which minifying took away, and never renames one', () => {
    const e = function e () {}          // what Konva's Sepia looks like after our build
    const own = function () {}
    own.filterName = 'Clarendon'
    nameFilters({ Sepia: e }, { Clarendon: own, notAFilter: 3 })
    expect(e.filterName).toBe('Sepia')
    expect(own.filterName).toBe('Clarendon')
  })
})

describe('photo editor: the filters on offer', () => {
  it('shows a short list in plain words and hides the Instagram names, again after a redraw', () => {
    const root = document.createElement('div')
    root.innerHTML = ['Sepia', 'Clarendon', 'Gingham', '1977'].map((n) => `<div class="FIE_filters-item"><span class="FIE_filters-item-label">${n}</span></div>`).join('')
    tameFilters(root, (en) => (en === 'Old photo' ? 'Oude foto' : en))
    tameFilters(root, (en) => (en === 'Old photo' ? 'Oude foto' : en))
    const shown = [...root.querySelectorAll('.FIE_filters-item')].filter((i) => i.style.display !== 'none').map((i) => i.textContent)
    expect(shown).toEqual(['Oude foto', 'Bright'])
    expect(Object.keys(FILTERS)).toHaveLength(10)
  })
})

describe('photo editor: a picture to edit', () => {
  const page = () => {
    const root = document.createElement('div')
    root.setAttribute('wire:id', 'abc')
    root.innerHTML = '<div id="stage"></div>'
    document.body.appendChild(root)
    const wire = { saveEditedImage: vi.fn(async () => ({ ok: true })), resetEditedImage: vi.fn(async () => {}) }
    window.Livewire = { find: vi.fn(() => wire) }
    return { wire, stage: document.getElementById('stage') }
  }

  it('finds the editor component that owns the canvas', () => {
    const { wire, stage } = page()
    expect(wireFor(stage)).toBe(wire)
    expect(window.Livewire.find).toHaveBeenCalledWith('abc')
  })

  it('opens Filerobot on the original with its saved state and saves the result once', async () => {
    const { wire, stage } = page()
    const done = openPhotoEditor({ id: 'art_7', title: 'Ship', original: '/ship.png', state: { a: 1 }, edited: true, el: stage })
    await flush(); await flush()
    const { default: Fake } = await import('filerobot-image-editor')
    expect(Fake.last.config.source).toBe('/ship.png')
    expect(Fake.last.config.loadableDesignState).toEqual({ a: 1 })
    expect(Fake.last.config.onBeforeSave()).toBe(false)   // straight to onSave, no "save as" dialog
    expect(Fake.last.config.useBackendTranslations).toBe(false)   // no words fetched from an outside server
    expect(Fake.last.config.Text).toEqual({ text: 'Text', fontSize: 75 })   // never empty; a sixteenth of a 1200 px picture
    expect(document.querySelector('[data-photo-editor-reset]').hidden).toBe(false)

    await Fake.last.config.onSave({ imageBase64: 'data:image/webp;base64,AAA' }, { b: 2 })
    await done
    expect(wire.saveEditedImage).toHaveBeenCalledWith('art_7', 'data:image/webp;base64,AAA', { b: 2 })
    expect(document.querySelector('[data-photo-editor]')).toBeNull()
    expect(Fake.last.terminated).toBe(true)
  })

  it('keeps the editor open and says so when the save is refused', async () => {
    const { wire, stage } = page()
    wire.saveEditedImage.mockResolvedValueOnce({ ok: false })
    const toasts = []
    window.addEventListener('toast', (e) => toasts.push(e.detail))
    openPhotoEditor({ id: 'art_7', original: '/ship.png', el: stage })
    await flush(); await flush()
    const { default: Fake } = await import('filerobot-image-editor')
    await Fake.last.config.onSave({ imageBase64: 'x' }, {})
    expect(document.querySelector('[data-photo-editor]')).not.toBeNull()
    expect(toasts.at(-1).type).toBe('error')
    Fake.last.config.onClose()
  })

  it('goes back to the original, and Esc closes it', async () => {
    const { wire, stage } = page()
    const done = openPhotoEditor({ id: 's25_band-0', original: '/band.png', edited: true, el: stage })
    await flush()
    document.querySelector('[data-photo-editor-reset]').click()
    await done
    expect(wire.resetEditedImage).toHaveBeenCalledWith('s25_band-0')

    const again = openPhotoEditor({ id: 's25_sky', original: '/sky.png', el: stage })
    await flush()
    expect(document.querySelector('[data-photo-editor-reset]').hidden).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await again
    expect(document.querySelector('[data-photo-editor]')).toBeNull()
  })
})

describe('photo editor: a double-click on a picture layer', () => {
  const layer = (extra = {}) => ({ asset_id: 1, url: '/edit.webp', title: 'Ship', x: 50, y: 58, scale: 1, height: 40, ...extra })

  it('asks for the editor on the original picture, in the editor only', () => {
    const seen = []
    const on = (e) => seen.push(e.detail)
    window.addEventListener('image-edit:open', on)
    const edit = document.createElement('div')
    new ArtworkOverlay(edit).setLayers([layer({ original_url: '/ship.png', edit_state: { a: 1 } })])
    edit.querySelector('[data-layer-id="art_1"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const play = document.createElement('div')
    new ArtworkOverlay(play, { readonly: true }).setLayers([layer()])
    play.querySelector('[data-layer-id="art_1"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    window.removeEventListener('image-edit:open', on)

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ id: 'art_1', original: '/ship.png', state: { a: 1 }, edited: true, el: edit })
  })

  it('an unedited layer opens on its own picture', () => {
    let seen = null
    const on = (e) => { seen = e.detail }
    window.addEventListener('image-edit:open', on)
    const el = document.createElement('div')
    new ArtworkOverlay(el).setLayers([layer({ url: '/ship.png' })])
    el.querySelector('[data-layer-id="art_1"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    window.removeEventListener('image-edit:open', on)
    expect(seen).toMatchObject({ original: '/ship.png', edited: false })
  })
})
