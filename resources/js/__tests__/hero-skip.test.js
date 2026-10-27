import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Pair test 2026-10-24: "Skip" stayed on the homepage hero after the intro, and with reduced
// motion. The hide rules sat in @layer components, under DaisyUI's .btn (layered in utilities),
// so .btn's display won. They must be unlayered to win.

const depthAt = (css, index) => {
  let depth = 0
  for (let i = 0; i < index; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
  }
  return depth
}

describe('hero Skip button', () => {
  it('is hidden by an unlayered rule that DaisyUI .btn cannot override', () => {
    const css = readFileSync('resources/css/app.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...css.matchAll(/^([^{}\n]*\.hero-skip)\s*\{/gm)]

    expect(rules.map((m) => m[1].trim())).toEqual([
      '.hero-skip',
      '.js-hero-demo [data-demo]:not(.is-revealed) .hero-skip',
    ])
    for (const m of rules) expect(depthAt(css, m.index), m[1]).toBe(0)
  })
})
