import {
  resolveFloors, placeItem, projectPoint, cellToWorld, hitTest, snapCell, clampCell,
  cellForScreenHeight, stackOrder, plateToStage, stageToPlate,
} from './projection.js'
import { poseAt, frameFor } from './timeline.js'
import { alphaAt, loadAlphaMask, DRAWN_ALPHA } from './alpha-mask.js'

/**
 * DioramaStage — draws a diorama scene (config.diorama) into a host element: the plate, its
 * occluders and the items, stacked back to front by depth. The player and the editor both use it,
 * so what a teacher places is what the class sees.
 *
 * The plate covers the host (object-fit: cover); every position comes from projection.js, never
 * from CSS perspective. With `editable`, items can be dragged: the pointer is cast onto the floors,
 * the item snaps to quarter cells and never leaves a floor (no hit = it stays where it was); the
 * handle above an item resizes it, which moves it in depth instead of changing its real height.
 *
 * Assets (pictures, px_per_m, height) come from `${plate.base}assets.json` next to the plate.
 */

const SNAP_STEP = 0.25            // cells
const GRID_MAX_LINES = 60         // per direction; big floors draw every n-th line
const HANDLE_PX = 14
/** Opacity of anything in front of the selected item that covers it (Bart: see what you place). */
export const BLOCKER_OPACITY = 0.3
/** Editor zoom range: out far enough to see well past the picture, in to 2× for detail. */
export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 2
/** Sample points per side when testing whether one drawing covers another. */
const COVER_SAMPLES = 8

/** Keep receiving the drag outside the element. A pointer that is already gone (a very quick tap) throws; the drag still works while over it. */
function capture (el, ev) {
  try { el.setPointerCapture?.(ev.pointerId) } catch (_) { /* pointer no longer active */ }
}

export class DioramaStage {
  /** @param {HTMLElement} host */
  constructor (host) {
    this.host = host
    this._root = null
    this._resize = null
    this._drag = null
  }

  /**
   * @param {object} spec    the diorama JSON
   * @param {object} assets  asset key → {image, px_per_m, height_m, frame_m}
   * @param {{editable?: boolean, onMove?: (move: {itemId: string, floor: string, cell: number[]}) => void}} opts
   */
  show (spec, assets, { editable = false, onMove = null } = {}) {
    this.destroy()
    this.spec = structuredClone(spec)
    this.assets = assets
    this.editable = editable
    this.onMove = onMove
    this._selected = null
    this._time = null
    this._view = { zoom: 1, panX: 0, panY: 0 }
    const base = spec.plate?.base ?? ''

    const root = document.createElement('div')
    root.className = 'diorama-stage'
    // isolation: the layers' z-indexes stack among themselves, never against the host's siblings.
    root.style.cssText = 'position:absolute;inset:0;overflow:hidden;isolation:isolate;'
    this._root = root

    this._masks = new Map()           // picture URL → alpha mask (null = treat as all drawn)
    this._plateEls = []
    // A plate picture is a file beside the scene JSON, or a full URL (a library backdrop).
    const urlOf = src => /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : base + src
    const plateImg = (src, id) => {
      const img = document.createElement('img')
      img.src = urlOf(src)
      img.alt = ''
      img.draggable = false
      img.dataset.dioramaLayer = id
      // cover: a backdrop painted at another size still fills the camera's frame
      img.style.cssText = 'position:absolute;max-width:none;pointer-events:none;object-fit:cover;'
      root.appendChild(img)
      this._plateEls.push(img)
      return img
    }
    this._layerEls = new Map()
    if (spec.plate?.image) this._layerEls.set('plate', plateImg(spec.plate.image, 'plate'))
    for (const o of spec.plate?.occluders ?? []) {
      this._layerEls.set(o.id, plateImg(o.image, o.id))
      if (editable) this._loadMask(urlOf(o.image))
    }

    this._itemEls = new Map()
    this._shown = new Map()           // per item: the frame, flip and picture on screen (for hit tests)
    for (const item of spec.items ?? []) {
      const asset = assets[item.asset]
      if (!asset) continue
      // A div with the picture as background: a sprite sheet shows one frame at a time.
      const img = document.createElement('div')
      img.setAttribute('role', 'img')
      img.setAttribute('aria-label', asset.description ?? item.label ?? '')
      img.dataset.dioramaItem = item.id
      const frames = asset.sheet?.frames ?? 1
      img.style.cssText = 'position:absolute;background-repeat:no-repeat;'
        + `background-image:url("${asset.url ?? base + asset.image}");background-size:${frames * 100}% 100%;`
        + `pointer-events:${editable ? 'auto' : 'none'};touch-action:none;${editable ? 'cursor:grab;' : ''}`
      root.appendChild(img)
      this._itemEls.set(item.id, img)
      if (editable) {
        this._wireDrag(item.id, img)
        this._loadMask(asset.url ?? base + asset.image)
      }
    }

    if (editable) {
      this._grid = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      this._grid.setAttribute('aria-hidden', 'true')
      this._grid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none;z-index:1;'
      root.appendChild(this._grid)
      this._chip = document.createElement('div')
      this._chip.className = 'badge badge-neutral badge-sm'
      this._chip.style.cssText = 'position:absolute;display:none;transform:translate(-50%,8px);pointer-events:none;z-index:9999;white-space:nowrap;'
      root.appendChild(this._chip)
      this._handle = document.createElement('div')
      this._handle.dataset.dioramaHandle = ''
      this._handle.style.cssText = `position:absolute;width:${HANDLE_PX}px;height:${HANDLE_PX}px;border-radius:9999px;`
        + 'transform:translate(-50%,-50%);display:none;z-index:9999;cursor:ns-resize;touch-action:none;pointer-events:auto;'
        + 'background:var(--color-base-100);border:2px solid var(--color-primary);'
      root.appendChild(this._handle)
      this._wireResize()
      this._wireDragMoves()
      this._wireZoom()
      this._zoomChip = document.createElement('button')
      this._zoomChip.type = 'button'
      this._zoomChip.className = 'btn btn-xs'
      this._zoomChip.style.cssText = 'position:absolute;right:8px;bottom:8px;z-index:9999;display:none;pointer-events:auto;'
      this._zoomChip.addEventListener('click', () => this.setZoom(1))   // back to what the class sees
      root.appendChild(this._zoomChip)
      // Another object picked elsewhere (object list, a text box): this stage lets go of its item.
      this._onOtherSelected = (e) => {
        if (this._selected && e.detail?.id !== 'dio_' + this._selected) this.select(null)
      }
      window.addEventListener('scene-object-selected', this._onOtherSelected)
    }

    this._focusU = this._itemFocusU()
    this.host.appendChild(root)
    this._resize = new ResizeObserver(() => this.layout())
    this._resize.observe(this.host)
    this.layout()
  }

  /** True when `spec` is what the stage already shows (a save echoing back, an unrelated edit). */
  matches (spec) {
    return JSON.stringify(spec) === JSON.stringify(this.spec)
  }

  /** Plate pixel → stage pixel with this stage's crop focus. */
  _toStage (p) {
    return plateToStage(this.spec.camera, ...this._stage, p, this._focusU, this._view)
  }

  _toPlate (x, y) {
    return stageToPlate(this.spec.camera, ...this._stage, { x, y }, this._focusU, this._view)
  }

  /**
   * Editor zoom about a stage point (default the centre): the plate point under it stays put.
   * Zoomed out, the floors beyond the picture's edges show and items can be dragged out there.
   */
  setZoom (zoom, atX = this._stage[0] / 2, atY = this._stage[1] / 2) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
    const anchor = this._toPlate(atX, atY)
    this._view = { ...this._view, zoom: z }
    const moved = this._toStage(anchor)
    this._view = { ...this._view, panX: this._view.panX + atX - moved.x, panY: this._view.panY + atY - moved.y }
    if (Math.abs(z - 1) < 1e-6) this._view = { zoom: 1, panX: 0, panY: 0 }   // back to the student's view
    this.layout()
  }

  /** The editor's zoom and pan, to carry over when the same scene re-mounts. */
  get view () { return { ...this._view } }
  set view (v) { this._view = { zoom: 1, panX: 0, panY: 0, ...v }; this.layout() }

  _panBy (dx, dy) {
    this._view = { ...this._view, panX: this._view.panX - dx, panY: this._view.panY - dy }
    this.layout()
  }

  _wireZoom () {
    const target = this.host.parentElement ?? this.host
    this._onWheel = (e) => {
      if (!this._root) return
      const r = this.host.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {                     // Cmd/Ctrl+wheel, and a trackpad pinch
        e.preventDefault()
        this.setZoom(this._view.zoom * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
      } else if (this._view.zoom !== 1) {               // zoomed: a plain scroll pans
        e.preventDefault()
        this._panBy(e.deltaX, e.deltaY)
      }
    }
    target.addEventListener('wheel', this._onWheel, { passive: false })
    this._wheelTarget = target
  }

  /**
   * The plate column a portrait crop centres on: the NEAREST item (the biggest on screen, in
   * practice the character, not the barrel behind him). A midpoint between items far apart cut
   * both in half on a phone. Fixed when the stage is shown: re-centring during a drag would slide
   * the scene under the pointer.
   */
  _itemFocusU () {
    const floors = resolveFloors(this.spec)
    const nearest = (this.spec.items ?? [])
      .map(item => this.assets[item.asset] && placeItem(this.spec.camera, floors, item, 1))
      .filter(Boolean)
      .sort((a, b) => a.depth - b.depth)[0]
    return nearest ? nearest.u : this.spec.camera.width / 2
  }

  /** Re-place everything for the current spec and host size. */
  layout () {
    if (!this._root) return
    const { camera } = this.spec
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (!w || !h) return
    this._stage = [w, h]
    this._floors = resolveFloors(this.spec)

    const origin = this._toStage({ u: 0, v: 0 })
    for (const img of this._plateEls) {
      Object.assign(img.style, {
        left: `${origin.x}px`, top: `${origin.y}px`,
        width: `${camera.width * origin.scale}px`, height: `${camera.height * origin.scale}px`,
      })
    }

    const placements = []
    for (const item of this.spec.items ?? []) {
      const img = this._itemEls.get(item.id)
      const asset = this.assets[item.asset]
      if (!img || !asset) continue
      const pose = this._poseOf(item)
      const p = placeItem(camera, this._floors, { ...item, cell: pose.cell }, asset.px_per_m)
      if (!p) { img.style.display = 'none'; continue }
      const at = this._toStage(p)
      const frames = asset.sheet?.frames ?? 1
      const frame = frameFor(asset.sheet, pose.anim, pose.walkedM)
      const flipped = this._flips(item, asset, pose)
      const flip = flipped ? ' scaleX(-1)' : ''
      const boxW = asset.frame_m[0] * asset.px_per_m * p.scale * at.scale
      const boxH = asset.frame_m[1] * asset.px_per_m * p.scale * at.scale
      const [ax, ay] = asset.anchor ?? [0.5, 1]
      this._shown.set(item.id, {
        frame, frames, flipped, url: asset.url ?? (this.spec.plate?.base ?? '') + asset.image,
        box: { x: at.x - ax * boxW, y: at.y - ay * boxH, w: boxW, h: boxH },   // stage px, as drawn
      })
      Object.assign(img.style, {
        display: '', left: `${at.x}px`, top: `${at.y}px`,
        width: `${asset.frame_m[0] * asset.px_per_m * p.scale * at.scale}px`,
        height: `${asset.frame_m[1] * asset.px_per_m * p.scale * at.scale}px`,
        backgroundPosition: frames > 1 ? `${(frame / (frames - 1)) * 100}% 0` : '0 0',
        // The anchor (bottom centre of the DRAWING, default the picture's) sits on the floor point.
        transform: `translate(${-(asset.anchor?.[0] ?? 0.5) * 100}%,${-(asset.anchor?.[1] ?? 1) * 100}%)${flip}`,
      })
      placements.push({ id: item.id, depth: p.depth, v: p.v })
    }

    // Even z per layer, so the floor grid can sit at 1: over the plate, under every occluder and
    // item (the wall hides the floor behind it, a sailor stands on the lines, not under them).
    stackOrder(this.spec, placements).forEach((entry, i) => {
      const el = entry.kind === 'item' ? this._itemEls.get(entry.id) : this._layerEls.get(entry.id)
      if (el) el.style.zIndex = String(2 * i)
    })
    const plateBox = { x: origin.x, y: origin.y, w: camera.width * origin.scale, h: camera.height * origin.scale }
    this._occShown = new Map((this.spec.plate?.occluders ?? []).map(o => [o.id, {
      url: this._layerEls.get(o.id)?.src, frame: 0, frames: 1, flipped: false, box: plateBox,
    }]))
    this._fadeBlockers()
    this._placeHandle()
    if (!this._drag && !this._resizing) this._showZoomGrid()
    if (this._zoomChip) {
      const zoomed = this._view.zoom !== 1
      this._zoomChip.style.display = zoomed ? '' : 'none'
      this._zoomChip.textContent = `${Math.round(this._view.zoom * 100)}%`
    }
  }

  /** The item's top centre in stage px (for the resize handle). */
  _topOf (item) {
    const asset = this.assets[item.asset]
    const p = placeItem(this.spec.camera, this._floors, item, asset.px_per_m)
    if (!p) return null
    const heightPx = asset.height_m * asset.px_per_m * p.scale
    return this._toStage({ u: p.u, v: p.v - heightPx })
  }

  _placeHandle () {
    if (!this._handle) return
    const item = this._selected && this.spec.items.find(i => i.id === this._selected)
    const top = item && this._topOf(item)
    this._handle.style.display = top ? '' : 'none'
    if (top) Object.assign(this._handle.style, { left: `${top.x}px`, top: `${top.y - HANDLE_PX}px` })
  }

  /** The items, for the object list. */
  items () {
    return this.spec?.items ?? []
  }

  /** Select an item (object list row, or a press on it): shows its resize handle. */
  select (id) {
    this._selected = this._item(id) ? id : null
    this._placeHandle()
    this._fadeBlockers()
    if (this._selected) {
      window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: 'dio_' + id } }))
    }
  }

  /**
   * The floor cell under a page point, snapped: where a picture dropped from the Icons panel lands.
   * No point (a click in the panel), or no floor under it: the floor in the middle of the lower
   * stage, else the middle of the first floor. Never off the grid.
   * @returns {{floor: string, cell: number[]}}
   */
  cellAt (clientX = null, clientY = null) {
    const r = this.host.getBoundingClientRect()
    const tryAt = (x, y) => {
      const p = this._toPlate(x, y)
      const hit = hitTest(this.spec.camera, this._floors, p.u, p.v)
      return hit && { floor: hit.floor, cell: clampCell(this._floors.get(hit.floor), snapCell(hit.cell, SNAP_STEP)) }
    }
    const [w, h] = this._stage
    const at = (clientX !== null && tryAt(clientX - r.left, clientY - r.top)) || tryAt(w / 2, h * 0.8)
    if (at) return at
    const floor = this.spec.floors.find(f => !f.on) ?? this.spec.floors[0]
    const [[x0, y0], [x1, y1]] = floor.cells
    return { floor: floor.id, cell: snapCell([(x0 + x1) / 2, (y0 + y1) / 2], SNAP_STEP) }
  }

  _item (id) {
    return this.spec.items.find(i => i.id === id)
  }

  /** Replace one item immutably and re-place. */
  _setItem (id, patch) {
    this.spec = { ...this.spec, items: this.spec.items.map(i => i.id === id ? { ...i, ...patch } : i) }
    this.layout()
  }

  _pointerPlate (ev) {
    const r = this.host.getBoundingClientRect()
    return this._toPlate(ev.clientX - r.left, ev.clientY - r.top)
  }

  /** Floors carried by this item (a boat's deck): dragging the boat must not land on them. */
  _ownFloors (id) {
    return this.spec.floors.filter(f => f.on === id).map(f => f.id)
  }

  /**
   * The front-most item whose DRAWN pixels are under a page point: a press on a picture's
   * transparent margin reaches the item beneath it. Null when nothing is drawn there.
   */
  pickAt (clientX, clientY) {
    const host = this.host.getBoundingClientRect()
    const x = clientX - host.left
    const y = clientY - host.top
    const hits = [...this._itemEls.entries()]
      .filter(([id, el]) => el.style.display !== 'none' && this._shown.has(id))
      .sort(([, a], [, b]) => Number(b.style.zIndex) - Number(a.style.zIndex))
    for (const [id] of hits) {
      if (this._drawnAt(this._shown.get(id), x, y)) return id
    }
    return null
  }

  _wireDrag (ownId, ownEl) {
    ownEl.addEventListener('pointerdown', (ev) => {
      // The item that is DRAWN under the pointer, which may be one behind this picture.
      const id = this.pickAt(ev.clientX, ev.clientY)
      if (!id) { this.select(null); return }         // an empty margin: deselect, nothing grabbed
      const el = this._itemEls.get(id)
      ev.preventDefault()
      ev.stopPropagation()
      capture(el, ev)
      this.select(id)
      const item = this._item(id)
      const start = this._pointerPlate(ev)
      const feet = projectPoint(this.spec.camera, cellToWorld(this._floors.get(item.floor), item.cell))
      // Grab offset: the item keeps its place under the pointer instead of jumping its feet to it.
      this._drag = { id, du: feet.u - start.u, dv: feet.v - start.v, moved: false }
      el.style.cursor = 'grabbing'
      this._showGrid(item.floor)
      this._placeHandle()
    })
  }

  /** Moving and letting go, for whichever item is being dragged: one pair of listeners per stage. */
  _wireDragMoves () {
    const move = (ev) => {
      if (!this._drag) return
      const { id } = this._drag
      const p = this._pointerPlate(ev)
      const hit = hitTest(this.spec.camera, this._floors, p.u + this._drag.du, p.v + this._drag.dv, { except: this._ownFloors(id) })
      if (!hit) return                                   // no floor here: stay on the last one
      const floor = this._floors.get(hit.floor)
      this._drag.moved = true
      this._setItem(id, { floor: hit.floor, cell: clampCell(floor, snapCell(hit.cell, SNAP_STEP)) })
      this._showGrid(hit.floor)
      this._showChip(id)
    }
    const end = () => {
      if (!this._drag) return
      const { id, moved } = this._drag
      this._drag = null
      const el = this._itemEls.get(id)
      if (el) el.style.cursor = 'grab'
      this._hideGuides()
      if (moved) this._emitMove(id)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    this._unwireDragMoves = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }

  _wireResize () {
    const h = this._handle
    h.addEventListener('pointerdown', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      capture(h, ev)
      this._resizing = { id: this._selected, moved: false }
      this._showGrid(this._item(this._selected).floor)
    })
    h.addEventListener('pointermove', (ev) => {
      if (!this._resizing) return
      const item = this._item(this._resizing.id)
      const asset = this.assets[item.asset]
      const floor = this._floors.get(item.floor)
      const feet = projectPoint(this.spec.camera, cellToWorld(floor, item.cell))
      const targetPx = feet.v - this._pointerPlate(ev).v
      if (targetPx < 4) return
      // Resize = depth (Bart): the real height stays, the item walks nearer or further.
      const cell = cellForScreenHeight(this.spec.camera, floor, item, asset.height_m, targetPx)
      this._resizing.moved = true
      this._setItem(item.id, { cell: clampCell(floor, snapCell(cell, SNAP_STEP)) })
      this._showChip(item.id)
    })
    const end = () => {
      if (!this._resizing) return
      const { id, moved } = this._resizing
      this._resizing = null
      this._hideGuides()
      if (moved) this._emitMove(id)
    }
    h.addEventListener('pointerup', end)
    h.addEventListener('pointercancel', end)
  }

  _emitMove (id) {
    const item = this._item(id)
    this.onMove?.({ itemId: id, floor: item.floor, cell: item.cell })
  }

  _showChip (id) {
    const item = this._item(id)
    const asset = this.assets[item.asset]
    const p = placeItem(this.spec.camera, this._floors, item, asset.px_per_m)
    const at = this._toStage(p)
    this._chip.textContent = `${asset.height_m.toFixed(2)} m · ${p.depth.toFixed(1)} m · ${item.floor}`
    Object.assign(this._chip.style, { display: '', left: `${at.x}px`, top: `${at.y}px` })
  }

  /** The perspective grid of one floor: lines to the vanishing point and cross lines. */
  _showGrid (floorIds) {
    const ids = Array.isArray(floorIds) ? floorIds : [floorIds]
    this._grid.innerHTML = ids.map(id => this._gridPath(this._floors.get(id))).join('')
    this._grid.style.display = ''
  }

  /** The perspective grid of one floor as an SVG path. */
  _gridPath (floor) {
    const [[x0, y0], [x1, y1]] = floor.cells
    const cam = this.spec.camera
    const stagePt = (cell) => {
      const p = projectPoint(cam, cellToWorld(floor, cell))
      return p && this._toStage(p)
    }
    // Endpoints behind the camera have no pixel: walk the line from the far end to the first
    // cell that projects, so floors that start under the camera still draw.
    const segment = (a, b, steps = 32) => {
      const pts = []
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const pt = stagePt([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
        if (pt && Number.isFinite(pt.x) && Math.abs(pt.y) < 1e5) pts.push(pt)
      }
      return pts.length > 1 ? `M${pts[0].x},${pts[0].y}L${pts[pts.length - 1].x},${pts[pts.length - 1].y}` : ''
    }
    const every = (a, b) => Math.max(1, Math.ceil((b - a) / GRID_MAX_LINES))
    let d = ''
    for (let x = Math.ceil(x0); x <= x1; x += every(x0, x1)) d += segment([x, y0], [x, y1])
    for (let y = Math.ceil(y0); y <= y1; y += every(y0, y1)) d += segment([x0, y], [x1, y])
    return `<path d="${d}" fill="none" style="stroke:var(--color-primary);stroke-opacity:0.55;stroke-width:1px"/>`   // var() only works as CSS, not as an SVG attribute
  }

  /** Zoomed out, the floors stay drawn: they carry on past the picture, and so can the items. */
  _showZoomGrid () {
    if (!this._grid || this._drag || this._resizing) return
    if (this._view.zoom < 1) this._showGrid(this.spec.floors.filter(f => !f.on).map(f => f.id))
    else this._grid.style.display = 'none'
  }

  _hideGuides () {
    if (this._grid) this._grid.style.display = 'none'
    this._showZoomGrid()
    if (this._chip) this._chip.style.display = 'none'
    this._placeHandle()
  }

  _loadMask (url) {
    if (this._masks.has(url)) return
    this._masks.set(url, null)
    loadAlphaMask(url).then(mask => { if (mask && this._root) { this._masks.set(url, mask); this._fadeBlockers() } })
  }

  /** Is `shown` (a laid-out picture) drawn at stage point (x, y)? No mask yet = its whole box. */
  _drawnAt (shown, x, y) {
    const { box } = shown
    if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) return false
    const mask = this._masks.get(shown.url)
    if (!mask) return true
    let fx = (x - box.x) / box.w
    if (shown.flipped) fx = 1 - fx
    return alphaAt(mask, (shown.frame + fx) / shown.frames, (y - box.y) / box.h) > DRAWN_ALPHA
  }

  /**
   * While an item is selected, whatever is in front of it AND drawn over its drawn pixels (another
   * figure, the wall, the rail) goes to BLOCKER_OPACITY, so the teacher sees what she is placing.
   */
  _fadeBlockers () {
    if (!this.editable || !this._shown) return
    const target = this._selected && this._shown.get(this._selected)
    const targetZ = target ? Number(this._itemEls.get(this._selected).style.zIndex) : Infinity
    const layers = [
      ...[...this._itemEls.entries()].map(([id, el]) => [el, id === this._selected ? null : this._shown.get(id)]),
      ...[...this._layerEls.entries()].filter(([id]) => id !== 'plate').map(([id, el]) => [el, this._occShown?.get(id)]),
    ]
    for (const [el, shown] of layers) {
      const covers = target && shown && Number(el.style.zIndex) > targetZ && this._covers(shown, target)
      el.style.opacity = covers ? String(BLOCKER_OPACITY) : ''
    }
  }

  /** Does `front` draw over any drawn pixel of `back`? Sampled on a grid over back's box. */
  _covers (front, back) {
    const { box } = back
    for (let i = 0; i < COVER_SAMPLES; i++) {
      for (let j = 0; j < COVER_SAMPLES; j++) {
        const x = box.x + box.w * (i + 0.5) / COVER_SAMPLES
        const y = box.y + box.h * (j + 0.5) / COVER_SAMPLES
        if (this._drawnAt(back, x, y) && this._drawnAt(front, x, y)) return true
      }
    }
    return false
  }

  /** Where an item is at the current playback time (its own cell when nothing plays). */
  _poseOf (item) {
    if (this._time == null) return { cell: item.cell, anim: null, walkedM: 0, dir: null }
    return poseAt(item, this._time, this._floors.get(item.floor).cellM)
  }

  /**
   * Mirror the picture? Only assets that say which way they are drawn (`faces`) turn: while moving
   * they face the way they go on screen, standing they face `item.facing`.
   */
  _flips (item, asset, pose) {
    if (!asset.faces) return false
    let facing = item.facing ?? asset.faces
    if (pose.dir) {
      const floor = this._floors.get(item.floor)
      const here = projectPoint(this.spec.camera, cellToWorld(floor, pose.cell))
      const ahead = projectPoint(this.spec.camera, cellToWorld(floor, [pose.cell[0] + pose.dir[0] * 0.01, pose.cell[1] + pose.dir[1] * 0.01]))
      if (here && ahead && Math.abs(ahead.u - here.u) > 1e-6) facing = ahead.u < here.u ? 'left' : 'right'
    }
    return facing !== asset.faces
  }

  /** Show the scene at `seconds` (keyframes, walk frames); null = the editing pose. */
  update (seconds) {
    this._time = seconds
    this.layout()
  }

  /** Follow a clock (the narration's currentTime) every frame until destroyed. */
  play (clock) {
    const tick = () => {
      if (!this._root) return
      const t = clock()
      if (t !== this._time) this.update(t)
      this._raf = requestAnimationFrame(tick)
    }
    this._raf = requestAnimationFrame(tick)
  }

  destroy () {
    this._unwireDragMoves?.()
    this._unwireDragMoves = null
    this._wheelTarget?.removeEventListener('wheel', this._onWheel)
    this._wheelTarget = null
    if (this._onOtherSelected) window.removeEventListener('scene-object-selected', this._onOtherSelected)
    this._onOtherSelected = null
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = 0
    this._resize?.disconnect()
    this._resize = null
    this._root?.remove()
    this._root = null
    this._drag = null
    this._resizing = null
  }
}

/**
 * The scene's own pictures: `${plate.base}assets.json` (cached per base). A scene built only from
 * library pictures has no base and needs none. A missing file loses only those pictures, never
 * the stage: the plate, the grid and the library pictures still draw.
 */
const _assetCache = new Map()
export function loadDioramaAssets (spec) {
  const base = spec.plate?.base
  if (!base) return Promise.resolve({})
  if (!_assetCache.has(base)) {
    // ponytail: assets.json beside the plate is the pilot's registry for Blender-made pictures;
    // library pictures come from svg_assets (LibraryAssets.php).
    _assetCache.set(base, fetch(`${base}assets.json`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} for ${base}assets.json`); return r.json() })
      .catch(err => { console.warn('diorama assets:', err.message); _assetCache.delete(base); return {} }))
  }
  return _assetCache.get(base)
}
