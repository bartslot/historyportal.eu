/**
 * BalloonLayer: the speech balloons of a scene told in lines (SceneDialogue on the server).
 *
 * lines: [{ speaker, text, start, end, figure: { asset_id, mouth: [x, y], facing: -1|0|1 } | null }]
 *   start/end — seconds on the scene's narration track; a balloon shows while start <= t < end.
 *               No end (null): up to the scene's end, as a balloon added in the editor is.
 *   figure    — the layer that speaks, and where its mouth is on its own picture (0..1). The mouth
 *               is put on the figure's RENDERED box every frame, so the balloon follows the layer
 *               through scale, depth, bob, its entrance and (later) a walking sprite.
 *               facing: the side the face looks to (1 = right), where the balloon goes, so the
 *               tail comes in at an angle from in front of the face; 0 = unknown, toward the middle.
 *               null, or a figure not on stage = off-frame (a letter, a voice): no tail.
 *   kind      — 'speech' (default) or 'thought': a cloud with a trail of circles, no tail.
 *   at        — [x, y] 0..1 of the host: where the teacher put the balloon's middle. Without it
 *               the balloon sits above its speaker's mouth (or top middle, off-frame).
 *   tail      — { tip: [x, y] 0..1 of the host, bend }: where the tail points, dragged out in the
 *               editor. Without it a speaker's tail points at the mouth (balloon-shape.js).
 *   panel     — 0|1 on a split scene: the panel a balloon with no speaker sits in.
 * Narrator lines are captions, not balloons, and are skipped here. Balloon text is never spoken.
 *
 * The host follows the playback clock: update(t) on every timeupdate, and after a seek. It only
 * adds and removes balloons whose state changed, so calling it often costs nothing.
 */
import { EASE } from '../easing.js'
import { DEFAULT_BEND, clampToView, cloudPath, outlinePoint, outlineT, tailRoot, tailShape, thoughtTrail, tipShortOf } from './balloon-shape.js'
import { playEntrance } from './animations.js'

/** Reference width the house rules are measured at. */
const REF_WIDTH = 1920
/** The tail's tip stops this far from the mouth, at REF_WIDTH (Bart, 2026-09-28: 50-60). */
export const MOUTH_GAP_REF = 55
/** Below this the gap would vanish on a phone; never closer than this many real pixels. */
const MOUTH_GAP_MIN = 14

/** Per REF_WIDTH: bubble text size, widest bubble, how far above the mouth the bubble sits. */
const FONT_REF = 30
const MAX_WIDTH_REF = 560
const LIFT_REF = 160
/** The bubble's near edge sits this far past the mouth, on the side the face looks to. */
const NEAR_REF = 70
/** Narrowest bubble worth keeping on the face's side; below this it goes to the other side. */
const MIN_WIDTH_REF = 300
const EDGE_REF = 24
const TAIL_BASE_REF = 34

const ENTER_MS = 260
const EXIT_MS = 180

/** The gap in real pixels for a host this wide. */
export const mouthGap = (hostWidth) => Math.max(MOUTH_GAP_MIN, (MOUTH_GAP_REF * hostWidth) / REF_WIDTH)

/**
 * Which side of the mouth the balloon goes, and how wide it may be there. The face's side first;
 * the other side only when not even a narrow bubble fits on it.
 *
 * @returns {{side: 1|-1, room: number}}
 */
export function balloonSide (mouth, facing, host, view) {
  const k = host.w / REF_WIDTH
  const reach = (NEAR_REF + EDGE_REF) * k
  const room = (side) => (side > 0 ? view.x1 - mouth[0] : mouth[0] - view.x0) - reach
  const want = facing || (mouth[0] < (view.x0 + view.x1) / 2 ? 1 : -1)
  const side = room(want) >= MIN_WIDTH_REF * k || room(want) >= room(-want) ? want : -want

  return { side, room: room(side) }
}

/**
 * Where a bubble of size `box` goes for a mouth at `mouth` (px in the host), and its tail.
 * The bubble sits above the mouth and wholly on `side` of it (the side the face looks to), so the
 * tail leaves the bubble's near corner and comes in at an angle from in front of the face: never
 * straight down, never across the head. Kept inside `view`, the part of the host on screen (a
 * portrait screen crops the plate). The tail stops `mouthGap` short of the mouth.
 *
 * @returns {{left:number, top:number, tail: null | {base:[number,number], tip:[number,number], half:number}}}
 */
export function layoutBalloon (mouth, box, host, view = { x0: 0, y0: 0, x1: host.w, y1: host.h }, others = [], side = null) {
  const k = host.w / REF_WIDTH
  const edge = EDGE_REF * k
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

  if (!mouth) {
    // Off-frame: top middle of what is on screen.
    const at = clearOf({ left: (view.x0 + view.x1 - box.w) / 2, top: view.y0 + edge * 2 }, box, others, view, edge)
    return { ...at, tail: null }
  }

  const [mx, my] = mouth
  const toward = side ?? balloonSide(mouth, 0, host, view).side
  const { left, top } = clearOf({
    left: clamp(toward > 0 ? mx + NEAR_REF * k : mx - NEAR_REF * k - box.w, view.x0 + edge, view.x1 - box.w - edge),
    top: clamp(my - LIFT_REF * k - box.h, view.y0 + edge, view.y1 - box.h - edge),
  }, box, others, view, edge, mx)

  // Tail base: the bubble's bottom edge, at the corner nearest the face.
  const half = (TAIL_BASE_REF * k) / 2
  const corner = Math.min(box.h / 2, 28 * k) + half
  const bx = toward > 0 ? left + corner : left + box.w - corner
  const by = top + box.h - 1

  // The tip: along base → mouth, stopped `gap` short of the mouth.
  const gap = mouthGap(host.w)
  const dx = mx - bx
  const dy = my - by
  const dist = Math.hypot(dx, dy)
  const reach = Math.max(0, dist - gap)
  const tip = dist > 0 ? [bx + (dx / dist) * reach, by + (dy / dist) * reach] : [bx, by]

  return { left, top, tail: { base: [bx, by], tip, half } }
}

/**
 * Move a bubble off the bubbles already on screen (`others`: {left, top, w, h}), to the first spot
 * that fits inside `view` without touching any of them. A bubble with a speaker (`mouthX`) tries
 * below first, then the side toward its speaker: pushed across the frame it would sit over someone
 * else and read as theirs. If nothing fits it stays; overlapping beats leaving the frame.
 */
export function clearOf (at, box, others, view, margin, mouthX = null) {
  const hits = (p) => others.some(o => p.left < o.left + o.w + margin && o.left < p.left + box.w + margin
    && p.top < o.top + o.h + margin && o.top < p.top + box.h + margin)
  const inside = (p) => p.left >= view.x0 && p.left + box.w <= view.x1 && p.top >= view.y0 && p.top + box.h <= view.y1
  if (!hits(at)) return at
  for (const o of others) {
    const right = { left: o.left + o.w + margin, top: at.top }
    const left = { left: o.left - box.w - margin, top: at.top }
    const below = { left: at.left, top: o.top + o.h + margin }
    const tries = mouthX === null
      ? [right, left, below]
      : [below, mouthX < o.left + o.w / 2 ? left : right]
    const ok = tries.find(p => inside(p) && !hits(p))
    if (ok) return ok
  }

  return at
}

/** The drawn box of a figure layer (ArtworkOverlay marks each layer node with its asset id). */
const defaultFigureBox = (assetId) => {
  const img = document.querySelector(`[data-layer-id="art_${assetId}"] img`)

  return img ? img.getBoundingClientRect() : null
}

/** A stored point [x, y] as fractions of the host (0..1), or null when it is not one. */
export const fractionPoint = (p) => (Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) ? p : null)

/**
 * Every line with the id the editor knows it by: `bal_<index in config.lines>`. Assigned before a
 * split scene sorts its lines into panels, so each id still names its place in the scene's list.
 */
export const withBalloonIds = (lines) => (Array.isArray(lines) ? lines : [])
  .map((l, i) => (l && typeof l === 'object' ? { ...l, id: l.id ?? `bal_${i}` } : l))

/** The corner radius of a bubble (1.4em in app.css) for a given font size. */
const CORNER_EM = 1.4
/**
 * The ink line of EVERY balloon, px: one pencil, whatever the balloon's size. A bigger balloon
 * gets bigger words, never a fatter line (Bart, 2026-10-16: "lines should be drawn by the same
 * pencil so lines don't increase width or stroke size").
 */
const INK_PX = 2
/** A balloon's size, as a factor of the house size: the smallest and largest the editor keeps. */
export const MIN_SCALE = 0.3
export const MAX_SCALE = 4
/** How a balloon arrives when its line names none: the pop it always had. */
export const DEFAULT_BALLOON_ENTRANCE = 'pop'

const pct = (v) => Math.round(v * 10000) / 100

/**
 * One animatable property of a balloon (the timeline's `bal` rows), from its line, else from where
 * it is drawn now (`drawn`: fractions of the host, see _place). x, y, tip_x, tip_y are % of the
 * host; root is the outline position 0..1; scale and opacity are factors.
 */
export function balloonValue (line, property, drawn = null) {
  const at = fractionPoint(line?.at) ?? drawn?.center ?? null
  const tip = fractionPoint(line?.tail?.tip) ?? drawn?.tip ?? null
  switch (property) {
    case 'x': return at ? pct(at[0]) : null
    case 'y': return at ? pct(at[1]) : null
    case 'scale': return Number.isFinite(line?.scale) ? line.scale : 1
    case 'opacity': return Number.isFinite(line?.opacity) ? line.opacity : 1
    case 'tip_x': return tip ? pct(tip[0]) : null
    case 'tip_y': return tip ? pct(tip[1]) : null
    case 'root': return Number.isFinite(line?.tail?.root) ? line.tail.root : (drawn?.root ?? null)
    case 'bend': return Number.isFinite(line?.tail?.bend) ? line.tail.bend : DEFAULT_BEND
    default: return null
  }
}

/**
 * The save for animated values (balloonValue units): what the server stores on the line. One axis
 * of a pair takes the other from `read` (the balloon as it is now).
 */
export function balloonPatch (values, read = () => null) {
  const v = (k) => (Number.isFinite(values[k]) ? values[k] : read(k))
  const both = (a, b) => (Number.isFinite(v(a)) && Number.isFinite(v(b)) ? [v(a) / 100, v(b) / 100] : null)
  const patch = {}
  if ('x' in values || 'y' in values) { const at = both('x', 'y'); if (at) patch.at = at }
  if (Number.isFinite(values.scale)) patch.scale = values.scale
  if (Number.isFinite(values.opacity)) patch.opacity = values.opacity
  const tail = {}
  if ('tip_x' in values || 'tip_y' in values) { const tip = both('tip_x', 'tip_y'); if (tip) tail.tip = tip }
  if (Number.isFinite(values.root)) tail.root = values.root
  if (Number.isFinite(values.bend)) tail.bend = values.bend
  if (Object.keys(tail).length) patch.tail = tail

  return patch
}

/**
 * The line with animated values put on it (a keyframe frame, or a field dragged in the inspector).
 * A value for one axis keeps the other where it is now. Pure: a new line, the old one untouched.
 */
export function withBalloonValues (line, values, drawn = null) {
  const next = { ...line }
  const has = (k) => Number.isFinite(values?.[k])
  if (has('x') || has('y')) {
    const at = fractionPoint(line.at) ?? drawn?.center ?? [0.5, 0.5]
    next.at = [has('x') ? values.x / 100 : at[0], has('y') ? values.y / 100 : at[1]]
  }
  if (has('scale')) next.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, values.scale))
  if (has('opacity')) next.opacity = Math.min(1, Math.max(0, values.opacity))
  if (['tip_x', 'tip_y', 'root', 'bend'].some(has)) {
    const tail = { ...(line.tail ?? {}) }
    if (has('tip_x') || has('tip_y')) {
      const tip = fractionPoint(tail.tip) ?? drawn?.tip ?? [0.5, 0.9]
      tail.tip = [has('tip_x') ? values.tip_x / 100 : tip[0], has('tip_y') ? values.tip_y / 100 : tip[1]]
    }
    if (has('root')) tail.root = values.root
    if (has('bend')) tail.bend = values.bend
    next.tail = tail
  }

  return next
}

export class BalloonLayer {
  /**
   * @param {(assetId: number) => DOMRect | null} [figureBox] where a figure layer is drawn now
   * @param {{editable?: boolean, onChange?: (id: string, patch: object) => void, onSelect?: (id: string|null) => void}} [opts]
   *        editable: the editor's stage (balloon-edit.js): every balloon shows, whatever the clock says,
   *        and can be selected, dragged, typed in and given a tail.
   */
  constructor (host, figureBox = defaultFigureBox, opts = {}) {
    this.host = host
    this.figureBox = figureBox
    this.editable = !!opts.editable
    this.opts = opts
    this._raf = 0
    this.lines = []
    this.shown = new Map() // line index → element
    this._selectedId = null
    this._t = 0
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._relayout())
      this._ro.observe(host)
    }
  }

  /** A new scene: drop every balloon at once (no exit animation across a scene cut). */
  setLines (lines) {
    for (const el of this.shown.values()) el.remove()
    this.shown.clear()
    this.lines = withBalloonIds(lines).filter(l => l && l.speaker !== 'narrator' && l.text)
    this.update(this._t)
    this.opts.onLines?.(this)
  }

  update (t) {
    this._t = Number(t) || 0
    this.lines.forEach((line, i) => {
      // No end = up to the scene's end. The editor shows every balloon all the time.
      const on = this.editable || (this._t >= (Number(line.start) || 0) && this._t < (line.end ?? Infinity))
      if (on && !this.shown.has(i)) this._show(i, line)
      else if (!on && this.shown.has(i)) this._hide(i)
    })
  }

  destroy () {
    this._ro?.disconnect()
    this.setLines([])
  }

  /** Index of a line by its editor id, -1 when this layer does not hold it. */
  indexOf (id) {
    return this.lines.findIndex(l => l.id === id)
  }

  /** Replace one line's fields (the editor while dragging or typing) and redraw it in place. */
  patchLine (id, patch) {
    const i = this.indexOf(id)
    if (i < 0) return
    this.lines = this.lines.map((l, j) => (j === i ? { ...l, ...patch } : l))
    const el = this.shown.get(i)
    if (el) this._place(el, this.lines[i])
  }

  /** Keyframe values (balloonValue's units) onto one balloon, drawn now. */
  applyValues (id, values) {
    const i = this.indexOf(id)
    if (i < 0) return
    this.patchLine(id, withBalloonValues(this.lines[i], values, this.shown.get(i)?._drawn))
  }

  /** One animatable property of a balloon as it is now, or undefined when this layer lacks it. */
  readValue (id, property) {
    const i = this.indexOf(id)
    if (i < 0) return undefined

    return balloonValue(this.lines[i], property, this.shown.get(i)?._drawn)
  }

  /** The editor's selection: ring the balloon (and show its tail handle); null clears it. */
  markSelected (id) {
    this._selectedId = id ?? null
    for (const [i, el] of this.shown) {
      el.toggleAttribute('data-selected', this.lines[i]?.id === this._selectedId)
      this._place(el, this.lines[i])
    }
  }

  _show (i, line) {
    const el = document.createElement('div')
    el.className = 'lp-balloon'
    el.dataset.speaker = line.speaker
    el.dataset.kind = line.kind === 'thought' ? 'thought' : 'speech'
    el.dataset.balloonId = line.id
    // The cloud of a thought sits under the words. The tail is painted OVER the bubble: under it,
    // the bubble's shadow greyed the tail. Its fill also covers the bubble's outline where they
    // join; only its two sides are inked.
    el.innerHTML = '<svg class="lp-balloon__cloud" aria-hidden="true"><path fill="#fffdf7" stroke="#1b1712" stroke-width="2" stroke-linejoin="round"/></svg>'
      + '<div class="lp-balloon__bubble"></div>'
      + '<svg class="lp-balloon__tail" aria-hidden="true"><path class="fill" fill="#fffdf7"/>'
      + '<path class="ink" fill="none" stroke="#1b1712" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<g class="trail" fill="#fffdf7" stroke="#1b1712" stroke-width="2"></g></svg>'
    // textContent, never innerHTML: the words are lesson copy.
    el.querySelector('.lp-balloon__bubble').textContent = line.text
    if (this._selectedId === line.id) el.setAttribute('data-selected', '')
    this.host.appendChild(el)
    this.shown.set(i, el)
    this._follow()
    if (this.editable) this.opts.onShow?.(this, el, line.id)
    const origin = this._place(el, line)
    if (this.editable) return

    // The layers' own entrances (animations.js), so a balloon arrives the way a figure can.
    el.style.transformOrigin = `${origin[0]}px ${origin[1]}px`
    const anim = line.anim ?? DEFAULT_BALLOON_ENTRANCE
    playEntrance(el, { anim, ease: anim === 'pop' ? 'pop' : 'enter', duration: anim === 'pop' ? ENTER_MS : undefined })
  }

  _hide (i) {
    const el = this.shown.get(i)
    this.shown.delete(i)
    const done = () => el.remove()
    const anim = el.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_MS, easing: EASE.exit, fill: 'forwards' })
    if (anim) anim.onfinish = done
    else done()
  }

  _relayout () {
    for (const [i, el] of this.shown) this._place(el, this.lines[i])
  }

  /** Re-place every frame while a balloon is up: the figures move (ambient, entrances, sprites). */
  _follow () {
    if (this._raf || typeof requestAnimationFrame !== 'function') return
    const tick = () => {
      if (!this.shown.size) { this._raf = 0; return }
      this._relayout()
      this._raf = requestAnimationFrame(tick)
    }
    this._raf = requestAnimationFrame(tick)
  }

  /** The speaker's mouth in host px, from where its figure is drawn right now; null = off-frame. */
  _mouth (line) {
    const box = line.figure ? this.figureBox(line.figure.asset_id) : null
    if (!box || !box.width) return null
    const hr = this.host.getBoundingClientRect()
    const [fx, fy] = line.figure.mouth

    return [box.left + fx * box.width - hr.left, box.top + fy * box.height - hr.top]
  }

  /**
   * Where a balloon may go, in host coordinates: the on-screen part of the host (a portrait
   * screen crops the plate). A split panel's balloons ROAM (opts.roam): they may cross the panel
   * border into the next panel, so their bounds are the whole stage around the host.
   */
  _view () {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    const hr = this.host.getBoundingClientRect()
    const sr = (this.host.parentElement || this.host).getBoundingClientRect()
    if (this.opts.roam) {
      return { x0: sr.left - hr.left, y0: sr.top - hr.top, x1: sr.right - hr.left, y1: sr.bottom - hr.top }
    }

    return {
      x0: Math.max(0, sr.left - hr.left), y0: Math.max(0, sr.top - hr.top),
      x1: Math.min(w, sr.right - hr.left), y1: Math.min(h, sr.bottom - hr.top),
    }
  }

  /** The same bounds as fractions of the host: what a dragged balloon or tail tip may be. */
  fractionBounds () {
    const v = this._view()
    const w = this.host.clientWidth || 1
    const h = this.host.clientHeight || 1

    return { x: [v.x0 / w, v.x1 / w], y: [v.y0 / h, v.y1 / h] }
  }

  /** Size and place one balloon; returns the point it grows from (the tail's root). */
  _place (el, line) {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    const k = w / REF_WIDTH
    const view = this._view()
    const thought = line.kind === 'thought'
    // Scale grows the words, the box, the tail root and the circles; the ink line stays one pencil.
    const scale = Number.isFinite(line.scale) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, line.scale)) : 1
    const font = Math.max(13, FONT_REF * k) * scale
    const ink = `${INK_PX}px`
    el.style.opacity = Number.isFinite(line.opacity) ? String(line.opacity) : ''
    for (const node of el.querySelectorAll('.lp-balloon__cloud path, .lp-balloon__tail .ink, .lp-balloon__tail .trail')) node.setAttribute('stroke-width', ink)
    const bubble = el.querySelector('.lp-balloon__bubble')
    Object.assign(bubble.style, {
      fontSize: `${font}px`,
      borderWidth: ink,
      maxWidth: `${Math.min(0.8 * (view.x1 - view.x0), Math.max(180, MAX_WIDTH_REF * k) * scale)}px`,
      // A cloud's scallops eat into its box: the words get more room from the edge.
      padding: thought ? `${0.95 * font}px ${1.3 * font}px` : `${0.55 * font}px ${0.9 * font}px`,
      left: '0px',
      top: '0px',
      // Its own width: an absolutely placed box otherwise shrinks to the room left before its
      // host's edge, and a balloon dragged across a split panel's border wrapped into a column
      // that ended at the border (Bart, 2026-10-16: "the bubble doesn't pass yet").
      width: 'max-content',
    })
    const at = fractionPoint(line.at)
    const mouth = this._mouth(line)
    const { side, room } = mouth && !at ? balloonSide(mouth, line.figure?.facing || 0, { w, h }, view) : { side: null, room: Infinity }
    // Narrower (more lines) rather than off the face's side.
    bubble.style.maxWidth = `${Math.max(140, Math.min(parseFloat(bubble.style.maxWidth), room))}px`
    const box = { w: bubble.offsetWidth, h: bubble.offsetHeight }
    const { left, top } = at ? this._atPosition(at, box, view, k) : this._autoPosition(el, mouth, box, { w, h }, view, side)
    bubble.style.left = `${left}px`
    bubble.style.top = `${top}px`
    // The box the bubble HAS where it now stands, not the one measured before it moved there. A
    // bubble that reflows once placed (squeezed against an edge) otherwise left the tail's root on
    // an outline that was not drawn: the tail came loose (Bart, 2026-10-16: "we are able to
    // dismantle the tail").
    const rect = { left, top, w: bubble.offsetWidth || box.w, h: bubble.offsetHeight || box.h }
    this._drawCloud(el, rect, thought)

    const tip = this._tip(line, rect, mouth, view, w, h, font)
    const shape = tip ? this._drawTail(el, rect, tip, line, thought, font) : this._drawTail(el, rect, null)
    // What is drawn, as fractions of the host: the timeline reads a balloon nobody keyed from this.
    el._drawn = {
      center: [(left + rect.w / 2) / (w || 1), (top + rect.h / 2) / (h || 1)],
      tip: tip ? [tip[0] / (w || 1), tip[1] / (h || 1)] : null,
      root: shape ? outlineT(rect, shape.root) : null,
    }
    this.opts.onPlace?.(el, line, tip, { rect, shape, radius: this._radius(rect, font) })

    return shape?.root ?? [left + rect.w / 2, top + rect.h / 2]
  }

  /** A balloon the teacher put somewhere: its middle on that spot, kept inside the frame. */
  _atPosition (at, box, view, k) {
    const edge = EDGE_REF * k
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

    return {
      left: clamp(at[0] * this.host.clientWidth - box.w / 2, view.x0 + edge, view.x1 - box.w - edge),
      top: clamp(at[1] * this.host.clientHeight - box.h / 2, view.y0 + edge, view.y1 - box.h - edge),
    }
  }

  /** A balloon placed by its speaker (above the mouth, on the side the face looks to). */
  _autoPosition (el, mouth, box, host, view, side) {
    // Bubbles that came up earlier keep their place; this one moves aside (never the other way
    // round, or two balloons would push each other every frame).
    const earlier = [...this.shown.values()]
    const others = earlier.slice(0, earlier.indexOf(el)).map(o => o.querySelector('.lp-balloon__bubble'))
      .map(b => ({ left: b.offsetLeft, top: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }))

    return layoutBalloon(mouth, box, host, view, others, side)
  }

  /**
   * Where the tail points, host px: the tip the teacher dragged (kept in the view: the panel, or
   * the whole stage for a roaming split balloon), else the
   * speaker's mouth less the house gap. A speaker beyond the panel's edge: the tail runs to it.
   */
  _tip (line, rect, mouth, view, w, h, font) {
    const stored = fractionPoint(line.tail?.tip)
    if (stored) return clampToView([stored[0] * w, stored[1] * h], view)
    if (!mouth) return null
    const target = clampToView(mouth, view)
    if (target[0] !== mouth[0] || target[1] !== mouth[1]) return target
    const pinned = line.tail?.root
    const root = Number.isFinite(pinned) ? outlinePoint(rect, pinned, { radius: this._radius(rect, font) }) : tailRoot(rect, mouth)

    return root ? tipShortOf(root.point, mouth, mouthGap(w)) : null
  }

  /** The rounded corner a tail root keeps clear of. */
  _radius (rect, font) {
    return Math.min(rect.h / 2, CORNER_EM * font)
  }

  _drawCloud (el, rect, thought) {
    const cloud = el.querySelector('.lp-balloon__cloud')
    const path = cloud.firstElementChild
    if (!thought) { path.setAttribute('d', ''); return }
    Object.assign(cloud.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.w}px`, height: `${rect.h}px` })
    path.setAttribute('d', cloudPath(rect.w, rect.h))
  }

  /** The tail (speech) or the trail of circles (thought) toward `tip`: its shape, or null. */
  _drawTail (el, rect, tip, line = null, thought = false, font = 0) {
    const fill = el.querySelector('.lp-balloon__tail .fill')
    const ink = el.querySelector('.lp-balloon__tail .ink')
    const trail = el.querySelector('.lp-balloon__tail .trail')
    fill.setAttribute('d', '')
    ink.setAttribute('d', '')
    trail.replaceChildren()
    if (!tip) return null
    const pinned = Number.isFinite(line?.tail?.root) ? line.tail.root : null
    if (thought) {
      const dots = thoughtTrail(rect, tip, pinned)
      for (const d of dots) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        c.setAttribute('cx', d.x.toFixed(2))
        c.setAttribute('cy', d.y.toFixed(2))
        c.setAttribute('r', d.r.toFixed(2))
        trail.appendChild(c)
      }
      if (!dots.length) return null
      // The trail's handles: its root on the outline and the last circle, which is the tip.
      const root = (pinned === null ? tailRoot(rect, tip) : outlinePoint(rect, pinned))?.point ?? [dots[0].x, dots[0].y]
      return { root, tip, mid: null, dots }
    }
    const bend = Number.isFinite(line?.tail?.bend) ? line.tail.bend : DEFAULT_BEND
    const shape = tailShape(rect, tip, { bend, radius: this._radius(rect, font), root: pinned })
    if (!shape) return null
    fill.setAttribute('d', shape.fill)
    ink.setAttribute('d', shape.ink)

    return shape
  }
}
