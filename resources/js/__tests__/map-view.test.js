import { describe, it, expect } from 'vitest'
import { openingView, contentBox, boxView, labelsView, FALLBACK_VIEW, LABELS_MAX_ZOOM } from '../map-view.js'

// A US Civil War block: focus cities on the eastern seaboard, no European coordinate anywhere.
const US_FOCUS = [
  { type: 'focus', lng: -89.65, lat: 39.8, label: 'Springfield, Illinois' },
  { type: 'focus', lng: -77.04, lat: 38.9, label: 'Washington' },
  { type: 'focus', lng: -79.93, lat: 32.78, label: 'Charleston' },
]

describe('openingView', () => {
  /**
   * The regression this guards: the map opened on Switzerland regardless of content, and stayed
   * there whenever the polity fit couldn't run — a US lesson looking at Europe.
   */
  it('opens on the block\'s own cities, not Europe', () => {
    const { center, zoom } = openingView({ annotations: US_FOCUS })

    expect(center[0]).toBeLessThan(-70)   // western hemisphere
    expect(center[1]).toBeGreaterThan(30) // northern mid-latitudes
    expect(zoom).toBeGreaterThan(FALLBACK_VIEW.zoom)
  })

  it('frames pinned place labels the same way as focus cities', () => {
    const labels = US_FOCUS.map((a) => ({ text: a.label, lng: a.lng, lat: a.lat }))

    expect(openingView({ labels })).toEqual(openingView({ annotations: US_FOCUS }))
  })

  it('falls back to the default view when the block names no place', () => {
    expect(openingView({})).toEqual(FALLBACK_VIEW)
    expect(openingView({ annotations: [], labels: [] })).toEqual(FALLBACK_VIEW)
  })

  // A single city has no span at all, so the raw maths would slam the camera to its zoom cap.
  it('keeps a single focus city at a regional zoom, not pressed against its dot', () => {
    const { center, zoom } = openingView({ annotations: [US_FOCUS[1]] })

    expect(center).toEqual([-77.04, 38.9])
    expect(zoom).toBe(5)
  })
})

describe('contentBox', () => {
  it('ignores annotations that are not focus pins and labels with no text', () => {
    const box = contentBox({
      annotations: [...US_FOCUS, { type: 'arrow', lng: 4.9, lat: 52.4 }],
      labels: [{ lng: 2.35, lat: 48.86 }],
    })

    expect(box).toEqual({ minX: -89.65, minY: 32.78, maxX: -77.04, maxY: 39.8 })
  })

  it('skips coordinates that are missing or unparseable', () => {
    expect(contentBox({ annotations: [{ type: 'focus', lng: 'x', lat: 12 }] })).toBeNull()
  })
})

describe('boxView', () => {
  it('centres on the box and zooms out as the box grows', () => {
    const small = boxView({ minX: -10, minY: 40, maxX: 10, maxY: 50 })
    const large = boxView({ minX: -120, minY: -40, maxX: 120, maxY: 60 })

    expect(small.center).toEqual([0, 45])
    expect(small.zoom).toBeGreaterThan(large.zoom)
  })
})

describe('labelsView', () => {
  // Dante 1289: the polity fit (Italy) framed half of Europe and these three shared one blot.
  const TUSCANY = [
    { type: 'focus', lng: 11.7, lat: 43.75, label: 'Campaldino' },
    { type: 'focus', lng: 11.2558, lat: 43.7696, label: 'Firenze' },
    { type: 'focus', lng: 11.3308, lat: 43.3188, label: 'Siena' },
  ]

  it('frames Tuscany at regional zoom, far closer than the polity/opening view', () => {
    const v = labelsView({ annotations: TUSCANY })

    expect(v.center[0]).toBeCloseTo((11.2558 + 11.7) / 2, 5)
    expect(v.center[1]).toBeCloseTo((43.3188 + 43.7696) / 2, 5)
    expect(v.zoom).toBeGreaterThan(openingView({ annotations: TUSCANY }).zoom)
    expect(v.zoom).toBeLessThanOrEqual(LABELS_MAX_ZOOM)
  })

  it('pads the box 15% each side', () => {
    // 20° wide box: span 20 * 1.3 = 26 → zoom log2(300/26); tall side smaller so width rules.
    const v = labelsView({ annotations: [
      { type: 'focus', lng: 0, lat: 40, label: 'a' },
      { type: 'focus', lng: 20, lat: 42, label: 'b' },
    ] })
    expect(v.zoom).toBeCloseTo(Math.log2(300 / 26), 5)
  })

  it('never zooms a single pin to street level', () => {
    const v = labelsView({ annotations: [TUSCANY[1]] })
    expect(v.center).toEqual([11.2558, 43.7696])
    // min span 1.5° (x1.7 for height) → log2(300 / 2.55) ≈ 6.9, capped at the map's own max.
    expect(v.zoom).toBe(LABELS_MAX_ZOOM)
    expect(labelsView({ annotations: [TUSCANY[1]] })).toEqual(labelsView({ annotations: [TUSCANY[1], TUSCANY[1]] }))
  })

  it('returns null when the block names no place, so the caller keeps its old camera', () => {
    expect(labelsView({})).toBeNull()
  })
})
