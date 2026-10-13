/**
 * Where an overlay card goes over a comic panel so it hides the least of what matters: the layer
 * that reacts (the ship the class is moving) counts most, every other figure by how much of it the
 * card would cover. Pure; the caller measures the rects (px, relative to the stage).
 *
 * Candidates are the four corners and bottom centre, kept clear of the player's chrome (the edit
 * pill on top, the deck below). On a tie the earlier candidate wins, so an empty panel keeps the
 * card at the bottom.
 */

/**
 * Room kept free around the stage edge when nothing was measured: top for the player's top row
 * (the edit pill, or the brand logo a guest or a pupil sees, which is taller), bottom for the deck.
 */
export const CHROME = { top: 64, bottom: 112, side: 32 }

/** Breathing room between the card and the chrome it keeps clear of. */
const CHROME_GAP = 8

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

/**
 * @param {{w: number, h: number}} stage
 * @param {{w: number, h: number}} card
 * @param {Array<{rect: {x: number, y: number, w: number, h: number}, weight?: number}>} avoid
 * @returns {{x: number, y: number, name: string}}
 */
export function placeCard (stage, card, avoid = [], chrome = CHROME) {
  const left = CHROME.side
  const right = Math.max(left, stage.w - CHROME.side - card.w)
  const top = chrome.top ?? CHROME.top
  const bottom = Math.max(top, stage.h - (chrome.bottom ?? CHROME.bottom) - card.h)
  const centre = Math.max(left, (stage.w - card.w) / 2)
  const spots = [
    { name: 'bottom-center', x: centre, y: bottom },
    { name: 'bottom-left', x: left, y: bottom },
    { name: 'bottom-right', x: right, y: bottom },
    { name: 'top-left', x: left, y: top },
    { name: 'top-right', x: right, y: top },
  ]
  let best = spots[0]
  let bestCost = Infinity
  for (const spot of spots) {
    const rect = { x: spot.x, y: spot.y, w: card.w, h: card.h }
    const cost = avoid.reduce((sum, a) => sum + overlap(rect, a.rect) * (a.weight ?? 1), 0)
    if (cost < bestCost - 1e-6) { best = spot; bestCost = cost }
  }
  return { x: Math.round(best.x), y: Math.round(best.y), name: best.name }
}

/**
 * The player's own chrome as no-go margins for `host`: how far down the top row reaches (the logo
 * or the edit pill, whichever this viewer has) and how far up the deck comes. Measured, so a taller
 * logo or a wider deck is kept clear of too; the defaults stand in for what is not on the page.
 *
 * @returns {{ top: number, bottom: number }} px from the host's top and bottom edges
 */
export function chromeMargins (host, root = document) {
  const box = host?.getBoundingClientRect()
  const top = root.querySelector('[data-player-chrome="top"]')?.getBoundingClientRect()
  const deck = root.querySelector('[data-player-chrome="bottom"]')?.getBoundingClientRect()
  if (!box || !box.height) return { top: CHROME.top, bottom: CHROME.bottom }
  return {
    top: top?.height ? Math.max(0, top.bottom - box.top) + CHROME_GAP : CHROME.top,
    bottom: deck?.height ? Math.max(0, box.bottom - deck.top) + CHROME_GAP : CHROME.bottom,
  }
}

/**
 * Put an overlay card (the meter, the race lobby) where it hides least, on a wide screen; on a phone
 * it stays in its own flow along the bottom. Pass the spot from an earlier call to keep the card put
 * when it is redrawn. Returns the spot, or null on a phone.
 */
export function placeOverlay (host, card, avoid = () => [], spot = null) {
  const w = host.clientWidth
  if (w < 640) return null
  if (!spot) {
    let rects = []
    try { rects = avoid() || [] } catch (_) { /* nothing measured: bottom centre */ }
    // Not laid out yet (or no layout at all): the card's nominal size, max-w-xl by a typical height.
    const size = card.offsetWidth ? { w: card.offsetWidth, h: card.offsetHeight } : { w: 576, h: 320 }
    spot = placeCard({ w, h: host.clientHeight }, size, rects, chromeMargins(host))
  }
  card.style.position = 'absolute'
  card.style.left = `${spot.x}px`
  card.style.top = `${spot.y}px`
  card.dataset.spot = spot.name
  return spot
}

// ── Measuring the figures (DOM) ───────────────────────────────────────────────────────────────

const SAMPLE_W = 64
const ALPHA_MIN = 32
const opaqueCache = new Map()

/**
 * The painted part of a cut-out as fractions of its box {x, y, w, h}: a figure picture is often the
 * whole stage with one person in a corner. Read once per picture from a small canvas; a picture the
 * canvas may not read (another origin) counts as its whole box.
 */
export function opaqueBox (img) {
  const key = img?.currentSrc || img?.src
  if (!key || !img.naturalWidth) return { x: 0, y: 0, w: 1, h: 1 }
  if (opaqueCache.has(key)) return opaqueCache.get(key)
  let box = { x: 0, y: 0, w: 1, h: 1 }
  try {
    const w = SAMPLE_W
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const g = canvas.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0, w, h)
    const data = g.getImageData(0, 0, w, h).data
    let x0 = w; let y0 = h; let x1 = -1; let y1 = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] >= ALPHA_MIN) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
      }
    }
    if (x1 >= 0) box = { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h }
  } catch (_) { /* tainted canvas: the whole box */ }
  opaqueCache.set(key, box)
  return box
}

/**
 * What the card should avoid: every figure layer under `root` ([data-layer-id]), as its painted
 * rect relative to `origin` (the card's host), weighted 3 for the layers in `heavy` (asset ids:
 * the layer that reacts or moves).
 */
export function figureRects (root, origin, heavy = []) {
  if (!root || !origin) return []
  const o = origin.getBoundingClientRect()
  return [...root.querySelectorAll('[data-layer-id]')].map((node) => {
    const r = node.getBoundingClientRect()
    const img = node.querySelector('img')
    const f = img ? opaqueBox(img) : { x: 0, y: 0, w: 1, h: 1 }
    const id = Number(String(node.dataset.layerId).replace('art_', ''))
    return {
      rect: { x: r.left - o.left + f.x * r.width, y: r.top - o.top + f.y * r.height, w: f.w * r.width, h: f.h * r.height },
      weight: heavy.map(Number).includes(id) ? 3 : 1,
    }
  }).filter(a => a.rect.w > 0 && a.rect.h > 0)
}
