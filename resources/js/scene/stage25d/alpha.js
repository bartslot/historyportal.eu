/**
 * stage25d/alpha: which points of a painted picture are paint and which are the transparent margin of its plane,
 * so a click beside the stone does not pick the stone. Loaded lazily, one small canvas read per picture.
 */
const OPAQUE_FROM = 24   // alpha 0..255 above which a point counts as the picture

export function createAlphaMaps (base) {
  const maps = new Map()   // file -> { w, h, data } | 'loading' | 'failed'

  const load = (file) => {
    if (maps.has(file)) return
    maps.set(file, 'loading')
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0)
        maps.set(file, { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data })
      } catch (_) { maps.set(file, 'failed') }
    }
    img.onerror = () => maps.set(file, 'failed')
    img.src = base + file
  }

  return {
    /** Start loading the pictures of these assets. */
    prime (list) { list.forEach((a) => a?.file && load(a.file)) },
    /** Is the point (u across, v up: 0..1) paint? Unknown (not loaded, failed) counts as paint: never refuse a click. */
    opaque (asset, u, v) {
      const m = maps.get(asset?.file)
      if (!m || typeof m === 'string') { if (asset?.file) load(asset.file); return true }
      const x = Math.min(m.w - 1, Math.max(0, Math.floor(u * m.w)))
      const y = Math.min(m.h - 1, Math.max(0, Math.floor((1 - v) * m.h)))
      return m.data[(y * m.w + x) * 4 + 3] > OPAQUE_FROM
    },
  }
}
