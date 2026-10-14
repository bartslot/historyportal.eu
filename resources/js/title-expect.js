/**
 * The "what you can expect" strip of a title candidate (poster.json "expect": {box, style: "strip"},
 * Figma 2321:1315): a white band across the whole screen at the slot's height, the lines spaced
 * along it, starting after the top row's own control (the edit pill or the logo). On a phone the
 * lines stack, under the top row.
 */
export const STRIP = { phone: 640, gap: 24, gutter: 16 }

/** Pure: the strip's place in the title screen (px), from the frame rect and the slot's box (%). */
export function stripLayout (frame, view, box, chrome = null) {
  if (view.w < STRIP.phone) {
    return { top: 0, minHeight: 0, padLeft: STRIP.gutter, padTop: chrome ? chrome.y + chrome.h + 8 : STRIP.gutter, stacked: true }
  }
  return {
    top: Math.max(0, frame.y + box.y / 100 * frame.h),
    minHeight: box.h / 100 * frame.h,
    padLeft: chrome ? Math.max(STRIP.gutter, chrome.x + chrome.w + STRIP.gap) : STRIP.gutter * 3,
    padTop: 0,
    stacked: false,
  }
}

/**
 * Lay the strip out in its host; `stage` and `host` are DOMRects. On a phone the stacked strip is
 * tall, so the poster (`posterHost`) starts under it instead of behind it: no face disappears.
 */
export function placeExpectStrip (strip, stage, host, box, posterHost = null) {
  const pill = [...document.querySelectorAll('[data-player-chrome="top"] [data-title-avoid]')]
    .map(el => el.getBoundingClientRect()).find(r => r.width > 0)
  const chrome = pill ? { x: pill.left - host.left, y: pill.top - host.top, w: pill.width, h: pill.height } : null
  const frame = { x: stage.left - host.left, y: stage.top - host.top, w: stage.width, h: stage.height }
  const l = stripLayout(frame, { w: host.width, h: host.height }, box, chrome)
  Object.assign(strip.style, {
    top: `${l.top}px`,
    minHeight: `${l.minHeight}px`,
    paddingLeft: `${l.padLeft}px`,
    paddingTop: l.stacked ? `${l.padTop}px` : '',
  })
  strip.dataset.stacked = l.stacked ? '1' : '0'
  if (posterHost) {
    const top = l.stacked ? `${Math.round(strip.offsetHeight)}px` : ''
    if (posterHost.style.top !== top) posterHost.style.top = top
  }

  return l
}
