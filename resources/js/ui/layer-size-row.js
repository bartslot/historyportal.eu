import { createAspectLock } from './aspect-lock.js'

/** How many decimals the Dimensions fields show. The design's 11.05 / 11.06 is two. */
const DP = 2

/** Round for DISPLAY only. The lock keeps full precision; see aspect-lock.js. */
export const show = (n) => (Number.isFinite(n) ? Number(n.toFixed(DP)) : '')

/**
 * Alpine factory for the Dimensions row: x-data="layerSizeRow({ ... })".
 *
 * A global factory rather than an Alpine.data registration, matching onboardingTour and
 * easingPreview — the Blade x-data has to call it without depending on alpine:init ordering.
 *
 * WHY THE WIDTH IS MEASURED RATHER THAN READ. A layer stores `height` and, only once somebody has
 * unlocked the aspect, `width`. Every layer authored before the Dimensions row existed has no
 * width at all, and the panel still has to show one. It cannot be derived from the image's aspect
 * alone: `height` is a percentage of the stage's HEIGHT and `width` a percentage of its WIDTH, so
 * the stage's own proportion is part of the sum. Asking the overlay what it actually rendered is
 * both shorter and correct for any stage.
 *
 * The overlay returns the box's SHAPE, not its size, and the width is derived as
 * `storedHeight * ratio`. Seeding the width from a measured percentage while the height came from
 * storage paired two numbers that disagreed — the layer below read 18.08 wide by 40 tall while it
 * actually rendered 18.08 by 71.8 — and the lock then held a proportion neither of them had.
 *
 * @param {object} opts
 * @param {number|string} opts.assetId
 * @param {number} opts.height          stored base height, % of stage
 * @param {number|null} opts.width      stored base width, or null when the layer has none
 * @param {boolean} [opts.locked]       whether the aspect starts locked
 */
export function layerSizeRow ({ assetId, height, width = null, locked = true } = {}) {
  return {
    lock: null,
    /** What the fields show. Kept separate from the lock's unrounded state on purpose. */
    w: '',
    h: '',
    locked: !!locked,
    /** Null until the overlay can tell us the box; the width field stays empty until then. */
    ready: false,
    _tries: 0,

    init () {
      this.lock = createAspectLock({
        width: Number.isFinite(width) ? width : 0,
        height: Number.isFinite(height) ? height : 0,
        locked: false,
      })
      this.h = show(this.lock.height)
      if (Number.isFinite(width)) {
        this.w = show(this.lock.width)
        this.ready = true
        this.lock.setLocked(this.locked)
      } else {
        this._seedWidth()
      }
    },

    /**
     * Ask the overlay for the rendered box.
     *
     * An image that has not decoded reports zero, so this retries rather than seeding 0 — a 0 in
     * the width field is a value the very next keystroke would persist, and a 0-width layer is
     * invisible with nothing on screen to explain it. It gives up after a second: a layer whose
     * image never loads should leave the field empty, not spin forever.
     */
    _seedWidth () {
      const box = window.__layerOverlay?.(assetId)?.measure?.(assetId)
      const derived = box && box.ratio > 0 ? this.lock.height * box.ratio : 0
      if (derived > 0) {
        this.lock.setWidth(derived)
        this.w = show(derived)
        this.ready = true
        // Capture the ratio only now: locking against a zero width would hold no ratio at all.
        this.lock.setLocked(this.locked)
        return
      }
      if (this._tries++ > 20) return
      setTimeout(() => this._seedWidth(), 50)
    },

    toggleLock () {
      this.locked = !this.locked
      // Re-captures on engage, so unlock → reshape → lock holds the NEW proportion.
      this.lock.setLocked(this.locked)
    },

    /**
     * Both setters go through the lock, then push BOTH sides to the canvas and the server. Pushing
     * only the edited side would leave the other one changed in the panel and unchanged on the
     * stage, which reads as the lock not working at all.
     */
    edit (side, value) {
      if (!this.ready) return
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return

      side === 'w' ? this.lock.setWidth(n) : this.lock.setHeight(n)
      this.w = show(this.lock.width)
      this.h = show(this.lock.height)
      this.push()
    },

    /** Live preview, no round trip. Every overlay rendering this layer, not just the stage's. */
    push () {
      window.__setLayerProp?.(assetId, 'width', this.lock.width)
      window.__setLayerProp?.(assetId, 'height', this.lock.height)
    },

    /** Persist on change (blur / Enter), which is the value the teacher settled on. */
    commit ($wire) {
      if (!this.ready) return
      $wire?.call?.('updateArtworkLayer', assetId, 'width', this.lock.width)
      $wire?.call?.('updateArtworkLayer', assetId, 'height', this.lock.height)
    },
  }
}
