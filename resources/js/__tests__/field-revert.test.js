import { describe, it, expect, beforeEach } from 'vitest'
import { initFieldRevert, revertTo, isRevertable } from '../ui/field-revert.js'

const mount = (html) => {
  document.body.innerHTML = html
  return document.body.firstElementChild
}

const esc = (el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))

beforeEach(() => { document.body.innerHTML = ''; delete document.__fieldRevertReady })

describe('which fields Esc applies to', () => {
  it('covers the panel’s numeric fields and its sliders', () => {
    const el = mount('<div><input type="number"><input type="range"><input type="text"><button></button></div>')
    const [num, range, text] = el.querySelectorAll('input')
    expect(isRevertable(num)).toBe(true)
    expect(isRevertable(range)).toBe(true)
    expect(isRevertable(text)).toBe(false)
    expect(isRevertable(el.querySelector('button'))).toBe(false)
  })
})

describe('putting a value back', () => {
  /**
   * Both events, in that order. `input` is what the live preview and the aspect lock listen on and
   * `change` is what saves — reverting without the second would put the number back on screen and
   * leave the wrong one on the server.
   */
  it('tells the live preview AND the save', () => {
    const el = mount('<input type="number" value="50">')
    const seen = []
    el.addEventListener('input', () => seen.push('input'))
    el.addEventListener('change', () => seen.push('change'))

    revertTo(el, '20')

    expect(el.value).toBe('20')
    expect(seen).toEqual(['input', 'change'])
  })

  it('says nothing when the value has not moved', () => {
    const el = mount('<input type="number" value="50">')
    const seen = []
    el.addEventListener('input', () => seen.push('input'))

    expect(revertTo(el, '50')).toBe(false)
    expect(seen).toEqual([])
  })
})

describe('Escape in a field', () => {
  it('restores the value the field was focused with', () => {
    initFieldRevert(document)
    const el = mount('<input type="number" value="50">')

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    el.value = '9'                       // the teacher types
    esc(el)

    expect(el.value).toBe('50')
  })

  /**
   * The value at FOCUS, not the last saved one: a field edited twice without leaving must still go
   * back to where the visit started.
   */
  it('goes back to the start of the visit, not the previous keystroke', () => {
    initFieldRevert(document)
    const el = mount('<input type="number" value="50">')

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    el.value = '9'
    el.value = '3'
    esc(el)

    expect(el.value).toBe('50')
  })

  /** Or Esc also closes whatever panel sits above the field. */
  it('swallows the key when it reverted something', () => {
    initFieldRevert(document)
    const el = mount('<input type="number" value="50">')
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    el.value = '9'

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    el.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  /** But an untouched field must let Esc through to close the panel. */
  it('lets the key through when there is nothing to revert', () => {
    initFieldRevert(document)
    const el = mount('<input type="number" value="50">')
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    el.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  /**
   * THE REGRESSION. The remembered value used to live in a data-attribute on the field, and a
   * Livewire morph re-applies the server's attributes over the element — stripping one the server
   * has never heard of. Focused, handler installed, memory gone.
   */
  it('survives a morph rewriting the field’s attributes', () => {
    initFieldRevert(document)
    const el = mount('<input type="number" value="50">')

    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    el.value = '9'
    // What a morph does: the server's attributes, and nothing it does not know about.
    for (const a of [...el.attributes]) el.removeAttribute(a.name)
    el.setAttribute('type', 'number')

    esc(el)

    expect(el.value).toBe('50')
  })

  it('ignores Escape in a field it never saw focused', () => {
    initFieldRevert(document)
    const el = mount('<input type="number" value="50">')
    el.value = '9'
    esc(el)

    expect(el.value).toBe('9')
  })
})
