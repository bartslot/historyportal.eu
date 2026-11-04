/**
 * Alpha masks for hit testing: a press on a picture's transparent part must reach what is drawn
 * beneath it (Bart, 2026-09-29), not grab the big figure whose empty corner happens to be on top.
 *
 * A mask is the picture's alpha channel at a small size (max 256 px a side): enough to tell a
 * drawn pixel from the margin, cheap to keep for every picture on the stage.
 */

/** Alpha 0..255 above which a pixel counts as drawn. */
export const DRAWN_ALPHA = 24
const MASK_MAX_SIDE = 256

/** @returns {number} alpha 0..255 at fractions (fx, fy) of the picture; 0 outside it. */
export function alphaAt (mask, fx, fy) {
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return 0
  const x = Math.min(mask.w - 1, Math.floor(fx * mask.w))
  const y = Math.min(mask.h - 1, Math.floor(fy * mask.h))
  return mask.alpha[y * mask.w + x]
}

/**
 * Where a screen point lands on a picture that is turned and mirrored about its middle: fractions across and down.
 * `rect` is its bounding box on screen, `w`, `h` its own unturned size. Mirrors the CSS `rotate() scale()` it is drawn with.
 */
export function picturePoint (clientX, clientY, rect, w, h, { rotation = 0, flipX = false, flipY = false } = {}) {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  const a = (-rotation * Math.PI) / 180
  const x = dx * Math.cos(a) - dy * Math.sin(a)
  const y = dx * Math.sin(a) + dy * Math.cos(a)
  return { fx: 0.5 + ((flipX ? -1 : 1) * x) / w, fy: 0.5 + ((flipY ? -1 : 1) * y) / h }
}

const _cache = new Map()

/**
 * Load a picture's mask (cached per URL). Null when it cannot be read (no canvas, or a server
 * that does not allow reading its pixels): callers then treat the whole picture as drawn.
 * @returns {Promise<{w: number, h: number, alpha: Uint8Array}|null>}
 */
export function loadAlphaMask (url) {
  if (!_cache.has(url)) {
    _cache.set(url, new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const k = Math.min(1, MASK_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
          const w = Math.max(1, Math.round(img.naturalWidth * k))
          const h = Math.max(1, Math.round(img.naturalHeight * k))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)
          ctx.drawImage(img, 0, 0, w, h)
          const rgba = ctx.getImageData(0, 0, w, h).data
          const alpha = new Uint8Array(w * h)
          for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]
          resolve({ w, h, alpha })
        } catch (_) { resolve(null) }          // tainted canvas: no pixel access
      }
      img.onerror = () => resolve(null)
      img.src = url
    }))
  }
  return _cache.get(url)
}
