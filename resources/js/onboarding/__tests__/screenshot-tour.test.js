import { describe, it, expect } from 'vitest'
import { COMPACT_BREAKPOINT, SPOTLIGHT_PADDING } from '../tour-position.js'
import { MAX_ZOOM, anchorInFrame, cameraFor, layoutStep, throughCamera } from '../screenshot-tour.js'

const frame = { width: 1200, height: 750 }
const card = { width: 336, height: 220 }

describe('anchorInFrame', () => {
    it('scales a percent rectangle to the frame it is drawn in', () => {
        expect(anchorInFrame({ x: 10, y: 20, w: 50, h: 40 }, frame)).toEqual({ left: 120, top: 150, width: 600, height: 300 })
    })

    it('has no anchor without a rectangle or before the frame has a size', () => {
        expect(anchorInFrame(null, frame)).toBeNull()
        expect(anchorInFrame({ x: 1, y: 1, w: 1, h: 1 }, { width: 0, height: 0 })).toBeNull()
    })
})

describe('layoutStep', () => {
    it('rings the rectangle and sits the card on the preferred side when it fits', () => {
        // The topic field: a wide, short strip a third of the way down.
        const layout = layoutStep({ rect: { x: 17, y: 34, w: 65, h: 4.5 }, frame, card, preferred: 'bottom' })

        expect(layout.compact).toBe(false)
        expect(layout.placement).toBe('bottom')
        expect(layout.spotlight.top).toBeCloseTo(0.34 * 750 - SPOTLIGHT_PADDING)
        expect(layout.top).toBeGreaterThan(0.385 * 750)
    })

    it('flips to the other side when the preferred one has no room', () => {
        // The player's control bar sits on the bottom edge: there is nothing below it.
        const layout = layoutStep({ rect: { x: 25, y: 92, w: 50, h: 8 }, frame, card, preferred: 'bottom' })

        expect(layout.placement).toBe('top')
        expect(layout.top + card.height).toBeLessThanOrEqual(0.92 * 750)
    })

    it('centres the card with no ring when a step has no rectangle', () => {
        const layout = layoutStep({ rect: null, frame, card, preferred: 'center' })

        expect(layout.spotlight).toBeNull()
        expect(layout.placement).toBe('center')
        expect(layout.left).toBeCloseTo((frame.width - card.width) / 2)
    })

    it('drops the card under the picture on a narrow frame but keeps the ring', () => {
        const narrow = { width: COMPACT_BREAKPOINT - 1, height: 400 }
        const layout = layoutStep({ rect: { x: 0, y: 20, w: 12, h: 80 }, frame: narrow, card, preferred: 'right' })

        expect(layout.compact).toBe(true)
        expect(layout.placement).toBe('sheet')
        expect(layout.top).toBeNull()
        expect(layout.spotlight).not.toBeNull()
    })

    it('sits beside a highlight too wide for the card, overlapping its edge rather than its middle', () => {
        // The quiz card: centred, more than half the picture wide, no full card width either side.
        const layout = layoutStep({ rect: { x: 23.3, y: 21, w: 53.4, h: 58 }, frame, card, preferred: 'right' })

        expect(['left', 'right']).toContain(layout.placement)
        expect(layout.left < 0.233 * 1200 || layout.left > 0.5 * 1200).toBe(true)
    })
})

describe('cameraFor', () => {
    it('leaves a large highlight alone', () => {
        expect(cameraFor({ x: 15, y: 20, w: 69, h: 29 }, frame)).toEqual({ scale: 1, x: 0, y: 0 })
    })

    it('zooms in on a small highlight, capped, without showing past the picture edge', () => {
        // The Publish button: top-right corner, a few percent of the frame.
        const camera = cameraFor({ x: 95.3, y: 0.6, w: 3.9, h: 5.8 }, frame)

        expect(camera.scale).toBe(MAX_ZOOM)
        expect(camera.x).toBeCloseTo(frame.width - frame.width * MAX_ZOOM)
        expect(camera.y).toBe(0)
    })

    it('keeps the highlight on the same pixels of the zoomed picture', () => {
        const rect = { x: 87.8, y: 75.6, w: 8.9, h: 18.2 }
        const camera = cameraFor(rect, frame)
        const moved = throughCamera(rect, camera, frame)

        expect(moved.w).toBeCloseTo(rect.w * camera.scale)
        expect(moved.x + moved.w).toBeLessThanOrEqual(100.01)
        expect(moved.y + moved.h).toBeLessThanOrEqual(100.01)
    })
})
