import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { gsap } from 'gsap'
import { setupLandingCursor } from '../landing-cursor.js'

// Pair test 2026-10-24: a white dot sat top-left on every phone homepage, and on desktop it
// parked mid-poster until the mouse moved.

const mockPointer = (fine) => {
  window.matchMedia = vi.fn((q) => ({ matches: q === '(pointer: fine)' ? fine : false }))
}

const move = (pointerType) => {
  const e = new Event('pointermove')
  Object.assign(e, { clientX: 120, clientY: 80, pointerType })
  window.dispatchEvent(e)
}

describe('landing cursor', () => {
  let dot
  beforeEach(() => {
    document.body.innerHTML = '<div class="landing-cursor"></div>'
    dot = document.querySelector('.landing-cursor')
  })

  it('stays hidden on desktop until the mouse first moves', () => {
    mockPointer(true)
    setupLandingCursor()
    expect(gsap.getProperty(dot, 'autoAlpha')).toBe(0)

    move('mouse')
    gsap.globalTimeline.progress(1, true)
    gsap.ticker.tick()
    expect(dot.style.visibility).not.toBe('hidden')
  })

  it('a finger on a hybrid screen never brings the dot up', () => {
    mockPointer(true)
    setupLandingCursor()
    move('touch')
    expect(gsap.getProperty(dot, 'autoAlpha')).toBe(0)
  })

  it('is hidden by CSS by default and gone on touch screens', () => {
    const css = readFileSync('resources/css/app.css', 'utf8')
    const base = css.match(/^\s*\.landing-cursor\s*\{([^}]*)\}/m)[1]
    expect(base).toMatch(/visibility:\s*hidden/)
    expect(css).toMatch(/@media \(pointer: coarse\)[^{]*\{\s*\.landing-cursor\s*\{\s*display:\s*none/)
  })
})
