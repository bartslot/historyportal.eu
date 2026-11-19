import { describe, it, expect } from 'vitest'
import { revealUnits, applyReveal, clearReveal, isRevealing } from '../text-reveal.js'
import { TextOverlayLayer } from '../TextOverlayLayer.js'

/** The letters a reader can see: every character not inside a span at opacity 0. */
const visible = (node) => {
  let out = ''
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) out += c.data
      else if (!(c.dataset && 'reveal' in c.dataset && Number(c.style.opacity) === 0)) walk(c)
    }
  }
  walk(node)
  return out.replace(/\s+/g, ' ').trim()
}
const box = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d }

describe('reveal: the share of a text\'s letters or words shown', () => {
  it('counts whole units and how far the next one has faded in', () => {
    expect(revealUnits(0, 10)).toEqual({ shown: 0, partial: 0 })
    expect(revealUnits(0.35, 10).shown).toBe(3)
    expect(revealUnits(0.35, 10).partial).toBeCloseTo(0.5)
    expect(revealUnits(1, 10)).toEqual({ shown: 10, partial: 0 })
    expect(revealUnits(2, 10)).toEqual({ shown: 10, partial: 0 })
  })

  it('letters: shows the first share of the letters, keeps the rest in place but invisible', () => {
    const node = box('Venice 1217')
    applyReveal(node, { reveal: 0.6 })   // 10 letters: 6
    expect(visible(node)).toBe('Venice')
    expect(node.textContent).toBe('Venice 1217')   // the hidden letters still hold their place
  })

  it('words: shows whole words', () => {
    const node = box('In the year 1217')
    applyReveal(node, { revealWords: 0.5 })
    expect(visible(node)).toBe('In the')
  })

  it('the edge letter fades with the fraction', () => {
    const node = box('abcd')
    applyReveal(node, { reveal: 0.375 })   // 1.5 of 4
    const span = [...node.querySelectorAll('span[data-reveal]')].find((s) => Number(s.style.opacity) > 0)
    expect(span.textContent).toBe('b')
    expect(Number(span.style.opacity)).toBeCloseTo(0.5)
  })

  it('nothing to do when everything shows, and clearReveal puts plain text back', () => {
    const plain = box('Venice')
    applyReveal(plain, { reveal: 1 })
    expect(plain.innerHTML).toBe('Venice')
    expect(isRevealing({})).toBe(false)
    const node = box('Venice 1217')
    applyReveal(node, { reveal: 0 })
    expect(visible(node)).toBe('')
    clearReveal(node)
    expect(node.innerHTML).toBe('Venice 1217')
  })

  it('spans list lines and the ComicAmerica outline follows the fill', () => {
    const node = box('<span class="lp-comic-america" data-t="Venice 1217"><span>Venice 1217</span></span>')
    applyReveal(node, { reveal: 0.6 })
    expect(node.querySelector('[data-t]').dataset.t.trim()).toBe('Venice')
  })

  it('TextOverlayLayer draws a reveal in the player (readonly) and the editor alike', () => {
    for (const editable of [false, true]) {
      const host = document.createElement('div')
      const layer = new TextOverlayLayer(host, { editable })
      layer.setTexts([{ id: 't1', text: 'Venice 1217', x: 10, y: 10 }])
      layer.patch('t1', { reveal: 0.6 })
      expect(visible(host.querySelector('[data-text-id="t1"]')), `editable ${editable}`).toContain('Venice')
      expect(visible(host.querySelector('[data-text-id="t1"]'))).not.toContain('1217')
      layer.patch('t1', { reveal: 1 })
      expect(visible(host.querySelector('[data-text-id="t1"]'))).toContain('1217')
    }
  })
})
