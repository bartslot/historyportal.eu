/**
 * stage25d/interact: pick a layer on the canvas, show its box with handles, drag it sideways.
 *
 * A press picks the nearest standing picture whose paint (not its transparent margin) is under the pointer, and the
 * selected picture before any other: it can be dragged out from behind what stands in front of it. A click on it with
 * others under the pointer selects the next one down, so every layer can be reached on the canvas. An empty press does
 * nothing here, so the editor's own "scene selected" handling takes it. The selection looks and
 * works like an artwork layer's (ArtworkOverlay): the sky ring, eight white handles that scale about the middle,
 * and the rotate grip on its stem. Everything goes through `onChange(index, property, value)`, which the editor
 * routes through the timeline: a keyed property gets a key at the playhead, a plain one is saved on the layer.
 * Pictures stand on the ground grid (floor.js, the diorama's maths): a drag slides along the ground (up = farther,
 * down = nearer) and snaps to quarter steps of the grid, the corner handles change the distance (a nearer picture is a
 * bigger one; its real height never changes), and the grid is drawn while editing. Backdrops that span the view (sky
 * picture, bg strips) and sky-depth pictures are not on the ground: they still move by x and scale by size.
 * A figure of parts (a puppet) also shows a handle on each bone it can turn; a drag turns that bone (`bone:head`).
 */
import { BONE_PREFIX, viewWidthAt } from '@stage25d/stage25d/layout'
import { turnBetween } from '../../editor/puppet-pose.js'
import { handleCss } from '../ArtworkOverlay.js'
import { settle, pointForSizeRatio, alongSight, gridPieces, groundOf, layerOf } from './floor.js'

const X_MIN = -1
const X_MAX = 2
/** Further than this between press and release (CSS px) is a drag, not a click. */
const CLICK_PX = 4

/** Which of the pictures under the pointer (nearest first) a press takes, and where a click on it goes next. */
export const pickOf = (all, selected) => {
  const hits = all.filter((h, n) => all.findIndex((o) => o.index === h.index) === n)   // a figure's overlapping parts each report: one picture
  const at = hits.findIndex((h) => h.index === selected)
  if (at < 0) return { hit: hits[0] ?? null, next: null }
  return { hit: hits[at], next: hits.length > 1 ? hits[(at + 1) % hits.length].index : null }
}

/** The layers standing nearer than the selected one and overlapping its box: `boxes` is `[{ index, box }]`. */
export const inFrontOf = (boxes, selected) => {
  const own = boxes.find((b) => b.index === selected)?.box
  if (!own) return []
  return boxes.filter(({ index, box }) => index !== selected && box && box.z < own.z
    && box.x0 < own.x1 && box.x1 > own.x0 && box.y0 < own.y1 && box.y1 > own.y0).map((b) => b.index)
}

/** The character the teacher is looking at: the selected one, else the one on screen nearest the middle of the view.
 *  `boxes` is `[{ index, box }]` of the characters; null when none is on screen. */
export const figureInView = (boxes, selected) => {
  const seen = boxes.filter(({ box }) => box && box.x1 > 0 && box.x0 < 1 && box.y1 > 0 && box.y0 < 1)
  if (seen.some((b) => b.index === selected)) return selected
  const off = ({ x0, y0, x1, y1 }) => Math.hypot((x0 + x1) / 2 - 0.5, (y0 + y1) / 2 - 0.5)
  return seen.reduce((best, b) => (!best || off(b.box) < off(best.box) ? b : best), null)?.index ?? null
}

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
 * @param {(x: number, y: number, lift?: number, index?: number) => number[] | null} c.groundUnder   the ground point [x, z] in metres under a
 *        canvas point, for feet `lift` metres above the ground (layer `index`: a strip keeps to the floor)
 * @param {(index: number) => number} [c.footY]                 how high a layer's feet stand now
 * @param {() => number[]} c.eye                                where the camera stands on the ground, [x, z]
 * @param {(index: number) => void} [c.onSettled]               a drag along the ground ended
 * @param {(x: number, y: number) => boolean | { move: (dx: number, dy: number) => void, end: () => void }} [c.onEmpty]
 *        a press on no standing picture; true when it selected a backdrop, its drag when that backdrop moves
 * @param {(bone: string) => string} [c.boneLabel]             a bone's name for its handle, in the teacher's language
 */
export function attachInteraction ({ canvas, host, stage, valueOf, alpha, onChange, onGround = () => false, byDistance = () => false, groundUnder = () => null, footY = () => 0, eye = () => [0, 0], onSettled = () => {}, onEmpty = () => false, boneLabel = (bone) => bone }) {
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

  // A figure of parts: a handle on each bone it can turn, at the bone's far end; a drag turns the bone round its joint.
  // 32 px to grab (the control sizes), a small dot to see; above the box, so a press on it never moves the figure.
  const bones = document.createElement('div')
  bones.dataset.stage25dBones = ''
  bones.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;'
  host.appendChild(bones)
  const boneDots = new Map()
  const boneDot = (name) => {
    if (boneDots.has(name)) return boneDots.get(name)
    const d = document.createElement('div')
    d.dataset.boneHandle = name
    d.setAttribute('aria-label', boneLabel(name))
    d.dataset.tooltip = boneLabel(name)
    d.style.cssText = 'position:absolute;width:32px;height:32px;margin:-16px 0 0 -16px;display:none;place-items:center;cursor:grab;touch-action:none;pointer-events:auto;'
    const dot = document.createElement('span')
    dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid ${SKY};box-sizing:border-box;`
    d.appendChild(dot)
    d.addEventListener('pointerdown', onBoneDown(name))
    follow(d)
    bones.appendChild(d)
    boneDots.set(name, d)
    return d
  }
  const placeBones = (r, h) => {
    const seen = selected === null || !r ? null : stage()?.jointsOnScreen?.(selected)
    const shown = new Set(seen?.joints.map((j) => j.name) ?? [])
    for (const j of seen?.joints ?? []) {
      Object.assign(boneDot(j.name).style, { display: 'grid', left: `${j.tip[0] * r.width + r.left - h.left}px`, top: `${j.tip[1] * r.height + r.top - h.top}px` })
    }
    for (const [name, d] of boneDots) if (!shown.has(name)) d.style.display = 'none'
    // a figure scales evenly: its corners do that, so the side handles make room for the bones (a forearm sits right there)
    for (const side of handles.slice(4)) side.style.display = shown.size ? 'none' : ''
  }

  // The selected picture where it runs past the frame, at half strength (Bart 11-12: "you cannot see the selected layer
  // completely"). Behind the canvas, so inside the frame the stage shows as it is; kept to the work area, never over
  // the panels. Its handles stay at full strength on the box above.
  const GHOST_PX = 100
  const ghostArea = document.createElement('div')
  ghostArea.dataset.stage25dGhost = ''
  ghostArea.style.cssText = 'position:absolute;display:none;overflow:hidden;pointer-events:none;z-index:-1;'
  const ghost = document.createElement('img')
  ghost.alt = ''
  ghost.draggable = false
  ghost.style.cssText = `position:absolute;left:0;top:0;width:${GHOST_PX}px;height:${GHOST_PX}px;max-width:none;transform-origin:0 0;opacity:0.5;`
  ghostArea.appendChild(ghost)
  host.insertBefore(ghostArea, host.firstChild)
  const placeGhost = (r, h) => {
    const g = selected === null || !r ? null : stage()?.layerGhost?.(selected)
    const area = document.getElementById('lesson-stage-letterbox')?.getBoundingClientRect()
    if (!g || !area) { ghostArea.style.display = 'none'; return }
    if (ghost.dataset.src !== g.url) { ghost.src = g.url; ghost.dataset.src = g.url }
    Object.assign(ghostArea.style, { display: 'block', left: `${area.left - h.left}px`, top: `${area.top - h.top}px`, width: `${area.width}px`, height: `${area.height}px` })
    const px = ([x, y]) => [x * r.width + r.left - area.left, y * r.height + r.top - area.top]
    const [o, a, b] = [px(g.tl), px(g.tr), px(g.bl)]
    ghost.style.transform = `matrix(${(a[0] - o[0]) / GHOST_PX}, ${(a[1] - o[1]) / GHOST_PX}, ${(b[0] - o[0]) / GHOST_PX}, ${(b[1] - o[1]) / GHOST_PX}, ${o[0]}, ${o[1]})`
  }

  // The ground grid while editing (never in the player: this file is the editor's), drawn by the stage on the ground
  // itself, under the pictures: a faint pencil line in the theme's neutral ink (amber vanishes into painted grass).
  stage()?.setGrid?.(gridPieces(), themeRgb(host, '--color-neutral'))
  const chip = document.createElement('div')
  chip.style.cssText = 'position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;'
  host.appendChild(chip)

  const showChip = (index) => {
    const b = rectOf()
    if (!b || index === null) { chip.style.display = 'none'; return }
    const h = host.getBoundingClientRect()
    const r = canvas.getBoundingClientRect()
    Object.assign(chip.style, { display: 'block', left: `${b.left + b.width / 2 + r.left - h.left}px`, top: `${b.top + b.height + r.top - h.top}px` })
    chip.textContent = `${valueOf(index, 'z').toFixed(2)} m`
  }

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const hitsAt = (x, y) => (stage()?.pickLayers(x, y) ?? []).filter((h) => alpha.opaque(h.asset, h.u, h.v, h.index))

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
    if (!b) { box.style.display = 'none'; placeBones(null); placeGhost(null); return }
    const r = canvas.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    Object.assign(box.style, { display: 'block', left: `${b.left + r.left - h.left}px`, top: `${b.top + r.top - h.top}px`, width: `${b.width}px`, height: `${b.height}px` })
    placeBones(r, h)
    placeGhost(r, h)
  }

  const clampTo = (value, min, max) => Math.min(max, Math.max(min, value))

  const onDown = (e) => {
    if (e.button !== 0) return
    const { x, y } = local(e)
    const { hit: painted, next: down } = pickOf(hitsAt(x, y), selected)
    // The selected picture's whole box is it, the air in it too: between a figure's legs, a small flame, even with a nearer
    // picture painted there. It stays selected and drags; a click without a drag goes on to that nearer picture
    const was = rectOf()
    const inBox = was && x >= was.left && x <= was.left + was.width && y >= was.top && y <= was.top + was.height
    const hit = inBox ? { index: selected } : painted
    const next = inBox && painted && painted.index !== selected ? painted.index : down
    if (!hit) {
      const held = onEmpty(x, y)
      if (held) e.stopPropagation()   // a backdrop was selected: not "the scene"
      // a backdrop that moves (a ground band) hands back its drag: { move(dx, dy), end() }
      if (held && typeof held === 'object') {
        drag = { mode: 'backdrop', held, start: [x, y], id: e.pointerId, el: canvas }
        canvas.setPointerCapture?.(e.pointerId)
      }
      return
    }
    e.stopPropagation()   // the editor's "empty canvas = the scene is selected" press must not undo this selection
    select(hit.index, true)
    const b = stage().layerBox(hit.index)
    const ground = onGround(hit.index)
    const r = rectOf()
    drag = {
      mode: 'move', index: hit.index, z: b.z, from: stage().worldXAt(x, y, b.z), x0: valueOf(hit.index, 'x'), id: e.pointerId, el: canvas,
      // on the ground the feet (bottom middle of the box) follow the pointer at the offset where it was grabbed
      next, pressed: [e.clientX, e.clientY],
      ground, start: [x, y], foot: r ? [r.left + r.width / 2, r.top + r.height] : [x, y], lift: ground ? footY(hit.index) : 0,
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

  /** A press on a bone's handle: it turns round its joint, which stays where it is on screen while it does. */
  function onBoneDown (name) {
    return (e) => {
      if (e.button !== 0 || selected === null) return
      const seen = stage()?.jointsOnScreen?.(selected)
      const joint = seen?.joints.find((j) => j.name === name)
      if (!joint) return
      e.stopPropagation()
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const { x, y } = local(e)
      drag = {
        mode: 'bone', name, index: selected, id: e.pointerId, el: e.currentTarget,
        at: [joint.at[0] * r.width, joint.at[1] * r.height], last: [x, y],
        deg: valueOf(selected, `${BONE_PREFIX}${name}`) ?? 0, sense: seen.mirrored ? -1 : 1,
      }
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
  }

  function onMoveEvent (e) {
    const { x, y } = local(e)
    if (drag?.mode === 'backdrop') { drag.held.move(x - drag.start[0], y - drag.start[1]); return }
    if (drag?.mode === 'bone') {
      // clockwise on screen is clockwise for the bone, unless the figure shows mirrored; held to the joint's limits as it goes,
      // so turning back from past a limit moves at once
      const turned = drag.deg + turnBetween(drag.at, drag.last, [x, y]) * drag.sense
      const limit = (deg) => stage()?.boneLimit?.(drag.index, drag.name, deg) ?? deg
      drag.deg = limit(clampTo(turned, -180, 180))
      drag.last = [x, y]
      drag.sent = limit(e.shiftKey ? Math.round(drag.deg / 15) * 15 : Math.round(drag.deg * 10) / 10)   // a snap stays inside the limit too
      onChange(drag.index, `${BONE_PREFIX}${drag.name}`, drag.sent, { hold: true })   // shown at once, saved when let go
      return
    }
    if (drag?.mode === 'move' && drag.ground) {
      // Slide along the ground: the feet go where the pointer moved them on screen, onto the ground there, snapped.
      const at = groundUnder(drag.foot[0] + x - drag.start[0], drag.foot[1] + y - drag.start[1], drag.lift, drag.index)
      if (!at) return   // no ground under the feet (above the horizon): it stays put
      const to = layerOf(settle(at))
      onChange(drag.index, 'x', clampTo(to.x, X_MIN, X_MAX))   // the server's range: far off to the side is off the stage
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
    requestAnimationFrame(() => { hoverQueued = false; canvas.style.cursor = hitsAt(x, y).length ? 'pointer' : '' })
  }

  const onUp = (e) => {
    if (!drag) return
    drag.el.releasePointerCapture?.(drag.id)
    if (drag.mode === 'backdrop') { drag.held.end(); drag = null; return }
    if (drag.mode === 'bone' && drag.sent !== undefined) onChange(drag.index, `${BONE_PREFIX}${drag.name}`, drag.sent, { done: true })   // one save
    const index = drag.index
    const moved = (drag.mode === 'move' && drag.ground) || drag.byDistance
    const next = drag.next != null && Math.hypot(e.clientX - drag.pressed[0], e.clientY - drag.pressed[1]) < CLICK_PX ? drag.next : null
    drag = null
    chip.style.display = 'none'
    if (moved) onSettled(index)
    if (next !== null) select(next, true)
  }

  const onOther = (e) => { if (selected !== null && e.detail?.id !== `s25_layer-${selected}`) { selected = null; place() } }

  canvas.addEventListener('pointerdown', onDown)
  function follow (el) {
    el.addEventListener('pointermove', onMoveEvent)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }
  [canvas, ...handles, grip].forEach(follow)
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
      bones.remove()
      ghostArea.remove()
      stage()?.setGrid?.(null)
      chip.remove()
    },
  }
}

/** A theme colour (a CSS variable) as 0..1 RGB for the stage: a 1 px canvas reads any CSS colour, oklch too. */
function themeRgb (el, name) {
  const g = document.createElement('canvas').getContext?.('2d', { willReadFrequently: true })
  if (!g) return [0.2, 0.25, 0.33]   // no 2D canvas (tests): slate
  g.fillStyle = getComputedStyle(el).getPropertyValue(name).trim() || 'slategray'
  g.fillRect(0, 0, 1, 1)
  return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((v) => v / 255)
}
