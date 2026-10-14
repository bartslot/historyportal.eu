import { describe, it, expect } from 'vitest'
import { placeQr, qrSpots, qrCard, frameRect, coverRect, QR } from '../title-qr.js'

const stage = { w: 1440, h: 900 }
const text = { w: 100, h: 44 }
const hits = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const rectOf = (spot) => ({ x: spot.x, y: spot.y, ...qrCard(spot.size, text) })

describe('where the join QR goes', () => {
  it('stays bottom right when that corner is free', () => {
    const spot = placeQr({ stage, text })
    expect(spot).toMatchObject({ hidden: false, name: 'bottom-right', size: 112 })
    expect(spot.x + 112).toBe(stage.w - QR.gutter)
  })

  it('keeps its own place beside the language switch when that is free', () => {
    const spot = placeQr({ stage, text, natural: { x: 1280, y: 688 } })
    expect(spot).toMatchObject({ name: 'bottom-right', x: 1280, y: 688, natural: true })
  })

  it('never covers a face, even when the face weighs nothing', () => {
    const face = { rect: { x: 1250, y: 650, w: 190, h: 250 }, kind: 'face', weight: 0 }
    const spot = placeQr({ stage, text, keepClear: [face] })
    expect(spot.name).toBe('top-right')
    expect(hits(rectOf(spot), face.rect)).toBe(false)
  })

  it('goes round faces in every corner, edge and the middle of the screen', () => {
    const faces = qrSpots(stage, qrCard(112, text)).slice(0, 7).map(s => ({ rect: { x: s.x, y: s.y, w: 40, h: 40 }, kind: 'face' }))
    const spot = placeQr({ stage, text, keepClear: faces })
    expect(spot.hidden).toBe(false)
    for (const f of faces) expect(hits(rectOf(spot), f.rect)).toBe(false)
  })

  it('never covers the screen\'s own elements (Start, the badges, the language switch)', () => {
    const elements = [{ x: 1200, y: 560, w: 240, h: 340 }, { x: 1300, y: 0, w: 140, h: 200 }]
    const spot = placeQr({ stage, text, elements })
    expect(spot.name).toBe('bottom-left')
    for (const e of elements) expect(hits(rectOf(spot), e)).toBe(false)
  })

  it('covers the least weighted figure when it must cover something', () => {
    const keepClear = [
      { rect: { x: 1200, y: 0, w: 240, h: 900 }, kind: 'figure', weight: 3 },
      { rect: { x: 0, y: 600, w: 300, h: 300 }, kind: 'subject', weight: 1 },
      { rect: { x: 0, y: 0, w: 300, h: 300 }, kind: 'figure', weight: 3 },
    ]
    expect(placeQr({ stage, text, keepClear }).name).toBe('bottom-center')
  })

  it('shrinks before it gives up, then hides', () => {
    const small = { w: 700, h: 260 }
    const elements = [{ x: 0, y: 0, w: 700, h: 100 }]
    const shrunk = placeQr({ stage: small, text, elements })
    expect(shrunk.hidden).toBe(false)
    expect(shrunk.size).toBeLessThan(112)
    expect(shrunk.size).toBeGreaterThanOrEqual(72)

    const hidden = placeQr({ stage: small, text, elements: [{ x: 0, y: 0, w: 700, h: 130 }] })
    expect(hidden).toEqual({ hidden: true })
  })

  it('does what the teacher chose: a corner even over a figure, or hidden', () => {
    const face = { rect: { x: 1250, y: 650, w: 190, h: 250 }, kind: 'face' }
    expect(placeQr({ stage, text, keepClear: [face], override: 'bottom-left' })).toMatchObject({ name: 'bottom-left', x: 16, size: 112 })
    expect(placeQr({ stage, text, override: 'top-left', topInset: 72 })).toMatchObject({ name: 'top-left', y: 72 })
    expect(placeQr({ stage, text, override: 'hidden' })).toEqual({ hidden: true })
  })
})

describe('keep-clear boxes to pixels', () => {
  it('maps a % of the frame onto the drawn frame', () => {
    expect(frameRect({ x: 10, y: 20, w: 50, h: 25 }, { x: -80, y: 0, w: 1600, h: 900 })).toEqual({ x: 80, y: 180, w: 800, h: 225 })
  })

  it('finds a covered picture\'s box in the view', () => {
    expect(coverRect(1440, 900, 2000, 1000)).toEqual({ x: -180, y: 0, w: 1800, h: 900 })
  })
})
