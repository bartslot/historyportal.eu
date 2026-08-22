import { describe, it, expect } from 'vitest'
import { scrubbedValue, precisionOf, fieldFor } from '../ui/scrub.js'

describe('what a sideways drag lands on', () => {
  it('moves the value up dragging right and down dragging left', () => {
    expect(scrubbedValue(50, 30, { step: 1 })).toBe(60)
    expect(scrubbedValue(50, -30, { step: 1 })).toBe(40)
  })

  it('holds the value still for a drag of nothing', () => {
    expect(scrubbedValue(50, 0, { step: 1 })).toBe(50)
  })

  it('respects the field’s own step', () => {
    // A field stepping by 0.05 must not land on 0.5133 because a pixel said so.
    const v = scrubbedValue(1, 30, { step: 0.05 })
    expect(Number.isInteger(v / 0.05)).toBe(true)
  })

  it('clamps to the field’s min and max', () => {
    expect(scrubbedValue(95, 500, { step: 1, min: 0, max: 100 })).toBe(100)
    expect(scrubbedValue(5, -500, { step: 1, min: 0, max: 100 })).toBe(0)
  })

  /**
   * Shift for coarse and Alt for fine is the convention in every tool this imitates. The same drag
   * has to travel further with Shift and less with Alt, or the modifiers are decoration.
   */
  it('travels further with the coarse modifier and less with the fine one', () => {
    const plain = scrubbedValue(0, 30, { step: 1 })
    const coarse = scrubbedValue(0, 30, { step: 1, multiplier: 10 })
    const fine = scrubbedValue(0, 30, { step: 1, multiplier: 0.1 })

    expect(coarse).toBeGreaterThan(plain)
    expect(fine).toBeLessThan(plain)
  })

  /**
   * A drag that lands on 0.30000000000000004 shows the teacher a number the field can never hold.
   */
  it('does not introduce decimals the step cannot produce', () => {
    expect(scrubbedValue(0.1, 6, { step: 0.1 })).toBe(0.3)
    expect(String(scrubbedValue(0.1, 6, { step: 0.1 }))).not.toContain('0000')
  })
})

describe('reading the step’s precision', () => {
  it('counts the decimals a step implies', () => {
    expect(precisionOf(1)).toBe(0)
    expect(precisionOf(0.1)).toBe(1)
    expect(precisionOf(0.05)).toBe(2)
    expect(precisionOf('0.001')).toBe(3)
  })
})

describe('finding the field a handle drives', () => {
  const mount = (html) => {
    const el = document.createElement('div')
    el.innerHTML = html
    document.body.appendChild(el)
    return el
  }

  it('finds the number input inside the same field group', () => {
    const el = mount('<label><span data-scrub>W</span><input type="number" value="5" /></label>')

    expect(fieldFor(el.querySelector('[data-scrub]'))).toBe(el.querySelector('input'))
  })

  /**
   * The size row puts W and H side by side inside one `join`. A handle must find ITS OWN field, or
   * dragging W would move H.
   */
  it('does not reach across into a neighbouring field', () => {
    const el = mount(`
      <div class="join">
        <label class="join-item"><span data-scrub id="w">W</span><input type="number" id="wi" value="5" /></label>
        <label class="join-item"><span data-scrub id="h">H</span><input type="number" id="hi" value="9" /></label>
      </div>`)

    expect(fieldFor(el.querySelector('#w'))).toBe(el.querySelector('#wi'))
    expect(fieldFor(el.querySelector('#h'))).toBe(el.querySelector('#hi'))
  })

  it('reports nothing when there is no field to drive', () => {
    const el = mount('<label><span data-scrub>W</span></label>')

    expect(fieldFor(el.querySelector('[data-scrub]'))).toBeNull()
  })
})
