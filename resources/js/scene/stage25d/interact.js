/**
 * stage25d/interact: pick a layer on the canvas, show its box with handles, drag it sideways.
 *
 * A press picks the nearest standing picture whose paint (not its transparent margin) is under the pointer; an
 * empty press does nothing here, so the editor's own "scene selected" handling takes it. The selection looks and
 * works like an artwork layer's (ArtworkOverlay): the sky ring, eight white handles that scale about the middle,
 * and the rotate grip on its stem. Everything goes through `onChange(index, property, value)`, which the editor
 * routes through the timeline: a keyed property gets a key at the playhead, a plain one is saved on the layer.
 * Pictures stand on the ground grid (floor.js, the diorama's maths): a drag slides along the ground (up = farther,
 * down = nearer) and snaps to quarter steps of the grid, the corner handles change the distance (a nearer picture is a
 * bigger one; its real height never changes), and the grid is drawn while editing. Backdrops that span the view (sky
 * picture, bg strips) and sky-depth pictures are not on the ground: they still move by x and scale by size.
 */
import { viewWidthAt } from '@stage25d/stage25d/layout'
import { handleCss } from '../ArtworkOverlay.js'
import { settle, pointForSizeRatio, alongSight, gridPolylines, groundOf, layerOf } from './floor.js'

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
 * @param {(index: number) => boolean} c.onGround              the layer stands on the ground (not a backdrop)
 * @param {(index: number) => boolean} c.byDistance            resizing moves it in distance, not in scale
 * @param {(x: number, y: number) => number[] | null} c.groundUnder   the ground point [x, z] in metres under a canvas point
 * @param {() => number[]} c.eye                                where the camera stands on the ground, [x, z]
 * @param {(index: number) => void} [c.onSettled]               a drag along the ground ended
 */
export function attachInteraction ({ canvas, host, stage, valueOf, alpha, onChange, onGround = () => false, byDistance = () => false, groundUnder = () => null, eye = () => [0, 0], onSettled = () => {} }) {
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

  // The ground grid, drawn over the canvas while editing (never in the player: this file is the editor's).
  const NS = 'http://www.w3.org/2000/svg'
  const grid = document.createElementNS(NS, 'svg')
  grid.setAttribute('aria-hidden', 'true')
  grid.dataset.stage25dGrid = ''
  grid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:1;'
  host.appendChild(grid)
  const chip = document.createElement('div')
  chip.style.cssText = 'position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;'
  host.appendChild(chip)
  const lines = gridPolylines()
  let gridKey = null

  const drawGrid = () => {
    const st = stage()
    if (!st?.screenOf) return
    const key = st.cameraKey()
    if (key === gridKey) return   // redrawn only when the camera (or the canvas size) changed
    gridKey = key
    const r = canvas.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    const dx = r.left - h.left
    const dy = r.top - h.top
    let d = ''
    for (const line of lines) {
      let run = []
      const flush = () => { if (run.length > 1) d += `M${run.map((p) => `${p.x},${p.y}`).join('L')}`; run = [] }
      for (const w of line) {
        const p = st.screenOf(w)
        if (p && Number.isFinite(p.x) && Math.abs(p.y) < 20) run.push({ x: dx + p.x * r.width, y: dy + p.y * r.height }); else flush()
      }
      flush()
    }
    // a dark line under the amber one: readable over painted grass
    grid.innerHTML = `<path d="${d}" fill="none" style="stroke:#0f172a;stroke-opacity:0.45;stroke-width:3px"/>`
      + `<path d="${d}" fill="none" style="stroke:var(--color-primary);stroke-opacity:0.9;stroke-width:1.25px"/>`
  }

  const showChip = (index) => {
    const b = rectOf()
    if (!b || index === null) { chip.style.display = 'none'; return }
    const h = host.getBoundingClientRect()
    const r = canvas.getBoundingClientRect()
    Object.assign(chip.style, { display: 'block', left: `${b.left + b.width / 2 + r.left - h.left}px`, top: `${b.top + b.height + r.top - h.top}px` })
    chip.textContent = `${valueOf(index, 'z').toFixed(2)} m`
  }

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
    drawGrid()
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
    const ground = onGround(hit.index)
    drag = {
      mode: 'move', index: hit.index, z: b.z, from: stage().worldXAt(x, y, b.z), x0: valueOf(hit.index, 'x'), id: e.pointerId, el: canvas,
      ground, p0: ground ? groundOf(valueOf(hit.index, 'x'), valueOf(hit.index, 'z')) : null, grab: ground ? groundUnder(x, y) : null,
    }
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
      byDistance: mode === 'scale' && byDistance(selected),
      p0: groundOf(valueOf(selected, 'x'), valueOf(selected, 'z')), eye: eye(),
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onMoveEvent = (e) => {
    const { x, y } = local(e)
    if (drag?.mode === 'move' && drag.ground) {
      // Slide along the ground: the point under the pointer, less where the picture was grabbed, snapped to the grid.
      const at = groundUnder(x, y)
      if (!drag.grab || !at) return   // no ground under the pointer (above the horizon): it stays put
      const to = layerOf(settle([drag.p0[0] + at[0] - drag.grab[0], drag.p0[1] + at[1] - drag.grab[1]]))
      onChange(drag.index, 'x', to.x)
      onChange(drag.index, 'z', to.z)
      showChip(drag.index)
      return
    }
    if (drag?.mode === 'move') {
      const dx = (stage().worldXAt(x, y, drag.z) - drag.from) / viewWidthAt(drag.z)
      onChange(drag.index, 'x', Math.round(clampTo(drag.x0 + dx, X_MIN, X_MAX) * 1000) / 1000)
      return
    }
    if (drag?.mode === 'scale' && drag.byDistance) {
      // Resize = distance: a bigger picture is a nearer one. The scale folds into the distance (it ends at 1).
      const ratio = (Math.hypot(x - drag.cx, y - drag.cy) / drag.d0) * drag.scale0
      // the distance snaps to the grid too; x follows along the line of sight, so it keeps its column on screen
      const z = settle(pointForSizeRatio(drag.p0, ratio, drag.eye))[1]
      const to = layerOf(alongSight(drag.p0, z, drag.eye))
      if (drag.scale0 !== 1) onChange(drag.index, 'scale', 1)
      onChange(drag.index, 'x', to.x)
      onChange(drag.index, 'z', to.z)
      showChip(drag.index)
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

  const onUp = () => {
    if (!drag) return
    drag.el.releasePointerCapture?.(drag.id)
    const index = drag.index
    const moved = (drag.mode === 'move' && drag.ground) || drag.byDistance
    drag = null
    chip.style.display = 'none'
    if (moved) onSettled(index)
  }

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
      grid.remove()
      chip.remove()
    },
  }
}
