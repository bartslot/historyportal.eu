/**
 * SplitStage: a split scene's two comic panels (split-layout.js), drawn the same way in the
 * editor preview (wizard-bridge.js) and the student player (lesson-player.js).
 *
 * Each panel is its own little stage, clipped to its box: the backdrop planes and the panel's own
 * camera (ParallaxScene), its figures (ArtworkOverlay) and its speech balloons (BalloonLayer).
 * Between the panels a white gutter; on each panel's gutter edge a thin, slightly uneven ink line.
 * The outer edges bleed, like the reference page. Flat: no shadow.
 */
import { ParallaxScene } from './ParallaxScene.js'
import { ArtworkOverlay } from './ArtworkOverlay.js'
import { BalloonLayer } from './BalloonLayer.js'
import { backdropLayers, isClipartLayer } from './layer-filters.js'
import { splitLayout, focusPosition, normalizeSplit, normalizeFocus, atFromPointer, panFocus, wheelZoom } from './split-layout.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
/** One wobble point per this many px of edge; the line drifts at most this share of its width. */
const WOBBLE_STEP_PX = 28
const WOBBLE_SHARE = 0.22
/** The divider's grab area reaches this far past the gutter on each side, px. */
const DIVIDER_PAD_PX = 6
/** A wheel zoom is saved this long after the last notch, so a spin is one save, not twenty. */
const WHEEL_SAVE_MS = 350
/** Under this many px a press on a pane is a click (select it), not a pan. */
const PAN_THRESHOLD_PX = 3
/** Pointer targets that are not the pane's picture: figures move, balloons and the divider are their own. */
const NOT_THE_PICTURE = '[data-layer-id],[data-layer-chrome],[data-split-divider]'

/** Which panel says a line: the one holding its figure; off-frame lines go to the first panel. */
export function panelForLine (line, panelLayers) {
  const id = line?.figure?.asset_id
  if (id == null) return 0
  const i = panelLayers.findIndex(layers => (layers || []).some(l => l?.asset_id === id))

  return i < 0 ? 0 : i
}

/** A hand-drawn straight line from (x0,y0) to (x1,y1): small seeded wobble, never random per frame. */
export function inkPath (x0, y0, x1, y1, width, seed = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  const steps = Math.max(1, Math.round(len / WOBBLE_STEP_PX))
  const nx = -(y1 - y0) / (len || 1)
  const ny = (x1 - x0) / (len || 1)
  let s = seed
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5 }
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const off = i === 0 || i === steps ? 0 : rand() * width * WOBBLE_SHARE * 2
    pts.push(`${(x0 + (x1 - x0) * t + nx * off).toFixed(2)} ${(y0 + (y1 - y0) * t + ny * off).toFixed(2)}`)
  }

  return `M ${pts.join(' L ')}`
}

export class SplitStage {
  /**
   * @param {HTMLElement} host  the stage box the two panels fill
   * @param {{editable?: boolean, onSelect?: (i:number)=>void, onLayerChange?: (i:number, assetId:number, t:object)=>void,
   *          onSplitChange?: (at:number)=>void, onViewChange?: (i:number, focus:{x:number,y:number,zoom:number})=>void}} opts
   */
  constructor (host, { editable = false, onSelect = null, onLayerChange = null, onSplitChange = null, onViewChange = null } = {}) {
    if (!host) throw new TypeError('SplitStage: host element is required')
    this.host = host
    this.editable = editable
    this.onSelect = onSelect
    this.onLayerChange = onLayerChange
    this.onSplitChange = onSplitChange
    this.onViewChange = onViewChange
    this._dragging = false   // a divider drag or a pan: the server's echo must not snap it back
    this.panels = []
    this._root = null
    this._split = null
    this._selected = null
  }

  /**
   * @param {{split: {dir:string, at:number}, shots: object[], lines?: object[], matte?: string|null,
   *          loop?: boolean, selected?: number|null}} scene
   */
  show ({ split, shots = [], lines = [], matte = null, loop = false, selected = null } = {}) {
    this.destroy()
    this._split = normalizeSplit(split)
    if (!this._split) return
    const root = document.createElement('div')
    root.className = 'lp-split'
    root.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:var(--split-gutter,#fbf8f1);'
    this.host.appendChild(root)
    this._root = root

    this.panels = [0, 1].map(i => this._panel(root, shots[i] || {}, i, matte, loop))
    if (this.editable) this._divider = this._makeDivider(root)
    this.setLines(lines)
    this._layout()
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._layout())
      this._ro.observe(this.host)
    }
    this.select(selected)
  }

  _panel (root, shot, i, matte, loop) {
    const el = document.createElement('div')
    el.className = 'lp-split__panel'
    el.dataset.panel = String(i)
    // The panel's own colour (Background ▸ Colour on that panel) wins over the scene's.
    el.style.cssText = `position:absolute;overflow:hidden;background:${shot.background_color || matte || 'var(--split-matte,#0f172a)'};`
    const box = () => {
      const d = document.createElement('div')
      d.style.cssText = 'position:absolute;inset:0;'
      el.appendChild(d)
      return d
    }
    const plate = box()
    const art = box()
    const talk = box()
    talk.style.pointerEvents = 'none'
    talk.style.zIndex = '35'   // above the figures (30/32), like the player's own balloon host
    const ink = document.createElementNS(SVG_NS, 'svg')
    ink.setAttribute('aria-hidden', 'true')
    ink.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:40;'
    el.appendChild(ink)
    root.appendChild(el)

    const layers = Array.isArray(shot.layers) ? shot.layers : []
    const pos = focusPosition(shot.focus)
    const planes = backdropLayers(layers).map(l => ((l.kind ?? 'cover') === 'cover' ? { ...l, objectPosition: pos } : l))
    const figures = layers.filter(l => (l?.url || l?.embed) && isClipartLayer(l))

    const overlay = new ArtworkOverlay(art, this.editable
      ? { onChange: (assetId, t) => this.onLayerChange?.(i, assetId, t) }
      : { readonly: true })
    overlay.setStackLevels(30, 32)
    overlay.setBackdrop(planes.find(l => (l.kind ?? 'cover') === 'cover')?.url)

    let parallax = null
    const p = { el, ink, plate, overlay, balloons: null, layers, focus: normalizeFocus(shot.focus), parallax: null }
    if (planes.length) {
      parallax = new ParallaxScene(plate)
      parallax.show({
        layers: planes,
        motion: { panX: 0, panY: 0, zoom: 1 },
        camera: shot.camera || null,
        entry: shot.entry || null,
        loop,
        entryAlong: [art],
        onCameraFrame: (frameFor) => overlay.setCamera(frameFor),
      })
      if (!shot.camera) parallax.update(0.5)
    }
    p.parallax = parallax
    this._applyFocus(p)
    overlay.setLayers(figures)
    overlay.playEntrances()

    // Balloons find their speaker inside THIS panel only.
    const balloons = new BalloonLayer(talk, (assetId) => {
      const img = el.querySelector(`[data-layer-id="art_${assetId}"] img`)
      return img ? img.getBoundingClientRect() : null
    })

    if (this.editable) {
      // A click anywhere in a panel (a figure in it too) makes it the one the inspector edits.
      el.style.pointerEvents = 'auto'
      el.addEventListener('pointerdown', () => { if (this._selected !== i) this.onSelect?.(i) }, true)
      this._panZoom(p, i)
    }
    p.balloons = balloons

    return p
  }

  /**
   * The panel's crop: which point of its picture stays in view (object-position) and how far it is
   * zoomed in, about that same point, so a pan of a zoomed picture moves what you see.
   */
  _applyFocus (p) {
    const { x, y, zoom } = p.focus
    const pos = `${x}% ${y}%`
    for (const img of p.plate.querySelectorAll('.px-layer-bg img')) {
      img.style.objectPosition = pos
      img.style.transformOrigin = pos
      img.style.transform = zoom > 1 ? `scale(${zoom})` : ''
    }
  }

  /** Editor: drag a pane's picture to move it, wheel over it to zoom. Figures keep their own drag. */
  _panZoom (p, i) {
    p.el.style.cursor = 'grab'
    let pan = null
    p.el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest?.(NOT_THE_PICTURE)) return
      pan = { x: e.clientX, y: e.clientY, focus: p.focus, moved: false, id: e.pointerId }
    })
    p.el.addEventListener('pointermove', (e) => {
      if (!pan || e.pointerId !== pan.id) return
      const dx = e.clientX - pan.x
      const dy = e.clientY - pan.y
      if (!pan.moved && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return
      if (!pan.moved) {
        pan.moved = true
        this._dragging = true
        p.el.style.cursor = 'grabbing'
        try { p.el.setPointerCapture(e.pointerId) } catch (_) { /* synthetic pointer */ }
      }
      p.focus = panFocus(pan.focus, dx, dy, p.el.clientWidth, p.el.clientHeight)
      this._applyFocus(p)
    })
    const end = () => {
      if (!pan) return
      const moved = pan.moved
      pan = null
      p.el.style.cursor = 'grab'
      this._dragging = false
      if (moved) this.onViewChange?.(i, { ...p.focus })
    }
    p.el.addEventListener('pointerup', end)
    p.el.addEventListener('pointercancel', end)
    // Not passive: over a pane the wheel zooms the picture, it does not scroll the page.
    p.el.addEventListener('wheel', (e) => {
      if (e.target.closest?.('[data-split-divider]')) return
      e.preventDefault()
      p.focus = { ...p.focus, zoom: wheelZoom(p.focus.zoom, e.deltaY) }
      this._applyFocus(p)
      clearTimeout(p.wheelSave)
      p.wheelSave = setTimeout(() => { p.wheelSave = null; this.onViewChange?.(i, { ...p.focus }) }, WHEEL_SAVE_MS)
    }, { passive: false })
  }

  /**
   * Editor: the gutter is a handle, the same grip as the dock's top edge (.lp-grip in app.css):
   * same pill, cursor, hover and held state. Drag it, or use the arrow keys, to move the split.
   */
  _makeDivider (root) {
    const d = document.createElement('div')
    d.className = 'lp-grip'
    d.dataset.splitDivider = ''
    d.tabIndex = 0
    d.setAttribute('role', 'separator')
    d.setAttribute('aria-label', 'Split position')
    d.style.cssText = 'position:absolute;z-index:45;pointer-events:auto;'
    const pill = document.createElement('span')
    pill.className = 'lp-grip-pill'
    pill.setAttribute('aria-hidden', 'true')
    d.appendChild(pill)
    const along = (e) => {
      const r = this.host.getBoundingClientRect()
      return this._dir === 'h' ? [e.clientY - r.top, r.height] : [e.clientX - r.left, r.width]
    }
    let start = null
    d.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      start = this._split.at
      this._dragging = true
      d.dataset.dragging = ''
      try { d.setPointerCapture(e.pointerId) } catch (_) { /* synthetic pointer */ }
    })
    d.addEventListener('pointermove', (e) => {
      if (start === null) return
      this._split = { ...this._split, at: atFromPointer(...along(e)) }
      this._layout()
    })
    const end = () => {
      if (start === null) return
      const moved = this._split.at !== start
      start = null
      this._dragging = false
      delete d.dataset.dragging
      if (moved) this.onSplitChange?.(this._split.at)
    }
    d.addEventListener('pointerup', end)
    d.addEventListener('pointercancel', end)
    d.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.05 : 0.01
      const back = this._dir === 'h' ? 'ArrowUp' : 'ArrowLeft'
      const fwd = this._dir === 'h' ? 'ArrowDown' : 'ArrowRight'
      if (e.key !== back && e.key !== fwd) return
      e.preventDefault()
      const at = normalizeSplit({ ...this._split, at: this._split.at + (e.key === fwd ? step : -step) }).at
      if (at === this._split.at) return
      this._split = { ...this._split, at }
      this._layout()
      this.onSplitChange?.(at)
    })
    root.appendChild(d)
    return { el: d }
  }

  /** The split from the server (the slider, an undo): applied in place, never mid-drag. */
  setSplit (split) {
    const s = normalizeSplit(split)
    if (!s || this._dragging || !this._root) return
    this._split = s
    this._layout()
  }

  /** A panel's crop from the server (the sliders, an undo): applied in place, never mid-pan. */
  setFocus (i, focus) {
    const p = this.panels[i]
    if (!p || this._dragging) return
    p.focus = normalizeFocus(focus)
    this._applyFocus(p)
  }

  _layout () {
    if (!this._root) return
    const lay = splitLayout(this._split, this.host.clientWidth, this.host.clientHeight)
    if (!lay) return
    this._root.dataset.dir = lay.dir
    this._dir = lay.dir
    lay.panels.forEach((b, i) => {
      const p = this.panels[i]
      if (!p) return
      Object.assign(p.el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })
      this._drawInk(p, b, lay, i)
    })
    this._placeDivider(lay)
  }

  /** The divider handle over the gutter, a little wider than it so it is easy to grab. */
  _placeDivider (lay) {
    if (!this._divider) return
    const { el } = this._divider
    const [a, b] = lay.panels
    const pad = DIVIDER_PAD_PX
    const w = lay.gutter + 2 * pad
    if (lay.dir === 'h') {
      Object.assign(el.style, { left: '0px', width: `${b.w}px`, top: `${a.h - pad}px`, height: `${w}px` })
    } else {
      Object.assign(el.style, { top: '0px', height: `${a.h}px`, left: `${a.w - pad}px`, width: `${w}px` })
    }
    // A stacked split's gutter is a horizontal bar, like the dock's top edge; side by side, upright.
    el.setAttribute('aria-orientation', lay.dir === 'h' ? 'horizontal' : 'vertical')
    el.setAttribute('aria-valuenow', String(Math.round(this._split.at * 100)))
  }

  /** The ink line on the panel's gutter edge, drawn inside the panel (the outer edges bleed). */
  _drawInk (p, b, lay, i) {
    const w = lay.ink
    const half = w / 2
    const [x0, y0, x1, y1] = lay.dir === 'h'
      ? (i === 0 ? [0, b.h - half, b.w, b.h - half] : [0, half, b.w, half])
      : (i === 0 ? [b.w - half, 0, b.w - half, b.h] : [half, 0, half, b.h])
    p.ink.setAttribute('viewBox', `0 0 ${b.w} ${b.h}`)
    p.ink.innerHTML = ''
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', inkPath(x0, y0, x1, y1, w, 7 + i * 13))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'var(--split-ink,#1d1611)')
    path.setAttribute('stroke-width', String(w))
    path.setAttribute('stroke-linecap', 'round')
    p.ink.appendChild(path)
  }

  /** The panel the editor is working on: outlined, its overlay the one the layer list talks to. */
  select (i) {
    this._selected = Number.isInteger(i) ? i : null
    this.panels.forEach((p, j) => {
      p.el.querySelector(':scope > [data-split-selected]')?.remove()
      if (!this.editable || j !== this._selected) return
      const ring = document.createElement('div')
      ring.dataset.splitSelected = ''
      ring.style.cssText = 'position:absolute;inset:0;border:2px solid var(--color-primary,#f59e0b);pointer-events:none;z-index:41;'
      p.el.appendChild(ring)
    })
  }

  /** The figures overlay of panel i (the editor's layer list and inspector work on it). */
  overlay (i) {
    return this.panels[i]?.overlay ?? null
  }

  /** Speech balloons, each in the panel that holds its speaker. */
  setLines (lines) {
    const all = this.panels.map(p => p.layers)
    this.panels.forEach((p, i) => p.balloons.setLines((lines || []).filter(l => panelForLine(l, all) === i)))
  }

  /** The narration clock: balloons come and go. */
  setTime (t) {
    for (const p of this.panels) p.balloons.update(t)
  }

  /** Narration progress 0..1 (a panel with its own camera runs on its own clock). */
  update (progress) {
    for (const p of this.panels) p.parallax?.update(progress)
  }

  destroy () {
    this._ro?.disconnect()
    this._ro = null
    for (const p of this.panels) {
      try { p.parallax?.destroy() } catch (_) { /* already gone */ }
      try { p.overlay.clear() } catch (_) { /* already gone */ }
      try { p.balloons.destroy() } catch (_) { /* already gone */ }
    }
    // A wheel zoom still waiting to be saved is saved now, not lost with the stage.
    this.panels.forEach((p, i) => {
      if (!p.wheelSave) return
      clearTimeout(p.wheelSave)
      this.onViewChange?.(i, { ...p.focus })
    })
    this.panels = []
    this._divider = null
    this._root?.remove()
    this._root = null
  }
}
