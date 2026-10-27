import { describe, test, expect, beforeEach } from 'vitest'
import { buildStoryboard, DEFAULTS, applyVariant } from '../lesson-demo.js'

/**
 * Bart 2026-10-21: the entrance "needs to be much much faster" and a pointer should click the age
 * group, so it feels quick and easy. It ran ~21 s to the lesson (1.3 s beats, 0.7 timescale).
 */

const MAX_SECONDS_TO_REVEAL = 8

function hero () {
  document.body.innerHTML = `
    <div data-demo>
      <div data-demo-conversation style="position:relative">
        <p data-demo-step="goal">Goal?</p>
        <span data-demo-typed="De VOC en ontdekkingsreizen"></span><span data-demo-caret></span>
        <p data-demo-step="audience">Who?</p>
        <span data-demo-chip>Groep 8</span><span data-demo-chip data-demo-chip-pick>Klas 2</span>
        <span data-demo-pointer></span>
      </div>
      <div data-demo-reveal><div data-reveal-item></div></div>
    </div>`
  return document.querySelector('[data-demo]')
}

const warp = { state: {}, recede () {}, restart () {} }

describe('hero storyboard pace', () => {
  let settings

  beforeEach(() => {
    settings = applyVariant({ ...DEFAULTS }, DEFAULTS.variant)
  })

  test('the lesson lands within a few seconds at the default speed', () => {
    const master = buildStoryboard(hero(), warp, settings)

    expect(master.labels.reveal / settings.timeScaleStart).toBeLessThan(MAX_SECONDS_TO_REVEAL)
  })

  test('a pointer clicks the picked age group before the warp', () => {
    const root = hero()
    const master = buildStoryboard(root, warp, settings)
    const picked = root.querySelector('[data-demo-chip-pick]')

    expect(master.labels.click).toBeGreaterThan(0)
    expect(master.labels.click).toBeLessThan(master.labels.warp)

    master.seek(master.labels.click - 0.01, false)
    expect(picked.classList.contains('is-picked')).toBe(false)
    master.seek(master.labels.click + 0.01, false)
    expect(picked.classList.contains('is-picked')).toBe(true)
  })
})
