import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderGallery } from '../gallery-scene.js'

/**
 * A narrated gallery must last as long as its narration. It used to cycle on a fixed 5 s clock,
 * so Dante's four images were done in 20 s of a 38 s voice (and the voice itself never played).
 */
describe('gallery pace', () => {
  let el
  const credit = () => el.querySelector('[data-credit]').textContent
  const images = ['a', 'b', 'c', 'd'].map((c) => ({ url: `/${c}.webp`, credit: c }))

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
  })
  afterEach(() => { vi.useRealTimers(); el.remove() })

  it('spreads the images across the narration instead of the 5 s cycle', () => {
    const g = renderGallery(el, { images })
    g.pace(40000)                             // 4 images over 40 s → one every 10 s

    expect(credit()).toBe('a')
    vi.advanceTimersByTime(9999)
    expect(credit()).toBe('a')                // the old clock would be on 'b' already
    vi.advanceTimersByTime(1)
    expect(credit()).toBe('b')
    vi.advanceTimersByTime(20000)
    expect(credit()).toBe('d')                // the last image is up for the last stretch of voice
    g.destroy()
  })

  it('keeps the fixed cycle when there is no narration to pace against', () => {
    const g = renderGallery(el, { images })
    g.pace(0)
    vi.advanceTimersByTime(5000)
    expect(credit()).toBe('b')
    g.destroy()
  })

  it('never flickers: a short voice over many images holds each for at least 2.5 s', () => {
    const g = renderGallery(el, { images })
    g.pace(4000)
    vi.advanceTimersByTime(2499)
    expect(credit()).toBe('a')
    vi.advanceTimersByTime(1)
    expect(credit()).toBe('b')
    g.destroy()
  })
})
