import { describe, it, expect, beforeAll } from 'vitest'
import { initTooltips } from '../tooltip.js'

/** A toggle (Hide / Show) flips its data-tooltip while its tooltip is up: the words follow at once. */

beforeAll(() => initTooltips())

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('the tooltip of a control whose state flips', () => {
  it('re-reads data-tooltip when it changes while shown', async () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="eye" data-tooltip="Hide">x</button>')
    const eye = document.getElementById('eye')
    eye.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    const tip = document.querySelector('.lp-tip')
    expect(tip.textContent).toBe('Hide')

    eye.dataset.tooltip = 'Show'
    await tick()
    expect(tip.textContent).toBe('Show')
    expect(tip.classList.contains('is-visible')).toBe(true)
  })
})

describe('a press', () => {
  it('hides the old words, and the new ones show when the pressed control flips under the pointer', async () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="eye2" data-tooltip="Hide">x</button>')
    const eye = document.getElementById('eye2')
    eye.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    eye.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
    const tip = document.querySelector('.lp-tip')
    expect(tip.classList.contains('is-visible')).toBe(false)

    eye.dataset.tooltip = 'Show'
    await tick()
    expect(tip.textContent).toBe('Show')
    expect(tip.classList.contains('is-visible')).toBe(true)
  })

  it('a control the pointer has left does not pop its tooltip back when it changes', async () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="eye3" data-tooltip="Hide">x</button>')
    const eye = document.getElementById('eye3')
    eye.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    eye.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }))
    eye.dataset.tooltip = 'Show'
    await tick()
    expect(document.querySelector('.lp-tip').classList.contains('is-visible')).toBe(false)
  })
})
