/**
 * The cargo hold: a painted cut-away ship whose hold shows a team's cargo, for the cargo game
 * (TeamGame, `presentation: 'hold'`). One renderer, any size: the pick screen's big ship, the
 * compare screen's small ships, the departure, and (later) the end-of-lesson board.
 *
 * Every item has its own slot (plan §5): the painted hold (zones in % of the ship picture, from
 * the art's `.hold.json`) is cut into one unit per point of the whole catalogue, near-square cells
 * per zone, and slotPlan() gives each item its run of cells, in catalogue order. So every legal
 * load fits with no overlap, the same item sits in the same place on every ship, and nothing here
 * knows a Tasman item. Only cargo aboard is drawn; missing cargo is absent.
 *
 * With `hold.draught` on, the ship sits a little lower as it fills: its box moves down and the
 * blend-into-scene waterline (sit-in-scene.js) rises with it, so reflection, shadow and foam follow.
 *
 * Every string is teacher text: textContent only.
 */
import { el } from './dom.js'
import { renderSitIn, backdropPixels, sampleColours } from './sit-in-scene.js'
import { applyAmbient, trackStage } from './ambient.js'
import { sail } from './sail.js'

/** Motion (design-motion-principles + motion-design: ease-out in, ease-in out, no overshoot). */
export const HOLD_MOTION = {
  loadMs: 350,
  unloadMs: 260,
  draughtMs: 400,
  fadeMs: 150,
  shakeMs: 320,
  arcLift: 0.18,                      // the arc's rise, as a share of the distance flown
  easeOut: 'cubic-bezier(0.2, 0, 0, 1)',
  easeIn: 'cubic-bezier(0.3, 0, 1, 1)',
}

/** Defaults for a hold the spec leaves partly empty: the ship sits in the lower stage. */
export const HOLD_DEFAULTS = {
  aspect: 16 / 9, x: 50, y: 96, h: 86, waterline: 0.06,
  reflection: 0.3, contact_shadow: 0.4, foam: 0.5, roll: 0.5,
}

/**
 * How deep a full ship sinks when the game's `hold.draught` is on (the default; the teacher can
 * switch it off), as a share of its height: a weight joke, never a score (Bart, 10-15). Subtle,
 * and well above the gun ports. No text says a heavier ship is better or worse (plan §5).
 */
export const DRAUGHT_AMOUNT = 0.045

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0))
const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : fallback)
const r2 = (n) => Math.round(n * 100) / 100

// ── Pure rules ───────────────────────────────────────────────────────────────────────────────

/** The hold config as the component reads it: every number a number, zones inside the picture. */
export function readHold (raw = {}) {
  const zones = (Array.isArray(raw.zones) ? raw.zones : [])
    .map(z => ({ x: num(z?.x, 0), y: num(z?.y, 0), w: num(z?.w, 0), h: num(z?.h, 0) }))
    .filter(z => z.w > 0 && z.h > 0)
  const out = { ship: raw.ship || '', backdrop: raw.backdrop || '', zones }
  for (const [k, v] of Object.entries(HOLD_DEFAULTS)) out[k] = num(raw[k], v)
  out.aspect = Math.max(0.2, out.aspect)
  // On unless switched off; a number is the depth itself (capped at 0.2 of the ship's height).
  out.draught = raw.draught === false || raw.draught === 0 ? 0
    : typeof raw.draught === 'number' ? Math.min(0.2, Math.max(0, raw.draught)) : DRAUGHT_AMOUNT
  return out
}

/** Units per zone: shared by area, largest remainder, so they always add up to `capacity`. */
export function unitsPerZone (zones, capacity) {
  const cap = Math.max(0, Math.round(capacity))
  const areas = zones.map(z => Math.max(0, z.w * z.h))
  const total = areas.reduce((a, b) => a + b, 0)
  if (!total) return zones.map(() => 0)
  const raw = areas.map(a => (a / total) * cap)
  const out = raw.map(Math.floor)
  const left = cap - out.reduce((a, b) => a + b, 0)
  raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => { out[i]++ })
  return out
}

/** Rows x columns for n units in a box of this width/height ratio: cells as square as can be. */
export function gridFor (n, ratio) {
  let best = { rows: 1, cols: Math.max(1, n) }
  let bestScore = Infinity
  for (let rows = 1; rows <= Math.max(1, n); rows++) {
    const cols = Math.ceil(n / rows)
    const score = Math.abs(Math.log((ratio / cols) * rows)) + (cols * rows - n) / Math.max(1, n)
    if (score < bestScore) { bestScore = score; best = { rows, cols } }
  }
  return best
}

/**
 * Every unit's rectangle, in % of the ship picture, in strip order (zone by zone, row by row).
 * @returns {{x:number,y:number,w:number,h:number,row:string}[]}
 */
export function cellRects (zones, capacity, aspect) {
  const counts = unitsPerZone(zones, capacity)
  const cells = []
  zones.forEach((z, zi) => {
    const n = counts[zi]
    if (!n) return
    const { rows, cols } = gridFor(n, (z.w * aspect) / z.h)
    const cw = z.w / cols
    const ch = z.h / rows
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols)
      cells.push({ x: r2(z.x + (i % cols) * cw), y: r2(z.y + row * ch), w: r2(cw), h: r2(ch), row: `${zi}:${row}` })
    }
  })
  return cells
}

/**
 * Every item's own place in the hold (plan §5: a predefined slot; load order never moves it).
 * The hold is cut into one unit per point of the WHOLE catalogue, so every legal load fits with
 * no overlap; items go, in catalogue order, into the first row with room for all of them, and only
 * an item that fits no row whole is split over the free cells left (drawn as two pieces).
 *
 * @param {{key:string, cost:number}[]} items  the catalogue, fixed items first
 * @returns {Map<string, {x:number,y:number,w:number,h:number}[]>}  key -> its piece rectangles
 */
export function slotPlan (items, zones, aspect) {
  const total = items.reduce((s, it) => s + costOf(it), 0)
  const cells = cellRects(zones, total, aspect)
  const rows = new Map()
  cells.forEach((c, i) => { if (!rows.has(c.row)) rows.set(c.row, []); rows.get(c.row).push(i) })
  const used = Array(cells.length).fill(false)
  const plan = new Map()
  for (const it of items) {
    const n = costOf(it)
    if (!n) { plan.set(it.key, []); continue }
    let run = null
    for (const idx of rows.values()) {
      const free = idx.filter(i => !used[i])
      if (free.length >= n && free[n - 1] - free[0] === n - 1) { run = free.slice(0, n); break }
    }
    run = run ?? cells.map((_, i) => i).filter(i => !used[i]).slice(0, n)
    run.forEach(i => { used[i] = true })
    plan.set(it.key, mergeRow(run.map(i => cells[i])))
  }
  return plan
}

/** Neighbouring cells of one row as one rectangle. */
function mergeRow (cells) {
  const pieces = []
  for (const c of cells) {
    const last = pieces[pieces.length - 1]
    if (last && last.row === c.row && Math.abs(last.x + last.w - c.x) < 0.02) last.w = r2(c.x + c.w - last.x)
    else pieces.push({ ...c })
  }
  return pieces.map(({ row, ...rect }) => rect)
}

const costOf = (c) => Math.max(0, Math.round(Number(c?.cost) || 0))

/** How far the ship sinks, as a share of its height: 0 empty, `max` full (never past full). */
export function draughtFor (load, capacity, max = DRAUGHT_AMOUNT) {
  return capacity > 0 ? r2(clamp01(load / capacity) * clamp01(max) * 100) / 100 : 0
}

/** True when the bar should take its warning tint: within a tenth of the capacity, or over. */
export const nearlyFull = (load, capacity) => capacity > 0 && load >= capacity * 0.9

/**
 * The ship's box on a small stage zoomed in on its hull (the compare screen's ships): the hold
 * fills about 86% of the stage's width (or 46% of its height, whichever is less), centred, with
 * the hull and the water under it in view.
 * @param {number} stageAspect  the stage's width / height
 * @returns {{x:number, y:number, h:number}}
 */
export function zoomedPlace (hold, stageAspect = 1.6) {
  if (!hold.zones.length) return { x: hold.x, y: hold.y, h: hold.h }
  const left = Math.min(...hold.zones.map(z => z.x)) / 100
  const right = Math.max(...hold.zones.map(z => z.x + z.w)) / 100
  const top = Math.min(...hold.zones.map(z => z.y)) / 100
  const bottom = Math.max(...hold.zones.map(z => z.y + z.h)) / 100
  // h is the ship's height in % of the stage height; its width is h * aspect / stageAspect.
  const byWidth = (0.86 * stageAspect) / (Math.max(0.05, right - left) * hold.aspect)
  const byHeight = 0.46 / Math.max(0.05, bottom - top)
  const h = Math.min(4, byWidth, byHeight) * 100
  const shipW = (h / 100) * hold.aspect / stageAspect
  const x = 50 - (((left + right) / 2) - 0.5) * shipW * 100
  return { x: r2(x), y: r2(42 - ((top + bottom) / 2) * h + h), h: r2(h) }
}

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── DOM ──────────────────────────────────────────────────────────────────────────────────────

let stageSeq = 0

/**
 * A stage with a backdrop and the ship on it. `update()` puts a team's cargo in its hold: only
 * what is aboard, each item in its own slot (missing cargo is absent, never a faded icon).
 *
 * @param {object} opts
 * @param {object} opts.hold          readHold() output
 * @param {{key:string, cost:number}[]} opts.catalogue  every item, fixed first (the slot plan)
 * @param {boolean} [opts.zoomed]     zoom in on the hull (the compare screen's ships)
 * @param {number} [opts.stageAspect] the stage's width / height, for the zoom
 * @param {boolean} [opts.quiet]      the plate washed out on paper (a row of small ships)
 * @param {(key:string) => void} [opts.onPiece]  a non-fixed piece was tapped
 * @param {(c:object) => string} [opts.pieceLabel]  the accessible name of a piece
 */
export function createHoldStage ({
  hold, catalogue = [], zoomed = false, stageAspect = 1.6, quiet = false,
  onPiece = null, pieceLabel = (c) => c.name, className = '',
}) {
  const id = `hold-${++stageSeq}`
  const plan = slotPlan(catalogue, hold.zones, hold.aspect)
  const place = zoomed ? zoomedPlace(hold, stageAspect) : { x: hold.x, y: hold.y, h: hold.h }
  const stage = el('div', `relative overflow-hidden ${quiet ? 'lp-sheet' : 'bg-base-300'} ${className}`)
  stage.dataset.holdStage = ''
  if (hold.backdrop) {
    const bg = el('img', `absolute inset-0 h-full w-full object-cover ${quiet ? 'opacity-35' : ''}`)
    bg.src = hold.backdrop
    bg.alt = ''
    bg.draggable = false
    stage.appendChild(bg)
  }

  // node: the ship's box (position + draught); body: the roll; img + the hold's cargo inside it.
  const node = el('div', 'absolute')
  node.style.cssText = `height:${place.h}%; aspect-ratio:${hold.aspect}; left:${place.x}%; top:${r2(place.y - place.h)}%;
    transform:translate(-50%, 0); transition:transform ${HOLD_MOTION.draughtMs}ms ${HOLD_MOTION.easeOut};`
  const body = el('div', 'relative h-full w-full')
  const img = el('img', 'block h-full w-full select-none')
  img.src = hold.ship
  img.alt = ''
  img.draggable = false
  const cargoLayer = el('div', 'absolute inset-0')
  body.append(img, cargoLayer)
  node.appendChild(body)
  stage.appendChild(node)
  if (!reducedMotion() && hold.roll > 0) {
    trackStage(stage)
    applyAmbient(body, { ambient: 'roll', ambient_amount: hold.roll, asset_id: stageSeq })
  }

  const state = { key: null, draught: 0, colours: null, pieces: new Map(), speed: 0 }

  const sitItem = () => ({
    asset_id: id, width: 100, speed: state.speed,
    waterline: Math.min(1, hold.waterline + state.draught),
    reflection: hold.reflection, contact_shadow: hold.contact_shadow, foam: hold.foam,
  })
  const drawSit = () => renderSitIn(node, body, img, sitItem(), state.colours)

  // The water's colours, read from the plate once the ship is laid out (a cross-origin plate keeps
  // the fallback colour).
  const sample = () => {
    if (!hold.backdrop) return
    backdropPixels(hold.backdrop).then((pixels) => {
      const s = stage.getBoundingClientRect()
      const n = node.getBoundingClientRect()
      if (!pixels || !s.width || !n.width) return
      state.colours = sampleColours(pixels, {
        x: (n.left - s.left) / s.width, y: (n.top - s.top) / s.height, w: n.width / s.width, h: n.height / s.height,
      }, s.width / s.height, sitItem().waterline)
      drawSit()
    })
  }
  if (img.complete && img.naturalWidth) requestAnimationFrame(sample)
  else img.addEventListener('load', () => requestAnimationFrame(sample), { once: true })

  const makePiece = (c, rect, main) => {
    const tappable = main && onPiece && !c.fixed
    const piece = el(tappable ? 'button' : 'div', 'absolute flex items-center justify-center overflow-hidden rounded-sm p-[1%] text-base-content outline-offset-1')
    piece.style.cssText = `left:${rect.x + 0.2}%; top:${rect.y + 0.4}%; width:${Math.max(0, rect.w - 0.4)}%; height:${Math.max(0, rect.h - 0.8)}%;`
    piece.dataset.cargo = c.key
    if (main) {
      if (c.image) {
        const pic = el('img', 'pointer-events-none h-full w-full object-contain')
        pic.src = c.image
        pic.alt = ''
        pic.draggable = false
        piece.appendChild(pic)
      } else {
        piece.classList.add('bg-base-100/90')
        piece.appendChild(el('span', 'line-clamp-2 text-center text-[0.6em] font-semibold leading-tight', c.name))
      }
      piece.setAttribute('aria-label', pieceLabel(c))
      if (c.fixed) {
        piece.dataset.fixed = ''
        piece.appendChild(lockBadge())
      }
    } else {
      piece.setAttribute('aria-hidden', 'true')
    }
    if (tappable) piece.type = 'button'
    // A piece's continuation on the next row acts the same (it is not a second button).
    if (onPiece && !c.fixed) piece.addEventListener('click', () => onPiece(c.key))
    return piece
  }

  return {
    el: stage,

    /**
     * Show one team's hold. Only `cargo` is drawn, each item in its own slot.
     * @param {{key:string, cargo:{key:string,name:string,image?:string,fixed?:boolean}[], capacity:number, load:number}} p
     * @returns {string[]} the keys that came in new (for the flight)
     */
    update ({ key, cargo, capacity, load }) {
      const teamChanged = state.key !== key
      if (teamChanged) { cargoLayer.querySelectorAll('[data-cargo]').forEach(e => e.remove()); state.pieces = new Map() }
      state.key = key
      const added = []
      const keep = new Set()
      cargo.forEach(c => {
        const rects = plan.get(c.key) ?? []
        if (!rects.length) return
        keep.add(c.key)
        const had = state.pieces.get(c.key)
        const sig = c.image || c.name
        if (had?.sig === sig) return
        had?.els.forEach(e => e.remove())
        const mainAt = rects.reduce((best, p, i) => (p.w * p.h > rects[best].w * rects[best].h ? i : best), 0)
        const els = rects.map((p, i) => makePiece(c, p, i === mainAt))
        els.forEach(e => cargoLayer.appendChild(e))
        state.pieces.set(c.key, { sig, els, main: els[mainAt] })
        if (!had && !teamChanged) added.push(c.key)
      })
      for (const [k, p] of state.pieces) {
        if (!keep.has(k)) { p.els.forEach(e => e.remove()); state.pieces.delete(k) }
      }

      const draught = hold.draught > 0 ? draughtFor(load, capacity, hold.draught) : 0
      if (draught !== state.draught || !node.dataset.drawn) {
        state.draught = draught
        node.dataset.drawn = '1'
        node.dataset.draught = String(draught)
        node.style.transform = `translate(-50%, ${r2(draught * 100)}%)`
        if (reducedMotion()) node.style.transition = 'none'
        drawSit()
      }
      return added
    },

    /** The main piece of a loaded item, or null. */
    piece (key) { return state.pieces.get(key)?.main ?? null },

    /** Mark pieces with a flat brand-amber outline (no glow): `keys` on, every other piece off. */
    highlight (keys = new Set()) {
      for (const [k, p] of state.pieces) {
        const on = keys.has(k)
        p.els.forEach(e => { e.classList.toggle('outline', on); e.classList.toggle('outline-[3px]', on); e.classList.toggle('outline-primary', on) })
        if (on) p.main.dataset.differs = ''; else delete p.main.dataset.differs
      }
    },

    /** Departure: the hatches shut over the hold (flat covers, top down), choices locked. */
    lock () {
      if (cargoLayer.querySelector('[data-hatch]')) return
      hold.zones.forEach((z, i) => {
        const hatch = el('div', 'absolute rounded-sm bg-neutral')
        hatch.dataset.hatch = ''
        hatch.setAttribute('aria-hidden', 'true')
        hatch.style.cssText = `left:${z.x}%; top:${z.y}%; width:${z.w}%; height:${z.h}%; transform-origin:50% 0%;`
        cargoLayer.appendChild(hatch)
        if (!reducedMotion()) {
          hatch.animate?.([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
            { duration: 300, delay: i * 80, easing: HOLD_MOTION.easeIn, fill: 'backwards' })
        }
      })
      stage.dataset.locked = ''
    },

    /** Sail out of frame to the right (the bow), under way: foam up. Resolves when gone. */
    sailOut (seconds = 4) {
      state.speed = 1
      drawSit()
      return sail(node, stage, { to_x: 170, duration: seconds })
    },

    /** The current draught, as a share of the ship's height. */
    get draught () { return state.draught },
  }
}

function lockBadge () {
  // Heroicons outline lock-closed, small, in the piece's corner: this cargo always goes.
  const wrap = el('span', 'absolute right-[4%] top-[4%] flex h-[28%] max-h-6 min-h-3 aspect-square items-center justify-center rounded-full bg-neutral text-neutral-content')
  wrap.setAttribute('aria-hidden', 'true')
  wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-[70%] w-[70%]"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>'
  return wrap
}

/**
 * Fly a picture from one box to another (a card into the hold, or back), on a short arc.
 * Reduced motion: no flight; `then` runs at once. Fixed-position on the page, gone at the end.
 */
export function flyCargo (src, from, to, { back = false, then = null } = {}) {
  if (!src || !from || !to || reducedMotion() || typeof document.body.animate !== 'function') { then?.(); return null }
  const size = Math.min(from.width, from.height)
  const ghost = el('img', 'pointer-events-none fixed z-[90] object-contain')
  ghost.src = src
  ghost.alt = ''
  ghost.style.cssText += `left:${from.left + (from.width - size) / 2}px; top:${from.top + (from.height - size) / 2}px; width:${size}px; height:${size}px;`
  document.body.appendChild(ghost)
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const k = Math.max(0.15, Math.min(to.width, to.height) / size)
  const lift = Math.hypot(dx, dy) * HOLD_MOTION.arcLift
  const anim = ghost.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: back ? 1 : 0.9 },
    { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(${(1 + k) / 2})`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(${k})`, opacity: back ? 0.6 : 1 },
  ], { duration: back ? HOLD_MOTION.unloadMs : HOLD_MOTION.loadMs, easing: back ? HOLD_MOTION.easeIn : HOLD_MOTION.easeOut })
  const done = () => { ghost.remove(); then?.() }
  anim.onfinish = done
  anim.oncancel = done
  return anim
}

/** A piece that arrives without a flight (reduced motion, a drop): a short fade in. */
export function fadeIn (node) {
  node?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: HOLD_MOTION.fadeMs, easing: HOLD_MOTION.easeOut })
}

/** A gentle sideways shake: "too heavy". Reduced motion: none (the text says it). */
export function shake (node) {
  if (!node?.animate || reducedMotion()) return
  node.animate([
    { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
    { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
  ], { duration: HOLD_MOTION.shakeMs, easing: 'cubic-bezier(0.37, 0, 0.63, 1)' })
}
