/**
 * timeline-view.js — the pixel↔time arithmetic of the timeline, kept out of the Alpine component
 * so it can be tested without a DOM.
 *
 * Everything here is in SECONDS, because the narration is in seconds and the whole point of this
 * timeline is that it is pinned to the narration. Milliseconds appear nowhere but a label.
 */

/** How close to a word start a dragged keyframe has to land before it snaps, in PIXELS.
 *  Pixels, not seconds: snapping must feel identical at every zoom level. */
export const SNAP_PX = 8

/** Apple's drag threshold, about three points. Under it a press is still a press. */
export const DRAG_THRESHOLD_PX = 3

/** Room before 0 and after the end, so a key sitting on either edge is a whole diamond you can
 *  grab rather than half of one clipped by the scroller. */
export const LANE_PAD_PX = 10

/** Zoom (pixels per second) that makes `duration` exactly fill `width`. */
export const fitZoom = (width, duration) => (duration > 0 && width > 0 ? width / duration : 100)

/** Seconds at a pixel offset from the lane's left edge. */
export const timeAtX = (clientX, laneLeft, scrollLeft, zoom) =>
  (zoom > 0 ? (clientX - laneLeft + scrollLeft) / zoom : 0)

/** Pixel offset within the lane for a moment in time. */
export const xAtTime = (time, scrollLeft, zoom) => time * zoom - scrollLeft

/** The snap radius in seconds, for this zoom. */
export const toleranceSeconds = (zoom, px = SNAP_PX) => (zoom > 0 ? px / zoom : 0)

/**
 * The tick spacing that keeps labels legible at this zoom, from a 1-2-5 ladder.
 *
 * Ticks every 100ms are noise thrown across a minute and exactly right across two seconds, so the
 * ladder is keyed to how much room a label has rather than to a preference.
 */
export const tickStep = (zoom, minLabelPx = 56) => {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
  return steps.find((s) => s * zoom >= minLabelPx) ?? steps[steps.length - 1]
}

/** Tick times from 0 to duration at `step`, inclusive of a final tick on the duration itself. */
export const ticksFor = (duration, step) => {
  if (!(duration > 0) || !(step > 0)) return []
  const out = []
  for (let t = 0; t <= duration + 1e-9; t += step) out.push(Math.round(t * 1e6) / 1e6)
  return out
}

/**
 * MILLISECONDS on the face, seconds in the model.
 *
 * Bart: *"That teachers think in seconds make it harder to work with. We need milliseconds."* The
 * file agrees — the mock's transport says `ms`. Seconds put three decimals in a field two digits
 * wide, and a keyframe at 2.856 is harder to read back than 2856. The model stays in seconds
 * because the narration alignment is in seconds; only the display converts.
 */
export const toMs = (seconds) => Math.round((Number.isFinite(seconds) ? Math.max(0, seconds) : 0) * 1000)

export const fromMs = (ms) => (Number.isFinite(ms) ? Math.max(0, ms) : 0) / 1000

export const formatTime = (seconds) => `${toMs(seconds)}`

/**
 * The zoom slider: from "the whole timeline fits" (`base`) to ZOOM_SLIDER_RANGE times closer, on a
 * LOGARITHMIC scale.
 *
 * It was linear over 2–600 px/s on an 88px slider: a 300x span in 88 pixels, most of it zoomed out
 * past the end of the timeline where there is nothing to see, and ~7 px/s per pixel — a doubling
 * per pixel at the low end. Zoom is a ratio, so each step multiplies it by the same factor (about
 * 3.5% per slider pixel). Cmd/Ctrl+wheel still reaches past either end.
 */
export const ZOOM_SLIDER_RANGE = 20
export const ZOOM_SLIDER_STEPS = 1000

export const zoomFromSlider = (value, base) =>
  base * ZOOM_SLIDER_RANGE ** (Math.min(ZOOM_SLIDER_STEPS, Math.max(0, Number(value) || 0)) / ZOOM_SLIDER_STEPS)

export const sliderFromZoom = (zoom, base) => {
  if (!(base > 0) || !(zoom > 0)) return 0
  const steps = ZOOM_SLIDER_STEPS * Math.log(zoom / base) / Math.log(ZOOM_SLIDER_RANGE)
  return Math.round(Math.min(ZOOM_SLIDER_STEPS, Math.max(0, steps)))
}
