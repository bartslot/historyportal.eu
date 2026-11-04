/**
 * stage25d/alpha: which points of a painted picture are paint and which are the transparent margin of its plane,
 * so a click beside the stone does not pick the stone. Loaded lazily, one small canvas read per picture. A picture the
 * teacher edited reads its own new file (asset.src, stage.ts editedAsset), so what was erased no longer picks.
 */
const OPAQUE_FROM = 24   // alpha 0..255 above which a point counts as the picture
const fileOf = (asset) => asset?.src ?? asset?.file

export function createAlphaMaps (base) {
  const maps = new Map()   // file -> { w, h, data } | 'loading' | 'failed'

  const load = (file, isEdited = false) => {
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
    img.src = isEdited ? file : base + file
  }

  return {
    /** Start loading the pictures of these assets. */
    prime (list) { list.forEach((a) => fileOf(a) && load(fileOf(a), !!a.src)) },
    /** Is the point (u across, v down: 0..1, as the plane's uvs and Babylon's pick give it) paint? Still loading counts as empty: a transparent margin is never the picture. A picture that failed to load counts as paint.
     *  An animation reads `frame`, the one on show (sprite.ts frameAt); without it, any frame. */
    opaque (asset, u, v, frame) {
      const file = fileOf(asset)
      const m = maps.get(file)
      if (m === 'failed') return true   // no way to tell: better a picture that can be picked than one that cannot
      if (!m || m === 'loading') { if (file) load(file, !!asset.src); return false }
      // an animation's file is a sheet of frames: the frame on show, or (no frame given) any frame
      const cols = asset.kind === 'animation' ? Math.max(1, asset.cols ?? 1) : 1
      const rows = asset.kind === 'animation' ? Math.max(1, asset.rows ?? 1) : 1
      const fw = m.w / cols, fh = m.h / rows
      const x = Math.min(fw - 1, Math.max(0, Math.floor(u * fw)))
      const y = Math.min(fh - 1, Math.max(0, Math.floor(v * fh)))   // the plane's v runs 0 at the top (layer.ts anchoredPlane)
      const cells = Number.isInteger(frame) ? [[Math.floor(frame / cols) % rows, frame % cols]] : Array.from({ length: rows * cols }, (_, n) => [Math.floor(n / cols), n % cols])
      return cells.some(([r, c]) => m.data[(Math.floor(r * fh + y) * m.w + Math.floor(c * fw + x)) * 4 + 3] > OPAQUE_FROM)
    },
  }
}
