/**
 * The player's deck (the transport bar) sits over the bottom of the stage. A game overlay must
 * end above it, or the deck covers the game's own buttons (the cargo game's "Klaar", a quiz
 * answer). This keeps --lp-deck-reserve on the overlay: the distance from the deck's top to the
 * overlay's bottom; app.css lifts the overlay's bottom by it while the overlay has content.
 */

/** Pure: how much of the overlay the deck covers, px (0 when the deck is above or beside it). */
export function deckReserve (overlay, deck) {
  if (!overlay || !deck) return 0
  return Math.max(0, Math.ceil(overlay.bottom - deck.top))
}

/** Keep the reserve current through resizes. @returns {() => void} stop watching */
export function watchDeckReserve (overlayEl, deckEl) {
  if (!overlayEl || !deckEl) return () => {}
  const write = () => {
    // Measured against the overlay's parent: the overlay itself moves once the reserve applies.
    const box = overlayEl.parentElement?.getBoundingClientRect() ?? overlayEl.getBoundingClientRect()
    overlayEl.style.setProperty('--lp-deck-reserve', `${deckReserve(box, deckEl.getBoundingClientRect())}px`)
  }
  write()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(write) : null
  ro?.observe(deckEl)
  window.addEventListener('resize', write)
  return () => { ro?.disconnect(); window.removeEventListener('resize', write) }
}
