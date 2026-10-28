/**
 * keyed-fields.js — the Format panel's fields on a property that has keyframes.
 *
 * Once a property is animated, a field is a view of it AT THE PLAYHEAD (After Effects, Figma):
 * it shows the sampled value as the playhead moves, and a value the teacher settles on becomes a
 * keyframe there — updating the key under the playhead, or adding one between keys. A property
 * with no keys saves the plain layer value exactly as before.
 *
 * The Timeline tab owns the tracks and publishes `window.__timelineKeying`; this module is the
 * panel's half. A field opts in with `data-key-target` + `data-key-property` (and `data-key-scale`
 * when it shows a fraction as a percentage). Delegated, because Livewire morphs these panels all
 * the time and a binding per element stops working on whichever row was re-rendered last.
 */

import { paintFill } from './range-fill.js'

const keyOf = (el) => {
  const { keyTarget: target, keyProperty: property, keyScale } = el?.dataset ?? {}
  return target && property ? { target, property, scale: Number(keyScale) || 1 } : null
}

/** A field's text → the property's value. A colour stays a string. */
export const fieldToValue = (raw, scale = 1) => {
  if (typeof raw === 'string' && raw.startsWith('#')) return raw.toLowerCase()
  const n = Number(raw)
  return Number.isFinite(n) ? n / scale : null
}

/** The property's value → what the field shows. */
export const valueToField = (value, scale = 1) => {
  if (typeof value === 'string') return value
  return Number.isFinite(value) ? String(Math.round(value * scale * 100) / 100) : ''
}

/**
 * Save one layer value from a panel control that writes through JS (the angle dial, the size row):
 * a keyframe when the property is animated, the plain value otherwise.
 */
export const saveLayerValue = ($wire, assetId, property, value) => {
  if (window.__timelineKeying?.edit?.(`art:${assetId}`, property, value)) return
  $wire?.call?.('updateArtworkLayer', assetId, property, value)
}

/**
 * Show the value at the playhead in every keyed field the teacher is not typing in or dragging.
 *
 * A slider the teacher has just let go of still has focus, and is synced all the same: its knob
 * and number are what Livewire overwrites with the base value when the keyframe save re-renders
 * the panel (Bart, 2026-10-16: "changing the slider doesn't result in anything on the slider").
 */
const syncFields = () => {
  const keying = window.__timelineKeying
  if (!keying) return
  for (const el of document.querySelectorAll('input[data-key-target]')) {
    const key = keyOf(el)
    if (!key || !keying.animated?.(key.target, key.property)) continue
    const isRange = el.type === 'range'
    if (isRange ? el.matches(':active') : el === document.activeElement) continue
    const text = valueToField(keying.value(key.target, key.property), key.scale)
    if (text === '') continue
    if (el.value !== text) el.value = text
    if (!isRange) continue
    paintFill(el)
    showNumber(el)
  }
}

/** The number beside a keyed slider, from the slider's own value. */
const showNumber = (el) => {
  const display = el.closest('.range-panel-knob')?.parentElement?.querySelector('[data-key-display]')
  if (display) display.textContent = String(Math.round(Number(el.value) * (Number(display.dataset.keyDisplayScale) || 1) * 100) / 100)
}

/**
 * Write a keyed field's value at the playhead. `flush: false` is a live step (a keystroke, a spinner
 * tick, a scrub) and the timeline saves it after a pause; `flush: true` is the teacher settling on it.
 * @returns {boolean} true when the timeline took the value as a keyframe
 */
const commitField = (el, { flush }) => {
  const key = keyOf(el)
  if (!key) return false
  const value = fieldToValue(el.value, key.scale)
  if (value === null) return false
  return window.__timelineKeying?.edit?.(key.target, key.property, value, { flush }) ?? false
}

// One canvas write per frame, however fast the input fires: a scrub or a held arrow key emits many
// input events between two paints, and only the last value in the frame is worth drawing.
let liveFrame = 0
let liveField = null

const commitLive = (el) => {
  liveField = el
  if (liveFrame) return
  liveFrame = requestAnimationFrame(() => {
    liveFrame = 0
    commitField(liveField, { flush: false })
  })
}

export function initKeyedFields () {
  // Capture phase, so it runs before Livewire's own `wire:change` on the field — and stops it,
  // because the keyframe IS the save; writing the base value as well would move what Reset
  // returns to.
  document.addEventListener('change', (event) => {
    if (commitField(event.target, { flush: true })) event.stopImmediatePropagation()
  }, true)

  // The live half: typing, spinner arrows and scrubbing all fire `input` long before `change`
  // (which waits for blur or release), so the canvas follows them as they happen.
  document.addEventListener('input', (event) => {
    if (event.target.type === 'range' && keyOf(event.target)) showNumber(event.target)
    if (keyOf(event.target)) commitLive(event.target)
  })
  window.addEventListener('timeline-changed', syncFields)

  // A morph puts the server's base value back into every field it touches.
  const hook = () => window.Livewire?.hook?.('morphed', syncFields)
  if (window.Livewire) hook()
  else document.addEventListener('livewire:init', hook, { once: true })
}
