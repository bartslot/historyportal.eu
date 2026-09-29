import { describe, it, expect } from 'vitest'
import { BalloonLayer, balloonSide, layoutBalloon, mouthGap } from '../BalloonLayer.js'
import { lineCues } from '../captions.js'

/**
 * Speech balloons. The rule worth pinning is Bart's: the tail tip stops 55 px from the mouth at
 * 1920 wide (he asked for 50-60), and the balloon never leaves the frame.
 */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('layoutBalloon', () => {
  it('stops the tail 55 px short of the mouth on a 1920 stage', () => {
    const mouth = [460, 430]
    const { tail } = layoutBalloon(mouth, { w: 420, h: 120 }, { w: 1920, h: 1080 })
    expect(dist(tail.tip, mouth)).toBeCloseTo(55, 5)
  })

  it('keeps a readable gap on a phone instead of shrinking it to nothing', () => {
    const mouth = [90, 300]
    const { tail } = layoutBalloon(mouth, { w: 180, h: 80 }, { w: 375, h: 667 })
    expect(dist(tail.tip, mouth)).toBeCloseTo(14, 6)
    expect(mouthGap(375)).toBe(14)
  })

  it('puts the balloon above the mouth and inside the frame, even for a mouth at the edge', () => {
    const host = { w: 1920, h: 1080 }
    const box = { w: 500, h: 140 }
    const { left, top } = layoutBalloon([1900, 200], box, host)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + box.w).toBeLessThanOrEqual(host.w)
    expect(top).toBeGreaterThanOrEqual(0)
  })

  it('keeps the balloon on screen when a portrait crop hides the speaker', () => {
    // A 1493 px plate shown through an 800 px window starting at x = 346.
    const view = { x0: 346, y0: 0, x1: 1146, y1: 804 }
    const { left, tail } = layoutBalloon([1300, 375], { w: 300, h: 100 }, { w: 1493, h: 804 }, view)
    expect(left).toBeGreaterThanOrEqual(view.x0)
    expect(left + 300).toBeLessThanOrEqual(view.x1)
    expect(Math.hypot(tail.tip[0] - 1300, tail.tip[1] - 375)).toBeGreaterThanOrEqual(mouthGap(1493) - 1e-9)
  })

  it('moves a new balloon off one already on screen', () => {
    const host = { w: 1920, h: 1080 }
    const box = { w: 400, h: 100 }
    const first = { left: 760, top: 48, w: 400, h: 100 }
    const { left, top } = layoutBalloon(null, box, host, undefined, [first])
    const apart = left >= first.left + first.w || left + box.w <= first.left || top >= first.top + first.h
    expect(apart).toBe(true)
  })

  it('never pushes a speaker\'s balloon across the frame, away from its mouth', () => {
    const host = { w: 1920, h: 1080 }
    const box = { w: 420, h: 110 }
    const mouth = [460, 470]
    const alone = layoutBalloon(mouth, box, host)
    // Something already sits exactly where this balloon wants to go.
    const blocker = { left: alone.left, top: alone.top, w: 700, h: box.h }
    const moved = layoutBalloon(mouth, box, host, undefined, [blocker])
    expect(moved.left + box.w / 2).toBeLessThan(host.w / 2)
    expect(moved.top).toBeGreaterThanOrEqual(blocker.top + blocker.h)
  })

  it('brings the tail in at an angle from the side the face looks to, never straight down', () => {
    const host = { w: 1920, h: 1080 }
    for (const [mouth, facing] of [[[460, 470], 1], [[460, 470], -1], [[1400, 470], 1], [[1400, 470], -1]]) {
      const { side, room } = balloonSide(mouth, facing, host, { x0: 0, y0: 0, x1: 1920, y1: 1080 })
      // The player narrows the bubble to the room on that side.
      const box = { w: Math.min(420, room), h: 110 }
      const { tail } = layoutBalloon(mouth, box, host, undefined, [], side)
      const [bx, by] = tail.base
      expect(side).toBe(facing)
      // In front of the face: the tail's base is on the facing side of the mouth ...
      expect(Math.sign(bx - mouth[0])).toBe(facing)
      // ... and it leans at least 25 degrees off vertical.
      expect(Math.atan2(Math.abs(bx - mouth[0]), Math.abs(mouth[1] - by)) * 180 / Math.PI).toBeGreaterThan(25)
    }
  })

  it('keeps the balloon on the face\'s side unless not even a narrow one fits there', () => {
    const view = { x0: 0, y0: 0, x1: 1920, y1: 1080 }
    expect(balloonSide([1500, 400], 1, { w: 1920, h: 1080 }, view).side).toBe(1)
    expect(balloonSide([1800, 400], 1, { w: 1920, h: 1080 }, view).side).toBe(-1)
  })

  it('gives an off-frame speaker a balloon with no tail', () => {
    expect(layoutBalloon(null, { w: 400, h: 100 }, { w: 1920, h: 1080 }).tail).toBeNull()
  })
})

describe('BalloonLayer mouth', () => {
  it('puts the mouth on the figure as it is drawn now, at its current scale', () => {
    const host = document.createElement('div')
    // A figure drawn 200 x 400 px at (100, 50); its mouth is at 50 % across, 25 % down its picture.
    const layer = new BalloonLayer(host, () => ({ left: 100, top: 50, width: 200, height: 400 }))
    expect(layer._mouth({ figure: { asset_id: 7, mouth: [0.5, 0.25] } })).toEqual([200, 150])
  })

  it('treats a speaker whose figure is not on stage as off-frame', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null)
    expect(layer._mouth({ figure: { asset_id: 7, mouth: [0.5, 0.25] } })).toBeNull()
    expect(layer._mouth({ figure: null })).toBeNull()
  })
})

describe('lineCues', () => {
  it('captions only the narrator, at the line\'s own place on the track', () => {
    const cues = lineCues([
      { speaker: 'beatrice', text: 'Buon giorno.', start: 0, end: 5 },
      { speaker: 'narrator', text: 'Nella Vita nuova, Dante racconta il saluto.', start: 2.5, end: 6 },
    ])
    expect(cues).toEqual([{ text: 'Nella Vita nuova, Dante racconta il saluto.', start: 2.5, end: 6 }])
  })
})
