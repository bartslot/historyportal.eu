import { describe, it, expect } from 'vitest'
import { selectBalloon, selectedBalloon } from '../balloon-edit.js'

/**
 * A deleted balloon is not the stage's selection any more (tester 11-16: Delete, Cmd-Z brought the
 * balloon back with its ring while the server had nothing selected, and the next Delete removed it).
 */
describe('the balloon selection after a delete', () => {
  it('is cleared when the server says a balloon was deleted', () => {
    selectBalloon('bal_1', { silent: true })
    expect(selectedBalloon()).toBe('bal_1')

    window.dispatchEvent(new CustomEvent('balloon:deleted', { detail: { id: 'bal_1' } }))

    expect(selectedBalloon()).toBe(null)
  })
})
