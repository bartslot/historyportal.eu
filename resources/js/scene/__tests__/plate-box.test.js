import { describe, it, expect, afterEach } from 'vitest'
import { containBox, plateBox, subjectFocusX } from '../plate-box.js'
import { ParallaxScene } from '../ParallaxScene.js'

const PLATE = 2880 / 1607   // the history-line backdrops

describe('containBox (pure)', () => {
  it('pillarboxes a 16:9 plate on nothing at 16:9 and letterboxes it at 16:10', () => {
    expect(containBox(1600, 900, 16 / 9)).toEqual({ left: 0, top: 0, width: 1600, height: 900 })
    const b = containBox(1440, 900, PLATE)
    expect(b.width).toBe(1440)
    expect(b.height).toBeCloseTo(1440 / PLATE, 6)
    expect(b.top).toBeCloseTo((900 - 1440 / PLATE) / 2, 6)
  })

  it('fits a phone in portrait by width: a band across the middle', () => {
    const b = containBox(390, 844, PLATE)
    expect(b.width).toBe(390)
    expect(b.height).toBeCloseTo(217.6, 1)
    expect(b.top).toBeCloseTo((844 - b.height) / 2, 6)
  })

  it('is the whole stage when the plate shape is unknown', () => {
    expect(containBox(800, 600, null)).toEqual({ left: 0, top: 0, width: 800, height: 600 })
  })
})

describe('plateBox: portrait falls back to cover around the subject (pure)', () => {
  const person = (x, height) => ({ kind: 'figure', x, height, url: '/storage/svg-assets/library/history-line/figures/dante/p.webp' })

  it('stays the contain box on a landscape stage, whatever the figures', () => {
    expect(plateBox(1440, 900, PLATE, [person(10, 50)])).toEqual(containBox(1440, 900, PLATE))
  })

  it('fills the height of a phone and puts the subject in the middle (Nasce la Commedia: Dante at 40%)', () => {
    const b = plateBox(390, 844, PLATE, [person(40, 62)])
    expect(b.height).toBe(844)
    expect(b.width).toBeCloseTo(844 * PLATE, 6)   // ≈ 1513 px: figures ~3.9× the contain strip's size
    expect(b.top).toBe(0)
    expect(b.left + 0.4 * b.width).toBeCloseTo(195, 6)
  })

  it('never shows past the plate: a subject near an edge clamps the crop to that edge', () => {
    expect(plateBox(390, 844, PLATE, [person(2, 50)]).left).toBe(0)
    const right = plateBox(390, 844, PLATE, [person(99, 50)])
    expect(right.left + right.width).toBeCloseTo(390, 6)
  })

  it('centres when there are no figures', () => {
    const b = plateBox(390, 844, PLATE, null)
    expect(b.left + b.width / 2).toBeCloseTo(195, 6)
  })
})

describe('subjectFocusX (pure)', () => {
  const fig = (x, height, url = '/storage/svg-assets/library/history-line/figures/dante/d.webp') => ({ kind: 'figure', x, height, url })
  const nature = (x, height) => fig(x, height, '/storage/svg-assets/library/history-line/nature/tuscany/cipresso.webp')

  it('is the height-weighted centroid of people that fit the window', () => {
    expect(subjectFocusX([fig(40, 60), fig(50, 40)], 0.26)).toBeCloseTo((40 * 60 + 50 * 40) / 100 / 100, 6)
    // the whole plate is visible: any group fits
    expect(subjectFocusX([fig(30, 42), fig(64, 40), fig(75, 28)])).toBeCloseTo((30 * 42 + 64 * 40 + 75 * 28) / 110 / 100, 6)
  })

  it('centres on the tallest person when the group cannot fit (Poesia: Dante 26/72, Beatrice 63/64, Guido 88/50)', () => {
    // a centroid (≈0.55) would frame Beatrice's back and neither poet
    expect(subjectFocusX([fig(88, 50), fig(63, 64), fig(26, 72)], 0.26)).toBe(0.26)
  })

  it('lets the people decide, not the scenery (La condanna e l\'esilio: Dante at 42, a cypress at 88)', () => {
    expect(subjectFocusX([nature(42, 9), nature(88, 52), fig(42, 46), nature(14, 15)], 0.26)).toBeCloseTo(0.42, 6)
  })

  it('falls back to all figures when none is a library person, and to null when there are none', () => {
    expect(subjectFocusX([nature(20, 10), nature(30, 10)], 0.26)).toBeCloseTo(0.25, 6)
    expect(subjectFocusX([{ kind: 'cover', url: '/bg.webp', x: null }])).toBeNull()
    expect(subjectFocusX(null)).toBeNull()
  })
})

describe('cover bleed', () => {
  afterEach(() => { document.body.innerHTML = '' })
  const coverInset = (motion, fit) => {
    const host = document.createElement('div'); document.body.appendChild(host)
    const s = new ParallaxScene(host)
    s.show({ layers: [{ url: '/bg.webp', kind: 'cover', depth: 1 }], motion, fit })
    return host.querySelector('.px-layer-bg').style.inset
  }

  it('bleeds only while the camera moves', () => {
    expect(coverInset({ panX: -4, zoom: 1.06 })).toBe('-6%')
    expect(coverInset({ panX: 0, panY: 0, zoom: 1 })).toBe('0%')
  })

  it("holds still on 'contain' whatever motion it is handed", () => {
    expect(coverInset({ panX: -4, zoom: 1.06 }, 'contain')).toBe('0%')
  })
})
