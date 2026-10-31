import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initColorFields, engagedField, settle, paintField } from '../ui/color-field.js'

/**
 * The picker is the browser's popup, owned by the colour input. A morph that visits the field while
 * the teacher drags in it hands the input the server's stale colour, so the open field is skipped
 * until the teacher settles (change), presses elsewhere, or hits Escape / Enter.
 */

let updating = null

const fieldHtml = (isSet) => `
  <div id="out">outside</div>
  <div data-color-field id="field">
    <span data-color-swatch style="background-color: #444"><input type="color" value="#ffffff" id="picker"></span>
    <span data-color-set ${isSet ? '' : 'hidden'}><span data-color-hex>${isSet ? 'FFFFFF' : ''}</span></span>
    <span data-color-unset ${isSet ? 'hidden' : ''}>None</span>
    <input type="number" id="strength" value="100">
    <button id="diamond" type="button"></button>
  </div>
  <input type="color" id="bare" value="#000000">`

const press = (el) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }))
const offered = (el) => {
  let skipped = false
  updating({ el, skip: () => { skipped = true } })
  return skipped
}

beforeAll(() => {
  window.Livewire = { hook: (name, fn) => { if (name === 'morph.updating') updating = fn } }
  initColorFields()
})

beforeEach(() => {
  settle()
  document.body.innerHTML = fieldHtml(true)
})

describe('an open colour field is not morphed', () => {
  it('skips the field once the teacher presses its picker', () => {
    press(document.getElementById('picker'))
    expect(offered(document.getElementById('field'))).toBe(true)
  })

  it('skips a bare colour input as its own field', () => {
    const bare = document.getElementById('bare')
    bare.dispatchEvent(new Event('focusin', { bubbles: true }))
    expect(offered(bare)).toBe(true)
  })

  it('lets every other node morph', () => {
    press(document.getElementById('picker'))
    expect(offered(document.getElementById('out'))).toBe(false)
  })

  it('stays skipped through a long drag of input events', () => {
    const picker = document.getElementById('picker')
    press(picker)
    for (const c of ['#101010', '#203040', '#e63946']) {
      picker.value = c
      picker.dispatchEvent(new Event('input', { bubbles: true }))
    }
    expect(offered(document.getElementById('field'))).toBe(true)
  })
})

describe('the field is released', () => {
  const engagedPicker = () => { const p = document.getElementById('picker'); press(p); return p }

  it('on change, when the popup closes', () => {
    engagedPicker().dispatchEvent(new Event('change', { bubbles: true }))
    expect(engagedField()).toBeNull()
  })

  it('on a press anywhere else', () => {
    engagedPicker()
    press(document.getElementById('out'))
    expect(engagedField()).toBeNull()
  })

  it('on a press on the field\'s own diamond, which must see the server\'s state', () => {
    engagedPicker()
    press(document.getElementById('diamond'))
    expect(engagedField()).toBeNull()
  })

  it.each(['Escape', 'Enter'])('on %s', (key) => {
    engagedPicker()
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    expect(engagedField()).toBeNull()
  })

  it('when focus leaves the field', () => {
    const p = engagedPicker()
    p.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.getElementById('out') }))
    expect(engagedField()).toBeNull()
  })

  it('but not when focus only moves to the strength box beside it', () => {
    const p = engagedPicker()
    p.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.getElementById('strength') }))
    expect(engagedField()).not.toBeNull()
  })

  it('never keeps a field a scene switch tore out of the page', () => {
    engagedPicker()
    document.body.innerHTML = ''
    expect(engagedField()).toBeNull()
  })
})

describe('the swatch and hex follow the drag locally', () => {
  it('paint the colour the picker holds', () => {
    const picker = document.getElementById('picker')
    picker.value = '#e63946'
    picker.dispatchEvent(new Event('input', { bubbles: true }))
    expect(document.getElementById('field').querySelector('[data-color-swatch]').style.background).toContain('230, 57, 70')
    expect(document.querySelector('[data-color-hex]').textContent).toBe('E63946')
  })

  it('turn a field that had no colour into one that has', () => {
    document.body.innerHTML = fieldHtml(false)
    paintField(document.getElementById('field'), '#2a9d8f')
    expect(document.querySelector('[data-color-set]').hasAttribute('hidden')).toBe(false)
    expect(document.querySelector('[data-color-unset]').hasAttribute('hidden')).toBe(true)
    expect(document.querySelector('[data-color-hex]').textContent).toBe('2A9D8F')
  })

  it('ignore a value that is not a #rrggbb colour', () => {
    paintField(document.getElementById('field'), 'red')
    expect(document.querySelector('[data-color-hex]').textContent).toBe('FFFFFF')
  })
})
