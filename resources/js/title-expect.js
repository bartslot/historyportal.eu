/**
 * The "what you can expect" strip of a title candidate (poster.json "expect": {box, style: "strip"},
 * Figma 2321:1315): a white band across the whole screen at the slot's height, the lines spaced
 * along it, starting after the top row's own control (the edit pill or the logo). On a phone the
 * lines stack, under the top row.
 */
// minLines: lines under the title narrower than this read as a column of words; a poster then uses the strip.
export const STRIP = { phone: 640, gap: 24, gutter: 16, minLines: 280 }

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

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/**
 * Pure: how wide the lines under the title may be so they end before the bottom-right cluster
 * (badges, language, QR): centred lines keep the same room on both sides.
 */
export function linesRoom (lines, cluster, centred, gap = STRIP.gutter) {
  if (centred) return 2 * (cluster.left - gap - (lines.left + lines.width / 2))
  return cluster.left - gap - lines.left
}

/**
 * The lines under the title (a candidate without a slot) wrap before they run into the
 * bottom-right cluster. Only when they would: otherwise they keep one row. Returns true when
 * the width changed, so the caller measures the screen again.
 */
export function fitExpectLines (ul, cluster) {
  if (!ul || !cluster || !ul.offsetWidth) return false
  const before = ul.style.maxWidth
  ul.style.maxWidth = ''
  ul.dataset.cramped = ''
  // The cluster's own pieces, not its box: a column of badges leaves room beside the language switch.
  const centred = getComputedStyle(ul).justifyContent === 'center'
  const full = ul.getBoundingClientRect()
  let left = Infinity
  // Narrower lines take more rows and climb: check again, up to a few times, against everything hit so far.
  for (let pass = 0; pass < 3; pass++) {
    const parts = [...cluster.querySelectorAll('[data-title-avoid], [data-title-qr]')].map(el => el.getBoundingClientRect()).filter(r => r.width)
    const items = [...ul.children].map(li => li.getBoundingClientRect()).filter(r => r.width)
    const hit = parts.filter(p => items.some(li => overlaps(li, p)))
    if (!hit.length) break
    left = Math.min(left, ...hit.map(p => p.left))
    const room = Math.floor(linesRoom(full, { left }, centred))
    // Too narrow to read as lines: the caller can send them to the strip (data-cramped).
    ul.dataset.cramped = room < STRIP.minLines ? '1' : ''
    ul.style.maxWidth = `${Math.max(STRIP.minLines, room)}px`
    ul.style.marginInline = centred ? 'auto' : ''
  }

  return ul.style.maxWidth !== before
}

/**
 * Lay the strip out in its host; `stage` and `host` are DOMRects. On a phone the stacked strip is
 * tall, so the poster (`posterHost`) starts under it instead of behind it: no face disappears.
 * `below`: the poster starts under the strip on every screen (a candidate without a slot of its
 * own, whose letters may reach the top). `freeTop`: where the frame starts when the poster is NOT
 * moved (title-poster.js posterFit); a strip that ends above it moves nothing (a cover's empty sky
 * on a phone). Returns the layout; `moved` when the poster moved.
 */
export function placeExpectStrip (strip, stage, host, box, posterHost = null, below = false, freeTop = 0) {
  const pill = [...document.querySelectorAll('[data-player-chrome="top"] [data-title-avoid]')]
    .map(el => el.getBoundingClientRect()).find(r => r.width > 0)
  const chrome = pill ? { x: pill.left - host.left, y: pill.top - host.top, w: pill.width, h: pill.height } : null
  const frame = { x: stage.left - host.left, y: stage.top - host.top, w: stage.width, h: stage.height }
  const l = stripLayout(frame, { w: host.width, h: host.height }, box, chrome)
  if (below) l.top = 0                // the poster moves under it, so it does not follow the frame
  Object.assign(strip.style, {
    top: `${l.top}px`,
    minHeight: `${l.minHeight}px`,
    paddingLeft: `${l.padLeft}px`,
    paddingTop: l.stacked ? `${l.padTop}px` : '',
  })
  strip.dataset.stacked = l.stacked ? '1' : '0'
  l.moved = false
  if (posterHost) {
    const h = strip.offsetHeight
    const top = (l.stacked || below) && h && freeTop < h ? `${Math.round(h)}px` : ''
    l.moved = posterHost.style.top !== top
    if (l.moved) posterHost.style.top = top
  }

  return l
}
