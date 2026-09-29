import { describe, it, expect, beforeAll } from 'vitest'
import { initDragScroll } from '../ui/drag-scroll.js'

beforeAll(() => initDragScroll(document))

function row () {
  document.body.innerHTML = '<div data-drag-scroll><button id="a">A</button><button id="b">B</button></div>'
  const el = document.querySelector('[data-drag-scroll]')
  Object.defineProperty(el, 'scrollWidth', { value: 900 })
  Object.defineProperty(el, 'clientWidth', { value: 300 })
  el.scrollLeft = 100
  return el
}
const fire = (target, type, x, extra = {}) => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { clientX: x, button: 0, pointerType: 'mouse', ...extra })
  target.dispatchEvent(e)
}

describe('drag-scroll', () => {
  it('a mouse drag scrolls the row the other way, and the release is not a click', () => {
    const el = row()
    let clicked = false
    document.getElementById('a').addEventListener('click', () => { clicked = true })
    fire(document.getElementById('a'), 'pointerdown', 200)
    fire(document, 'pointermove', 140)
    fire(document, 'pointerup', 140)
    document.getElementById('a').click()
    expect(el.scrollLeft).toBe(160)
    expect(clicked).toBe(false)
  })

  it('a press that barely moves is still a click', () => {
    row()
    let clicked = false
    document.getElementById('b').addEventListener('click', () => { clicked = true })
    fire(document.getElementById('b'), 'pointerdown', 200)
    fire(document, 'pointermove', 202)
    fire(document, 'pointerup', 202)
    document.getElementById('b').click()
    expect(clicked).toBe(true)
  })

  it('touch is left to the native swipe', () => {
    const el = row()
    fire(document.getElementById('a'), 'pointerdown', 200, { pointerType: 'touch' })
    fire(document, 'pointermove', 100)
    fire(document, 'pointerup', 100)
    expect(el.scrollLeft).toBe(100)
  })
})
