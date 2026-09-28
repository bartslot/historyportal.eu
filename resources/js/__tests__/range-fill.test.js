import { describe, it, expect, beforeAll } from 'vitest'
import { fillPercent, initRangeFill } from '../ui/range-fill.js'

/** A stand-in for the input, since only min/max/value are read. */
const range = (min, max, value) => ({ min: String(min), max: String(max), value: String(value) })

describe('how far along the rail the fill stops', () => {
  it('reads a value as its share of the track', () => {
    expect(fillPercent(range(0, 100, 50))).toBe(50)
    expect(fillPercent(range(0, 100, 0))).toBe(0)
    expect(fillPercent(range(0, 100, 100))).toBe(100)
  })

  /**
   * The panel's ranges rarely start at zero — Scale is 0.2 to 6, Opacity 0.05 to 1. Treating the
   * value as a percentage of the MAX alone would leave every one of them filled wrongly, and Scale
   * at its minimum would show a fill instead of an empty rail.
   */
  it('measures from the minimum, not from zero', () => {
    expect(fillPercent(range(0.2, 6, 0.2))).toBe(0)
    expect(fillPercent(range(0.2, 6, 6))).toBe(100)
    expect(fillPercent(range(0.2, 6, 3.1))).toBeCloseTo(50, 6)
  })

  it('handles a range that runs negative', () => {
    expect(fillPercent(range(-180, 180, 0))).toBe(50)
    expect(fillPercent(range(-180, 180, -180))).toBe(0)
  })

  it('clamps a value outside the track', () => {
    expect(fillPercent(range(0, 100, 150))).toBe(100)
    expect(fillPercent(range(0, 100, -50))).toBe(0)
  })

  /** A range whose ends are equal has no track to fill, and dividing by its span is a NaN. */
  it('reports nothing filled when there is no track', () => {
    expect(fillPercent(range(5, 5, 5))).toBe(0)
  })

  it('reports nothing filled for a value it cannot read', () => {
    expect(fillPercent(range(0, 100, ''))).toBe(0)
    expect(fillPercent({ min: '', max: '', value: 'abc' })).toBe(0)
  })
})

/**
 * The knob is drawn from --range-t, so it must follow a value set WITHOUT an input event — the
 * way x-model, a reset and a Livewire morph set it — or the drawn knob stays where it was.
 */
const slider = (value = '0') => {
  const wrap = document.createElement('span')
  wrap.className = 'range-panel-knob'
  wrap.innerHTML = `<input type="range" class="range range-panel" min="0" max="10" value="${value}">`
  return { wrap, input: wrap.querySelector('input') }
}
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('range-fill keeps the drawn knob on the value', () => {
  beforeAll(() => initRangeFill(document))

  it('follows a value assigned by script, on the wrapper that draws the knob', () => {
    const { wrap, input } = slider()
    document.body.append(wrap)
    input.value = '5'
    expect(wrap.style.getPropertyValue('--range-t')).toBe('0.5')
    expect(input.style.getPropertyValue('--range-t')).toBe('0.5')
  })

  it('paints a slider that arrives in the page, and one whose value attribute a morph rewrites', async () => {
    const { wrap, input } = slider('10')
    document.body.append(wrap)
    await settle()
    expect(wrap.style.getPropertyValue('--range-t')).toBe('1')

    input.setAttribute('value', '2')
    input.value = '2'
    await settle()
    expect(wrap.style.getPropertyValue('--range-t')).toBe('0.2')
  })

  it('leaves a plain range alone', () => {
    const plain = document.createElement('input')
    plain.type = 'range'
    document.body.append(plain)
    plain.value = '30'
    expect(plain.style.getPropertyValue('--range-t')).toBe('')
  })
})
