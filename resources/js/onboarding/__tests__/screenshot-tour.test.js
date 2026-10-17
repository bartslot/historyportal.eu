import { describe, it, expect, vi } from 'vitest'
import { COMPACT_BREAKPOINT, SPOTLIGHT_PADDING } from '../tour-position.js'
import { AUTOPLAY_MS, MAX_ZOOM, anchorInFrame, cameraFor, createScreenshotTour, layoutStep, nextIndex, throughCamera } from '../screenshot-tour.js'

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

describe('inline tour', () => {
    const steps = [{ image: 'a.jpg' }, { image: 'a.jpg' }, { image: 'b.jpg' }]
    // Alpine supplies these; the layout work needs a real page, the step logic does not.
    const make = (inline = true) => Object.assign(createScreenshotTour({ steps, inline }), {
        $nextTick: (fn) => fn(), $refs: {}, $root: null,
    })

    it('moves on to the next step and starts over after the last', () => {
        expect(nextIndex(0, 3)).toBe(1)
        expect(nextIndex(2, 3)).toBe(0)
        expect(nextIndex(0, 0)).toBe(0)
    })

    it('wraps to the first step on Next from the last, instead of closing', () => {
        const tour = make()
        tour.index = 2
        tour.next()
        expect(tour.index).toBe(0)
    })

    it('stops playing by itself once someone presses Back or Next', () => {
        const tour = make()
        tour.playing = true
        tour.next()
        expect(tour.playing).toBe(false)
        tour.playing = true
        tour.previous()
        expect(tour.playing).toBe(false)
    })

    it('only schedules a step while playing and on screen', () => {
        vi.useFakeTimers()
        const tour = make()
        tour.playing = true
        tour._onScreen = false
        tour.schedule()
        vi.advanceTimersByTime(AUTOPLAY_MS)
        expect(tour.index).toBe(0)

        tour._onScreen = true
        tour.schedule()
        vi.advanceTimersByTime(AUTOPLAY_MS)
        expect(tour.index).toBe(1)
        vi.advanceTimersByTime(AUTOPLAY_MS)
        expect(tour.index).toBe(2)

        tour.toggle() // pause
        vi.advanceTimersByTime(AUTOPLAY_MS * 3)
        expect(tour.index).toBe(2)
        vi.useRealTimers()
    })

    it('never moves on by itself in the dialog', () => {
        vi.useFakeTimers()
        const tour = make(false)
        tour.playing = true
        tour._onScreen = true
        tour.schedule()
        vi.advanceTimersByTime(AUTOPLAY_MS * 2)
        expect(tour.index).toBe(0)
        vi.useRealTimers()
    })
})
