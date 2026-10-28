import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { initKeyedFields } from '../ui/keyed-fields.js'

// Frames are queued and run by hand, so a test decides exactly when the canvas is written.
const frames = []
window.requestAnimationFrame = (fn) => frames.push(fn)
const runFrames = () => frames.splice(0).forEach((fn) => fn())

/**
 * A keyed slider is a view of the property AT THE PLAYHEAD, the knob and the number included.
 *
 * Bart, 2026-10-16: "changing the slider doesn't result in anything on the slider - but I can see
 * the was opacity is on the scene". Dragging a balloon's opacity wrote the keyframe and the stage
 * faded, but the save re-rendered the inspector and Livewire put the base value back into the
 * knob and the number, and the field the teacher had just dragged was skipped because it still
 * had focus.
 */

let morphed = null
let value = 0.25

beforeAll(() => {
  window.Livewire = { hook: (name, fn) => { if (name === 'morphed') morphed = fn } }
  initKeyedFields()
})

beforeEach(() => {
  value = 0.25
  window.__timelineKeying = { animated: () => true, value: () => value }
  // The markup <x-ui.slider-row> renders for a balloon's opacity, with the server's base value.
  document.body.innerHTML = `
    <div>
      <span class="range-panel-knob" style="--range-pct: 100%">
        <input type="range" min="0" max="1" step="0.05" value="1" class="range range-panel"
               data-key-target="bal:0" data-key-property="opacity" style="--range-pct: 100%">
      </span>
      <span><span data-key-display data-key-display-scale="100">100</span></span>
    </div>`
})

const slider = () => document.querySelector('input[data-key-target]')
const shown = () => ({
  value: slider().value,
  knob: slider().closest('.range-panel-knob').style.getPropertyValue('--range-pct'),
  number: document.querySelector('[data-key-display]').textContent,
})

describe('a keyed slider at the playhead', () => {
  it('follows the playhead even while it has focus from the drag', () => {
    slider().focus()
    window.dispatchEvent(new CustomEvent('timeline-changed'))
    expect(shown()).toEqual({ value: '0.25', knob: '25%', number: '25' })
  })

  it('takes the value at the playhead back after Livewire morphs the base value in', () => {
    // The drag left the input on 0.25; the morph rewrote the knob and the number to the base.
    slider().value = '0.25'
    slider().closest('.range-panel-knob').style.setProperty('--range-pct', '100%')
    document.querySelector('[data-key-display]').textContent = '100'

    morphed({ el: document.body })
    expect(shown()).toEqual({ value: '0.25', knob: '25%', number: '25' })
  })

  it('moves its number with the drag', () => {
    slider().value = '0.4'
    slider().dispatchEvent(new Event('input', { bubbles: true }))
    expect(shown().number).toBe('40')
  })

  it('leaves a property with no keys alone', () => {
    window.__timelineKeying.animated = () => false
    window.dispatchEvent(new CustomEvent('timeline-changed'))
    expect(shown()).toEqual({ value: '1', knob: '100%', number: '100' })
  })
})

describe('a keyed field commits as the teacher types, not only on blur', () => {
  beforeEach(() => {
    runFrames()   // a frame queued by an earlier test would otherwise hold the next write back
  })

  it('writes each step once per frame without saving, and the change flushes the last one', () => {
    const edit = vi.fn(() => true)
    window.__timelineKeying.edit = edit

    slider().value = '0.4'
    slider().dispatchEvent(new Event('input', { bubbles: true }))
    slider().value = '0.6'
    slider().dispatchEvent(new Event('input', { bubbles: true }))
    expect(edit).not.toHaveBeenCalled()

    runFrames()
    expect(edit).toHaveBeenCalledTimes(1)
    expect(edit).toHaveBeenLastCalledWith('bal:0', 'opacity', 0.6, { flush: false })

    slider().dispatchEvent(new Event('change', { bubbles: true }))
    expect(edit).toHaveBeenLastCalledWith('bal:0', 'opacity', 0.6, { flush: true })
  })
})
