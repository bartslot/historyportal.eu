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

import { COMPACT_BREAKPOINT, positionCard, spotlightRect } from './tour-position.js'

/** Defaults for the knobs the dev tuner exposes. The CSS reads them as custom properties. */
export const TOUR_LOOK = {
    dim: 0.55,
    cardWidth: 21,
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

export const createScreenshotTour = ({ steps = [] } = {}) => ({
    steps,
    total: steps.length,
    index: 0,

    // Layout state read by the template.
    placement: 'center',
    cardStyle: '',
    spotlight: null,
    arrow: null,
    compact: false,

    _frame: null,
    _resizeObserver: null,
    _tunerOff: null,

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
        return this.total === 0 ? 0 : ((this.index + 1) / this.total) * 100
    },

    open() {
        if (this.total === 0) {
            return
        }

        this.index = 0
        this.$refs.dialog.showModal()

        if (typeof ResizeObserver !== 'undefined') {
            // The frame resizes with the window; the card changes height between steps. Either one
            // has to move the card back into place.
            this._resizeObserver = new ResizeObserver(() => this.scheduleReposition())
            this._resizeObserver.observe(this.$refs.stage)
            this._resizeObserver.observe(this.$refs.card)
        }

        this._tunerOff = this.registerTuner()
        this.$nextTick(() => this.reposition())
    },

    close() {
        this.$refs.dialog.close()
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
        this.index = Math.min(Math.max(Number(index) || 0, 0), this.total - 1)
        this.$nextTick(() => this.reposition())
    },

    next() {
        if (this.isLast) {
            this.close()
            return
        }

        this.goTo(this.index + 1)
    },

    previous() {
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

        const layout = layoutStep({
            rect: this.step.rect,
            frame: { width: stage.width, height: stage.height },
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
        const root = this.$refs.dialog
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
