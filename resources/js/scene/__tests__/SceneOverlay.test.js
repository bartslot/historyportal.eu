import { describe, it, expect, vi, afterEach } from 'vitest'
import { SceneOverlay, IDLE_FADE_MS } from '../SceneOverlay.js'

describe('SceneOverlay', () => {
  it('mounts year and location text into the host element', () => {
    const host = document.createElement('div')
    const overlay = new SceneOverlay(host)
    overlay.mount()
    overlay.update({ year: '1810', location: 'PARIS, FRANCE' })

    expect(host.querySelector('[data-year]').textContent).toBe('1810')
    expect(host.querySelector('[data-location]').textContent).toBe('PARIS, FRANCE')
    expect(host.querySelector('svg')).not.toBeNull()
  })

  it('uppercases the location', () => {
    const host = document.createElement('div')
    const overlay = new SceneOverlay(host)
    overlay.mount()
    overlay.update({ year: '1810', location: 'paris, france' })
    expect(host.querySelector('[data-location]').textContent).toBe('PARIS, FRANCE')
  })

  it('hides year badge when year is null', () => {
    const host = document.createElement('div')
    const overlay = new SceneOverlay(host)
    overlay.mount()
    overlay.update({ year: null, location: 'X' })

    const badge = host.querySelector('.scene-overlay__year')
    expect(badge.style.opacity).toBe('0')
  })

  it('uses container-relative caption sizing and hides the pin without a location', () => {
    const host = document.createElement('div')
    const overlay = new SceneOverlay(host)
    overlay.mount()
    overlay.update({ year: '1810', location: '   ' })

    expect(host.style.containerType).toBe('size')
    expect(host.innerHTML).toContain('cqw')
    expect(host.querySelector('[data-location-pin]').style.display).toBe('none')
    expect(host.querySelector('.scene-overlay__location').style.display).toBe('none')
    expect(host.querySelector('[data-year]').textContent).toBe('1810')
  })
})

describe('SceneOverlay in the editor fades out when idle (Bart, 2026-09-29)', () => {
  const setup = () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new SceneOverlay(host, { editable: true })
    overlay.update({ year: '1642', location: 'Quay', sceneId: 1 })
    return { host, overlay, wrap: host.querySelector('.scene-overlay__year') }
  }
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

  it('shows on a new scene, fades after 4 s, and a poll re-render does not bring it back', () => {
    const { overlay, wrap } = setup()
    expect(wrap.style.opacity).toBe('1')
    vi.advanceTimersByTime(IDLE_FADE_MS)
    expect(wrap.style.opacity).toBe('0')
    overlay.update({ year: '1642', location: 'Quay', sceneId: 1 })   // the same scene again
    expect(wrap.style.opacity).toBe('0')
    overlay.update({ year: '1650', location: 'Deck', sceneId: 2 })   // another scene
    expect(wrap.style.opacity).toBe('1')
  })

  it('comes back under the pointer and stays while it is being edited', () => {
    const { wrap, host } = setup()
    vi.advanceTimersByTime(IDLE_FADE_MS)
    wrap.dispatchEvent(new Event('pointerenter'))
    expect(wrap.style.opacity).toBe('1')
    const year = host.querySelector('[data-year]')
    year.tabIndex = 0             // jsdom cannot focus contenteditable; a browser can
    year.focus()
    wrap.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(IDLE_FADE_MS * 2)
    expect(wrap.style.opacity).toBe('1')
  })

  it('the player never fades it', () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const overlay = new SceneOverlay(host)
    overlay.update({ year: '1642', location: 'Quay', sceneId: 1 })
    vi.advanceTimersByTime(IDLE_FADE_MS * 2)
    expect(host.querySelector('.scene-overlay__year').style.opacity).toBe('1')
  })
})
