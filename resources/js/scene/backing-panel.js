/**
 * A backing panel: the coloured box behind a scene's text (config.texts[] with kind 'rect'),
 * drawn by TextOverlayLayer in the editor and the player alike.
 *
 * Bart, 2026-11-28: "I can't make the panel full screen, or half or side ways just like the scene
 * view can. I would like to add a background (mostly a specific color or a zoomed in piece of an
 * asset ...) and that this is watercolour texture on it." App\Services\Support\BackingPanel stores
 * the same fields; this file draws them.
 *
 *   side    'full' | 'left' | 'right' | 'top' | 'bottom'
 *   size    20..80, its share of the stage in % (a half; absent = 50)
 *   color / opacity   the fill, and how much of the scene shows through it
 *   blur    px of frosted glass behind it (absent = 10, how every older panel looked)
 *   image + focus     a picture of the scene, cropped and zoomed like a split panel (cropImage)
 *   wash    a paper edge (PAPER_MASKS): the painted edge the scene's own picture can have, with
 *           the paper's tooth over the fill, so the panel reads as a watercolour wash
 */
import { PAPER_MASKS } from './paper-edge.js'
import { cropImage } from './background-crop.js'
import { normalizeFocus } from './split-layout.js'

export const PANEL_SIDES = ['full', 'left', 'right', 'top', 'bottom']
const SIZE = [20, 80]
const DEFAULT_BLUR = 10

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback)

/** A panel with every field filled in, whatever was stored. */
export function normalizePanel (item = {}) {
  const color = typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#0f172a'
  const image = typeof item.image === 'string' && item.image !== '' ? item.image : null
  return {
    side: PANEL_SIDES.includes(item.side) ? item.side : 'left',
    size: clamp(num(item.size, 50), SIZE[0], SIZE[1]),
    color,
    opacity: clamp(num(item.opacity, 0.5), 0, 1),
    blur: clamp(num(item.blur, DEFAULT_BLUR), 0, 20),
    image,
    focus: normalizeFocus(item.focus),
    wash: PAPER_MASKS.includes(item.wash) ? item.wash : null,
  }
}

/** Where the panel sits on the stage, as CSS. */
export function panelBox ({ side, size }) {
  const s = `${size}%`
  switch (side) {
    case 'full': return 'inset:0;'
    case 'right': return `top:0;bottom:0;right:0;width:${s};`
    case 'top': return `left:0;right:0;top:0;height:${s};`
    case 'bottom': return `left:0;right:0;bottom:0;height:${s};`
    default: return `top:0;bottom:0;left:0;width:${s};`
  }
}

const maskUrl = (wash) => `url('/images/paper/${wash === 'book' ? 'edge-mask' : `edge-mask-${wash}`}.webp')`

/** '#rrggbb' as rgba(): a fill that stays see-through while the frosted glass behind it shows. */
export function hexToRgba (hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
  if (!m) return `rgba(15,23,42,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/**
 * Fill a panel's node. The node itself only places the box (and carries the editor's selection
 * ring); everything that shows lives in one child, so the watercolour edge masks the fill, the
 * picture and the frosted glass together and never the ring.
 */
export function drawPanel (node, item) {
  const p = normalizePanel(item)
  node.style.cssText += `position:absolute;${panelBox(p)}`
  const fill = document.createElement('div')
  fill.dataset.panelFill = ''
  const glass = p.blur > 0 ? `backdrop-filter:blur(${p.blur}px);-webkit-backdrop-filter:blur(${p.blur}px);` : ''
  // A picture is opaque paint: its colour shows only where the picture has none (a cut-out).
  fill.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;${glass}` +
    `background:${hexToRgba(p.color, p.image ? 1 : p.opacity)};${p.image ? `opacity:${p.opacity};` : ''}`
  if (p.wash) {
    const m = `${maskUrl(p.wash)} center / 100% 100% no-repeat`
    fill.style.setProperty('-webkit-mask', m)
    fill.style.setProperty('mask', m)
  }
  if (p.image) {
    const img = document.createElement('img')
    img.alt = ''
    img.draggable = false
    img.src = p.image
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;'
    cropImage(img, p.focus)
    fill.appendChild(img)
  }
  if (p.wash) {
    // The paper's tooth (public/images/paper/paper.svg), multiplied in: the wash sits in the paper.
    const tooth = document.createElement('div')
    tooth.style.cssText = "position:absolute;inset:0;background:url('/images/paper/paper.svg') 0 0 / 512px 512px;mix-blend-mode:multiply;"
    fill.appendChild(tooth)
  }
  node.appendChild(fill)
  return node
}

/**
 * The few colours a picture is mostly made of, most common first: every pixel binned on a 4-bit
 * grid per channel, near-white paper and near-black ink left out (they are not the scene's
 * colour), each bin's average colour, and bins too close to a stronger one merged away.
 *
 * @param {Uint8ClampedArray|number[]} data  RGBA bytes
 * @param {number} count
 * @returns {string[]} '#rrggbb', at most `count`
 */
export function dominantColors (data, count = 5) {
  const bins = new Map()
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2]
    const max = Math.max(r, g, b); const min = Math.min(r, g, b)
    if (min > 232 || max < 28) continue
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bin = bins.get(key) ?? bins.set(key, { n: 0, r: 0, g: 0, b: 0 }).get(key)
    bin.n++; bin.r += r; bin.g += g; bin.b += b
  }
  const ranked = [...bins.values()].sort((a, b) => b.n - a.n)
    .map((c) => [c.r / c.n, c.g / c.n, c.b / c.n])
  const picked = []
  for (const c of ranked) {
    if (picked.length >= count) break
    if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 48)) picked.push(c)
  }
  return picked.map((c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`)
}

/** The dominant colours of a picture by URL; [] when it cannot be read (another origin, offline). */
export function pictureColors (url, count = 5) {
  return new Promise((resolve) => {
    if (!url) return resolve([])
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = 64
        const h = Math.max(1, Math.round(w * (img.naturalHeight / (img.naturalWidth || 1))))
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)
        resolve(dominantColors(ctx.getImageData(0, 0, w, h).data, count))
      } catch (_) { resolve([]) }
    }
    img.onerror = () => resolve([])
    img.src = url
  })
}
