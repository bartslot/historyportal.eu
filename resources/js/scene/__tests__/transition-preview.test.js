import { describe, it, expect } from 'vitest'
import { railPictures } from '../transition-preview.js'

const rail = (html) => { const root = document.createElement('div'); root.innerHTML = html; return root }
const thumb = (id, src) => `<button data-thumb data-scene-id="${id}">${src ? `<img src="${src}">` : ''}</button>`

describe('railPictures', () => {
  it('finds the scene and the one before it in the rail order', () => {
    expect(railPictures(7, rail(thumb(3, '/a.webp') + thumb(7, '/b.webp') + thumb(9, '/c.webp')))).toEqual({ from: '/a.webp', to: '/b.webp' })
  })

  it('has no scene before the first one, and no picture for a scene without one', () => {
    expect(railPictures(3, rail(thumb(3, '/a.webp') + thumb(7)))).toEqual({ from: null, to: '/a.webp' })
    expect(railPictures(7, rail(thumb(3) + thumb(7)))).toEqual({ from: null, to: null })
  })

  it('knows nothing of a scene that is not on the rail', () => {
    expect(railPictures(42, rail(thumb(3, '/a.webp')))).toEqual({ from: null, to: null })
  })
})
