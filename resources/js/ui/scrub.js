/**
 * scrub.js — drag a field's label sideways to change its number.
 *
 * The design-tool interaction: press on the little W, drag right, the width goes up. Figma,
 * Photoshop and After Effects all do it, and it is the reason the label sits inside the field
 * rather than beside it.
 *
 * IT SYNTHESISES THE EVENTS TYPING PRODUCES, and that is the whole design. A scrub sets the
 * input's value and dispatches `input` (and `change` when the drag ends), so every listener already
 * on that field runs unchanged — the Alpine live-preview hook, the Livewire save, and the aspect
 * lock's own edit(), which is why dragging W while the aspect is held drives H exactly as typing
 * into W does. Reaching past the input to some setter would have needed the lock re-implemented
 * here, and the two would have drifted.
 *
 * ONE DELEGATED LISTENER, not a binding per field. Livewire morphs these panels constantly; a
 * per-element listener would need re-attaching after every morph and would silently stop working
 * on whichever row was last re-rendered. Opt in with `data-scrub` on the label.
 */

/** Pixels of travel per step of the field's own `step`. */
const PX_PER_STEP = 3

/** Below this, the gesture was a click on a label, not a drag. */
const DRAG_THRESHOLD_PX = 3

/** Shift drags coarsely, Alt finely — the usual convention in the tools this imitates. */
const COARSE = 10
const FINE = 0.1

/** The input a scrub handle drives: the first number or range field beside it. */
export function fieldFor (handle) {
  const scope = handle.closest('label, .join-item, [data-scrub-scope]') || handle.parentElement
  return scope?.querySelector('input[type=number], input[type=range]') ?? null
}

/** How many decimals a step implies, so a drag cannot introduce float noise the field never shows. */
export function precisionOf (step) {
  const s = String(step)
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
}

/**
 * The value a drag of `dx` pixels lands on.
 *
 * Exported for its own test: this is the arithmetic, and it is worth holding separately from the
 * pointer plumbing that feeds it.
 */
export function scrubbedValue (startValue, dx, { step = 1, min = -Infinity, max = Infinity, multiplier = 1 } = {}) {
  const perPixel = (step * multiplier) / PX_PER_STEP
  const raw = startValue + dx * perPixel
  const snapped = Math.round(raw / (step * multiplier)) * (step * multiplier)
  const clamped = Math.min(max, Math.max(min, snapped))
  return Number(clamped.toFixed(precisionOf(step * multiplier)))
}

/** Install the one document-level handler. Idempotent. */
export function initScrub (root = document) {
  if (root.__scrubReady) return
  root.__scrubReady = true

  root.addEventListener('pointerdown', (e) => {
    const handle = e.target instanceof Element ? e.target.closest('[data-scrub]') : null
    if (!handle) return
    const field = fieldFor(handle)
    if (!field || field.disabled) return

    const startValue = Number(field.value)
    if (!Number.isFinite(startValue)) return

    const step = Number(field.step) || 1
    const min = field.min === '' ? -Infinity : Number(field.min)
    const max = field.max === '' ? Infinity : Number(field.max)
    const startX = e.clientX
    let dragged = false

    // Best-effort: capture can throw on synthetic pointers, and the codebase has been bitten by
    // assuming it applied. The listeners are on the WINDOW either way, so a drag that leaves the
    // label still delivers its moves and its release.
    try { handle.setPointerCapture(e.pointerId) } catch (_) { /* synthetic pointer */ }

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      if (!dragged && Math.abs(dx) < DRAG_THRESHOLD_PX) return
      // Only once a real drag has started: from here the gesture is a scrub, not a click, and the
      // browser must not also be selecting text under the pointer.
      if (ev.cancelable) ev.preventDefault()
      dragged = true
      const multiplier = ev.shiftKey ? COARSE : (ev.altKey ? FINE : 1)
      field.value = String(scrubbedValue(startValue, dx, { step, min, max, multiplier }))
      field.dispatchEvent(new Event('input', { bubbles: true }))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      // Only a real drag saves. A stray press on a label must not write a value, and `change` is
      // what every one of these fields treats as "the number the teacher settled on".
      if (dragged) field.dispatchEvent(new Event('change', { bubbles: true }))
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    // NOT preventDefault() here. Cancelling pointerdown suppresses the compatibility mouse events
    // that follow, and double-clicking a label is now how a property goes back to its default —
    // so swallowing the press would take the reset gesture with it. Text selection is already
    // handled by `select-none` on the handle, which is what preventDefault was really for.
  })
}
