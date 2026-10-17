/**
 * The title screen's join QR: a static place, bottom right inside the gutter, at the right end of
 * the bottom rail (player.blade.php). It never moves. When the screen runs out of room it shrinks
 * (title-fit.js FIT.qrSteps) and then hides; the lesson code then stands in its place.
 *
 * keep_clear boxes (TitlePoster) are shares of the frame: {box: {x, y, w, h}, kind, weight}. Here
 * they are only turned into px: a face under the QR is an art problem, solved in the art.
 */

export const QR = {
  // The code's width (quiet zone included) at full size, then the smaller steps (title-fit.js).
  sizes: [96, 84, 72],
  minWidth: 640,              // below this (a phone) the QR stays hidden: the pupil is on a device already
  quietZone: 4,               // modules of white round the code: the QR spec's minimum
}

/**
 * Pure: the qrcode options for a code `width` px wide, quiet zone included: dark modules in
 * `ink` on opaque white. Phone cameras miss an inverted code on a busy picture, so it is never
 * white on transparent.
 */
export const qrOptions = (width, ink = '#0a0a0a') => ({ width, margin: QR.quietZone, color: { dark: ink, light: '#ffffffff' } })

/** Pure: shown or not, and how big: hidden by the teacher, by the give-way steps, or on a phone. */
export function qrState ({ stageW, override = 'auto', hidden = false, size = QR.sizes[0] }) {
  if (override === 'hidden' || hidden || stageW < QR.minWidth) return { hidden: true }
  return { hidden: false, size }
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
 * Size (or hide) the QR in the title screen `host`; return what was decided with the keep-clear
 * boxes in px (for the fit, the debug overlay and the proofs). `opts`: keepClear (poster.json
 * entries), frame (() => the rect those boxes are shares of, relative to host, or null), override
 * (the teacher's: 'hidden' hides it), qrHidden and maxSize (the give-way steps).
 */
export function layoutTitleQr (host, opts = {}) {
  const qr = host.querySelector('[data-title-qr]')
  const o = host.getBoundingClientRect()
  const frame = opts.frame?.() ?? null
  const keepClear = frame
    ? (opts.keepClear ?? []).map(k => ({ rect: frameRect(k.box, frame), kind: k.kind, weight: k.weight }))
    : []
  const state = qrState({ stageW: host.clientWidth, override: opts.override, hidden: opts.qrHidden, size: opts.maxSize })
  if (!qr) return { hidden: true, keepClear }
  qr.style.display = state.hidden ? 'none' : ''
  if (!state.hidden) {
    const canvas = qr.querySelector('canvas')
    Object.assign(canvas.style, { width: `${state.size}px`, height: `${state.size}px` })
  }
  qr.dataset.spot = state.hidden ? 'hidden' : 'bottom-right'

  return { ...state, keepClear, qr: state.hidden ? null : relRect(qr.getBoundingClientRect(), o) }
}

/** Debug overlay (?qr_debug=1): the keep-clear boxes and the QR, drawn on `host`. */
export function drawQrDebug (host, result) {
  host.querySelector('[data-qr-debug]')?.remove()
  const layer = document.createElement('div')
  layer.dataset.qrDebug = ''
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '60' })
  const colour = { face: '#22c55e', letters: '#f97316', figure: '#eab308', subject: '#a855f7', qr: '#3b82f6' }
  const box = (r, kind) => {
    const d = document.createElement('div')
    Object.assign(d.style, { position: 'absolute', left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, outline: `2px solid ${colour[kind]}`, background: `${colour[kind]}22` })
    d.dataset.kind = kind
    layer.appendChild(d)
  }
  result.keepClear?.forEach(k => box(k.rect, k.kind))
  if (result.qr) box(result.qr, 'qr')
  host.appendChild(layer)
}
