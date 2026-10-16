/**
 * Frustration signals for the test-session recorder, detected in the tester's browser where the
 * DOM is, and sent as their own timeline events (rage_click, dead_click).
 *
 *  - Rage click: 3+ clicks on the same spot (within 30 px) inside 1 second. Reported once per burst.
 *  - Dead click: a click after which nothing reacted within 1 second: no DOM change that counts
 *    (see isReaction), no route change. A click that unloads the page never fires (its timer dies).
 *
 * Pure, with clock and timers injected, so __tests__/test-session-detectors.test.js can drive them.
 */

export const RAGE_CLICKS = 3
export const RAGE_WINDOW_MS = 1000
export const RAGE_RADIUS_PX = 30
export const DEAD_CLICK_MS = 1000

/** @returns {(click: {t: number, x: number, y: number}) => number|null} burst size when it fires */
export function createRageDetector ({ clicks = RAGE_CLICKS, windowMs = RAGE_WINDOW_MS, radiusPx = RAGE_RADIUS_PX } = {}) {
  let recent = []
  return (click) => {
    recent = recent
      .filter((c) => click.t - c.t <= windowMs && Math.hypot(c.x - click.x, c.y - click.y) <= radiusPx)
      .concat(click)
    // Exactly at the threshold: the 4th and 5th click of the same burst do not report it again.
    return recent.length === clicks ? recent.length : null
  }
}

/**
 * Does this DOM mutation count as the page reacting to a click?
 *
 * Inline `style` changes do not: the player animates progress bars, Ken Burns and captions through
 * style every frame, which would make every click on it look alive. Nor does anything inside the
 * recorder's own UI (.hp-no-record).
 *
 * @param {MutationRecord} record
 */
export function isReaction (record) {
  if (record.type === 'attributes' && record.attributeName === 'style') return false
  const el = record.target?.nodeType === 1 ? record.target : record.target?.parentElement
  return !el?.closest?.('.hp-no-record')
}

/**
 * @param {{ now: () => number, setTimeout: (fn: Function, ms: number) => unknown,
 *           onDead: (info: object) => void, windowMs?: number }} opts
 */
export function createDeadClickWatcher ({ now, setTimeout, onDead, windowMs = DEAD_CLICK_MS }) {
  let lastReaction = -Infinity
  return {
    /** The page reacted (a counted mutation or a route change). */
    reaction () { lastReaction = now() },
    click (info) {
      const t = now()
      setTimeout(() => { if (lastReaction < t) onDead(info) }, windowMs)
    },
  }
}
