import { describe, it, expect } from 'vitest'
import { normalizeGradient, gradientCss, gradientLine } from '../background-gradient.js'

describe('background gradient', () => {
  it('rejects anything that is not two hex colours', () => {
    expect(normalizeGradient(null)).toBeNull()
    expect(normalizeGradient({ from: 'red', to: '#000000' })).toBeNull()
    expect(gradientCss({ from: '#112233' })).toBe('')
  })

  it('writes CSS with the angle wrapped into 0-359', () => {
    expect(gradientCss({ from: '#112233', to: '#445566', angle: 450 })).toBe('linear-gradient(90deg, #112233, #445566)')
  })

  it('draws the canvas line the way CSS does', () => {
    // 180deg in CSS runs top to bottom: from the middle of the top edge to the middle of the bottom.
    const down = gradientLine(180, 200, 100)
    expect([down.x0, down.y0, down.x1, down.y1].map(v => Math.round(v) + 0)).toEqual([100, 0, 100, 100])
    // 90deg runs left to right.
    const right = gradientLine(90, 200, 100)
    expect([right.x0, right.y0, right.x1, right.y1].map(v => Math.round(v) + 0)).toEqual([0, 50, 200, 50])
  })
})
