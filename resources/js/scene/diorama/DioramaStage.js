import {
  resolveFloors, placeItem, projectPoint, cellToWorld, hitTest, snapCell, clampCell,
  cellForScreenHeight, stackOrder, plateToStage, stageToPlate,
} from './projection.js'
import { poseAt, frameFor } from './timeline.js'

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
    const base = spec.plate?.base ?? ''

    const root = document.createElement('div')
    root.className = 'diorama-stage'
    // isolation: the layers' z-indexes stack among themselves, never against the host's siblings.
    root.style.cssText = 'position:absolute;inset:0;overflow:hidden;isolation:isolate;'
    this._root = root

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
    for (const o of spec.plate?.occluders ?? []) this._layerEls.set(o.id, plateImg(o.image, o.id))

    this._itemEls = new Map()
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
      if (editable) this._wireDrag(item.id, img)
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
    return plateToStage(this.spec.camera, ...this._stage, p, this._focusU)
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
      const flip = this._flips(item, asset, pose) ? ' scaleX(-1)' : ''
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
    this._placeHandle()
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
      const p = stageToPlate(this.spec.camera, ...this._stage, { x, y }, this._focusU)
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
    return stageToPlate(this.spec.camera, ...this._stage, { x: ev.clientX - r.left, y: ev.clientY - r.top }, this._focusU)
  }

  /** Floors carried by this item (a boat's deck): dragging the boat must not land on them. */
  _ownFloors (id) {
    return this.spec.floors.filter(f => f.on === id).map(f => f.id)
  }

  _wireDrag (id, el) {
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault()
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
    el.addEventListener('pointermove', (ev) => {
      if (!this._drag || this._drag.id !== id) return
      const p = this._pointerPlate(ev)
      const hit = hitTest(this.spec.camera, this._floors, p.u + this._drag.du, p.v + this._drag.dv, { except: this._ownFloors(id) })
      if (!hit) return                                   // no floor here: stay on the last one
      const floor = this._floors.get(hit.floor)
      this._drag.moved = true
      this._setItem(id, { floor: hit.floor, cell: clampCell(floor, snapCell(hit.cell, SNAP_STEP)) })
      this._showGrid(hit.floor)
      this._showChip(id)
    })
    const end = () => {
      if (!this._drag || this._drag.id !== id) return
      const { moved } = this._drag
      this._drag = null
      el.style.cursor = 'grab'
      this._hideGuides()
      if (moved) this._emitMove(id)
    }
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
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
  _showGrid (floorId) {
    const floor = this._floors.get(floorId)
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
    this._grid.innerHTML = `<path d="${d}" fill="none" style="stroke:var(--color-primary);stroke-opacity:0.55;stroke-width:1px"/>`   // var() only works as CSS, not as an SVG attribute
    this._grid.style.display = ''
  }

  _hideGuides () {
    if (this._grid) this._grid.style.display = 'none'
    if (this._chip) this._chip.style.display = 'none'
    this._placeHandle()
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
