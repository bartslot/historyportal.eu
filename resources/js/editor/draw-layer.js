/**
 * draw-layer.js — paint over the lesson with a pen, a line or an arrow (Bart, 2026-11-04: "to freely paint over a
 * lesson", in the editor AND live in class, "but you should be able to still select the lines what you drew and
 * delete").
 *
 * One drawing surface for both places. A stroke is drawn on a canvas over the stage while the pointer moves; when it
 * is let go it is handed to `onStroke(stroke)` as plain data, in stage percent (x 0..100 of the width, y of the
 * height), so it never depends on the screen it was drawn on:
 *
 *   { tool: 'pen' | 'line' | 'arrow', colour: '#rrggbb', width: px at a 1000 px tall stage, points: [[x, y], ...] }
 *
 * The editor saves each one as its own layer (EditsDrawings::addDrawing makes the picture from the points), so it is
 * selected, moved and deleted like any picture. In class the player keeps them in this surface only: a tap selects
 * one, the bin or Delete removes it, Clear removes all. Nothing in class is saved.
 */

export const TOOLS = ['pen', 'line', 'arrow']
export const COLOURS = ['#f59e0b', '#ef4444', '#ffffff', '#111827']
export const WIDTHS = [4, 8, 16]

/** Drop points closer than `min` (stage %) to the last kept one: a slow hand makes hundreds of them. */
export function thin (points, min = 0.25) {
  const out = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= min) out.push(p)
  }
  const end = points[points.length - 1]
  if (end && out[out.length - 1] !== end) out.push(end)
  return out
}

/** The points a tool keeps: a line and an arrow are their two ends, a pen its thinned trail. */
export function shape (tool, points) {
  if (!points.length) return []
  if (tool === 'line' || tool === 'arrow') return [points[0], points[points.length - 1]]
  return thin(points)
}

/** Long enough to be meant (a click is not a stroke). */
export const isStroke = (s) => s.points.length >= 2 &&
  Math.hypot(s.points[s.points.length - 1][0] - s.points[0][0], s.points[s.points.length - 1][1] - s.points[0][1]) +
  (s.points.length > 2 ? 1 : 0) >= 0.6

/** Draw one stroke on a 2D context sized w x h (stage % -> px). `selected` draws a dashed ring around it. */
export function paintStroke (g, s, w, h, selected = false) {
  const px = (p) => [p[0] / 100 * w, p[1] / 100 * h]
  const lw = Math.max(1, s.width * h / 1000)
  g.save()
  g.strokeStyle = s.colour
  g.fillStyle = s.colour
  g.lineWidth = lw
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  const pts = s.points.map(px)
  g.moveTo(...pts[0])
  if (s.tool === 'pen' && pts.length > 2) {
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]
      g.quadraticCurveTo(pts[i][0], pts[i][1], mid[0], mid[1])
    }
    g.lineTo(...pts[pts.length - 1])
  } else {
    for (const p of pts.slice(1)) g.lineTo(...p)
  }
  g.stroke()
  if (s.tool === 'arrow' && pts.length >= 2) {
    const [a, b] = [pts[0], pts[pts.length - 1]]
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    const head = lw * 3.5
    g.beginPath()
    g.moveTo(b[0] + Math.cos(ang) * lw, b[1] + Math.sin(ang) * lw)
    g.lineTo(b[0] - Math.cos(ang - 0.5) * head, b[1] - Math.sin(ang - 0.5) * head)
    g.lineTo(b[0] - Math.cos(ang + 0.5) * head, b[1] - Math.sin(ang + 0.5) * head)
    g.closePath()
    g.fill()
  }
  if (selected) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    const pad = lw + 6
    g.setLineDash([6, 4])
    g.lineWidth = 1.5
    g.strokeStyle = '#38bdf8'
    g.strokeRect(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad)
  }
  g.restore()
}

/** Distance (stage %, in px-space proportions) from a point to a stroke; for picking one with a tap. */
export function distanceTo (s, p, w, h) {
  const px = (q) => [q[0] / 100 * w, q[1] / 100 * h]
  const P = px(p)
  let best = Infinity
  const pts = s.points.map(px)
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const t = dx || dy ? Math.max(0, Math.min(1, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0
    best = Math.min(best, Math.hypot(P[0] - (a[0] + t * dx), P[1] - (a[1] + t * dy)))
  }
  if (pts.length === 1) best = Math.hypot(P[0] - pts[0][0], P[1] - pts[0][1])
  return best
}

/**
 * Lay a drawing surface over `host` (the stage). Options:
 *   onStroke(stroke)  a finished stroke (the editor saves it)
 *   keep              true: strokes stay on this surface, selectable and deletable (the player, in class)
 * Returns { setTool, setColour, setWidth, clear, removeSelected, strokes, destroy }.
 */
export function mountDraw (host, { onStroke = () => {}, keep = false, onSelect = () => {} } = {}) {
  const canvas = document.createElement('canvas')
  canvas.dataset.drawLayer = ''
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; z-index:60; touch-action:none; cursor:crosshair; pointer-events:auto;'
  host.appendChild(canvas)
  const g = canvas.getContext('2d')
  let tool = 'pen', colour = COLOURS[0], width = WIDTHS[1]
  let strokes = []
  let selected = -1
  let live = null

  const size = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(r.width * dpr))
    canvas.height = Math.max(1, Math.round(r.height * dpr))
    paint()
  }
  const paint = () => {
    g.clearRect(0, 0, canvas.width, canvas.height)
    strokes.forEach((s, i) => paintStroke(g, s, canvas.width, canvas.height, i === selected))
    if (live && live.points.length > 1) paintStroke(g, { ...live, points: shape(live.tool, live.points) }, canvas.width, canvas.height)
  }
  const at = (e) => {
    const r = canvas.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]
  }
  const select = (i) => { selected = i; paint(); onSelect(i >= 0 ? strokes[i] : null) }

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    try { canvas.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
    const p = at(e)
    // in class a tap on a stroke selects it instead of starting a new one
    if (keep) {
      const r = canvas.getBoundingClientRect()
      const hit = strokes.map((s, i) => [distanceTo(s, p, r.width, r.height), i]).filter(([d, i]) => d <= Math.max(10, strokes[i].width * r.height / 1000))
        .sort((a, b) => a[0] - b[0])[0]
      if (hit) { select(hit[1]); return }
      if (selected >= 0) select(-1)
    }
    live = { tool, colour, width, points: [p] }
  }
  const move = (e) => {
    if (!live) return
    live.points.push(at(e))
    paint()
  }
  const up = () => {
    if (!live) return
    const s = { ...live, points: shape(live.tool, live.points) }
    live = null
    if (isStroke(s)) {
      if (keep) strokes = [...strokes, s]
      onStroke(s)
    }
    paint()
  }
  const key = (e) => {
    if (keep && selected >= 0 && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); api.removeSelected() }
  }

  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  window.addEventListener('keydown', key)
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null
  ro?.observe(canvas)
  size()

  const api = {
    canvas,
    setTool (t) { if (TOOLS.includes(t)) tool = t },
    setColour (c) { if (/^#[0-9a-f]{6}$/i.test(c)) colour = c },
    setWidth (w) { if (WIDTHS.includes(Number(w))) width = Number(w) },
    get strokes () { return strokes },
    get selected () { return selected },
    removeSelected () { if (selected < 0) return; strokes = strokes.filter((_, i) => i !== selected); select(-1) },
    clear () { strokes = []; select(-1) },
    destroy () {
      ro?.disconnect()
      window.removeEventListener('keydown', key)
      canvas.remove()
    },
  }
  return api
}

/**
 * The editor's Tekenen button and strip: x-data="drawTool()". While on, a drawing surface lies over the stage and
 * every finished stroke is saved as its own layer ($wire.addDrawing); Klaar (or Esc) puts the stage back to normal,
 * where the drawn lines are selected, moved and deleted like any picture.
 */
export function drawTool () {
  return {
    on: false, tool: 'pen', colour: COLOURS[0], width: WIDTHS[1], busy: 0,
    tools: TOOLS, colours: COLOURS, widths: WIDTHS,
    surface: null,
    host () { return document.querySelector('.wizard-artwork-host') },
    toggle () { this.on ? this.stop() : this.start() },
    init () {
      // a save re-renders the stage and replaces the element the surface lies on: put it back, same pen
      this._keep = () => this.remount()
      window.addEventListener('objscene-changed', this._keep)
      this._watch = setInterval(this._keep, 400)   // cheap: a check, nothing drawn
    },
    destroy () { clearInterval(this._watch); window.removeEventListener('objscene-changed', this._keep) },
    start () {
      if (!this.mount()) return
      this.on = true
    },
    /** Lay the surface on the stage now on screen. False when there is no stage. */
    mount () {
      const host = this.host()
      if (!host) return false
      this.surface?.destroy()
      this.surface = mountDraw(host, {
        onStroke: async (stroke) => {
          const r = host.getBoundingClientRect()
          this.busy++
          try { await this.$wire.addDrawing(stroke, r.height ? r.width / r.height : 16 / 9) } finally { this.busy--; this.remount() }
        },
      })
      this.apply()
      return true
    },
    remount () { if (this.on && !this.surface?.canvas.isConnected) this.mount() },
    stop () { this.surface?.destroy(); this.surface = null; this.on = false },
    apply () { this.surface?.setTool(this.tool); this.surface?.setColour(this.colour); this.surface?.setWidth(this.width) },
    pick (key, value) { this[key] = value; this.apply() },
  }
}
