import { describe, it, expect } from 'vitest'
import { isTypingTarget, isPlayPauseKey } from '../ui/keyboard.js'

/** A keydown as the browser hands it over, with only the fields the guard reads. */
const press = (over = {}) => ({
  code: 'Space',
  repeat: false,
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  target: document.body,
  ...over,
})

const el = (html) => {
  const host = document.createElement('div')
  host.innerHTML = html
  return host.firstElementChild
}

describe('where a shortcut must keep its hands off', () => {
  it('leaves the three form fields alone', () => {
    expect(isTypingTarget(el('<input type="number">'))).toBe(true)
    expect(isTypingTarget(el('<textarea></textarea>'))).toBe(true)
    expect(isTypingTarget(el('<select></select>'))).toBe(true)
  })

  it('leaves a rich-text box alone, and anything nested inside one', () => {
    const box = el('<div contenteditable="true"><span>a word</span></div>')
    document.body.append(box)
    expect(isTypingTarget(box)).toBe(true)
    expect(isTypingTarget(box.querySelector('span'))).toBe(true)
    box.remove()
  })

  it('treats contenteditable="false" as the opt-out it is', () => {
    expect(isTypingTarget(el('<div contenteditable="false">x</div>'))).toBe(false)
  })

  it('claims a button, a body and a nothing', () => {
    expect(isTypingTarget(el('<button>Play</button>'))).toBe(false)
    expect(isTypingTarget(document.body)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
    expect(isTypingTarget(undefined)).toBe(false)
  })
})

describe('which Space belongs to the transport', () => {
  it('takes a bare Space pressed with nothing focused', () => {
    expect(isPlayPauseKey(press())).toBe(true)
  })

  it('refuses every other key', () => {
    expect(isPlayPauseKey(press({ code: 'KeyK' }))).toBe(false)
    expect(isPlayPauseKey(press({ code: 'Enter' }))).toBe(false)
  })

  /**
   * The panel is nothing but number fields and the script editor is one tab away, so this is the
   * case that decides whether the shortcut is usable at all.
   */
  it('refuses a Space typed into a field', () => {
    expect(isPlayPauseKey(press({ target: el('<input type="number">') }))).toBe(false)
    expect(isPlayPauseKey(press({ target: el('<textarea></textarea>') }))).toBe(false)
  })

  it('refuses a Space a modifier has claimed', () => {
    expect(isPlayPauseKey(press({ metaKey: true }))).toBe(false)
    expect(isPlayPauseKey(press({ ctrlKey: true }))).toBe(false)
    expect(isPlayPauseKey(press({ altKey: true }))).toBe(false)
  })

  /** Holding Space fires keydown over and over; a toggle would strobe between play and pause. */
  it('refuses a repeat, so holding the key is one press', () => {
    expect(isPlayPauseKey(press({ repeat: true }))).toBe(false)
  })

  it('refuses a Space someone else has already handled', () => {
    expect(isPlayPauseKey(press({ defaultPrevented: true }))).toBe(false)
  })

  it('survives being handed nothing', () => {
    expect(isPlayPauseKey(null)).toBe(false)
    expect(isPlayPauseKey(undefined)).toBe(false)
  })
})
