import { describe, it, expect } from 'vitest'
import { BalloonLayer } from '../BalloonLayer.js'

/**
 * Bart, 2026-10-20: "are they still drifting when you reload? I saw tails disappearing when I
 * opened a lesson again." A balloon must be the same picture at any stage size: the editor's stage
 * changes with the panels around it, and the player's is the whole screen.
 */
const sized = (w, h) => {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: w })
  Object.defineProperty(host, 'clientHeight', { value: h })
  host.getBoundingClientRect = () => ({ left: 0, top: 0, right: w, bottom: h, width: w, height: h })
  const stage = document.createElement('div')
  stage.getBoundingClientRect = host.getBoundingClientRect
  stage.appendChild(host)
  return host
}

const line = { id: 'bal_1', speaker: 'balloon', text: 'Je krijgt 2 schepen', start: 0, end: null, at: [0.2542, 0.2229], tail: { tip: [0.3023, 0.3741], bend: 0.12 } }
const fontOf = (host) => parseFloat(host.querySelector('.lp-balloon__bubble').style.fontSize)
const maxWidthOf = (host) => parseFloat(host.querySelector('.lp-balloon__bubble').style.maxWidth)

describe('a balloon is drawn in proportion to its stage', () => {
  it('has the same size relative to the stage in a small editor stage and a full-screen player', () => {
    for (const editable of [true, false]) {
      const small = sized(800, 450)
      const big = sized(1600, 900)
      new BalloonLayer(small, () => null, { editable }).setLines([line])
      new BalloonLayer(big, () => null, { editable }).setLines([line])
      expect(fontOf(small) / fontOf(big)).toBeCloseTo(0.5, 6)
      expect(maxWidthOf(small) / maxWidthOf(big)).toBeCloseTo(0.5, 6)
    }
  })

  it('keeps the words readable on a phone-sized player, and only there', () => {
    const phone = sized(400, 225)
    new BalloonLayer(phone, () => null).setLines([line])
    expect(fontOf(phone)).toBeGreaterThanOrEqual(13)
    const editorSmall = sized(400, 225)
    new BalloonLayer(editorSmall, () => null, { editable: true }).setLines([line])
    expect(fontOf(editorSmall)).toBeCloseTo(30 * 400 / 1920, 6)
  })
})

describe('a speaker that is drawn late', () => {
  it('gets its tail as soon as the figure is on stage, without a new mount', () => {
    const host = sized(1600, 900)
    let box = null   // the figure's picture is still loading
    const layer = new BalloonLayer(host, () => box)
    layer.setLines([{ id: 'bal_3', speaker: 'tasman', text: 'Terra Australis...', start: 0, end: null, figure: { asset_id: 104, mouth: [0.5456, 0.1299], facing: -1 } }])
    const ink = () => host.querySelector('.lp-balloon__tail .ink').getAttribute('d')
    expect(ink()).toBe('')
    box = { left: 900, top: 300, width: 200, height: 500, right: 1100, bottom: 800 }
    layer._relayout()   // what every animation frame does while a balloon is up
    expect(ink()).toMatch(/^M /)
  })
})
