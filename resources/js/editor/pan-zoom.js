/**
 * pan-zoom.js — look closer at a picture in the clean-up dialog (Bart, 2026-11-05, a 265 x 355 figure with white in its
 * hair). The wheel zooms where the pointer is; Space, the middle button or the Hand tool drags the picture. The picture
 * itself is untouched: only a CSS transform on `content`, so everything that reads the pointer through
 * getBoundingClientRect keeps working.
 */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 32
const FIT_MARGIN = 0.94
const MAX_FIT = 8              // a tiny icon is not blown up to the whole window
const WHEEL_SPEED = 0.002
const KEEP_VISIBLE = 48        // px of the picture that always stay on screen
const CRISP_FROM = 3           // from this zoom on each picture pixel shows as a square

/** The picture centred and as large as fits. */
export function fitView (vw, vh, w, h) {
  const z = Math.max(MIN_ZOOM, Math.min(MAX_FIT, (Math.min(vw / w, vh / h) || 1) * FIT_MARGIN))
  return { z, x: (vw - w * z) / 2, y: (vh - h * z) / 2 }
}

/** The view zoomed by `factor`, keeping the picture point under (px, py) where it is. */
export function zoomAt (view, factor, px, py) {
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.z * factor))
  const k = z / view.z
  return { z, x: px - (px - view.x) * k, y: py - (py - view.y) * k }
}

/** A view that keeps some of the picture on screen, however far it was dragged. */
export function keepInView (view, vw, vh, w, h) {
  const sw = w * view.z, sh = h * view.z
  const margin = (size) => Math.min(KEEP_VISIBLE, size)
  return {
    z: view.z,
    x: Math.max(margin(sw) - sw, Math.min(vw - margin(sw), view.x)),
    y: Math.max(margin(sh) - sh, Math.min(vh - margin(sh), view.y)),
  }
}

/**
 * Wire `viewport` (the window onto the picture) to `content` (the w x h px picture on it).
 * Returns { view, fit, zoomBy, setHand, setSpace, panning, destroy }.
 */
export function mountPanZoom (viewport, content, w, h, onChange = () => {}) {
  let view = { z: 1, x: 0, y: 0 }
  let touched = false   // the teacher moved it: a resized window no longer refits
  let hand = false, space = false
  let drag = null

  const box = () => viewport.getBoundingClientRect()
  const show = (next) => {
    const r = box()
    view = keepInView(next, r.width, r.height, w, h)
    content.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`
    for (const c of content.querySelectorAll('canvas')) c.style.imageRendering = view.z >= CRISP_FROM ? 'pixelated' : ''
    onChange(view)
  }
  const cursor = () => {
    viewport.style.cursor = drag ? 'grabbing' : hand || space ? 'grab' : ''
    content.style.pointerEvents = drag || hand || space ? 'none' : ''   // or the canvas's own cursor wins
  }
  const fit = () => { touched = false; const r = box(); show(fitView(r.width, r.height, w, h)) }
  const zoomBy = (factor, px, py) => {
    const r = box()
    touched = true
    show(zoomAt(view, factor, px ?? r.width / 2, py ?? r.height / 2))
  }

  const wheel = (e) => {
    e.preventDefault()
    const r = box()
    const lines = e.deltaMode === 1 ? 16 : 1
    zoomBy(Math.exp(-e.deltaY * lines * WHEEL_SPEED), e.clientX - r.left, e.clientY - r.top)
  }
  // in the capture phase, so a drag that moves the picture never reaches the brush underneath
  const down = (e) => {
    if (!(hand || space || e.button === 1)) return
    e.preventDefault()
    e.stopImmediatePropagation()
    try { viewport.setPointerCapture(e.pointerId) } catch { /* synthetic pointers */ }
    drag = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y }
    cursor()
  }
  const move = (e) => {
    if (!drag) return
    e.stopImmediatePropagation()
    touched = true
    show({ z: view.z, x: drag.x + e.clientX - drag.sx, y: drag.y + e.clientY - drag.sy })
  }
  const up = (e) => {
    if (!drag) return
    e.stopImmediatePropagation()
    drag = null
    cursor()
  }

  viewport.addEventListener('wheel', wheel, { passive: false })
  viewport.addEventListener('pointerdown', down, true)
  viewport.addEventListener('pointermove', move, true)
  viewport.addEventListener('pointerup', up, true)
  viewport.addEventListener('pointercancel', up, true)
  const ro = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => { if (touched) show(view); else fit() })
    : null
  ro?.observe(viewport)
  fit()

  return {
    get view () { return view },
    fit,
    zoomBy,
    setHand (on) { hand = !!on; cursor() },
    setSpace (on) { space = !!on; cursor() },
    get panning () { return !!drag || hand || space },
    destroy () {
      ro?.disconnect()
      viewport.removeEventListener('wheel', wheel)
      viewport.removeEventListener('pointerdown', down, true)
      viewport.removeEventListener('pointermove', move, true)
      viewport.removeEventListener('pointerup', up, true)
      viewport.removeEventListener('pointercancel', up, true)
    },
  }
}
