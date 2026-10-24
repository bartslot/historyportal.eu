import { describe, test, expect, afterEach } from 'vitest'
import { labelArrows } from '../carousel.js'

/** Pair test 2026-10-24: the dashboard shelves' arrows said "Next" to a Dutch teacher. */
describe('labelArrows', () => {
  afterEach(() => { delete window.__lpLang })

  test('relabels Flickity\'s English arrows in the interface language', () => {
    window.__lpLang = { Previous: 'Vorige', Next: 'Volgende' }
    const row = document.createElement('div')
    row.innerHTML = `
      <button class="flickity-prev-next-button previous" aria-label="Previous"><svg><title>Previous</title></svg></button>
      <button class="flickity-prev-next-button next" aria-label="Next"><svg><title>Next</title></svg></button>`

    labelArrows(row)

    const [prev, next] = row.querySelectorAll('button')
    expect(prev.getAttribute('aria-label')).toBe('Vorige')
    expect(next.getAttribute('aria-label')).toBe('Volgende')
    expect(next.querySelector('title').textContent).toBe('Volgende')
  })
})
