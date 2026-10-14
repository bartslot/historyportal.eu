/**
 * The title screen never lets two of its pieces overlap, nor cover a face or the drawn letters
 * (poster.json keep_clear). Measured from the render; when something still overlaps, the screen
 * gives way in a fixed order (nextFit):
 *
 *   1. the expect lines under the title move to the strip along the top;
 *   2. the lesson-type badges go icon-only;
 *   3. the meta row (grade, subject, minutes) moves into the strip;
 *   4. the picture shrinks: a flat poster's frame moves up out of a band kept for the title bar
 *      (a little more each step; its own colour fills the band), a series logo gets narrower.
 *
 * A painted candidate (poster.fit 'cover') never shrinks or letterboxes its painting: chrome may
 * stand over the painting, never over chrome, a face or the letters. After step 3 it gives way
 * with its own chrome first, then its lettering:
 *
 *   4. the QR steps down (96, 84, 72);
 *   5. the badges turn from a row into a column (or back) where that leaves room;
 *   6. the QR hides, and the lesson code joins the meta row (or the strip);
 *   7. the title lettering scales down, a layer over the painting (FIT.letterScale per step).
 *
 * On a comic candidate the title bar (expect lines, meta, Start) also slides sideways to the
 * nearest place along the bottom where it covers nothing (barShift); that is placement, not a step.
 */
import { placeCard } from './scene/card-place.js'

export const FIT = {
  gap: 12,              // px kept between the title bar and what it must not touch
  band: 0.06,           // of the screen's height, added to the bar's band per shrink step
  maxShrink: 6,
  logoScale: 0.85,      // a series logo's width per shrink step
  letterScale: 0.9,     // a painted candidate's lettering per shrink step
  qrSteps: [128, 96, 84, 72],   // the QR's largest plate at each step down (painted candidates)
  shiftStep: 16,        // px between the places the title bar tries along the bottom
}

export const FIT_START = Object.freeze({ linesInStrip: false, badgesCompact: false, metaInStrip: false, qrStep: 0, badgesFlip: false, qrHidden: false, shrink: 0 })

/** Pure: two rects overlap (by more than a hairline). */
export const overlaps = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1

/**
 * Pure: every pair that overlaps: two pieces of different groups, or a piece and a keep-clear box
 * (face, letters). The subtitle is lettered on the poster's own ribbon, so it may sit on the letters.
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
      if (overlaps(p.rect, k.rect)) out.push({ a: p.group, b: k.kind })
    }
  })
  return out
}

/**
 * Pure: the next way the screen gives way for these overlaps, or null when it has none left.
 * ctx.strip: the candidate has a strip to move lines and the meta row into (a comic candidate);
 * ctx.painted: a painted candidate (the chrome gives way before its lettering does).
 */
export function nextFit (fit, hits, ctx = {}) {
  if (!hits.length) return null
  const involved = (g) => hits.some(h => h.a === g || h.b === g)
  if (ctx.strip && !fit.linesInStrip && involved('lines')) return { ...fit, linesInStrip: true }
  if (!fit.badgesCompact && involved('badges')) return { ...fit, badgesCompact: true }
  if (ctx.strip && !fit.metaInStrip && involved('meta')) return { ...fit, metaInStrip: true }
  if (ctx.painted) {
    // Chrome crowding chrome (or the title bar finding no free place): the QR and badges make room.
    const crowded = ['qr', 'language', 'badges', 'cta', 'meta', 'lines'].some(involved)
    if (crowded && !fit.qrHidden && fit.qrStep < FIT.qrSteps.length - 1) return { ...fit, qrStep: fit.qrStep + 1 }
    if (crowded && !fit.badgesFlip && ctx.badges) return { ...fit, badgesFlip: true }
    if (crowded && !fit.qrHidden) return { ...fit, qrHidden: true }
  }
  if (fit.shrink < FIT.maxShrink) return { ...fit, shrink: fit.shrink + 1 }
  return null
}

/**
 * Pure: a box (% of the frame) scaled by `s` about the point `c` (% of the frame): the lettering
 * of a painted candidate, scaled as one layer.
 */
export function scaleBoxAbout (box, c, s) {
  return { x: c.x + (box.x - c.x) * s, y: c.y + (box.y - c.y) * s, w: box.w * s, h: box.h * s }
}

/**
 * Pure: the band (px from the bottom) a poster's frame keeps clear at shrink step `n`: the title
 * bar's own height from its top edge, plus FIT.band of the screen per further step. 0 at step 0.
 */
export const bandHeight = (n, barTop, screenH) => (n <= 0 ? 0 : Math.max(0, screenH - barTop + FIT.gap) + (n - 1) * FIT.band * screenH)

/**
 * Pure: how far (px) the title bar slides sideways so it touches none of `blocks`: the nearest
 * free place along its own row, 0 when it already is free or no place is.
 */
export function barShift (bar, blocks, stageW, gutter = 16) {
  if (!blocks.some(b => overlaps(bar, b))) return 0
  const spots = []
  for (let x = gutter; x + bar.w <= stageW - gutter; x += FIT.shiftStep) spots.push({ name: `x${x}`, x, y: bar.y })
  spots.sort((p, q) => Math.abs(p.x - bar.x) - Math.abs(q.x - bar.x))
  const spot = placeCard({ w: stageW, h: bar.y + bar.h }, { w: bar.w, h: bar.h }, [], undefined, { spots, block: blocks })
  return spot ? spot.x - bar.x : 0
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
    const group = el.closest('[data-poster-stage]') ? 'subtitle'
      : el.dataset.titleExpect === 'lines' ? 'lines'
        : el.closest('[data-title-piece]')?.dataset.titlePiece ?? 'title'
    if (el.dataset.titleAvoid === 'children') [...el.children].forEach(c => add(c, group))
    else add(el, group)
  }
  const qr = host.querySelector('[data-title-qr]')
  if (qr) add(qr, 'qr')
  return out
}
