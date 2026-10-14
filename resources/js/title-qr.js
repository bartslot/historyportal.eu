/**
 * Where the title screen's join QR (the code, the lesson code under it, "scan to join") stands:
 * never over a face, the title letters or any of the screen's own elements, and over as little
 * else of the picture as it can. The spot choice is the overlay card's (scene/card-place.js
 * placeCard); this only supplies the spots, the sizes and what is measured.
 *
 * keep_clear boxes (TitlePoster) are shares of the frame: {box: {x, y, w, h}, kind, weight}.
 * A face or the letters may never be covered; a figure or the subject only costs its weight.
 */
import { placeCard } from './scene/card-place.js'

export const QR = {
  gutter: 16,
  // Full size first, then smaller until the code is still scannable from a class's front row.
  sizes: [112, 96, 84, 72],
  minWidth: 640,              // below this (a phone) the QR stays hidden, as it always was
}

export const CORNERS = ['bottom-right', 'top-right', 'bottom-left', 'top-left']
export const OVERRIDES = ['auto', ...CORNERS, 'hidden']

/** What covering one px² of each kind costs; a face and the letters are refused outright. */
export const KEEP_CLEAR_WEIGHT = { face: 100, letters: 10, figure: 3, subject: 1 }
const NEVER_COVER = ['face', 'letters']

/**
 * Pure: the spots to try for a card, in order of preference: the four corners (bottom right,
 * top right, bottom left, top left), the middle of each edge, then four inside points of a coarse
 * grid. All inside the gutter; none when the card does not fit at all.
 */
export function qrSpots (stage, card, gutter = QR.gutter) {
  const L = gutter
  const T = gutter
  const R = stage.w - gutter - card.w
  const B = stage.h - gutter - card.h
  if (R < L || B < T) return []
  const cx = (L + R) / 2
  const cy = (T + B) / 2
  const spots = [
    { name: 'bottom-right', x: R, y: B },
    { name: 'top-right', x: R, y: T },
    { name: 'bottom-left', x: L, y: B },
    { name: 'top-left', x: L, y: T },
    { name: 'bottom-center', x: cx, y: B },
    { name: 'right-middle', x: R, y: cy },
    { name: 'left-middle', x: L, y: cy },
    { name: 'top-center', x: cx, y: T },
  ]
  for (const fy of [1 / 3, 2 / 3]) {
    for (const fx of [2 / 3, 1 / 3]) spots.push({ name: `grid-${Math.round(fx * 3)}-${Math.round(fy * 3)}`, x: L + (R - L) * fx, y: T + (B - T) * fy })
  }

  return spots
}

/** Pure: the QR block's size for a QR of `size` px: the code above its two text lines. */
export const qrCard = (size, text) => ({ w: Math.max(size, text.w), h: size + text.h })

/**
 * Pure: where the QR goes.
 *
 * @param {object} o
 * @param {{w: number, h: number}} o.stage          the title screen, px
 * @param {{w: number, h: number}} o.text           the text under the code (the lesson code and "scan to join")
 * @param {Array<{rect: object, kind: string, weight?: number}>} [o.keepClear]  in stage px
 * @param {Array<{x: number, y: number, w: number, h: number}>} [o.elements]    the screen's own elements
 * @param {string} [o.override]                     the teacher's choice: auto, a corner, hidden
 * @param {{x: number, y: number}} [o.natural]      where the QR sits in its own place (bottom right, beside the language)
 * @param {number} [o.topInset]                     how far down a forced top corner starts (under the top row)
 * @returns {{hidden: true} | {hidden: false, x: number, y: number, size: number, name: string}}
 */
export function placeQr ({ stage, text, keepClear = [], elements = [], override = 'auto', natural = null, topInset = QR.gutter }) {
  if (override === 'hidden') return { hidden: true }
  const full = QR.sizes[0]

  if (CORNERS.includes(override)) {
    // The teacher's corner wins over everything measured; only the top row is kept clear.
    const card = qrCard(full, text)
    const spot = qrSpots(stage, card).find(s => s.name === override)
    if (!spot) return { hidden: true }
    const y = override.startsWith('top') ? Math.max(spot.y, topInset) : spot.y

    return { hidden: false, x: Math.round(spot.x), y: Math.round(y), size: full, name: override }
  }

  const block = [...elements, ...keepClear.filter(k => NEVER_COVER.includes(k.kind)).map(k => k.rect)]
  const avoid = keepClear.map(k => ({ rect: k.rect, weight: k.weight ?? KEEP_CLEAR_WEIGHT[k.kind] ?? 1 }))
  for (const size of QR.sizes) {
    const card = qrCard(size, text)
    const spots = qrSpots(stage, card)
    // Its own place first: beside the language switch, as the screen was designed.
    if (natural && size === full) spots.unshift({ name: 'bottom-right', x: natural.x, y: natural.y, natural: true })
    const spot = placeCard(stage, card, avoid, undefined, { spots, block })
    if (spot) return { hidden: false, ...spot, size, natural: !!(natural && size === full && spot.x === Math.round(natural.x) && spot.y === Math.round(natural.y)) }
  }

  return { hidden: true }
}

/** Pure: a box in % of `frame` (px, relative to the stage) as a px rect. */
export function frameRect (box, frame) {
  return { x: frame.x + box.x / 100 * frame.w, y: frame.y + box.y / 100 * frame.h, w: box.w / 100 * frame.w, h: box.h / 100 * frame.h }
}

/** Pure: where a picture of `img` size lands under `background-size: cover` centred in a view. */
export function coverRect (viewW, viewH, imgW, imgH) {
  const s = Math.max(viewW / imgW, viewH / imgH)
  const w = imgW * s
  const h = imgH * s

  return { x: (viewW - w) / 2, y: (viewH - h) / 2, w, h }
}

// ── Measuring the screen (DOM) ────────────────────────────────────────────────────────────────

/** A DOMRect relative to another, as {x, y, w, h}. */
export const relRect = (r, o) => ({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height })
const rel = relRect
const shown = (el) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? r : null
}

/**
 * The screen's own elements the QR may not cover, as rects relative to `host`: every visible
 * [data-title-avoid] in `root`. data-title-avoid="children" measures the children one by one (a
 * row as wide as its column, with a few words in it).
 */
export function elementRects (root, host, qr) {
  const o = host.getBoundingClientRect()
  const out = []
  for (const el of root.querySelectorAll('[data-title-avoid]')) {
    if (qr?.contains(el)) continue
    const parts = el.dataset.titleAvoid === 'children' ? [...el.children] : [el]
    for (const part of parts) {
      const r = shown(part)
      if (r) out.push(rel(r, o))
    }
  }

  return out
}

/** The QR's text lines (code + "scan to join") as one box, measured at their own size. */
function textBox (qr) {
  const lines = [...qr.querySelectorAll('p')].map(p => p.getBoundingClientRect())
  const canvas = qr.querySelector('canvas').getBoundingClientRect()
  const qrBox = qr.getBoundingClientRect()

  return { w: Math.max(0, ...lines.map(l => l.width)), h: Math.max(0, qrBox.height - canvas.height) }
}

const pictureSizes = new Map()
/** The natural size of a picture, once loaded; null until then. */
export function pictureSize (url, onLoad) {
  if (pictureSizes.has(url)) return pictureSizes.get(url)
  pictureSizes.set(url, null)
  const img = new Image()
  img.onload = () => { pictureSizes.set(url, { w: img.naturalWidth, h: img.naturalHeight }); onLoad?.() }
  img.src = url

  return null
}

/**
 * Place the QR in the title screen `host` and return what was decided (with every rect used, for
 * the debug overlay and the proofs). `opts`: keepClear (poster.json entries), frame (() => the
 * rect those boxes are shares of, relative to host, or null), override, root (where to look for
 * [data-title-avoid], default document).
 */
export function layoutTitleQr (host, opts = {}) {
  const root = opts.root ?? document
  const qr = host.querySelector('[data-title-qr]')
  const stage = { w: host.clientWidth, h: host.clientHeight }
  if (!qr || !stage.w || stage.w < QR.minWidth) return { hidden: true, phone: stage.w > 0 && stage.w < QR.minWidth }

  // Back in its own place, full size, to measure it there.
  const canvas = qr.querySelector('canvas')
  Object.assign(qr.style, { position: '', left: '', top: '', display: '' })
  Object.assign(canvas.style, { width: `${QR.sizes[0]}px`, height: `${QR.sizes[0]}px` })
  const o = host.getBoundingClientRect()
  const natural = rel(qr.getBoundingClientRect(), o)
  const text = textBox(qr)
  const frame = opts.frame?.() ?? null
  const keepClear = frame
    ? (opts.keepClear ?? []).map(k => ({ rect: frameRect(k.box, frame), kind: k.kind, weight: k.weight }))
    : []
  const top = root.querySelector('[data-player-chrome="top"]')?.getBoundingClientRect()
  const topInset = top?.height ? Math.max(QR.gutter, top.bottom - o.top + 8) : QR.gutter
  const measure = () => ({ stage, text, keepClear, elements: elementRects(root, host, qr), override: opts.override ?? 'auto', topInset })

  let spot = placeQr({ ...measure(), natural })
  if (!spot.hidden && !spot.natural) {
    // Out of its place: the language switch and the badges close up, so measure them again there.
    qr.style.position = 'absolute'
    spot = placeQr(measure())
  }
  if (spot.hidden) {
    qr.style.display = 'none'
  } else if (!spot.natural) {
    Object.assign(canvas.style, { width: `${spot.size}px`, height: `${spot.size}px` })
    const parent = qr.offsetParent?.getBoundingClientRect() ?? o
    Object.assign(qr.style, { position: 'absolute', left: `${spot.x + o.left - parent.left}px`, top: `${spot.y + o.top - parent.top}px` })
  }
  qr.dataset.spot = spot.hidden ? 'hidden' : spot.name

  return { ...spot, keepClear, elements: measure().elements, qr: spot.hidden ? null : rel(qr.getBoundingClientRect(), o) }
}

/** Debug overlay (?qr_debug=1): the keep-clear boxes, the elements and the QR, drawn on `host`. */
export function drawQrDebug (host, result) {
  host.querySelector('[data-qr-debug]')?.remove()
  const layer = document.createElement('div')
  layer.dataset.qrDebug = ''
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '60' })
  const colour = { face: '#22c55e', letters: '#f97316', figure: '#eab308', subject: '#a855f7', element: '#ef4444', qr: '#3b82f6' }
  const box = (r, kind) => {
    const d = document.createElement('div')
    Object.assign(d.style, { position: 'absolute', left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, outline: `2px solid ${colour[kind]}`, background: `${colour[kind]}22` })
    d.dataset.kind = kind
    layer.appendChild(d)
  }
  result.keepClear?.forEach(k => box(k.rect, k.kind))
  result.elements?.forEach(r => box(r, 'element'))
  if (result.qr) box(result.qr, 'qr')
  host.appendChild(layer)
}
