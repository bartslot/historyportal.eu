/**
 * image-grid.js — every grid of pictures a teacher browses: one size slider, one hover zoom.
 *
 * Two kinds of tile (Bart, 2026-10-16):
 *   - IMAGE (backgrounds, paintings, city plans, scene plates): 16:9, cover, larger default, and a
 *     hover magnifies the picture around the cursor;
 *   - ICON (arrows, shapes, cut-out figures, props): square, contain, small default, at most a
 *     subtle scale-up.
 * A grid declares its kind; a mixed grid marks each tile with data-kind instead.
 *
 * The slider is pure client side: it writes --thumb on the grid, and the CSS in app.css
 * (.lp-thumb-grid) does the layout. No Livewire round trip, so it cannot wait on the server.
 *
 * The zoom and the touch long-press are ONE delegated set of listeners on the document, like
 * drag-scroll.js and tooltips: Livewire re-renders these grids constantly, and a listener bound per
 * tile stops firing on whichever tile was morphed last.
 */

/** Slider range and opening size per kind, in CSS pixels of the smallest column. */
export const GRID_KINDS = {
  image: { min: 96, max: 360, step: 8, initial: 200 },
  icon: { min: 48, max: 160, step: 4, initial: 72 },
}

/**
 * Widths a resizable thumbnail is requested at. Few, so the CDN cache works across slider
 * positions; and the Wikimedia standard thumbnail widths, which are the only ones it still renders
 * on demand without throttling.
 */
export const SRC_STEPS = [120, 250, 330, 500, 960, 1280, 1920]

/** How far a hover magnifies an image tile. */
export const ZOOM_SCALE = 2

/** The width the lightbox asks for, when the picture's host can resize it. */
export const LIGHTBOX_WIDTH = 1920

/** How long a touch must rest on a tile before it opens the lightbox. */
export const LONG_PRESS_MS = 450

const STORAGE_PREFIX = 'lp.thumbSize.'

export function kindRange (kind) {
  return GRID_KINDS[kind] ?? GRID_KINDS.image
}

/** A size the slider can actually show: a number, inside the kind's range. */
export function clampThumb (kind, value) {
  const { min, max, initial } = kindRange(kind)
  const n = Number(value)
  if (value === null || value === '' || !Number.isFinite(n)) return initial
  return Math.min(max, Math.max(min, Math.round(n)))
}

/**
 * The remembered size for one grid, else its opening size (the kind's, or `initial` for a grid
 * that opens smaller, like a strip in a narrow panel). Storage can be missing or throw.
 */
export function readThumb (id, kind, storage = globalThis.localStorage, initial = undefined) {
  const opening = clampThumb(kind, initial)
  try {
    const stored = storage?.getItem(STORAGE_PREFIX + id)
    return stored === null || stored === undefined ? opening : clampThumb(kind, stored)
  } catch {
    return opening
  }
}

export function writeThumb (id, value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_PREFIX + id, String(value))
  } catch {
    // Remembering the size is a convenience; a grid that forgets it still works.
  }
}

/**
 * The width one column really gets: auto-fill fits as many `thumb`-wide columns as the row holds,
 * then 1fr shares out what is left, so a column is between `thumb` and twice it.
 */
export function columnWidth (containerWidth, thumb, gap = 0) {
  if (!(containerWidth > 0) || !(thumb > 0)) return Math.max(0, thumb || 0)
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (thumb + gap)))
  return (containerWidth - gap * (cols - 1)) / cols
}

/** The smallest requested width that covers `cssWidth` device pixels, or the largest there is. */
export function srcStep (cssWidth, dpr = 1) {
  const need = Math.ceil(Math.max(0, cssWidth) * Math.max(1, dpr || 1))
  return SRC_STEPS.find((w) => w >= need) ?? SRC_STEPS[SRC_STEPS.length - 1]
}

const CLOUDINARY = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]*,[^/]*\/)?(.*)$/i
const WIKIMEDIA_THUMB = /^(https?:\/\/upload\.wikimedia\.org\/.+\/thumb\/.+\/)\d+px-([^/]+)$/i
const WIDTH_QUERY = /([?&]width=)\d+/i

/**
 * The same picture at another width, when its host can make one; otherwise null.
 *
 *   - Cloudinary: the transform segment is replaced (c_limit keeps the picture's own shape; the
 *     tile crops with object-fit). An SVG is left alone: a width would rasterise line art.
 *   - Wikimedia thumbnails: the NNNpx- prefix.
 *   - Special:FilePath and the corpus: a ?width= query.
 */
export function resizedUrl (url, width) {
  if (typeof url !== 'string' || url === '' || !(width > 0)) return null
  const w = Math.round(width)

  const c = CLOUDINARY.exec(url)
  if (c) {
    if (/\.svg(\?|$)/i.test(c[2])) return null
    return `${c[1]}c_limit,w_${w},f_auto,q_auto/${c[2]}`
  }
  const m = WIKIMEDIA_THUMB.exec(url)
  if (m) return `${m[1]}${w}px-${m[2]}`
  if (WIDTH_QUERY.test(url)) return url.replace(WIDTH_QUERY, `$1${w}`)
  return null
}

/** A srcset over SRC_STEPS, or '' when the host cannot resize (the src is used as it is). */
export function srcsetFor (url) {
  if (!resizedUrl(url, SRC_STEPS[0])) return ''
  return SRC_STEPS.map((w) => `${resizedUrl(url, w)} ${w}w`).join(', ')
}

/**
 * Where a zoom is anchored: the pointer's position inside the tile, in percent, clamped to the
 * tile so a pointer on the border never zooms past the picture's edge. A tile with no size yet
 * zooms on its centre.
 */
export function zoomOrigin (rect, clientX, clientY) {
  const axis = (pos, start, size) => {
    if (!(size > 0) || !Number.isFinite(pos)) return 50
    return Math.min(100, Math.max(0, ((pos - start) / size) * 100))
  }
  return { x: axis(clientX, rect.left, rect.width), y: axis(clientY, rect.top, rect.height) }
}

/**
 * Alpine factory for one grid: x-data="imageGrid({ id: 'picker', kind: 'image' })".
 * `id` names what is remembered, so the same kind of grid on two screens can keep its own size.
 */
export function imageGrid ({ id, kind = 'image', initial } = {}) {
  return {
    range: kindRange(kind),
    thumb: readThumb(id, kind, globalThis.localStorage, initial),
    colWidth: kindRange(kind).initial,

    init () {
      this.$watch('thumb', (value) => {
        writeThumb(id, value)
        this.measure()
      })
      this.measure()
      if (typeof ResizeObserver !== 'undefined') {
        this._resize = new ResizeObserver(() => this.measure())
        this._resize.observe(this.$el)
      }
    },

    destroy () {
      this._resize?.disconnect()
    },

    measure () {
      const grid = this.$el.querySelector('.lp-thumb-grid')
      // A strip has no columns to share out: every tile is exactly the slider's width.
      if (!grid) { this.colWidth = this.thumb; return }
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0
      this.colWidth = Math.round(columnWidth(grid.clientWidth, this.thumb, gap))
    },

    /** On the grid: :style="gridStyle". An object, so Alpine merges it with a static style. */
    get gridStyle () {
      return { '--thumb': `${this.thumb}px` }
    },

    /**
     * On each <img>: x-bind="thumbAttrs(url)". The browser picks the srcset step that fits the
     * column at this device's pixel ratio, so a bigger slider fetches a sharper file and a smaller
     * one never downloads more than it shows. A mixed grid's image tile spans two columns.
     */
    thumbAttrs (url, span = 1) {
      const srcset = srcsetFor(url)
      return srcset ? { srcset, sizes: `${this.colWidth * span}px` } : {}
    },
  }
}

const tileOf = (target) => target?.closest?.('[data-zoom]')
const canHover = () => globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true

/** Anchor the zoom on the pointer and ask for a file sharp enough for twice the tile. */
function zoomIn (tile, e) {
  const { x, y } = zoomOrigin(tile.getBoundingClientRect(), e.clientX, e.clientY)
  tile.style.setProperty('--zoom-x', `${x}%`)
  tile.style.setProperty('--zoom-y', `${y}%`)
  if (tile.dataset.zoomed === undefined) {
    tile.dataset.zoomed = ''
    // Lazily, once: a bigger `sizes` makes the browser fetch the next srcset step (and keep it).
    const img = tile.querySelector('img[srcset]')
    if (img) img.sizes = `${Math.ceil(tile.getBoundingClientRect().width * ZOOM_SCALE)}px`
  }
}

function zoomOut (tile) {
  delete tile.dataset.zoomed
}

/** Open the shared lightbox (<x-ui.image-lightbox>) on a tile's picture. */
export function openLightbox (tile) {
  const img = tile.querySelector('img')
  if (!img) return
  const shown = img.currentSrc || img.src
  const src = tile.dataset.zoomSrc || resizedUrl(shown, LIGHTBOX_WIDTH) || shown
  const caption = tile.getAttribute('aria-label') || tile.dataset.tooltip || img.alt || ''
  globalThis.dispatchEvent(new CustomEvent('image-lightbox', { detail: { src, caption } }))
}

export function initImageZoom (doc = document) {
  if (doc.__imageZoomReady) return
  doc.__imageZoomReady = true

  doc.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !canHover()) return
    const tile = tileOf(e.target)
    if (tile) zoomIn(tile, e)
  })
  doc.addEventListener('pointerout', (e) => {
    const tile = tileOf(e.target)
    if (tile && !tile.contains(e.relatedTarget)) zoomOut(tile)
  })

  // Touch: no hover, so a long press opens the picture in the lightbox, and the tap that ends
  // the press is not a pick.
  let press = null
  let swallowClick = false
  const cancel = () => { if (press) clearTimeout(press.timer); press = null }

  doc.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return
    const tile = tileOf(e.target)
    if (!tile) return
    press = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => { swallowClick = true; press = null; openLightbox(tile) }, LONG_PRESS_MS),
    }
  })
  doc.addEventListener('pointermove', (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) cancel()
  })
  doc.addEventListener('pointerup', cancel)
  doc.addEventListener('pointercancel', cancel)
  doc.addEventListener('click', (e) => {
    if (!swallowClick) return
    swallowClick = false
    if (tileOf(e.target)) { e.preventDefault(); e.stopImmediatePropagation() }
  }, true)
  doc.addEventListener('contextmenu', (e) => {
    if ((press || swallowClick) && tileOf(e.target)) e.preventDefault()
  })
}
