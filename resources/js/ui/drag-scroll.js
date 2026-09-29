/**
 * Drag-to-scroll for rows that are wider than their space: pill lists, thumbnail strips. Opt in
 * with `data-drag-scroll` on the scrolling element. A mouse drag scrolls it sideways; touch keeps
 * its own native swipe. A drag that moved is not a click, so letting go on a pill never picks it.
 *
 * One delegated set of listeners on the document, like tooltips: rows Livewire re-renders keep
 * working without re-binding.
 */

/** Pixels a press must travel before it is a drag, not a click. */
export const DRAG_THRESHOLD_PX = 4

export function initDragScroll (doc = document) {
  let drag = null

  doc.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.pointerType === 'touch') return
    const el = e.target.closest?.('[data-drag-scroll]')
    if (!el || el.scrollWidth <= el.clientWidth) return
    drag = { el, x: e.clientX, left: el.scrollLeft, moved: false }
  })

  doc.addEventListener('pointermove', (e) => {
    if (!drag) return
    const dx = e.clientX - drag.x
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return
    drag.moved = true
    drag.el.scrollLeft = drag.left - dx
    e.preventDefault()                         // no text selection while dragging
  })

  const end = () => {
    if (drag?.moved) {
      // The click that follows a drag lands on whatever pill is under the pointer: swallow it.
      doc.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault() }, { capture: true, once: true })
    }
    drag = null
  }
  doc.addEventListener('pointerup', end)
  doc.addEventListener('pointercancel', end)
}
