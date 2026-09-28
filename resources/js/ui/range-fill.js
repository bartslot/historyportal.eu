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

const isPanelRange = (el) =>
  el instanceof HTMLInputElement && el.type === 'range' && el.classList.contains('range-panel')

/**
 * Keep every drawn knob on its value, however the value got there.
 *
 * The knob is drawn from --range-t, not by the browser, so a value that changes WITHOUT an input
 * event would leave it behind: x-model writing `el.value`, a reset button, a Livewire morph putting
 * the server's value back, a slider arriving in a morph. Four routes, one per mechanism:
 *
 *   - `input` / `change` for a hand on the slider;
 *   - the `value` property setter, which is what x-model and every script assign through;
 *   - a MutationObserver for sliders that arrive in the DOM and `value` attributes a morph rewrites;
 *   - one pass over what is already on the page.
 */
export function initRangeFill (root = document) {
  if (root.__rangeFillReady) return
  root.__rangeFillReady = true

  const onEvent = (e) => { if (isPanelRange(e.target)) paintFill(e.target) }
  root.addEventListener('input', onEvent)
  root.addEventListener('change', onEvent)

  const proto = HTMLInputElement.prototype
  const value = Object.getOwnPropertyDescriptor(proto, 'value')
  if (value?.set && !proto.__rangeFillPatched) {
    proto.__rangeFillPatched = true
    Object.defineProperty(proto, 'value', {
      ...value,
      set (v) {
        value.set.call(this, v)
        if (isPanelRange(this)) paintFill(this)
      },
    })
  }

  const paintWithin = (node) => {
    if (isPanelRange(node)) paintFill(node)
    node.querySelectorAll?.('input.range-panel').forEach((el) => { if (isPanelRange(el)) paintFill(el) })
  }
  paintWithin(root.documentElement ?? root)

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') { if (isPanelRange(r.target)) paintFill(r.target); continue }
        r.addedNodes.forEach(paintWithin)
      }
    }).observe(root.documentElement ?? root, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['value', 'min', 'max'],
    })
  }
}
