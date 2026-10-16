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
import { splitLayout, focusPosition, normalizeSplit } from './split-layout.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
/** One wobble point per this many px of edge; the line drifts at most this share of its width. */
const WOBBLE_STEP_PX = 28
const WOBBLE_SHARE = 0.22

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
   * @param {{editable?: boolean, onSelect?: (i:number)=>void, onLayerChange?: (i:number, assetId:number, t:object)=>void}} opts
   */
  constructor (host, { editable = false, onSelect = null, onLayerChange = null } = {}) {
    if (!host) throw new TypeError('SplitStage: host element is required')
    this.host = host
    this.editable = editable
    this.onSelect = onSelect
    this.onLayerChange = onLayerChange
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
    el.style.cssText = `position:absolute;overflow:hidden;background:${matte || 'var(--split-matte,#0f172a)'};`
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
    overlay.setLayers(figures)
    overlay.playEntrances()

    // Balloons find their speaker inside THIS panel only.
    const balloons = new BalloonLayer(talk, (assetId) => {
      const img = el.querySelector(`[data-layer-id="art_${assetId}"] img`)
      return img ? img.getBoundingClientRect() : null
    })

    if (this.editable) {
      // A click anywhere in a panel (a figure in it too) makes it the one the inspector edits.
      el.addEventListener('pointerdown', () => { if (this._selected !== i) this.onSelect?.(i) }, true)
    }

    return { el, ink, parallax, overlay, balloons, layers }
  }

  _layout () {
    if (!this._root) return
    const lay = splitLayout(this._split, this.host.clientWidth, this.host.clientHeight)
    if (!lay) return
    this._root.dataset.dir = lay.dir
    lay.panels.forEach((b, i) => {
      const p = this.panels[i]
      if (!p) return
      Object.assign(p.el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })
      this._drawInk(p, b, lay, i)
    })
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
    this.panels = []
    this._root?.remove()
    this._root = null
  }
}
