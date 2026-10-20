/**
 * SplitStage: a split scene's comic panels, two to four of them in any layout (split-layout.js),
 * drawn the same way in the editor preview (wizard-bridge.js) and the student player
 * (lesson-player.js).
 *
 * Each panel is its own little stage, clipped to its box: the backdrop planes and the panel's own
 * camera (ParallaxScene), its figures (ArtworkOverlay) and its speech balloons (BalloonLayer).
 * Between the panels a white gutter; on each panel's gutter edge a thin, slightly uneven ink line.
 * The outer edges bleed, like the reference page. Flat: no shadow.
 */
import { ParallaxScene } from './ParallaxScene.js'
import { ArtworkOverlay } from './ArtworkOverlay.js'
import { BalloonLayer, withBalloonIds } from './BalloonLayer.js'
import { backdropLayers, isClipartLayer } from './layer-filters.js'
import { cropImage, fade, backgroundSource } from './background-crop.js'
import { splitLayout, focusPosition, normalizeSplit, normalizeFocus, paneCount, moveDivider, stepDivider, panFocus, wheelZoom, panelForLine } from './split-layout.js'

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
const NOT_THE_PICTURE = '[data-layer-id],[data-layer-chrome],[data-split-divider],[data-balloon-id]'

export { panelForLine }

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
   *          onSplitChange?: (split:{layout:string, at:number[]})=>void, onViewChange?: (i:number, focus:{x:number,y:number,zoom:number})=>void,
   *          balloons?: object|null}} opts  balloons: an editable BalloonLayer's options (balloon-edit.js)
   */
  constructor (host, { editable = false, onSelect = null, onLayerChange = null, onSplitChange = null, onViewChange = null, balloons = null } = {}) {
    if (!host) throw new TypeError('SplitStage: host element is required')
    this.host = host
    this.editable = editable
    this.onSelect = onSelect
    this.onLayerChange = onLayerChange
    this.onSplitChange = onSplitChange
    this.onViewChange = onViewChange
    this.balloonOptions = balloons
    this._dragging = false   // a divider drag or a pan: the server's echo must not snap it back
    this.panels = []
    this._root = null
    this._split = null
    this._selected = null
  }

  /**
   * @param {{split: {layout:string, at:number[]}, shots: object[], lines?: object[], matte?: string|null,
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

    this.panels = Array.from({ length: paneCount(this._split) }, (_, i) => this._panel(root, shots[i] || {}, i, matte, loop))
    this._dividers = []
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
    // The panel's balloons live ABOVE every panel, its frame and the grips, in a box the size of
    // the panel (placed in _layout): a balloon or its tail may cross the panel border into the
    // next panel, the way comic lettering breaks the frame (Bart, 2026-10-16).
    const talk = document.createElement('div')
    talk.dataset.splitTalk = String(i)
    talk.style.cssText = 'position:absolute;pointer-events:none;z-index:50;overflow:visible;'
    root.appendChild(talk)
    const ink = document.createElementNS(SVG_NS, 'svg')
    ink.setAttribute('aria-hidden', 'true')
    ink.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:40;'
    el.appendChild(ink)
    // The ring that marks the panel the editor is working on: a polygon, so a diagonal panel's
    // ring follows its slanted edge.
    const ring = document.createElementNS(SVG_NS, 'svg')
    ring.setAttribute('aria-hidden', 'true')
    ring.dataset.splitRing = ''
    ring.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:41;display:none;'
    el.appendChild(ring)
    root.appendChild(el)

    const layers = Array.isArray(shot.layers) ? shot.layers : []
    const pos = focusPosition(shot.focus)
    // A shot whose layer list was collapsed (its last figure deleted) still has its picture as
    // image_url: draw that as the cover, or the panel falls back to the bare matte.
    const backdrop = backdropLayers(layers)
    if (!backdrop.length && shot.image_url) backdrop.push({ url: shot.image_url, kind: 'cover', depth: 0.4 })
    const planes = backdrop.map(l => ((l.kind ?? 'cover') === 'cover' ? { ...l, objectPosition: pos } : l))
    const figures = layers.filter(l => (l?.url || l?.embed) && isClipartLayer(l))

    const overlay = new ArtworkOverlay(art, this.editable
      ? { onChange: (assetId, t) => this.onLayerChange?.(i, assetId, t) }
      : { readonly: true })
    overlay.setStackLevels(30, 32)
    overlay.setBackdrop(planes.find(l => (l.kind ?? 'cover') === 'cover')?.url)

    let parallax = null
    const p = { el, ink, ring, plate, talk, overlay, balloons: null, layers, focus: normalizeFocus(shot.focus), parallax: null }
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
    }, { ...(this.balloonOptions || {}), roam: true })

    if (this.editable) {
      // A click anywhere in a panel (a figure in it too) makes it the one the inspector edits.
      el.style.pointerEvents = 'auto'
      el.addEventListener('pointerdown', () => { if (this._selected !== i) this.onSelect?.(i) }, true)
      // A balloon is outside its panel's element now: clicking it still makes its panel the edited one.
      talk.addEventListener('pointerdown', () => { if (this._selected !== i) this.onSelect?.(i) }, true)
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
    for (const img of p.plate.querySelectorAll('.px-layer-bg img')) cropImage(img, { ...p.focus, opacity: 1 })
    fade(p.plate, p.opacity ?? 1)
  }

  /**
   * Each panel's picture as a background the timeline animates (scene/background-crop.js): its
   * saved crop is the base, a sampled frame pans, zooms and fades it. A drag or the sliders still
   * set the base through setFocus.
   */
  backgrounds () {
    return backgroundSource(this.panels.map((p, i) => ({
      id: String(i),
      get: () => ({ ...p.focus, opacity: p.opacity ?? 1 }),
      set: ({ opacity, ...focus }) => { p.focus = focus; p.opacity = opacity; this._applyFocus(p) },
      el: () => p.plate,
    })))
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
   * Editor: every gutter is a handle, the same grip as the dock's top edge (.lp-grip in app.css):
   * same pill, cursor, hover and held state. Drag it, or use the arrow keys, to move that divider.
   * A diagonal has one handle in the middle of its line, and moves as a whole.
   */
  _makeDivider (root, k) {
    const d = document.createElement('div')
    d.className = 'lp-grip'
    d.dataset.splitDivider = String(k)
    d.tabIndex = 0
    d.setAttribute('role', 'separator')
    d.setAttribute('aria-label', 'Split position')
    d.style.cssText = 'position:absolute;z-index:45;pointer-events:auto;'
    const pill = document.createElement('span')
    pill.className = 'lp-grip-pill'
    pill.setAttribute('aria-hidden', 'true')
    d.appendChild(pill)
    let drag = null
    d.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      drag = { split: this._split, x: e.clientX }
      this._dragging = true
      d.dataset.dragging = ''
      try { d.setPointerCapture(e.pointerId) } catch (_) { /* synthetic pointer */ }
    })
    d.addEventListener('pointermove', (e) => {
      if (!drag) return
      const r = this.host.getBoundingClientRect()
      this._split = moveDivider(drag.split, k, e.clientX - r.left, e.clientY - r.top, r.width, r.height, { dx: e.clientX - drag.x })
      this._layout()
    })
    const end = () => {
      if (!drag) return
      const moved = JSON.stringify(this._split.at) !== JSON.stringify(drag.split.at)
      drag = null
      this._dragging = false
      delete d.dataset.dragging
      if (moved) this.onSplitChange?.({ ...this._split })
    }
    d.addEventListener('pointerup', end)
    d.addEventListener('pointercancel', end)
    d.addEventListener('keydown', (e) => {
      const orient = d.dataset.orient
      const back = orient === 'h' ? 'ArrowUp' : 'ArrowLeft'
      const fwd = orient === 'h' ? 'ArrowDown' : 'ArrowRight'
      if (e.key !== back && e.key !== fwd) return
      e.preventDefault()
      const step = (e.shiftKey ? 0.05 : 0.01) * (e.key === fwd ? 1 : -1)
      const next = stepDivider(this._split, k, step)
      if (JSON.stringify(next.at) === JSON.stringify(this._split.at)) return
      this._split = next
      this._layout()
      this.onSplitChange?.({ ...this._split })
    })
    root.appendChild(d)
    return d
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
    this._root.dataset.layout = lay.layout
    lay.panels.forEach((b, i) => {
      const p = this.panels[i]
      if (!p) return
      Object.assign(p.el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })
      Object.assign(p.talk.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })
      p.el.style.clipPath = b.clip ? `polygon(${b.clip.map(([x, y]) => `${x}px ${y}px`).join(', ')})` : ''
      p.shape = b
      this._drawInk(p, b, lay, i)
      this._drawRing(p)
    })
    this._placeDividers(lay)
  }

  /** One grip per divider, over its gutter and a little wider than it so it is easy to grab. */
  _placeDividers (lay) {
    if (!this.editable || !this._root) return
    lay.dividers.forEach((dv) => {
      const d = this._dividers[dv.k] ??= this._makeDivider(this._root, dv.k)
      const pad = DIVIDER_PAD_PX
      d.dataset.orient = dv.orient
      d.style.transform = ''
      if (dv.orient === 'd') {
        // The handle sits on the middle of the line, turned with it; it drags sideways.
        const len = Math.hypot(dv.x1 - dv.x0, dv.y1 - dv.y0)
        const angle = Math.atan2(dv.y1 - dv.y0, dv.x1 - dv.x0) * 180 / Math.PI
        const w = lay.gutter + 2 * pad
        Object.assign(d.style, { left: `${(dv.x0 + dv.x1) / 2 - len / 2}px`, top: `${(dv.y0 + dv.y1) / 2 - w / 2}px`, width: `${len}px`, height: `${w}px`, transform: `rotate(${angle}deg)` })
        // Turned with the line, so its pill lies along it; it still drags sideways.
        d.setAttribute('aria-orientation', 'horizontal')
        d.style.cursor = 'ew-resize'
      } else {
        const grow = dv.orient === 'h' ? { top: `${dv.y - pad}px`, height: `${dv.h + 2 * pad}px`, left: `${dv.x}px`, width: `${dv.w}px` }
          : { left: `${dv.x - pad}px`, width: `${dv.w + 2 * pad}px`, top: `${dv.y}px`, height: `${dv.h}px` }
        Object.assign(d.style, grow, { cursor: '' })
        // A gutter between rows is a horizontal bar, like the dock's top edge; between columns, upright.
        d.setAttribute('aria-orientation', dv.orient === 'h' ? 'horizontal' : 'vertical')
      }
      d.setAttribute('aria-valuenow', String(Math.round(this._split.at[dv.k] * 100)))
    })
  }

  /**
   * The ink lines on a panel's inner edges, drawn inside the panel (the outer edges bleed). A
   * rectangle has ink on every edge that does not lie on the stage's own edge; a diagonal panel on
   * its slanted edge.
   */
  _drawInk (p, b, lay, i) {
    const w = lay.ink
    const half = w / 2
    const W = this.host.clientWidth
    const H = this.host.clientHeight
    const lines = []
    if (b.clip) {
      // Panel 0's slanted edge is its 2nd → 3rd point, panel 1's its 4th → 1st (split-layout.js).
      const [[x0, y0], [x1, y1]] = i === 0 ? [b.clip[1], b.clip[2]] : [b.clip[3], b.clip[0]]
      const off = i === 0 ? -half : half
      lines.push([x0 + off, y0, x1 + off, y1])
      p.ink.setAttribute('viewBox', `0 0 ${b.w} ${b.h}`)
    } else {
      const e = 0.5
      if (b.x > e) lines.push([half, 0, half, b.h])
      if (b.x + b.w < W - e) lines.push([b.w - half, 0, b.w - half, b.h])
      if (b.y > e) lines.push([0, half, b.w, half])
      if (b.y + b.h < H - e) lines.push([0, b.h - half, b.w, b.h - half])
      p.ink.setAttribute('viewBox', `0 0 ${b.w} ${b.h}`)
    }
    p.ink.innerHTML = ''
    lines.forEach(([x0, y0, x1, y1], j) => {
      const path = document.createElementNS(SVG_NS, 'path')
      path.setAttribute('d', inkPath(x0, y0, x1, y1, w, 7 + i * 13 + j * 5))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'var(--split-ink,#1d1611)')
      path.setAttribute('stroke-width', String(w))
      path.setAttribute('stroke-linecap', 'round')
      p.ink.appendChild(path)
    })
  }

  /** The selection ring in the panel's own shape. */
  _drawRing (p) {
    const b = p.shape
    if (!b) return
    const pts = b.clip ?? [[0, 0], [b.w, 0], [b.w, b.h], [0, b.h]]
    p.ring.setAttribute('viewBox', `0 0 ${b.w} ${b.h}`)
    p.ring.innerHTML = `<polygon points="${pts.map(([x, y]) => `${x},${y}`).join(' ')}" fill="none" stroke="var(--color-primary,#f59e0b)" stroke-width="4" vector-effect="non-scaling-stroke"/>`
  }

  /** The panel the editor is working on: outlined, its overlay the one the layer list talks to. */
  select (i) {
    this._selected = Number.isInteger(i) ? i : null
    this.panels.forEach((p, j) => {
      p.ring.style.display = this.editable && j === this._selected ? '' : 'none'
    })
  }

  /** The figures overlay of panel i (the editor's layer list and inspector work on it). */
  overlay (i) {
    return this.panels[i]?.overlay ?? null
  }

  /** Speech balloons, each in the panel that holds its speaker. */
  setLines (lines) {
    const all = this.panels.map(p => p.layers)
    const named = withBalloonIds(lines)
    this.panels.forEach((p, i) => p.balloons.setLines(named.filter(l => panelForLine(l, all) === i)))
  }

  /** A balloon's keyframed values, in whichever panel holds it. */
  applyBalloonValues (id, values) {
    for (const p of this.panels) p.balloons.applyValues(id, values)
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
    this._dividers = []
    this._root?.remove()
    this._root = null
  }
}
