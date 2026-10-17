import { describe, it, expect, afterEach, vi } from 'vitest'
import { balloonEntrance } from '../BalloonLayer.js'
import { artObjects } from '../../anim/scene-objects.js'

/**
 * Appear's speed and delay (Bart, 2026-10-17: "fast / Slow ... als add a delay (just like
 * keynote)"). The player honours both; a lesson saved before them plays exactly as it did.
 */

afterEach(() => { delete window.__lessonArtworkLayer })

describe('a balloon\'s entrance', () => {
  it('plays as before when it has no speed of its own', () => {
    expect(balloonEntrance({})).toEqual({ anim: 'pop', ease: 'pop', duration: 260 })
    expect(balloonEntrance({ anim: 'fade' })).toEqual({ anim: 'fade', ease: 'enter', duration: undefined })
  })

  it('takes its speed as a duration', () => {
    expect(balloonEntrance({ anim_duration: 520 }).duration).toBe(520)
    expect(balloonEntrance({ anim: 'fade', anim_duration: 300 }).duration).toBe(300)
  })
})

describe('a figure\'s entrance in the timeline', () => {
  it('is a span from its delay for as long as it plays, and none when it has no entrance', () => {
    window.__lessonArtworkLayer = { _layers: [
      { asset_id: 7, anim: 'fade', anim_delay: 0.5, anim_duration: 1200 },
      { asset_id: 8, anim: 'zoom' },
      { asset_id: 9 },
    ] }
    const spans = Object.fromEntries(artObjects().map((o) => [o.target, o.entrance]))
    expect(spans['art:7']).toEqual({ from: 0.5, to: 1.7 })
    expect(spans['art:8']).toEqual({ from: 0, to: 0.6 })
    expect(spans['art:9']).toBeNull()
  })
})

describe('the timeline bar for a figure\'s entrance', () => {
  it('reads the entrance, and a drag commits delay and length in one call', async () => {
    const { animationTimeline } = await import('../../anim/timeline-panel.js')
    window.__lessonArtworkLayer = { _layers: [{ asset_id: 7, anim: 'fade', anim_delay: 0.5, anim_duration: 600 }] }
    const p = animationTimeline({ sceneId: 'appear', tracks: [], targets: [], duration: 8 })
    p.$wire = { setLayerEntrance: vi.fn(), setTimeline () {} }
    p.refreshObjects()

    expect(p.barOf('art:7')).toEqual({ from: 0.5, to: 1.1 })
    p.commitBar('art:7', { target: 'art:7', from: 2, to: 2.9 })
    expect(p.$wire.setLayerEntrance).toHaveBeenCalledWith(7, 2, 900)
    // The bar stays where it was let go while the save comes back.
    expect(p.barOf('art:7')).toEqual({ from: 2, to: 2.9 })
  })
})
