/**
 * color-field.js — keeps <x-ui.color-field> alive while the teacher works in it.
 *
 * The colour picker is the browser's own popup, owned by the `<input type="color">`. The editor
 * re-renders its inspector all the time (wire:poll.3s, every keyframe save, every text patch) and
 * each morph hands that input the SERVER's value: the `value` attribute, and the swatch and hex
 * beside it, snap back to the last saved colour in the middle of a drag (Bart, 2026-10-30, prod
 * lesson 63: "the colorpicker was hiding everytime. i was interacting with it").
 *
 * So the field the teacher is working in is not morphed. It is "engaged" from the moment they
 * focus or press on its inputs until they settle (change), press anywhere else, or hit Escape /
 * Enter. While engaged the swatch and hex follow the input locally, so skipping the morph costs
 * nothing. The engaged field is remembered here, outside the DOM, because a morph strips whatever
 * a node carries.
 */

const FIELD = '[data-color-field]'
const INPUTS = 'input[type="color"], input[type="number"]'

/** @type {Element | null} */
let engaged = null

/** The field the teacher is in right now, or null (a field torn down by a scene switch is not it). */
export const engagedField = () => (engaged?.isConnected ? engaged : null)

export const engage = (field) => { engaged = field }
export const settle = () => { engaged = null }

/** Show a colour in the field's own swatch and hex readout, with no round trip. */
export const paintField = (field, color) => {
  const swatch = field.querySelector('[data-color-swatch]')
  const set = field.querySelector('[data-color-set]')
  const unset = field.querySelector('[data-color-unset]')
  const hex = field.querySelector('[data-color-hex]')
  if (!swatch || !hex || !/^#[0-9a-f]{6}$/i.test(color)) return
  swatch.style.background = color
  hex.textContent = color.slice(1).toUpperCase()
  set?.removeAttribute('hidden')
  unset?.setAttribute('hidden', '')
}

// A bare colour input (the voyage map, the skybox, the timeline row) is its own field.
const fieldOf = (target) => target?.closest?.(FIELD) ?? (target?.matches?.('input[type="color"]') ? target : null)
const isFieldInput = (target) => !!target?.matches?.(INPUTS) && !!fieldOf(target)

export function initColorFields () {
  document.addEventListener('focusin', (e) => { if (isFieldInput(e.target)) engage(fieldOf(e.target)) })

  // A press on the swatch opens the picker before every browser has focused the input.
  document.addEventListener('pointerdown', (e) => {
    if (isFieldInput(e.target)) engage(fieldOf(e.target))
    else settle()   // an explicit press anywhere else: the picker is done with
  }, true)

  document.addEventListener('input', (e) => {
    if (!isFieldInput(e.target)) return
    engage(fieldOf(e.target))
    if (e.target.type === 'color') paintField(fieldOf(e.target), e.target.value)
  })

  // The picker closing is the teacher settling on a colour; the save that follows may now morph.
  document.addEventListener('change', (e) => { if (isFieldInput(e.target)) settle() }, true)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') settle() }, true)
  document.addEventListener('focusout', (e) => {
    if (isFieldInput(e.target) && !fieldOf(e.relatedTarget)) settle()
  })

  const hook = () => window.Livewire?.hook?.('morph.updating', ({ el, skip }) => {
    if (el === engagedField()) skip()
  })
  if (window.Livewire) hook()
  else document.addEventListener('livewire:init', hook, { once: true })
}
