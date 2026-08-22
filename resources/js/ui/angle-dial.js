/**
 * angle-dial.js — the layer's rotation, as a dial rather than a slider.
 *
 * A slider is the wrong shape for an angle: it has two ends, and an angle does not. Dragging past
 * 359 should land on 0 without travelling back through the middle, which no linear track can do.
 * This is the macOS Inspector's control — a dial you drag, a degrees field, and a stepper — and
 * all three are faces of ONE value that every path writes through.
 *
 * WHAT THE TEACHER READS IS 0-360; WHAT IS STORED IS -180..180.
 *
 * The stored range is the layer model's and the canvas rotate handle's, and it is not changing.
 * 0-360 is what the control being copied shows and what anyone who has held a protractor expects.
 * That is one conversion, in one place, tested in both directions including the wrap — rather than
 * a signed dial, which would read as "-170" when a teacher has quite plainly turned something
 * nearly all the way round.
 */

/** Stored (-180..180, or anything) → what the dial and the field show (0..360). */
export function toDial (stored) {
  const n = Number(stored)
  if (!Number.isFinite(n)) return 0
  return ((n % 360) + 360) % 360
}

/**
 * What the dial shows (0..360) → what is stored (-180..180).
 *
 * 180 stays 180. The wrap would otherwise send it to -180, which is the same angle drawn the same
 * way but makes the number jump sign the moment a teacher passes half a turn.
 */
export function toStored (dial) {
  const n = Number(dial)
  if (!Number.isFinite(n)) return 0
  const wrapped = ((((n + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 ? 180 : wrapped
}

/**
 * The angle from a dial's centre to a pointer, in the dial's own 0-360 clockwise-from-up terms.
 *
 * atan2(dx, -dy) rather than the usual atan2(dy, dx): zero has to point UP, because zero means
 * "not turned" and a dot resting at twelve o'clock is the only way that reads. Clockwise is
 * positive, matching CSS rotate() so the dot and the layer turn the same way.
 */
export function angleFromPointer (cx, cy, px, py) {
  const deg = Math.atan2(px - cx, -(py - cy)) * 180 / Math.PI
  return ((deg % 360) + 360) % 360
}

/**
 * Alpine factory: x-data="layerAngleRow({ ... })".
 *
 * A global factory rather than an Alpine.data registration, matching onboardingTour and
 * easingPreview — the Blade x-data calls it without depending on alpine:init ordering.
 */
export function layerAngleRow ({ assetId, rotation = 0, flipX = false, flipY = false } = {}) {
  return {
    /** 0-360, what the dial and the field show. */
    deg: 0,
    flipX: !!flipX,
    flipY: !!flipY,
    dragging: false,

    init () {
      this.deg = Math.round(toDial(rotation))
    },

    /** The dot's position on the rim. */
    dotStyle () {
      return `transform: rotate(${this.deg}deg) translateY(-0.5rem);`
    },

    /** Set from the dial, the field or the stepper — all three land here. */
    setDeg (value, { commitWith = null } = {}) {
      // An emptied field reads as '', and Number('') is 0 — which is FINITE, so a plain isFinite
      // guard lets it through and snaps the layer bolt upright the moment a teacher selects the
      // number to retype it. Nothing is not zero.
      if (value === '' || value === null || value === undefined) return
      const n = Number(value)
      if (!Number.isFinite(n)) return
      this.deg = Math.round(((n % 360) + 360) % 360)
      this.push()
      if (commitWith) this.commit(commitWith)
    },

    /** Stepper and arrow keys. */
    nudge (delta, $wire) {
      this.setDeg(this.deg + delta, { commitWith: $wire })
    },

    /** Pointer anywhere on the dial gives the angle directly — no linear mapping, so it wraps. */
    fromPointer (event, el) {
      const box = el.getBoundingClientRect()
      this.setDeg(angleFromPointer(
        box.left + box.width / 2,
        box.top + box.height / 2,
        event.clientX,
        event.clientY,
      ))
    },

    startDial (event, el) {
      this.dragging = true
      try { el.setPointerCapture(event.pointerId) } catch (_) { /* synthetic pointer */ }
      this.fromPointer(event, el)
    },

    moveDial (event, el) {
      if (this.dragging) this.fromPointer(event, el)
    },

    endDial ($wire) {
      if (!this.dragging) return
      this.dragging = false
      this.commit($wire)
    },

    /** Live preview on every overlay rendering the layer. */
    push () {
      window.__setLayerProp?.(assetId, 'rotation', toStored(this.deg))
    },

    /** The value the teacher settled on. */
    commit ($wire) {
      $wire?.call?.('updateArtworkLayer', assetId, 'rotation', toStored(this.deg))
    },

    /**
     * Mirroring. NOT rotation: on a symmetrical shape a half turn and a horizontal flip look
     * identical, and on a ship or a portrait they are completely different, so folding one into
     * the other would be wrong exactly where it matters.
     */
    toggleFlip (axis, $wire) {
      const key = axis === 'y' ? 'flipY' : 'flipX'
      const field = axis === 'y' ? 'flip_y' : 'flip_x'
      this[key] = !this[key]
      window.__setLayerProp?.(assetId, field, this[key])
      $wire?.call?.('updateArtworkLayer', assetId, field, this[key])
    },
  }
}
