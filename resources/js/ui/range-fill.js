/**
 * range-fill.js — keeps `--range-pct` on a panel slider in step with its value.
 *
 * The rail's fill is a hard-stop gradient painted into the track, because DaisyUI's own fill is a
 * box-shadow cast off the THUMB and is therefore knob-height — a fat purple bar over a thin grey
 * rail, which is the thing Bart rejected. A gradient lives in the track, so the fill is rail-height
 * by construction; the cost is that somebody has to tell it how far along to stop.
 *
 * The initial value is rendered by <x-ui.slider-row> as an inline style, so a row is correct on its
 * very first frame and this only has to handle movement.
 *
 * ONE DELEGATED LISTENER, for the same reason as scrub.js: Livewire morphs these panels constantly,
 * and a listener bound per input stops firing on whichever row was re-rendered last.
 */

/** The value as a percentage of the track, clamped and safe on a zero-width range. */
export function fillPercent (input) {
  const min = Number(input.min === '' ? 0 : input.min)
  const max = Number(input.max === '' ? 100 : input.max)
  const value = Number(input.value)
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value)) return 0
  // A range whose min equals its max has no track to fill; anything else divides by zero.
  if (max === min) return 0
  const pct = ((value - min) / (max - min)) * 100
  return Math.min(100, Math.max(0, pct))
}

/**
 * Paint one slider's fill and move its knob.
 *
 * --range-t (0..1) positions both: the fill's stop inside the track, and the knob drawn by the
 * `.range-panel-knob` wrapper's ::after (the native thumb is invisible). It goes on the input AND
 * the wrapper: the server renders it inline on both, and an inline value is not overridden by
 * inheritance. --range-pct stays for anything still reading it.
 */
export function paintFill (input) {
  const pct = fillPercent(input)
  for (const el of [input, input.closest('.range-panel-knob')]) {
    if (!el) continue
    el.style.setProperty('--range-pct', pct + '%')
    el.style.setProperty('--range-t', String(pct / 100))
  }
}

/** Install the one document-level handler. Idempotent. */
export function initRangeFill (root = document) {
  if (root.__rangeFillReady) return
  root.__rangeFillReady = true

  root.addEventListener('input', (e) => {
    const el = e.target
    if (el instanceof HTMLInputElement && el.type === 'range' && el.classList.contains('range-panel')) {
      paintFill(el)
    }
  })
}
