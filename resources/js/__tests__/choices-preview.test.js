import { describe, it, expect, vi } from 'vitest'

vi.mock('../i18n.js', () => ({ t: (s) => s }))
await import('../scene/choices-preview.js')

const select = (id) => window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id } }))

describe('the Choices layer on the editor stage', () => {
  it('shows the card while the layer is selected, as a picture that takes no clicks or keys', () => {
    document.body.innerHTML = '<div id="lesson-choices-preview"></div>'
    window.__objScene = { sceneId: 5, choices: true, links: [{ label: 'Sail east', to: 6 }, { label: '', to: 7 }, { label: 'Nowhere yet', to: null }] }

    select('__choices__')
    const card = document.querySelector('[data-scene-links-preview]')
    expect(card).not.toBeNull()
    expect([...card.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Sail east', 'Continue'])
    expect(card.style.pointerEvents).toBe('none')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    expect(document.querySelector('[data-scene-links-preview]')).not.toBeNull()   // keys are the class's, not the editor's

    // an edit in the Choices panel: the new words show
    window.dispatchEvent(new CustomEvent('scene-choices', { detail: { sceneId: 5, has: true, links: [{ label: 'Stay', to: 6 }, { label: 'Go', to: 7 }] } }))
    return new Promise((done) => setTimeout(() => {
      expect([...document.querySelectorAll('[data-scene-links-preview] button')].map((b) => b.textContent)).toEqual(['Stay', 'Go'])
      select('txt_1')
      expect(document.querySelector('[data-scene-links-preview]')).toBeNull()
      done()
    }, 150))
  })
})
