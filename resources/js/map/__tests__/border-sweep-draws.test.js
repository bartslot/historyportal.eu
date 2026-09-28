import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sweepBorder } from '../border-sweep.js'

/**
 * The sweep has to actually draw, and for a while it did not.
 *
 * border-sweep.js reached for its default curve as `EASING.easeInCubic` off a NAMESPACE import
 * (`import * as EASING`), and easing.js has no top-level export by that name — it exports the
 * EASING object. So the default was `undefined`, and the frame loop's `gradient(easing(t))` threw
 * on every tick straight into a `catch { /* layer removed under us *\/ }` written for a different
 * problem. Neither caller passes `easing`, so BOTH of them ran the whole animation drawing nothing:
 * the voyage's coastline draw-on and the Time-Map's territory click sweep. Two seconds of silence,
 * then a snap to the end state.
 *
 * Nothing caught it because nothing asserted the sweep PAINTS. The layer was created, the tween
 * ran its full duration, and it cleaned up after itself correctly — every observable except the
 * one that matters looked right. So that is what this asserts, on the default path specifically,
 * because the default path is the one that was broken.
 */

/** The handful of MapLibre calls sweepBorder makes, and a record of what it painted. */
function fakeMap() {
  const layers = new Set()
  const sources = new Set()
  const painted = []

  return {
    painted,
    getLayer: (id) => (layers.has(id) ? { id } : undefined),
    getSource: (id) => (sources.has(id) ? { id } : undefined),
    addLayer: ({ id }) => layers.add(id),
    addSource: (id) => sources.add(id),
    removeLayer: (id) => layers.delete(id),
    removeSource: (id) => sources.delete(id),
    setPaintProperty: (_id, prop, value) => painted.push({ prop, value }),
  }
}

/** A ring big enough that sweepBorder gives it a real duration. */
const RING = [[[-9.2, 43], [-8.5, 43.3], [-7.1, 43.5], [-5.6, 43.5], [-9.2, 43]]]

describe('sweepBorder', () => {
  let frames

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (cb) => frames.push(cb) )
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })
  afterEach(() => vi.unstubAllGlobals())

  /** Run `n` frames, `ms` apart, from the clock the sweep started on. */
  const advance = (n, ms) => {
    const t0 = performance.now()
    for (let i = 1; i <= n; i++) {
      const cb = frames.shift()
      if (!cb) break
      cb(t0 + i * ms)
    }
  }

  it('paints a moving gradient with no easing passed — the default has to be a real curve', () => {
    const map = fakeMap()
    sweepBorder(map, { id: 'sweep', lines: RING, trail: '#211809' })

    advance(4, 120)

    const gradients = map.painted.filter((p) => p.prop === 'line-gradient')
    expect(gradients.length, 'the sweep never painted — it threw into its own catch').toBeGreaterThan(2)

    // Every frame paints a DIFFERENT gradient: that is the comet moving along the line. A default
    // that threw produced no frames at all, and one that was constant would be a stalled sweep.
    const distinct = new Set(gradients.map((g) => JSON.stringify(g.value)))
    expect(distinct.size, 'the sweep painted the same gradient every frame').toBeGreaterThan(2)
  })

  it('still honours an easing passed in explicitly', () => {
    const map = fakeMap()
    const easing = vi.fn((t) => t * t)
    sweepBorder(map, { id: 'sweep', lines: RING, trail: '#211809', easing })

    advance(3, 120)

    expect(easing).toHaveBeenCalled()
    expect(easing.mock.calls.every(([t]) => t >= 0 && t <= 1), 'progress left 0..1').toBe(true)
  })
})
