import { describe, it, expect, afterEach } from 'vitest'
import { containBox } from '../plate-box.js'
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
