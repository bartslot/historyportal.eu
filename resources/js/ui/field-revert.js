/**
 * field-revert.js — Esc gives a numeric field its old value back.
 *
 * "Esc reverting is the one people notice only when it is missing." A teacher who types over a
 * width, sees the layer jump somewhere wrong and presses Escape expects the old number back; with
 * no handler the browser does nothing, the wrong value is already live on the canvas, and the only
 * way out is remembering what it used to say.
 *
 * WHAT IT REVERTS TO is the value the field held when it was FOCUSED, not the last saved one. That
 * is the promise the gesture makes — undo this edit — and it is the only definition that survives a
 * field being focused, edited, and edited again without leaving.
 *
 * ONE DELEGATED PAIR OF LISTENERS, for the same reason as scrub.js and range-fill.js: Livewire
 * morphs these panels constantly and per-element bindings stop firing on whichever row was
 * re-rendered last.
 *
 * AND THE REMEMBERED VALUE IS HELD OUTSIDE THE DOM. The first version wrote it to a data-attribute
 * on the field, which read as the tidy thing to do and did not survive: a morph re-applies the
 * server's attributes over the element, and the server has never heard of `data-revert-to`, so it
 * was stripped between the focus and the Escape. Measured in a browser — the field was focused, the
 * handler was installed, and the value it should return to was simply gone. A WeakMap is keyed by
 * the element itself, so a morph that keeps the node keeps the memory, and one that replaces the
 * node has taken the focus away too.
 */

/** element → the value it held when focus arrived. Not a data-attribute; a morph eats those. */
const focusedWith = new WeakMap()

/** Fields this applies to: the panel's own numeric inputs and sliders. */
const REVERTABLE = 'input[type=number], input[type=range]'

export function isRevertable (el) {
  return el instanceof HTMLInputElement && (el.type === 'number' || el.type === 'range')
}

/**
 * Put a field back to `value` and tell everything listening.
 *
 * Both events, in that order, and this is not belt-and-braces: `input` is what the live preview and
 * the aspect lock listen on, and `change` is what saves. Reverting without the second one would put
 * the number back on screen and leave the wrong one on the server.
 */
export function revertTo (input, value) {
  if (value === null || value === undefined) return false
  if (input.value === value) return false
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

/** Install the delegated handlers. Idempotent. */
export function initFieldRevert (root = document) {
  if (root.__fieldRevertReady) return
  root.__fieldRevertReady = true

  // focusin rather than focus: focus does not bubble, so a delegated listener never sees it.
  root.addEventListener('focusin', (e) => {
    if (isRevertable(e.target)) focusedWith.set(e.target, e.target.value)
  })

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isRevertable(e.target)) return
    const previous = focusedWith.get(e.target)
    if (previous === undefined) return
    if (revertTo(e.target, previous)) {
      // Swallow it, or Esc also closes whatever panel or dialog is above the field.
      e.preventDefault()
      e.stopPropagation()
    }
  })
}
