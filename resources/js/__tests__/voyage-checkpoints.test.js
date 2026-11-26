// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  autoCardMs, CAROUSEL_MS, checkpointFraction, checkpointHasContent, checkpointImages, checkpointsOf,
  passedCheckpoints, renderCheckpointCard,
} from '../voyage-checkpoints.js'

// A straight track from Hormuz (56.3, 27.1) to Balkh (66.9, 36.8): f runs 0.4 → 0.6 over the leg.
const A = { lng: 56.3, lat: 27.1 }
const B = { lng: 66.9, lat: 36.8 }
const pointAt = (f) => {
  const k = Math.min(1, Math.max(0, (f - 0.4) / 0.2))
  return { lng: A.lng + (B.lng - A.lng) * k, lat: A.lat + (B.lat - A.lat) * k }
}

describe('checkpointFraction', () => {
  it('finds where the traveller passes a point on the route', () => {
    expect(checkpointFraction({ lng: 61.6, lat: 31.95 }, pointAt, 0.4, 0.6)).toBeCloseTo(0.5, 3)
  })

  it('snaps a point beside the route to its nearest spot on it', () => {
    // A little off the line, a quarter of the way along.
    expect(checkpointFraction({ lng: 59.2, lat: 29.3 }, pointAt, 0.4, 0.6)).toBeCloseTo(0.45, 2)
  })

  it('keeps a point past the end on the leg', () => {
    expect(checkpointFraction({ lng: 80, lat: 50 }, pointAt, 0.4, 0.6)).toBeCloseTo(0.6, 5)
  })

  it('measures across the antimeridian the short way', () => {
    const pacific = (f) => ({ lng: 170 + 20 * f, lat: -20 })   // 170°E → 190°E, drawn unwrapped
    expect(checkpointFraction({ lng: -175, lat: -20 }, pacific, 0, 1)).toBeCloseTo(0.75, 2)
  })
})

describe('passedCheckpoints', () => {
  it('opens each checkpoint once, in the order the traveller meets them', () => {
    const fs = [0.55, 0.45, 0.58]
    const shown = new Set()
    expect(passedCheckpoints(fs, 0.4, 0.5, shown)).toEqual([1])
    shown.add(1)
    expect(passedCheckpoints(fs, 0.4, 0.6, shown)).toEqual([0, 2])
  })
})

describe('content', () => {
  it('reads pictures as URLs and ignores empty ones', () => {
    expect(checkpointImages({ images: [{ url: 'a.webp' }, 'b.webp', { url: ' ' }, null] })).toEqual(['a.webp', 'b.webp'])
  })

  it('never offers an empty card', () => {
    expect(checkpointHasContent({ title: ' ', story: '', images: [] })).toBe(false)
    expect(checkpointHasContent({ story: 'De karavaan rust.' })).toBe(true)
    expect(checkpointHasContent({ images: [{ url: 'a.webp' }] })).toBe(true)
  })

  it('drops checkpoints without an id or a point', () => {
    expect(checkpointsOf([{ id: 'a', lng: 1, lat: 2 }, { lng: 1, lat: 2 }, { id: 'b', lng: 'x', lat: 2 }]).map((c) => c.id)).toEqual(['a'])
  })

  it('stays up long enough for every picture to come round', () => {
    expect(autoCardMs({ images: [] })).toBe(7000)
    expect(autoCardMs({ images: ['a', 'b', 'c'] })).toBe(3 * CAROUSEL_MS + 1000)
    expect(autoCardMs({ images: Array(12).fill('a') })).toBe(12 * CAROUSEL_MS + 1000)   // every picture comes round
  })
})

describe('renderCheckpointCard', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

  it('puts the picture on top and the text under it, as text', () => {
    const host = document.createElement('div')
    renderCheckpointCard(host, { id: 'cp1', title: '<b>Pamir</b>', story: 'Hoog en koud.', images: [{ url: 'p.webp' }] })
    const card = host.querySelector('[data-checkpoint-card="cp1"]')
    expect(card.firstElementChild.className).toBe('lp-checkpoint-media')
    expect(card.querySelector('.lp-checkpoint-title').textContent).toBe('<b>Pamir</b>')
    expect(card.querySelector('b')).toBeNull()
  })

  it('fades through more than one picture', () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    renderCheckpointCard(host, { id: 'cp2', images: ['a.webp', 'b.webp'] })
    const [a, b] = host.querySelectorAll('.lp-checkpoint-media img')
    expect([a.style.opacity, b.style.opacity]).toEqual(['1', '0'])
    vi.advanceTimersByTime(CAROUSEL_MS)
    expect([a.style.opacity, b.style.opacity]).toEqual(['0', '1'])
    expect(host.querySelector('.lp-checkpoint-text')).toBeNull()   // pictures only: no text block
  })

  it('closes from its button', () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const onClose = vi.fn()
    renderCheckpointCard(host, { id: 'cp3', story: 'x' }, { onClose })
    host.querySelector('.lp-checkpoint-close').click()
    vi.advanceTimersByTime(300)
    expect(onClose).toHaveBeenCalledOnce()
    expect(host.querySelector('[data-checkpoint-card]')).toBeNull()
  })
})
