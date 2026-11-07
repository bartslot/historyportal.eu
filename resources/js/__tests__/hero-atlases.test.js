import { describe, test, expect, vi } from 'vitest'

vi.mock('gsap', () => ({ gsap: { registerPlugin: () => {}, set: () => {}, to: () => {}, timeline: () => ({}), ticker: { add: () => {} } } }))

describe('requestAtlases', () => {
  test('turns the unrequested sprite sheets into real requests', async () => {
    const { requestAtlases } = await import('../hero/lesson-demo.js')
    const root = document.createElement('section')
    root.innerHTML = `
      <img data-timewarp-lesson-atlas data-src="/lesson.webp">
      <picture><source data-srcset="/cards.avif" type="image/avif"><img data-timewarp-atlas data-src="/cards.webp"></picture>`

    requestAtlases(root)

    expect(root.querySelector('[data-timewarp-lesson-atlas]').getAttribute('src')).toBe('/lesson.webp')
    expect(root.querySelector('source').getAttribute('srcset')).toBe('/cards.avif')
    expect(root.querySelector('[data-timewarp-atlas]').getAttribute('src')).toBe('/cards.webp')
  })
})
