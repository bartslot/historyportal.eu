/**
 * The title screen never lets two of its pieces overlap, nor cover a face or the drawn letters
 * (poster.json keep_clear). The chrome has fixed places (the top row, the bottom rail); what moves
 * is the artwork's size. Measured from the render; when something still overlaps, the screen gives
 * way in a fixed order (nextFit):
 *
 *   1. the QR shrinks (FIT.qrSteps), then hides (the lesson code takes its place in the rail);
 *   2. the title scales down a step: a painted candidate's lettering (its painting stays
 *      full-bleed), a flat poster's whole frame, a series logo's width.
 *
 * The QR over a face is not a reason to give way: its place is static, and a face there is an art
 * problem (reported, never solved by moving the QR).
 */

export const FIT = {
  letterScale: 0.9,     // the title's size per give-way step
  logoScale: 0.85,      // a series logo's width per step
  maxShrink: 6,
  qrSteps: [96, 84, 72],
  // The calm size: the lettering's letters span this share of the screen's width at most, and
  // (a stacked title, two lines of letters) this share of its height.
  letterShare: 0.38,
  letterShareH: 0.3,
  letterSharePhone: 0.86,
  phone: 640,
}

// Chrome with a static place: a face under it is left to the art.
export const STATIC = ['qr']

export const FIT_START = Object.freeze({ qrStep: 0, qrHidden: false, shrink: 0 })

/** Pure: two rects overlap (by more than a hairline). */
export const overlaps = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1

/**
 * Pure: every pair that overlaps: two pieces of different groups, or a piece and a keep-clear box
 * (face, letters). The subtitle is lettered on the poster's own ribbon, so it may sit on the
 * letters; the QR over a face is left to the art (see artHits).
 *
 * @param {Array<{group: string, rect: object}>} pieces
 * @param {Array<{kind: string, rect: object}>} keep
 * @returns {Array<{a: string, b: string}>} the groups (or keep kinds) of each overlapping pair
 */
export function collisions (pieces, keep = []) {
  const out = []
  pieces.forEach((p, i) => {
    for (const q of pieces.slice(i + 1)) if (p.group !== q.group && overlaps(p.rect, q.rect)) out.push({ a: p.group, b: q.group })
    for (const k of keep) {
      if (!['face', 'letters'].includes(k.kind)) continue
      if (k.kind === 'letters' && p.group === 'subtitle') continue
      if (k.kind === 'face' && STATIC.includes(p.group)) continue
      if (overlaps(p.rect, k.rect)) out.push({ a: p.group, b: k.kind })
    }
  })
  return out
}

/** Pure: the faces the static QR covers (an art problem to report, not a layout step). */
export const artHits = (qr, keep = []) => (qr ? keep.filter(k => k.kind === 'face' && overlaps(qr, k.rect)) : [])

/** Pure: the next way the screen gives way for these overlaps, or null when it has none left. */
export function nextFit (fit, hits) {
  if (!hits.length) return null
  const qrHit = hits.some(h => h.a === 'qr' || h.b === 'qr')
  if (qrHit && !fit.qrHidden && fit.qrStep < FIT.qrSteps.length - 1) return { ...fit, qrStep: fit.qrStep + 1 }
  if (qrHit && !fit.qrHidden) return { ...fit, qrHidden: true }
  if (fit.shrink < FIT.maxShrink) return { ...fit, shrink: fit.shrink + 1 }
  return null
}

/**
 * Pure: the calm scale of a title whose letters are `lettersW` px wide on a screen `viewW` px
 * wide: they span FIT.letterShare of it (FIT.letterSharePhone on a phone) and FIT.letterShareH of
 * the height, never more than drawn.
 */
export function calmScale (lettersW, viewW, lettersH = 0, viewH = 0) {
  if (!(lettersW > 0 && viewW > 0)) return 1
  if (viewW < FIT.phone) return Math.min(1, FIT.letterSharePhone * viewW / lettersW)
  const byHeight = lettersH > 0 && viewH > 0 ? FIT.letterShareH * viewH / lettersH : 1
  return Math.min(1, FIT.letterShare * viewW / lettersW, byHeight)
}

/** Pure: the union of the 'letters' keep-clear boxes (% of the frame), or null. */
export function lettersBox (keepClear = []) {
  const boxes = keepClear.filter(k => k.kind === 'letters').map(k => k.box)
  if (!boxes.length) return null
  const x = Math.min(...boxes.map(b => b.x))
  const y = Math.min(...boxes.map(b => b.y))
  return { x, y, w: Math.max(...boxes.map(b => b.x + b.w)) - x, h: Math.max(...boxes.map(b => b.y + b.h)) - y }
}

/**
 * Pure: a box (% of the frame) scaled by `s` about the point `c` (% of the frame): the lettering
 * of a painted candidate, scaled as one layer.
 */
export function scaleBoxAbout (box, c, s) {
  return { x: c.x + (box.x - c.x) * s, y: c.y + (box.y - c.y) * s, w: box.w * s, h: box.h * s }
}

// ── Measuring the screen (DOM) ────────────────────────────────────────────────────────────────

const shown = (el) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? r : null
}

/**
 * Every piece of the title screen in `host` as {group, rect} (px, relative to host): the top row,
 * the strip's lines, the poster subtitle, and every [data-title-avoid], grouped by its nearest
 * [data-title-piece] (a "children" row piece by piece).
 */
export function titlePieces (host, root = document) {
  const o = host.getBoundingClientRect()
  const out = []
  const add = (el, group) => {
    const r = shown(el)
    if (r) out.push({ group, rect: { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height } })
  }
  root.querySelectorAll('[data-player-chrome="top"] [data-title-avoid]').forEach(el => add(el, 'top'))
  host.querySelectorAll('[data-title-expect="strip"] li').forEach(el => add(el, 'strip'))
  for (const el of host.querySelectorAll('[data-title-avoid]')) {
    if (el.dataset.titleExpect === 'strip' || el.closest('[data-title-qr]')) continue
    const group = el.closest('[data-poster-stage]') ? 'subtitle' : el.closest('[data-title-piece]')?.dataset.titlePiece ?? 'title'
    if (el.dataset.titleAvoid === 'children') [...el.children].forEach(c => add(c, group))
    else add(el, group)
  }
  const qr = host.querySelector('[data-title-qr]')
  if (qr) add(qr, 'qr')
  return out
}
