import { describe, it, expect, afterEach } from 'vitest'
import { startsGesture, installEditSteps, TYPING_PAUSE_MS } from '../edit-steps.js'

const field = { tagName: 'INPUT' }
const other = { tagName: 'TEXTAREA' }
const stage = { tagName: 'CANVAS', closest: () => null }
const key = (target, extra = {}) => ({ type: 'keydown', key: 'a', target, ...extra })

describe('startsGesture', () => {
  it('starts a gesture on every press, but not on a second finger', () => {
    expect(startsGesture({ type: 'pointerdown', isPrimary: true }, null, 0)).toBe(true)
    expect(startsGesture({ type: 'pointerdown', isPrimary: false }, null, 0)).toBe(false)
  })

  it('keeps a typing burst in one field together and splits it at a pause or another field', () => {
    expect(startsGesture(key(field), null, 0)).toBe(true)
    expect(startsGesture(key(field), { target: field, at: 0 }, TYPING_PAUSE_MS - 1)).toBe(false)
    expect(startsGesture(key(field), { target: field, at: 0 }, TYPING_PAUSE_MS + 1)).toBe(true)
    expect(startsGesture(key(other), { target: field, at: 0 }, 10)).toBe(true)
  })

  it('takes every key outside a field as its own gesture, except a held or bare modifier key', () => {
    expect(startsGesture(key(stage, { key: 'Delete' }), null, 0)).toBe(true)
    expect(startsGesture(key(stage, { key: 'ArrowLeft', repeat: true }), null, 0)).toBe(false)
    expect(startsGesture(key(stage, { key: 'Shift' }), null, 0)).toBe(false)
  })
})

describe('installEditSteps', () => {
  let uninstall = () => {}
  afterEach(() => uninstall())

  it('sends the waiting saves first, then the new step', () => {
    const order = []
    window.addEventListener('scene:edit-step', () => order.push('flush'))
    uninstall = installEditSteps(() => ({ startEditStep: () => order.push('step') }))

    window.dispatchEvent(Object.assign(new Event('pointerdown'), { isPrimary: true }))
    expect(order).toEqual(['flush', 'step'])
  })

  it('does nothing outside the editor', () => {
    let flushed = false
    window.addEventListener('scene:edit-step', () => { flushed = true })
    uninstall = installEditSteps(() => null)
    window.dispatchEvent(Object.assign(new Event('pointerdown'), { isPrimary: true }))
    expect(flushed).toBe(false)
  })
})
