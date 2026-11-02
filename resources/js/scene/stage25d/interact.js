/**
 * stage25d/interact: pick a layer on the canvas, show its box with handles, drag it sideways.
 *
 * A press picks the nearest standing picture whose paint (not its transparent margin) is under the pointer; an
 * empty press does nothing here, so the editor's own "scene selected" handling takes it. Dragging moves x in the
 * units of the picture's depth (a share of the view width there), through `onMove`, which the editor routes
 * through the timeline: a keyed x gets a key at the playhead, a plain one is saved as the layer's own x.
 */
import { viewWidthAt } from '@stage25d/stage25d/layout'

const X_MIN = -1
const X_MAX = 2

/**
 * @param {object} c
 * @param {HTMLCanvasElement} c.canvas
 * @param {HTMLElement} c.host
 * @param {() => any} c.stage            the Babylon stage (null before the first show)
 * @param {() => number} c.xOf           (index) the layer's x at the playhead
 * @param {{ opaque: Function }} c.alpha
 * @param {(index: number, x: number) => void} c.onMove
 */
export function attachInteraction ({ canvas, host, stage, xOf, alpha, onMove }) {
  let selected = null
  let drag = null
  let hoverQueued = false

  const box = document.createElement('div')
  box.dataset.stage25dSelection = ''
  box.style.cssText = 'position:absolute;display:none;pointer-events:none;box-sizing:border-box;border:1.5px dashed var(--color-primary);z-index:3;'
  for (const [h, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const dot = document.createElement('span')
    dot.style.cssText = `position:absolute;width:8px;height:8px;background:var(--color-primary);${h ? 'right' : 'left'}:-5px;${v ? 'bottom' : 'top'}:-5px;`
    box.appendChild(dot)
  }
  host.appendChild(box)

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const pickAt = (x, y) => stage()?.pickLayers(x, y).find((h) => alpha.opaque(h.asset, h.u, h.v)) ?? null

  const select = (index, announce) => {
    selected = index
    if (announce && index !== null) window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: `s25_layer-${index}` } }))
    place()
  }

  const place = () => {
    const b = selected === null ? null : stage()?.layerBox(selected)
    if (!b) { box.style.display = 'none'; return }
    const r = canvas.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    Object.assign(box.style, {
      display: 'block', left: `${b.x0 * r.width + r.left - h.left}px`, top: `${b.y0 * r.height + r.top - h.top}px`,
      width: `${(b.x1 - b.x0) * r.width}px`, height: `${(b.y1 - b.y0) * r.height}px`,
    })
  }

  const onDown = (e) => {
    if (e.button !== 0) return
    const { x, y } = local(e)
    const hit = pickAt(x, y)
    if (!hit) return
    e.stopPropagation()   // the editor's "empty canvas = the scene is selected" press must not undo this selection
    select(hit.index, true)
    const b = stage().layerBox(hit.index)
    drag = { index: hit.index, z: b.z, from: stage().worldXAt(x, y, b.z), x0: xOf(hit.index), id: e.pointerId }
    canvas.setPointerCapture?.(e.pointerId)
  }

  const onMoveEvent = (e) => {
    const { x, y } = local(e)
    if (drag) {
      const dx = (stage().worldXAt(x, y, drag.z) - drag.from) / viewWidthAt(drag.z)
      onMove(drag.index, Math.round(Math.min(X_MAX, Math.max(X_MIN, drag.x0 + dx)) * 1000) / 1000)
      return
    }
    if (hoverQueued) return
    hoverQueued = true
    requestAnimationFrame(() => { hoverQueued = false; canvas.style.cursor = pickAt(x, y) ? 'pointer' : '' })
  }

  const onUp = () => { if (drag) canvas.releasePointerCapture?.(drag.id); drag = null }

  const onOther = (e) => { if (selected !== null && e.detail?.id !== `s25_layer-${selected}`) { selected = null; place() } }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMoveEvent)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
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
