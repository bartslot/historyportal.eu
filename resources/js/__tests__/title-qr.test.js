import { describe, it, expect } from 'vitest'
import { qrState, frameRect, coverRect, qrOptions, QR } from '../title-qr.js'

describe('the join QR', () => {
  it('shows at full size on a class screen', () => {
    expect(qrState({ stageW: 1024 })).toEqual({ hidden: false, size: QR.sizes[0] })
  })

  it('takes the size the screen gives it', () => {
    expect(qrState({ stageW: 1024, size: 72 })).toEqual({ hidden: false, size: 72 })
  })

  it('hides on a phone, when the teacher hides it, or when the screen ran out of room', () => {
    expect(qrState({ stageW: 375 }).hidden).toBe(true)
    expect(qrState({ stageW: 1440, override: 'hidden' }).hidden).toBe(true)
    expect(qrState({ stageW: 1440, hidden: true }).hidden).toBe(true)
  })

  it('ignores an old corner choice: its place is static', () => {
    expect(qrState({ stageW: 1440, override: 'top-left' })).toEqual({ hidden: false, size: QR.sizes[0] })
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

describe('the join code itself', () => {
  it('is dark on an opaque white plate with a quiet zone of at least 4 modules', () => {
    const o = qrOptions(256, '#0a0a0a')
    expect(o.margin).toBeGreaterThanOrEqual(4)
    expect(o.color).toEqual({ dark: '#0a0a0a', light: '#ffffffff' })
    expect(o.width).toBe(256)
  })
})
