/**
 * stage-zoom.js: make the editor's stage bigger or smaller, like Figma's canvas (Bart, 2026-11-12: "pinch on my
 * laptop, not triggering the zoom in function of mac itself, but making the canvas smaller/bigger", "or ctrl or cmd
 * scroll"). A pinch (Chrome sends it as a wheel with ctrlKey) or Ctrl/Cmd + scroll zooms about the pointer; a plain
 * two-finger scroll pans once zoomed; Cmd/Ctrl+0 puts it back. The page itself never zooms.
 *
 * The stage box really changes size (CSS vars --stage-zoom / --stage-pan-x / --stage-pan-y on #lesson-canvas-root),
 * never a CSS transform: every canvas, overlay and pointer reading inside it stays in its own true pixels.
 */
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
const WHEEL_SPEED = 0.01      // a pinch sends small deltas; a mouse wheel with Ctrl is clamped per event below
const MAX_STEP = 1.25         // one wheel notch never zooms more than this
const KEEP_VISIBLE = 80       // px of the stage that always stay inside the work area

/**
 * Pure: the view after zooming by `factor` about screen point (px, py), so the stage point under it stays put.
 * view {z, x, y}: zoom and pan; rect: the stage's box now; area: the work area's box.
 */
export function zoomAround (view, factor, px, py, rect, area) {
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.z * factor))
  const w1 = rect.width / view.z, h1 = rect.height / view.z
  const cx = rect.left - view.x + rect.width / 2, cy = rect.top - view.y + rect.height / 2   // the unpanned centre
  const fx = (px - rect.left) / rect.width, fy = (py - rect.top) / rect.height
  const left = px - fx * w1 * z, top = py - fy * h1 * z
  return clampPan({ z, x: left - (cx - w1 * z / 2), y: top - (cy - h1 * z / 2) }, w1, h1, cx, cy, area)
}

/** Pure: the view panned by (dx, dy) screen px. */
export function panBy (view, dx, dy, rect, area) {
  const w1 = rect.width / view.z, h1 = rect.height / view.z
  const cx = rect.left - view.x + rect.width / 2, cy = rect.top - view.y + rect.height / 2
  return clampPan({ z: view.z, x: view.x + dx, y: view.y + dy }, w1, h1, cx, cy, area)
}

/** Some of the stage always stays in the work area, however far it was pushed. */
function clampPan (v, w1, h1, cx, cy, area) {
  if (!area) return v
  const w = w1 * v.z, h = h1 * v.z
  const left = cx - w / 2 + v.x, top = cy - h / 2 + v.y
  const minLeft = area.left + Math.min(KEEP_VISIBLE, w) - w, maxLeft = area.right - Math.min(KEEP_VISIBLE, w)
  const minTop = area.top + Math.min(KEEP_VISIBLE, h) - h, maxTop = area.bottom - Math.min(KEEP_VISIBLE, h)
  return {
    z: v.z,
    x: v.x + Math.max(minLeft, Math.min(maxLeft, left)) - left,
    y: v.y + Math.max(minTop, Math.min(maxTop, top)) - top,
  }
}

const typing = (el) => el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
// these take the wheel themselves: a map zooms itself, the 3D camera's lens while it is being framed
const ownsWheel = (el) => el?.closest?.('#lesson-map-preview, .maplibregl-map') || (window.__stage25d?.framing && el?.closest?.('.stage25d-canvas'))

/** Wire the editor's stage. Idempotent per root. */
export function installStageZoom (root, area = document.getElementById('lesson-stage-letterbox')) {
  if (!root || root.__stageZoom) return root?.__stageZoom
  let view = { z: 1, x: 0, y: 0 }
  let raf = 0
  const refit = () => { raf = 0; window.dispatchEvent(new Event('resize')) }   // the renderers refit on resize
  // a stage zoomed past the work area stops at its edges: it never paints over the top bar or into the rail
  const clip = () => {
    if (!area || (view.z === 1 && !view.x && !view.y)) { root.style.clipPath = ''; return }
    const r = root.getBoundingClientRect(), a = area.getBoundingClientRect()
    const cut = (n) => `${Math.max(0, Math.round(n))}px`
    root.style.clipPath = `inset(${cut(a.top - r.top)} ${cut(r.right - a.right)} ${cut(r.bottom - a.bottom)} ${cut(a.left - r.left)})`
  }
  const show = (next) => {
    view = next
    root.style.setProperty('--stage-zoom', String(view.z))
    root.style.setProperty('--stage-pan-x', `${view.x}px`)
    root.style.setProperty('--stage-pan-y', `${view.y}px`)
    root.dataset.stageZoom = view.z.toFixed(3)
    clip()
    if (!raf) raf = requestAnimationFrame(refit)
  }
  // only the stage and the bare work area around it: a panel floating over the work area (rail, inspector, the deck)
  // scrolls itself (Bart 11-12: "we should scroll or move only the canvas when we are hovering the canvas panel")
  const overWork = (e) => root.contains(e.target) || (!!area && area.contains(e.target))

  const wheel = (e) => {
    const zoomKey = e.ctrlKey || e.metaKey
    if (zoomKey) e.preventDefault()   // anywhere in the editor: the page itself never zooms
    if (!overWork(e) || ownsWheel(e.target)) return
    const rect = root.getBoundingClientRect(), box = area?.getBoundingClientRect()
    if (zoomKey) {
      const lines = e.deltaMode === 1 ? 16 : 1
      const factor = Math.max(1 / MAX_STEP, Math.min(MAX_STEP, Math.exp(-e.deltaY * lines * WHEEL_SPEED)))
      show(zoomAround(view, factor, e.clientX, e.clientY, rect, box))
    } else if (view.z !== 1 || view.x || view.y) {
      e.preventDefault()
      show(panBy(view, -e.deltaX, -e.deltaY, rect, box))
    }
  }
  const key = (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== '0' || typing(e.target)) return
    e.preventDefault()
    show({ z: 1, x: 0, y: 0 })
  }
  window.addEventListener('wheel', wheel, { capture: true, passive: false })
  window.addEventListener('keydown', key, true)
  window.addEventListener('resize', clip)   // a panel opened or closed: the work area moved

  root.__stageZoom = {
    get view () { return view },
    reset () { show({ z: 1, x: 0, y: 0 }) },
    destroy () {
      window.removeEventListener('wheel', wheel, { capture: true })
      window.removeEventListener('keydown', key, true)
      window.removeEventListener('resize', clip)
      delete root.__stageZoom
    },
  }
  return root.__stageZoom
}

