import { describe, it, expect } from 'vitest'
import { COMIC_AMERICA, comicAmerica, letterComicAmerica } from '../comic-america.js'

describe('comicAmerica', () => {
  it('builds the outline/drop copy in data-t and the fill as the inner span', () => {
    const el = comicAmerica('Land!')
    expect(el.className).toBe(COMIC_AMERICA)
    expect(el.dataset.t).toBe('Land!')
    expect(el.children).toHaveLength(1)
    expect(el.firstElementChild.tagName).toBe('SPAN')
    expect(el.firstElementChild.textContent).toBe('Land!')
    // The words read once: the copy behind is an attribute, not text.
    expect(el.textContent).toBe('Land!')
  })

  it('keeps lesson copy as text, never markup', () => {
    const el = comicAmerica('<img src=x onerror=alert(1)>')
    expect(el.querySelector('img')).toBeNull()
    expect(el.firstElementChild.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('letters a host in place, replacing what it held', () => {
    const host = document.createElement('div')
    host.textContent = 'old'
    letterComicAmerica(host, 'BAM')
    expect(host.children).toHaveLength(1)
    expect(host.firstElementChild.dataset.t).toBe('BAM')
    expect(host.textContent).toBe('BAM')
  })
})
