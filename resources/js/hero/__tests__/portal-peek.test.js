import { describe, test, expect } from 'vitest'
import { peekOffset, PORTAL_DEFAULTS } from '../portal.js'

/**
 * Bart 2026-10-21: the portal opens onto the lesson "at 50vh from top", showing part of the
 * information under the title screen, then scrolls up to the title screen.
 */
const box = (clientHeight, scrollHeight) => ({ clientHeight, scrollHeight })

describe('portal peek', () => {
  test('opens half a screen down by default', () => {
    expect(PORTAL_DEFAULTS.portalPeek).toBe(0.5)
    expect(peekOffset(box(800, 2400), 0.5)).toBe(400)
  })

  test('never scrolls past the end of what is there', () => {
    expect(peekOffset(box(800, 1000), 0.5)).toBe(200)
    expect(peekOffset(box(800, 800), 0.5)).toBe(0)
  })

  test('no scroller, no peek', () => {
    expect(peekOffset(null, 0.5)).toBe(0)
  })
})
