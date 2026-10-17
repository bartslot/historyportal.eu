// Alpine component behind the About page's product tour: the welcome tour's spotlight and card,
// pointed at a rectangle on a screenshot instead of a live element.
//
// The placement maths is the welcome tour's own (tour-position.js), unchanged. It works on plain
// rectangles in any coordinate space, so here the "viewport" is the screenshot frame and the anchor
// is the step's rectangle, stored in percent of the picture and scaled to the frame's current size.
// That keeps the highlight on the right pixels at every window size.
//
// Below COMPACT_BREAKPOINT (measured on the frame, not the window) there is no room beside anything,
// so the card drops underneath the picture and only the ring stays on it.
//
// Two ways to show it, one engine: in a dialog behind a button (the default), or `inline` in the page
// (About's "How it works"), where it starts once it scrolls into view and moves on by itself every
// AUTOPLAY_MS while it is on screen. A hand on Back or Next takes over from the timer; reduced motion
// starts it paused. The timer is a setTimeout, never rAF: rAF stops in a background tab.

import { COMPACT_BREAKPOINT, positionCard, spotlightRect } from './tour-position.js'
import { EASE } from '../easing.js'

/** Defaults for the knobs the dev tuner exposes. The CSS reads them as custom properties. */
export const TOUR_LOOK = {
    dim: 0.55,
    cardWidth: 21,
}

/**
 * Motion, by purpose. Every value here answers "where do I look now":
 *   move    the ring, card and camera travel together to the next spot on the SAME screen, so the
 *           eye follows one thing instead of searching
 *   arrive  on a NEW screen nothing travels across the picture: it fades in, then the dimming
 *           closes in around the spot, then the card appears beside it (frame → spot → words)
 * Durations mirror the classes in product-tour.blade.php.
 */
export const MOTION = {
    move: 450,
    ringDelay: 140,
    ring: 320,
    cardDelay: 240,
    card: 260,
    open: 320,
}

/** How long an inline tour stays on one step before it moves on by itself. */
export const AUTOPLAY_MS = 6000

/** The step after this one; an inline tour starts over after the last. */
export const nextIndex = (index, total) => (total > 0 ? (index + 1) % total : 0)

/** A highlight smaller than this share of the frame (its larger side) is zoomed in on. */
export const ZOOM_TARGET = 0.3
export const MAX_ZOOM = 1.6
/** On a phone the whole frame is a few hundred pixels wide; small targets need more help. */
export const MAX_ZOOM_COMPACT = 2.2

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * The camera for a step: zoom in on a small highlight (the Publish button, the QR plate) so it is
 * readable, centred on it, without ever showing past the picture's edge. Big highlights get no zoom.
 * Returns { scale, x, y } for `transform: translate(x, y) scale(scale)` from the top-left corner.
 */
export const cameraFor = (rect, frame, maxZoom = MAX_ZOOM) => {
    const none = { scale: 1, x: 0, y: 0 }

    if (!rect || !(frame?.width > 0) || !(frame?.height > 0)) {
        return none
    }

    const share = Math.max(rect.w, rect.h) / 100
    const scale = share > 0 ? clamp(ZOOM_TARGET / share, 1, maxZoom) : 1

    if (scale === 1) {
        return none
    }

    const centreX = ((rect.x + rect.w / 2) / 100) * frame.width
    const centreY = ((rect.y + rect.h / 2) / 100) * frame.height

    return {
        scale,
        x: clamp(frame.width / 2 - centreX * scale, frame.width - frame.width * scale, 0),
        y: clamp(frame.height / 2 - centreY * scale, frame.height - frame.height * scale, 0),
    }
}

/** A rectangle (percent of the picture) as it lands on the frame once the camera has moved. */
export const throughCamera = (rect, camera, frame) => {
    if (!rect || camera.scale === 1) {
        return rect
    }

    const toPercentX = (px) => (px / frame.width) * 100
    const toPercentY = (px) => (px / frame.height) * 100

    return {
        x: toPercentX((rect.x / 100) * frame.width * camera.scale + camera.x),
        y: toPercentY((rect.y / 100) * frame.height * camera.scale + camera.y),
        w: rect.w * camera.scale,
        h: rect.h * camera.scale,
    }
}

/** A step's rectangle (percent of the picture) in pixels of a frame of the given size. */
export const anchorInFrame = (rect, frame) => {
    if (!rect || !(frame?.width > 0) || !(frame?.height > 0)) {
        return null
    }

    return {
        left: (rect.x / 100) * frame.width,
        top: (rect.y / 100) * frame.height,
        width: (rect.w / 100) * frame.width,
        height: (rect.h / 100) * frame.height,
    }
}

/**
 * Where the ring and the card go for one step, in frame coordinates. Pure, so the awkward cases (no
 * rectangle, a frame too narrow for a card beside anything) are tested without a browser.
 */
export const layoutStep = ({ rect, frame, card, preferred = 'center' }) => {
    const anchor = anchorInFrame(rect, frame)
    const compact = frame.width < COMPACT_BREAKPOINT

    const spotlight = anchor ? spotlightRect(anchor, frame) : null

    if (compact) {
        return { compact, spotlight, placement: 'sheet', top: null, left: null, arrow: null }
    }

    // 'roomiest': a card centred over a screenshot hides the very thing the step is about.
    const position = positionCard({ anchor, card, viewport: frame, preferred, fallback: 'roomiest' })

    return { compact, spotlight, ...position }
}

const prefersReducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export const createScreenshotTour = ({ steps = [], inline = false } = {}) => ({
    steps,
    total: steps.length,
    index: 0,
    inline,
    /** Inline only: whether the tour moves on by itself. */
    playing: false,

    /** image → its camera transform. Kept per picture, so the one fading out holds its framing. */
    cameras: {},
    /** Set on first open; the screenshots are only put in the page then. */
    opened: false,
    /** True for the frame in which a new screen is laid out: nothing may glide into place. */
    jumping: false,

    // Layout state read by the template.
    placement: 'center',
    cardStyle: '',
    spotlight: null,
    arrow: null,
    compact: false,

    _frame: null,
    _resizeObserver: null,
    _tunerOff: null,
    _timer: null,
    _visibility: null,
    _onScreen: false,
    _onVisibility: null,

    get step() {
        return this.steps[this.index] ?? null
    },

    get isFirst() {
        return this.index === 0
    },

    get isLast() {
        return this.index >= this.total - 1
    },

    get progress() {
        return this.total === 0 ? 0 : (this.index + 1) / this.total
    },

    cameraStyle(image) {
        const camera = this.cameras[image]

        return camera
            ? `transform: translate(${camera.x.toFixed(1)}px, ${camera.y.toFixed(1)}px) scale(${camera.scale.toFixed(3)});`
            : ''
    },

    open() {
        if (this.total === 0) {
            return
        }

        this.index = 0
        this.$refs.dialog.showModal()
        this.start()
    },

    /** Lay the tour out and watch its size: on open (dialog) or the first time it is seen (inline). */
    start() {
        this.opened = true

        if (typeof ResizeObserver !== 'undefined') {
            // The frame resizes with the window; the card changes height between steps. Either one
            // has to move the card back into place.
            this._resizeObserver = new ResizeObserver(() => this.scheduleReposition())
            this._resizeObserver.observe(this.$refs.stage)
            this._resizeObserver.observe(this.$refs.card)
        }

        this._tunerOff = this.registerTuner()
        this.jumping = true
        this.$nextTick(() => {
            this.reposition()
            this.arrive({ opening: true })
        })
    },

    close() {
        this.$refs.dialog?.close()
    },

    /**
     * Inline only (x-init): start the first time the tour scrolls into view, play while it is on screen
     * and the tab is visible, wait otherwise.
     */
    watch() {
        if (!this.inline || this.total === 0) {
            return
        }

        this.playing = !prefersReducedMotion()
        this._onVisibility = () => this.schedule()
        document.addEventListener('visibilitychange', this._onVisibility)

        if (typeof IntersectionObserver === 'undefined') {
            this._onScreen = true
            this.start()
            this.schedule()
            return
        }

        this._visibility = new IntersectionObserver(([entry]) => {
            this._onScreen = entry.isIntersecting
            if (this._onScreen && !this.opened) {
                this.start()
            }
            this.schedule()
        }, { threshold: 0.35 })
        this._visibility.observe(this.$root)
    },

    /** The next automatic step, if the tour is playing and someone can see it. */
    schedule() {
        clearTimeout(this._timer)
        this._timer = null

        if (!this.inline || !this.playing || !this._onScreen || document.hidden) {
            return
        }

        this._timer = setTimeout(() => this.goTo(nextIndex(this.index, this.total)), AUTOPLAY_MS)
    },

    /** The pause / play button. */
    toggle() {
        this.playing = !this.playing
        this.schedule()
    },

    /** Alpine calls this when the component leaves the page. */
    destroy() {
        clearTimeout(this._timer)
        this._visibility?.disconnect()
        if (this._onVisibility) {
            document.removeEventListener('visibilitychange', this._onVisibility)
        }
        this.closed()
    },

    /** The dialog closed: by X, Esc, the backdrop or the last step. Undo everything open() did. */
    closed() {
        this._resizeObserver?.disconnect()
        this._resizeObserver = null
        this._tunerOff?.()
        this._tunerOff = null

        if (this._frame) {
            cancelAnimationFrame(this._frame)
            this._frame = null
        }
    },

    goTo(index) {
        const next = Math.min(Math.max(Number(index) || 0, 0), this.total - 1)

        if (next === this.index) {
            this.schedule()
            return
        }

        const newScreen = this.steps[next]?.image !== this.step?.image

        this.index = next
        this.jumping = newScreen
        this.$nextTick(() => {
            this.reposition()

            if (newScreen) {
                this.arrive()
            }
        })
        this.schedule()
    },

    /**
     * A new screen: the ring and card are already in their final place (laid out with transitions
     * off), so animate them IN rather than across. The dimming closes in on the spot, then the card
     * follows. Transitions come back on two frames later, once that layout has been painted.
     */
    arrive({ opening = false } = {}) {
        requestAnimationFrame(() => requestAnimationFrame(() => { this.jumping = false }))

        if (prefersReducedMotion()) {
            return
        }

        const lead = opening ? 120 : 0

        if (opening) {
            this.$refs.panel?.animate(
                [{ opacity: 0, transform: 'translateY(8px) scale(0.985)' }, { opacity: 1, transform: 'none' }],
                { duration: MOTION.open, easing: EASE.enter },
            )
        }

        this.$refs.ring?.animate(
            [{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }],
            { duration: MOTION.ring, delay: lead + MOTION.ringDelay, easing: EASE.enter, fill: 'backwards' },
        )
        this.$refs.card?.animate(
            [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
            { duration: MOTION.card, delay: lead + MOTION.cardDelay, easing: EASE.enter, fill: 'backwards' },
        )
    },

    /** Back and Next are a hand on the tour: an inline tour stops moving on by itself. */
    next() {
        this.playing = false

        if (this.isLast) {
            this.inline ? this.goTo(0) : this.close()
            return
        }

        this.goTo(this.index + 1)
    },

    previous() {
        this.playing = false
        this.goTo(this.index - 1)
    },

    scheduleReposition() {
        if (this._frame) {
            return
        }

        this._frame = requestAnimationFrame(() => {
            this._frame = null
            this.reposition()
        })
    },

    reposition() {
        const stage = this.$refs.stage?.getBoundingClientRect()
        const card = this.$refs.card?.getBoundingClientRect()

        if (!stage || !card || !this.step) {
            return
        }

        const frame = { width: stage.width, height: stage.height }
        const compact = frame.width < COMPACT_BREAKPOINT
        const camera = cameraFor(this.step.rect, frame, compact ? MAX_ZOOM_COMPACT : MAX_ZOOM)

        this.cameras = { ...this.cameras, [this.step.image]: camera }

        const layout = layoutStep({
            rect: throughCamera(this.step.rect, camera, frame),
            frame,
            card: { width: card.width, height: card.height },
            preferred: this.step.placement,
        })

        this.compact = layout.compact
        this.spotlight = layout.spotlight
        this.placement = layout.placement
        this.arrow = layout.arrow
        // The card is positioned in the dialog, the layout in the picture: add the strip above it.
        const offset = this.$refs.stage.offsetTop
        this.cardStyle = layout.top === null
            ? ''
            : `top: ${Math.round(layout.top + offset)}px; left: ${Math.round(layout.left)}px;`
    },

    get spotlightStyle() {
        if (!this.spotlight) {
            return 'display: none;'
        }

        const { top, left, width, height } = this.spotlight

        return `top: ${Math.round(top)}px; left: ${Math.round(left)}px; `
            + `width: ${Math.round(width)}px; height: ${Math.round(height)}px;`
    },

    get arrowStyle() {
        if (this.arrow === null) {
            return 'display: none;'
        }

        return this.placement === 'top' || this.placement === 'bottom'
            ? `left: ${Math.round(this.arrow)}px;`
            : `top: ${Math.round(this.arrow)}px;`
    },

    registerTuner() {
        const root = this.$refs.dialog ?? this.$root
        const set = (name, value) => root.style.setProperty(name, value)

        return window.__tune?.register('Product tour', [
            { key: 'dim', label: 'Dimming', min: 0, max: 0.95, step: 0.01, value: TOUR_LOOK.dim,
                apply: (v) => set('--tour-dim', String(v)) },
            { key: 'cardWidth', label: 'Card width (rem)', min: 14, max: 30, step: 0.5, value: TOUR_LOOK.cardWidth,
                apply: (v) => { set('--tour-card-width', `${v}rem`); this.scheduleReposition() } },
        ], { tab: 'Landing' }) ?? null
    },
})

export default createScreenshotTour
