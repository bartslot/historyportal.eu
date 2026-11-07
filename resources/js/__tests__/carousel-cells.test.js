import { describe, test, expect } from 'vitest'
import Flickity from 'flickity'
import { exposeCells, CAROUSEL_OPTIONS } from '../carousel.js'

const row = () => {
  const element = document.createElement('div')
  element.innerHTML = '<a class="carousel-cell" href="/1">one</a><a class="carousel-cell" href="/2">two</a><a class="carousel-cell" href="/3">three</a>'
  document.body.append(element)
  const flickity = new Flickity(element, CAROUSEL_OPTIONS)
  exposeCells(flickity)

  return { element, flickity }
}

const hidden = (element) => element.querySelectorAll('.carousel-cell[aria-hidden]').length

/** PageSpeed 2026-11-06: "ARIA hidden element must not be focusable" on every card but the first. */
describe('exposeCells', () => {
  test('no card is hidden from the accessibility tree', () => {
    expect(hidden(row().element)).toBe(0)
  })

  test('moving the row hides nothing either', () => {
    const { element, flickity } = row()

    flickity.select(1)

    expect(flickity.selectedIndex).toBe(1)
    expect(hidden(element)).toBe(0)
  })

  test('the browser scrolling the clipped viewport to a focused card is undone', () => {
    const { flickity } = row()

    flickity.viewport.scrollLeft = 200
    flickity.viewport.dispatchEvent(new Event('scroll'))

    expect(flickity.viewport.scrollLeft).toBe(0)
  })
})
