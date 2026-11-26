import { describe, it, expect, beforeEach, vi } from 'vitest'
import { attachLoop, detachLoop, loopVideo, loopSource } from '../picture-loop.js'
import { ParallaxScene } from '../ParallaxScene.js'
import { hideFlatLayers } from '../stage-handoff.js'

const stubReducedMotion = (reduce) => {
  window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: reduce && q.includes('reduce'), media: q }))
}

beforeEach(() => {
  stubReducedMotion(false)
  // jsdom has no media playback
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  window.HTMLMediaElement.prototype.pause = vi.fn()
  window.HTMLMediaElement.prototype.load = vi.fn()
})

describe('picture loop', () => {
  it('makes a muted inline looping video, so browsers autoplay it', () => {
    const v = loopVideo('/storage/a.mp4')
    expect(v.muted).toBe(true)
    expect(v.loop).toBe(true)
    expect(v.hasAttribute('playsinline')).toBe(true)
    expect(v.getAttribute('src')).toBe('/storage/a.mp4')
  })

  it('lays one loop over the picture and replaces it on the next attach', () => {
    const host = document.createElement('div')
    attachLoop(host, '/storage/a.mp4', { fit: 'contain' })
    attachLoop(host, '/storage/b.mp4')
    const videos = host.querySelectorAll('video')
    expect(videos).toHaveLength(1)
    expect(videos[0].getAttribute('src')).toBe('/storage/b.mp4')
    expect(videos[0].style.objectFit).toBe('cover')
  })

  it('stays invisible until the video plays, so the still shows meanwhile', () => {
    const host = document.createElement('div')
    const v = attachLoop(host, '/storage/a.mp4')
    expect(v.style.opacity).toBe('0')
    v.dispatchEvent(new Event('playing'))
    expect(v.style.opacity).toBe('1')
  })

  it('keeps the still under reduced motion, and with no url clears the old loop', () => {
    const host = document.createElement('div')
    attachLoop(host, '/storage/a.mp4')
    attachLoop(host, null)
    expect(host.querySelector('video')).toBeNull()
    stubReducedMotion(true)
    expect(attachLoop(host, '/storage/a.mp4')).toBeNull()
  })

  it('a hidden flat layer lets its loop go', () => {
    const host = document.createElement('div')
    attachLoop(host, '/storage/a.mp4')
    hideFlatLayers([host])
    expect(host.querySelector('video')).toBeNull()
    detachLoop(null)   // no host: nothing to do, no throw
  })

  it('a layered panel plays the loop on its backdrop plane, over the still', () => {
    const host = document.createElement('div')
    const scene = new ParallaxScene(host)
    scene.show({ layers: [{ url: '/storage/a.jpg', kind: 'cover', depth: 0.4, loop: '/storage/a.mp4' }] })
    const plane = host.querySelector('.px-layer-bg')
    expect(plane.querySelector('img').getAttribute('src')).toBe('/storage/a.jpg')
    expect(plane.querySelector('video').getAttribute('src')).toBe('/storage/a.mp4')
    scene.destroy()
  })
})

describe('AV1 copy', () => {
  it('fetches the AV1 file where the browser plays AV1', () => {
    const spy = vi.spyOn(window.HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
    expect(loopSource('/storage/a.loop.mp4#av1')).toBe('/storage/a.loop.av1.mp4')
    expect(loopVideo('/storage/a.loop.mp4#av1').getAttribute('src')).toBe('/storage/a.loop.av1.mp4')
    spy.mockRestore()
  })

  it('keeps the H.264 file where it does not, and for a loop without a copy', () => {
    const spy = vi.spyOn(window.HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')
    expect(loopSource('/storage/a.loop.mp4#av1')).toBe('/storage/a.loop.mp4')
    spy.mockReturnValue('probably')
    expect(loopSource('/storage/a.mp4')).toBe('/storage/a.mp4')
    spy.mockRestore()
  })
})

describe('holding every loop with the scene clock', () => {
  it('pauses and resumes the loops on the page, and holds one made while paused', async () => {
    const { setLoopsPaused } = await import('../picture-loop.js')
    const host = document.createElement('div')
    const v = attachLoop(host, '/storage/held-a.mp4')
    const pause = vi.fn()
    const play = vi.fn(() => Promise.resolve())
    Object.assign(v, { pause, play })
    setLoopsPaused(true)
    expect(pause).toHaveBeenCalled()
    const late = loopVideo('/storage/held-b.mp4')
    const latePause = vi.fn()
    late.pause = latePause
    late.dispatchEvent(new Event('playing'))   // it plays once (first frame), then stops with the clock
    expect(latePause).toHaveBeenCalled()
    setLoopsPaused(false)
    expect(play).toHaveBeenCalled()
  })

  it('seeks every loop to the scene time, wrapped to its own length', async () => {
    const { seekLoops, setLoopsPaused } = await import('../picture-loop.js')
    setLoopsPaused(true)
    const v = loopVideo('/storage/seek.mp4')
    Object.defineProperty(v, 'duration', { value: 4, configurable: true })
    Object.defineProperty(v, 'currentTime', { value: 0, writable: true, configurable: true })
    seekLoops(9.5)
    expect(v.currentTime).toBeCloseTo(1.5)
    setLoopsPaused(false)
  })

  it('forgets a stopped loop', async () => {
    const { setLoopsPaused } = await import('../picture-loop.js')
    const host = document.createElement('div')
    const v = attachLoop(host, '/storage/gone.mp4')
    detachLoop(host)
    const pause = vi.fn()
    v.pause = pause
    setLoopsPaused(true)
    expect(pause).not.toHaveBeenCalled()
    setLoopsPaused(false)
  })
})
