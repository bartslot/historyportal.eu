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
import { DEFAULT_BEND, bendFromPoint, outlineT } from './balloon-shape.js'
import { MAX_SCALE, MIN_SCALE, fractionPoint } from './BalloonLayer.js'
import { handleCss } from './ArtworkOverlay.js'

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

/** Animated values onto a balloon on the stage: the timeline's scrub and play, a field's drag. */
export function patchBalloon (id, values) {
  for (const l of live()) l.applyValues(id, values)
}

/** One animatable property of a balloon on the stage (balloonValue units), or null. */
export function readBalloon (id, property) {
  for (const l of live()) {
    const v = l.readValue(id, property)
    if (v !== undefined) return v
  }

  return null
}

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
    onPlace: placeHandles,
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

/**
 * The host point (client px) as fractions of the host, kept inside where the layer's balloons may
 * go: the host itself, or the whole stage for a split panel's (they cross the panel border).
 */
export function toFraction (layer, x, y) {
  const r = layer.host.getBoundingClientRect()
  const b = layer.fractionBounds?.() ?? { x: [0, 1], y: [0, 1] }
  const f = (v, lo, size, [min, max]) => Math.min(max, Math.max(min, (v - lo) / (size || 1)))

  return [round(f(x, r.left, r.width, b.x)), round(f(y, r.top, r.height, b.y))]
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

/** The timeline's target for a balloon id: 'bal_3' → 'bal:3'. */
export const balloonTarget = (id) => `bal:${String(id).slice(4)}`

/**
 * What a finished gesture changes, as the timeline's property values (balloonValue units), so an
 * animated property records a key at the playhead like a dragged figure does.
 */
export function editedValues (patch) {
  const out = {}
  if (patch.at) Object.assign(out, { x: patch.at[0] * 100, y: patch.at[1] * 100 })
  if (Number.isFinite(patch.scale)) out.scale = patch.scale
  const t = patch.tail ?? {}
  if (t.tip) Object.assign(out, { tip_x: t.tip[0] * 100, tip_y: t.tip[1] * 100 })
  if (Number.isFinite(t.root)) out.root = t.root
  if (Number.isFinite(t.bend)) out.bend = t.bend

  return out
}

/** The scale a corner drag gives: the start scale times how much farther from the middle it is. */
export function scaleFromDrag (startScale, centre, from, to) {
  const d0 = Math.hypot(from[0] - centre[0], from[1] - centre[1])
  const d1 = Math.hypot(to[0] - centre[0], to[1] - centre[1])
  if (!(d0 > 0)) return startScale

  return Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale * (d1 / d0))) * 1000) / 1000
}

/**
 * One gesture on a balloon: 'move' carries its middle (at), 'tail' its tip, 'root' where the tail
 * leaves the outline, 'bend' how far it bows, 'scale' its size. Drawn live via patchLine; saved
 * once, on release, and only when the hand actually moved.
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
  const el = layer.shown.get(i)
  const geom = el?._geom ?? null
  const hr = layer.host.getBoundingClientRect()
  const br = el?.querySelector('.lp-balloon__bubble')?.getBoundingClientRect()
  // The balloon's middle in host fractions when the drag began (it may not have had an `at` yet).
  const startAt = fractionPoint(line.at)
    ?? (br ? toFraction(layer, br.left + br.width / 2, br.top + br.height / 2) : [0.5, 0.5])
  const start = { x: e.clientX, y: e.clientY }
  const local = (ev) => [ev.clientX - hr.left, ev.clientY - hr.top]
  let patch = null
  try { target.setPointerCapture(e.pointerId) } catch (_) { /* synthetic pointer */ }

  const tailWith = (part) => ({ tail: { ...(line.tail ?? {}), ...part } })
  const gesture = (ev) => {
    if (mode === 'move') {
      const at = [startAt[0] + (ev.clientX - start.x) / (hr.width || 1), startAt[1] + (ev.clientY - start.y) / (hr.height || 1)]
      const b = layer.fractionBounds?.() ?? { x: [0, 1], y: [0, 1] }
      return { at: at.map((v, i) => round(Math.min(b[i ? 'y' : 'x'][1], Math.max(b[i ? 'y' : 'x'][0], v)))) }
    }
    if (mode === 'scale' && br) {
      const centre = [br.left + br.width / 2, br.top + br.height / 2]
      return { scale: scaleFromDrag(Number.isFinite(line.scale) ? line.scale : 1, centre, [start.x, start.y], [ev.clientX, ev.clientY]) }
    }
    if (mode === 'root' && geom) return tailWith({ root: outlineT(geom.rect, local(ev)) })
    if (mode === 'bend' && geom?.shape) return tailWith({ bend: bendFromPoint(geom.shape.root, geom.shape.tip, local(ev)) })
    if (mode === 'tail') return tailWith({ tip: toFraction(layer, ev.clientX, ev.clientY), bend: line.tail?.bend ?? DEFAULT_BEND })

    return null
  }
  const move = (ev) => {
    if (!patch && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_THRESHOLD_PX) return
    patch = gesture(ev) ?? patch
    if (patch) layer.patchLine(id, patch)
  }
  const up = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
    target.removeEventListener('pointercancel', up)
    if (!patch) return
    onChange?.(id, patch)
    window.dispatchEvent(new CustomEvent('scene-object-edited', { detail: { target: balloonTarget(id), values: editedValues(patch) } }))
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
  target.addEventListener('pointercancel', up)
}

/** The selected balloon's handles: scale (bottom-right corner), and on a tail its tip, root and bend. */
const HANDLES = [
  { mode: 'scale', cursor: 'nwse-resize' },
  { mode: 'tail', cursor: 'grab' },
  { mode: 'root', cursor: 'grab' },
  { mode: 'bend', cursor: 'grab' },
]

function placeHandles (el, line, tip, geom) {
  el._geom = geom
  const selected = el.hasAttribute('data-selected')
  const shape = geom?.shape ?? null
  const at = {
    scale: geom ? [geom.rect.left + geom.rect.w, geom.rect.top + geom.rect.h] : null,
    tail: tip,
    root: shape?.root ?? null,
    bend: shape?.mid ?? null,
  }
  for (const h of HANDLES) {
    let node = el.querySelector(`:scope > [data-balloon-handle="${h.mode}"]`)
    const p = selected ? at[h.mode] : null
    if (!p) { node?.remove(); continue }
    if (!node) node = makeHandle(el, h)
    node.style.left = `${p[0] - 5}px`
    node.style.top = `${p[1] - 5}px`
  }
}

function makeHandle (el, h) {
  const node = document.createElement('div')
  node.dataset.balloonHandle = h.mode
  node.style.cssText = handleCss('', h.cursor)
  el.appendChild(node)
  const layerOf = () => live().find(l => l.host.contains(el))
  node.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    const layer = layerOf()
    if (layer) drag(layer, el.dataset.balloonId, e, node, h.mode, layer.opts.onChange)
  })
  // Double click: the root snaps to the edge nearest the tip again.
  if (h.mode === 'root') {
    node.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      const layer = layerOf()
      const id = el.dataset.balloonId
      const line = layer?.lines[layer.indexOf(id)]
      if (!line?.tail) return
      const { root, ...tail } = line.tail
      layer.patchLine(id, { tail })
      layer.opts.onChange?.(id, { tail: { root: null } })
    })
  }

  return node
}
