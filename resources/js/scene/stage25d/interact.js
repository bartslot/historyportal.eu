/**
 * stage25d/interact: pick a layer on the canvas, show its box with handles, drag it sideways.
 *
 * A press picks the nearest standing picture whose paint (not its transparent margin) is under the pointer; an
 * empty press does nothing here, so the editor's own "scene selected" handling takes it. The selection looks and
 * works like an artwork layer's (ArtworkOverlay): the sky ring, eight white handles that scale about the middle,
 * and the rotate grip on its stem. Everything goes through `onChange(index, property, value)`, which the editor
 * routes through the timeline: a keyed property gets a key at the playhead, a plain one is saved on the layer.
 * Moving sideways changes x in the units of the picture's depth (a share of the view width there).
 */
import { viewWidthAt } from '@stage25d/stage25d/layout'
import { handleCss } from '../ArtworkOverlay.js'

const X_MIN = -1
const X_MAX = 2

/**
 * @param {object} c
 * @param {HTMLCanvasElement} c.canvas
 * @param {HTMLElement} c.host
 * @param {() => any} c.stage            the Babylon stage (null before the first show)
 * @param {(index: number, property: string) => number} c.valueOf   the layer's value at the playhead
 * @param {{ opaque: Function }} c.alpha
 * @param {(index: number, property: string, value: number) => void} c.onChange
 */
export function attachInteraction ({ canvas, host, stage, valueOf, alpha, onChange }) {
  let selected = null
  let drag = null
  let hoverQueued = false

  // The same chrome as an artwork layer: sky ring, eight handles, rotate grip on a stem.
  const SKY = '#38bdf8'
  const box = document.createElement('div')
  box.dataset.stage25dSelection = ''
  box.style.cssText = `position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${SKY};z-index:3;`
  const stem = document.createElement('div')
  stem.style.cssText = `position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${SKY};pointer-events:none;`
  box.appendChild(stem)
  const grip = document.createElement('div')
  grip.dataset.rotateHandle = '1'
  grip.style.cssText = 'position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;'
  box.appendChild(grip)
  const HANDLES = [
    ['top:-5px; left:-5px;', 'nwse-resize'], ['top:-5px; right:-5px;', 'nesw-resize'], ['bottom:-5px; left:-5px;', 'nesw-resize'], ['bottom:-5px; right:-5px;', 'nwse-resize'],
    ['top:-5px; left:calc(50% - 5px);', 'ns-resize'], ['bottom:-5px; left:calc(50% - 5px);', 'ns-resize'], ['left:-5px; top:calc(50% - 5px);', 'ew-resize'], ['right:-5px; top:calc(50% - 5px);', 'ew-resize'],
  ]
  const handles = HANDLES.map(([pos, cursor]) => {
    const h = document.createElement('div')
    h.dataset.scaleHandle = '1'
    h.style.cssText = handleCss(pos, cursor)
    box.appendChild(h)
    return h
  })
  host.appendChild(box)

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const pickAt = (x, y) => stage()?.pickLayers(x, y).find((h) => alpha.opaque(h.asset, h.u, h.v)) ?? null

  const select = (index, announce) => {
    selected = index
    if (announce && index !== null) window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: `s25_layer-${index}` } }))
    place()
  }

  /** The selected box in canvas CSS px: left, top, width, height and the middle. */
  const rectOf = () => {
    const b = selected === null ? null : stage()?.layerBox(selected)
    if (!b) return null
    const r = canvas.getBoundingClientRect()
    return { left: b.x0 * r.width, top: b.y0 * r.height, width: (b.x1 - b.x0) * r.width, height: (b.y1 - b.y0) * r.height, z: b.z }
  }

  const place = () => {
    const b = rectOf()
    if (!b) { box.style.display = 'none'; return }
    const r = canvas.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    Object.assign(box.style, { display: 'block', left: `${b.left + r.left - h.left}px`, top: `${b.top + r.top - h.top}px`, width: `${b.width}px`, height: `${b.height}px` })
  }

  const clampTo = (value, min, max) => Math.min(max, Math.max(min, value))

  const onDown = (e) => {
    if (e.button !== 0) return
    const { x, y } = local(e)
    const hit = pickAt(x, y)
    if (!hit) return
    e.stopPropagation()   // the editor's "empty canvas = the scene is selected" press must not undo this selection
    select(hit.index, true)
    const b = stage().layerBox(hit.index)
    drag = { mode: 'move', index: hit.index, z: b.z, from: stage().worldXAt(x, y, b.z), x0: valueOf(hit.index, 'x'), id: e.pointerId, el: canvas }
    canvas.setPointerCapture?.(e.pointerId)
  }

  /** A press on a handle: scale about the middle of the box, or turn about it. */
  const onHandleDown = (mode) => (e) => {
    if (e.button !== 0 || selected === null) return
    const b = rectOf()
    if (!b) return
    e.stopPropagation()
    e.preventDefault()
    const r = canvas.getBoundingClientRect()
    const cx = b.left + b.width / 2
    const cy = b.top + b.height / 2
    const { x, y } = { x: e.clientX - r.left, y: e.clientY - r.top }
    drag = {
      mode, index: selected, cx, cy, id: e.pointerId, el: e.currentTarget,
      d0: Math.max(8, Math.hypot(x - cx, y - cy)), a0: Math.atan2(y - cy, x - cx),
      scale0: valueOf(selected, 'scale'), rotation0: valueOf(selected, 'rotation'),
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onMoveEvent = (e) => {
    const { x, y } = local(e)
    if (drag?.mode === 'move') {
      const dx = (stage().worldXAt(x, y, drag.z) - drag.from) / viewWidthAt(drag.z)
      onChange(drag.index, 'x', Math.round(clampTo(drag.x0 + dx, X_MIN, X_MAX) * 1000) / 1000)
      return
    }
    if (drag?.mode === 'scale') {
      const d = Math.hypot(x - drag.cx, y - drag.cy)
      onChange(drag.index, 'scale', Math.round(clampTo(drag.scale0 * (d / drag.d0), 0.05, 20) * 1000) / 1000)
      return
    }
    if (drag?.mode === 'rotate') {
      let deg = drag.rotation0 + ((Math.atan2(y - drag.cy, x - drag.cx) - drag.a0) * 180) / Math.PI   // clockwise on screen
      if (e.shiftKey) deg = Math.round(deg / 15) * 15
      onChange(drag.index, 'rotation', Math.round(deg * 10) / 10)
      return
    }
    if (hoverQueued) return
    hoverQueued = true
    requestAnimationFrame(() => { hoverQueued = false; canvas.style.cursor = pickAt(x, y) ? 'pointer' : '' })
  }

  const onUp = () => { if (drag) drag.el.releasePointerCapture?.(drag.id); drag = null }

  const onOther = (e) => { if (selected !== null && e.detail?.id !== `s25_layer-${selected}`) { selected = null; place() } }

  canvas.addEventListener('pointerdown', onDown)
  for (const el of [canvas, ...handles, grip]) {
    el.addEventListener('pointermove', onMoveEvent)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }
  handles.forEach((h) => h.addEventListener('pointerdown', onHandleDown('scale')))
  grip.addEventListener('pointerdown', onHandleDown('rotate'))
  window.addEventListener('scene-object-selected', onOther)

  return {
    /** Select by editor id ('layer-3') without announcing it again; null clears. */
    select: (index, announce = false) => select(index, announce),
    get selected () { return selected },
    place,
    destroy () {
      window.removeEventListener('scene-object-selected', onOther)
      box.remove()
    },
  }
}
