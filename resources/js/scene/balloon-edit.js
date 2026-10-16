/**
 * balloon-edit: speech and thought balloons on the EDITOR's stage. BalloonLayer draws them (the
 * player's own renderer); this wires the hand to them:
 *   • a press selects the balloon (one selection across every layer on the stage, and the same
 *     `scene-object-selected` broadcast the text and figure layers use)
 *   • dragging the balloon moves it (line.at); dragging from its EDGE pulls out a tail, and the
 *     handle on the tail's tip moves where it points (line.tail)
 *   • a double click types in it; a balloon just added opens that way with its words selected
 * Every finished gesture is one onChange(id, patch): one save on the server, one undo step.
 */
import { DEFAULT_BEND } from './balloon-shape.js'
import { fractionPoint } from './BalloonLayer.js'

/** A press this close to the bubble's edge (px, inside) pulls out a tail instead of moving it. */
export const EDGE_GRAB_PX = 10
/** Under this many px a press is a click, not a drag. */
const DRAG_THRESHOLD_PX = 3

const layers = new Set()
let selected = null
let pendingEdit = null

const live = () => {
  for (const l of layers) if (!l.host.isConnected) layers.delete(l)
  return [...layers]
}

/** Is a point (client px) within `grab` px of the inside of `r` (a DOMRect)? */
export function onEdge (x, y, r, grab = EDGE_GRAB_PX) {
  const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  if (!inside) return false

  return Math.min(x - r.left, r.right - x, y - r.top, r.bottom - y) <= grab
}

/** Select a balloon on the stage (null clears). Silent: no broadcast (it came from one). */
export function selectBalloon (id, { silent = false } = {}) {
  selected = id || null
  for (const l of live()) l.markSelected(selected)
  if (!silent && selected) window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: selected } }))
}

export const selectedBalloon = () => selected

/** Open a balloon for typing, now or as soon as a layer shows it (a balloon just added). */
export function editBalloon (id) {
  pendingEdit = id
  for (const l of live()) if (startTyping(l, id)) return
}

/** Options for an editable BalloonLayer that saves through `onChange(id, patch)`. */
export function editableBalloons (onChange) {
  return {
    editable: true,
    onChange,
    onShow: (layer, el, id) => wire(layer, el, id, onChange),
    onPlace: placeHandle,
    onLines: (layer) => {
      layers.add(layer)
      layer.markSelected(selected)
      if (pendingEdit) startTyping(layer, pendingEdit)
    },
  }
}

if (typeof window !== 'undefined' && !window.__balloonSelectionMounted) {
  window.__balloonSelectionMounted = true
  // Anything else selected on the stage (a text, a figure, the background) clears the balloon.
  window.addEventListener('scene-object-selected', (e) => {
    const id = e.detail?.id
    if (selected && !(typeof id === 'string' && id.startsWith('bal_'))) selectBalloon(null, { silent: true })
  })
}

function startTyping (layer, id) {
  const i = layer.indexOf(id)
  const el = i < 0 ? null : layer.shown.get(i)
  if (!el) return false
  pendingEdit = null
  selectBalloon(id)
  const bubble = el.querySelector('.lp-balloon__bubble')
  const before = layer.lines[i].text
  try { bubble.contentEditable = 'plaintext-only' } catch (_) { bubble.contentEditable = 'true' }
  if (bubble.contentEditable !== 'plaintext-only') bubble.contentEditable = 'true'
  bubble.focus()
  const range = document.createRange()
  range.selectNodeContents(bubble)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)

  const finish = (keep) => {
    bubble.removeEventListener('keydown', keys)
    bubble.removeEventListener('blur', blur)
    bubble.contentEditable = 'false'
    const text = bubble.textContent.replace(/\s+/g, ' ').trim()
    if (!keep || !text || text === before) {
      bubble.textContent = before
      return
    }
    layer.patchLine(id, { text })
    layer.opts.onChange?.(id, { text })
  }
  const blur = () => finish(true)
  const keys = (e) => {
    e.stopPropagation()   // Backspace types here; it never deletes the balloon
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); bubble.blur() }
    if (e.key === 'Escape') { e.preventDefault(); bubble.removeEventListener('blur', blur); finish(false); bubble.blur() }
  }
  bubble.addEventListener('keydown', keys)
  bubble.addEventListener('blur', blur)

  return true
}

/** The host point (client px) as fractions of the host, kept on it. */
function toFraction (layer, x, y) {
  const r = layer.host.getBoundingClientRect()
  const f = (v, lo, size) => Math.min(1, Math.max(0, (v - lo) / (size || 1)))

  return [round(f(x, r.left, r.width)), round(f(y, r.top, r.height))]
}

const round = (v) => Math.round(v * 10000) / 10000

function wire (layer, el, id, onChange) {
  el.dataset.editable = ''
  const bubble = el.querySelector('.lp-balloon__bubble')
  bubble.addEventListener('dblclick', (e) => { e.stopPropagation(); startTyping(layer, id) })
  bubble.addEventListener('pointermove', (e) => {
    if (bubble.isContentEditable || e.buttons) return
    bubble.style.cursor = onEdge(e.clientX, e.clientY, bubble.getBoundingClientRect()) ? 'crosshair' : ''
  })
  bubble.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || bubble.isContentEditable) return
    const tail = onEdge(e.clientX, e.clientY, bubble.getBoundingClientRect())
    drag(layer, id, e, bubble, tail ? 'tail' : 'move', onChange)
  })
}

/**
 * One gesture on a balloon: 'move' carries its middle (at), 'tail' its tail tip. Drawn live via
 * patchLine; saved once, on release, and only when the hand actually moved.
 */
function drag (layer, id, e, target, mode, onChange) {
  e.preventDefault()
  e.stopPropagation()
  // preventDefault keeps the focus where it was: in an inspector field it would swallow the
  // Delete key meant for this balloon.
  if (document.activeElement instanceof HTMLElement && !layer.host.contains(document.activeElement)) document.activeElement.blur()
  selectBalloon(id)
  const i = layer.indexOf(id)
  if (i < 0) return
  const line = layer.lines[i]
  const bubble = layer.shown.get(i)?.querySelector('.lp-balloon__bubble')
  const hr = layer.host.getBoundingClientRect()
  const br = bubble?.getBoundingClientRect()
  // The balloon's middle in host fractions when the drag began (it may not have had an `at` yet).
  const startAt = fractionPoint(line.at)
    ?? (br ? toFraction(layer, br.left + br.width / 2, br.top + br.height / 2) : [0.5, 0.5])
  const start = { x: e.clientX, y: e.clientY }
  let patch = null
  try { target.setPointerCapture(e.pointerId) } catch (_) { /* synthetic pointer */ }

  const move = (ev) => {
    if (!patch && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_THRESHOLD_PX) return
    if (mode === 'move') {
      const at = [round(startAt[0] + (ev.clientX - start.x) / (hr.width || 1)), round(startAt[1] + (ev.clientY - start.y) / (hr.height || 1))]
      patch = { at: at.map(v => Math.min(1, Math.max(0, v))) }
    } else {
      patch = { tail: { tip: toFraction(layer, ev.clientX, ev.clientY), bend: line.tail?.bend ?? DEFAULT_BEND } }
    }
    layer.patchLine(id, patch)
  }
  const up = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
    target.removeEventListener('pointercancel', up)
    if (patch) onChange?.(id, patch)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
  target.addEventListener('pointercancel', up)
}

/** The selected balloon's tail handle, on the tip (a thought's last circle). */
function placeHandle (el, line, tip) {
  let handle = el.querySelector(':scope > .lp-balloon__handle')
  if (!el.hasAttribute('data-selected') || !tip || !fractionPoint(line.tail?.tip)) {
    handle?.remove()
    return
  }
  if (!handle) {
    handle = document.createElement('div')
    handle.className = 'lp-balloon__handle'
    handle.dataset.balloonHandle = ''
    el.appendChild(handle)
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      const layer = live().find(l => l.host.contains(el))
      if (layer) drag(layer, el.dataset.balloonId, e, handle, 'tail', layer.opts.onChange)
    })
  }
  handle.style.left = `${tip[0]}px`
  handle.style.top = `${tip[1]}px`
}
