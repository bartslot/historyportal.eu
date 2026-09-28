/**
 * BalloonLayer: the speech balloons of a scene told in lines (SceneDialogue on the server).
 *
 * lines: [{ speaker, text, start, end, figure: { asset_id, mouth: [x, y], facing: -1|0|1 } | null }]
 *   start/end — seconds on the scene's narration track; a balloon shows while start <= t < end.
 *   figure    — the layer that speaks, and where its mouth is on its own picture (0..1). The mouth
 *               is put on the figure's RENDERED box every frame, so the balloon follows the layer
 *               through scale, depth, bob, its entrance and (later) a walking sprite.
 *               facing: the side the face looks to (1 = right), where the balloon goes, so the
 *               tail comes in at an angle from in front of the face; 0 = unknown, toward the middle.
 *               null, or a figure not on stage = off-frame (a letter, a voice): no tail.
 * Narrator lines are captions, not balloons, and are skipped here.
 *
 * The host follows the playback clock: update(t) on every timeupdate, and after a seek. It only
 * adds and removes balloons whose state changed, so calling it often costs nothing.
 */
import { EASE } from '../easing.js'

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

export class BalloonLayer {
  /** @param {(assetId: number) => DOMRect | null} [figureBox] where a figure layer is drawn now */
  constructor (host, figureBox = defaultFigureBox) {
    this.host = host
    this.figureBox = figureBox
    this._raf = 0
    this.lines = []
    this.shown = new Map() // line index → element
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
    this.lines = (Array.isArray(lines) ? lines : []).filter(l => l && l.speaker !== 'narrator' && l.text)
    this.update(0)
  }

  update (t) {
    this._t = Number(t) || 0
    this.lines.forEach((line, i) => {
      const on = this._t >= line.start && this._t < line.end
      if (on && !this.shown.has(i)) this._show(i, line)
      else if (!on && this.shown.has(i)) this._hide(i)
    })
  }

  destroy () {
    this._ro?.disconnect()
    this.setLines([])
  }

  _show (i, line) {
    const el = document.createElement('div')
    el.className = 'lp-balloon'
    el.dataset.speaker = line.speaker
    // The tail is painted OVER the bubble: under it, the bubble's shadow greyed the tail. Its fill
    // also covers the bubble's outline where they join; only its two sides are inked.
    el.innerHTML = '<div class="lp-balloon__bubble"></div>'
      + '<svg class="lp-balloon__tail" aria-hidden="true"><path class="fill" fill="#fffdf7"/>'
      + '<path class="ink" fill="none" stroke="#1b1712" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>'
    // textContent, never innerHTML: the words are lesson copy.
    el.querySelector('.lp-balloon__bubble').textContent = line.text
    this.host.appendChild(el)
    this.shown.set(i, el)
    this._follow()
    const origin = this._place(el, line)

    el.animate?.(
      [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: ENTER_MS, easing: EASE.pop, fill: 'both' },
    )
    el.style.transformOrigin = `${origin[0]}px ${origin[1]}px`
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

  /** Size and place one balloon; returns the point it grows from (the tail's base). */
  _place (el, line) {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    const k = w / REF_WIDTH
    // The on-screen part of the host, in host coordinates.
    const hr = this.host.getBoundingClientRect()
    const sr = (this.host.parentElement || this.host).getBoundingClientRect()
    const view = {
      x0: Math.max(0, sr.left - hr.left), y0: Math.max(0, sr.top - hr.top),
      x1: Math.min(w, sr.right - hr.left), y1: Math.min(h, sr.bottom - hr.top),
    }
    const bubble = el.querySelector('.lp-balloon__bubble')
    Object.assign(bubble.style, {
      fontSize: `${Math.max(13, FONT_REF * k)}px`,
      maxWidth: `${Math.min(0.8 * (view.x1 - view.x0), Math.max(180, MAX_WIDTH_REF * k))}px`,
      padding: `${0.55 * Math.max(13, FONT_REF * k)}px ${0.9 * Math.max(13, FONT_REF * k)}px`,
      left: '0px',
      top: '0px',
    })
    const mouth = this._mouth(line)
    const { side, room } = mouth ? balloonSide(mouth, line.figure?.facing || 0, { w, h }, view) : { side: null, room: Infinity }
    // Narrower (more lines) rather than off the face's side.
    bubble.style.maxWidth = `${Math.max(140, Math.min(parseFloat(bubble.style.maxWidth), room))}px`
    const box = { w: bubble.offsetWidth, h: bubble.offsetHeight }
    // Bubbles that came up earlier keep their place; this one moves aside (never the other way
    // round, or two balloons would push each other every frame).
    const earlier = [...this.shown.values()]
    const others = earlier.slice(0, earlier.indexOf(el)).map(o => o.querySelector('.lp-balloon__bubble'))
      .map(b => ({ left: b.offsetLeft, top: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }))
    const { left, top, tail } = layoutBalloon(mouth, box, { w, h }, view, others, side)
    bubble.style.left = `${left}px`
    bubble.style.top = `${top}px`

    const fill = el.querySelector('.lp-balloon__tail .fill')
    const ink = el.querySelector('.lp-balloon__tail .ink')
    if (!tail) {
      fill.setAttribute('d', '')
      ink.setAttribute('d', '')
      return [left + box.w / 2, top + box.h / 2]
    }
    const [bx, by] = tail.base
    const [tx, ty] = tail.tip
    // A slightly curved wedge. The fill starts inside the bubble (hiding its outline at the join);
    // the ink starts on the outline, so no stroke shows inside the bubble.
    const a = (y) => `${bx - tail.half} ${y} Q ${(bx + tx) / 2 - tail.half / 2} ${(by + ty) / 2} ${tx} ${ty}`
    const b = (y) => `Q ${(bx + tx) / 2 + tail.half / 3} ${(by + ty) / 2} ${bx + tail.half} ${y}`
    fill.setAttribute('d', `M ${a(by - 5)} ${b(by - 5)} Z`)
    ink.setAttribute('d', `M ${a(by)} ${b(by)}`)
    return [bx, by]
  }
}
