/**
 * numeric-field.js — how the panel's numeric fields behave beyond plain typing.
 *
 * Three gestures, all of them things a teacher tries because every other tool has them:
 * Escape puts the old value back, double-clicking a field's label resets that property to its
 * default, and a pasted "50%" is read as 50.
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

import { fieldFor } from './scrub.js'

/** element → the value it held when focus arrived. Not a data-attribute; a morph eats those. */
const focusedWith = new WeakMap()

/** The fields all of this applies to: the panel's numeric inputs and its sliders. */
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

/**
 * A pasted value with a trailing percent sign, as the number underneath it.
 *
 * `<input type="number">` refuses a "%" keystroke outright, so this only ever matters for a paste —
 * which is exactly how "50%" arrives, copied from somewhere that wrote the unit.
 *
 * DELIBERATELY DOES NOT TOUCH THE DECIMAL SEPARATOR. A Dutch teacher types 0,5 and this app ships
 * in five languages, so deciding what a comma means is locale-aware number parsing and a design
 * decision in its own right. Reading "1,5" as 15 would be silent and wrong. Only the unit is
 * stripped; anything else is left for the browser to accept or reject as it already does.
 */
export function stripUnit (text) {
  const match = String(text).trim().match(/^(-?[\d.,]+)\s*%$/)
  return match ? match[1] : null
}

/** Install the delegated handlers. Idempotent. */
export function initNumericFields (root = document) {
  if (root.__numericFieldsReady) return
  root.__numericFieldsReady = true

  // focusin rather than focus: focus does not bubble, so a delegated listener never sees it.
  root.addEventListener('focusin', (e) => {
    if (isRevertable(e.target)) focusedWith.set(e.target, e.target.value)
  })

  // A pasted "50%" is a 50. See stripUnit for why the decimal separator is left alone.
  root.addEventListener('paste', (e) => {
    if (!isRevertable(e.target)) return
    const pasted = e.clipboardData?.getData('text')
    if (!pasted) return
    const bare = stripUnit(pasted)
    if (bare === null) return
    e.preventDefault()
    revertTo(e.target, bare)
  })

  /**
   * Double-click a field's label to put that property back to its default.
   *
   * The only way back to a default, and the dial needs it most: landing on exactly 0 by hand is
   * fiddly, and Escape only helps while the focus is still in the field. The default is
   * server-rendered onto the input, so a Livewire morph re-applies it rather than stripping it —
   * unlike the Escape memory, which the server has never heard of and which lives in a WeakMap.
   */
  root.addEventListener('dblclick', (e) => {
    const handle = e.target instanceof Element ? e.target.closest('[data-scrub]') : null
    if (!handle) return
    const field = fieldFor(handle)
    const fallback = field?.dataset.default
    if (!field || fallback === undefined) return
    e.preventDefault()
    revertTo(field, fallback)
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
