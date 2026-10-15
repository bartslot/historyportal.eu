/**
 * The cargo hold: a painted cut-away ship whose hold fills with cargo, for the team game's budget
 * mode (TeamGame, `presentation: 'hold'`). One component, three users: the class's pick screen,
 * the reveal's small ships, and (later) the end-of-lesson board.
 *
 * How points become space: the hold's capacity in points is the number of compartment UNITS. The
 * painted hold is described by a few zones (rectangles in % of the ship picture, from the art's
 * `.hold.json`); the units are shared over the zones by area and laid out as a near-square grid in
 * each. All units, read zone by zone and row by row, form one strip: an item of cost n takes n
 * units in a row of that strip, and a run that crosses a row edge is drawn as two pieces. So any
 * load within capacity always fits, whatever the item costs, and nothing here knows a Tasman item.
 *
 * Cargo keeps its place: loading takes the first free run, unloading leaves a gap; only when no
 * run is long enough is everything packed tight again (in load order).
 *
 * The ship sits lower as it fills (the draught): its picture moves down by up to `draught` of its
 * height and the blend-into-scene waterline (sit-in-scene.js) rises with it, so the reflection,
 * contact shadow and foam follow.
 *
 * Every string is teacher text: textContent only.
 */
import { el } from './dom.js'
import { renderSitIn, backdropPixels, sampleColours } from './sit-in-scene.js'
import { applyAmbient, trackStage } from './ambient.js'

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
  aspect: 16 / 9, x: 50, y: 96, h: 86, waterline: 0.06, draught: 0.05,
  reflection: 0.3, contact_shadow: 0.4, foam: 0.5, roll: 0.5,
}

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

/** The pieces a run of cells [start, start + cost) draws as: one rectangle per row it touches. */
export function piecesOf (start, cost, cells) {
  const pieces = []
  for (let i = start; i < start + cost && i < cells.length; i++) {
    const c = cells[i]
    const last = pieces[pieces.length - 1]
    if (last && last.row === c.row) last.w = r2(c.x + c.w - last.x)
    else pieces.push({ ...c })
  }
  return pieces
}

const costOf = (c) => Math.max(0, Math.round(Number(c?.cost) || 0))

/** Units the strip needs: the capacity, or more when the cargo is over it (the real ship). */
export const stripLength = (cargo, capacity) =>
  Math.max(Math.round(capacity) || 0, cargo.reduce((s, c) => s + costOf(c), 0))

/**
 * Where each piece of cargo starts on the strip. Cargo already placed (`prev`, key -> start) stays
 * put; new cargo takes the first free run; when none is long enough, all of it is packed tight in
 * cargo order. Free cargo (cost 0) takes no units: its start is null.
 *
 * @param {{key:string, cost:number}[]} cargo   in load order (fixed items first)
 * @returns {Map<string, number|null>}  a NEW map; `prev` is never changed
 */
export function placeCargo (cargo, capacity, prev = new Map()) {
  const length = stripLength(cargo, capacity)
  const used = Array(length).fill(false)
  const out = new Map()
  const free = (s, n) => s >= 0 && s + n <= length && used.slice(s, s + n).every(u => !u)
  const take = (key, s, n) => { for (let i = s; i < s + n; i++) used[i] = true; out.set(key, s) }

  cargo.forEach(c => {
    const s = prev.get(c.key)
    if (costOf(c) > 0 && Number.isInteger(s) && free(s, costOf(c))) take(c.key, s, costOf(c))
  })
  for (const c of cargo) {
    const n = costOf(c)
    if (n === 0) { out.set(c.key, null); continue }
    if (out.has(c.key)) continue
    let s = 0
    while (s + n <= length && !free(s, n)) s++
    if (s + n > length) return packTight(cargo)
    take(c.key, s, n)
  }
  return out
}

function packTight (cargo) {
  const out = new Map()
  let at = 0
  cargo.forEach(c => { const n = costOf(c); out.set(c.key, n ? at : null); at += n })
  return out
}

/** How far the ship sinks, as a share of its height: 0 empty, `max` full (never past full). */
export function draughtFor (load, capacity, max = HOLD_DEFAULTS.draught) {
  return capacity > 0 ? r2(clamp01(load / capacity) * clamp01(max) * 100) / 100 : 0
}

/** True when the bar should take its warning tint: within a tenth of the capacity, or over. */
export const nearlyFull = (load, capacity) => capacity > 0 && load >= capacity * 0.9

/**
 * The ship's box on a stage zoomed in on its hold (the reveal's small ships): the zones' band
 * fills about 70% of the stage height, centred a little above the middle.
 * @returns {{x:number, y:number, h:number}}
 */
export function zoomedPlace (hold) {
  if (!hold.zones.length) return { x: hold.x, y: hold.y, h: hold.h }
  const top = Math.min(...hold.zones.map(z => z.y)) / 100
  const bottom = Math.max(...hold.zones.map(z => z.y + z.h)) / 100
  const h = Math.min(400, (0.7 / Math.max(0.05, bottom - top)) * 100)
  const centre = ((top + bottom) / 2) * h
  return { x: 50, y: r2(45 - centre + h), h: r2(h) }
}

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── DOM ──────────────────────────────────────────────────────────────────────────────────────

let stageSeq = 0

/**
 * A stage with a backdrop and the ship on it. `update()` puts cargo in its hold.
 *
 * @param {object} opts
 * @param {object} opts.hold          readHold() output
 * @param {boolean} [opts.zoomed]     zoom in on the hold (the reveal's small ships)
 * @param {(key:string) => void} [opts.onPiece]  a loaded, non-fixed piece was tapped
 * @param {Map} [opts.memory]         key -> placement map, kept across rebuilds (per team key)
 * @param {(key:string) => string} [opts.pieceLabel]  the accessible name of a piece
 */
export function createHoldStage ({ hold, zoomed = false, onPiece = null, memory = new Map(), pieceLabel = (k) => k, className = '' }) {
  const id = `hold-${++stageSeq}`
  const place = zoomed ? zoomedPlace(hold) : { x: hold.x, y: hold.y, h: hold.h }
  const stage = el('div', `relative overflow-hidden bg-base-300 ${className}`)
  stage.dataset.holdStage = ''
  if (hold.backdrop) {
    const bg = el('img', 'absolute inset-0 h-full w-full object-cover')
    bg.src = hold.backdrop
    bg.alt = ''
    bg.draggable = false
    stage.appendChild(bg)
  }

  // node: the ship's box (position + draught); body: the roll; img + the hold's cells inside it.
  const node = el('div', 'absolute')
  node.style.cssText = `height:${place.h}%; aspect-ratio:${hold.aspect}; left:${place.x}%; top:${r2(place.y - place.h)}%;
    transform:translate(-50%, 0); transition:transform ${HOLD_MOTION.draughtMs}ms ${HOLD_MOTION.easeOut};`
  const body = el('div', 'relative h-full w-full')
  const img = el('img', 'block h-full w-full select-none')
  img.src = hold.ship
  img.alt = ''
  img.draggable = false
  const slots = el('div', 'pointer-events-none absolute inset-0')
  const cargoLayer = el('div', 'absolute inset-0')
  body.append(img, slots, cargoLayer)
  node.appendChild(body)
  stage.appendChild(node)
  if (!reducedMotion() && hold.roll > 0) {
    trackStage(stage)
    applyAmbient(body, { ambient: 'roll', ambient_amount: hold.roll, asset_id: stageSeq })
  }

  const state = { key: null, length: -1, draught: 0, colours: null, pieces: new Map() }

  const sitItem = () => ({
    asset_id: id, width: 100, speed: 0,
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

  const drawSlots = (cells) => {
    slots.replaceChildren(...cells.map(c => {
      const slot = el('div', 'absolute rounded-sm border border-dashed border-base-100/70')
      slot.style.cssText = `left:${c.x + 0.3}%; top:${c.y + 0.6}%; width:${Math.max(0, c.w - 0.6)}%; height:${Math.max(0, c.h - 1.2)}%;`
      return slot
    }))
  }

  const makePiece = (c, rect, main) => {
    const tappable = main && onPiece && !c.fixed
    const piece = el(tappable ? 'button' : 'div', 'absolute flex items-center justify-center overflow-hidden rounded-sm border border-base-content/20 bg-base-100/90 p-[2%] text-base-content')
    piece.style.cssText = `left:${rect.x + 0.3}%; top:${rect.y + 0.6}%; width:${Math.max(0, rect.w - 0.6)}%; height:${Math.max(0, rect.h - 1.2)}%;`
    piece.dataset.cargo = c.key
    if (main) {
      if (c.image) {
        const pic = el('img', 'pointer-events-none h-full w-full object-contain')
        pic.src = c.image
        pic.alt = ''
        pic.draggable = false
        piece.appendChild(pic)
      } else {
        piece.appendChild(el('span', 'line-clamp-2 text-center text-[0.6em] font-semibold leading-tight', c.name))
      }
      piece.setAttribute('aria-label', pieceLabel(c))
      if (c.fixed) {
        piece.dataset.fixed = ''
        piece.appendChild(lockBadge())
      }
    } else {
      piece.setAttribute('aria-hidden', 'true')
      piece.classList.add('opacity-60')
    }
    if (tappable) piece.type = 'button'
    // A piece's continuation on the next row takes it out too (it is not a second button).
    if (onPiece && !c.fixed) piece.addEventListener('click', () => onPiece(c.key))
    return piece
  }

  return {
    el: stage,

    /**
     * Show one hold: the cargo (load order, fixed first) of team `key`.
     * @param {{key:string, cargo:{key:string,name:string,cost:number,image?:string,fixed?:boolean}[], capacity:number, load:number}} p
     * @returns {string[]} the keys that came in new
     */
    update ({ key, cargo, capacity, load }) {
      const length = stripLength(cargo, capacity)
      const cells = cellRects(hold.zones, length, hold.aspect)
      if (length !== state.length) { drawSlots(cells); state.length = length }
      const teamChanged = state.key !== key
      if (teamChanged) { cargoLayer.replaceChildren(); state.pieces = new Map() }
      state.key = key

      const starts = placeCargo(cargo, capacity, memory.get(key) ?? new Map())
      memory.set(key, starts)
      const added = []
      const keep = new Set()
      cargo.forEach(c => {
        const start = starts.get(c.key)
        if (start === null || start === undefined) return
        keep.add(c.key)
        const sig = `${start}:${costOf(c)}:${c.image || c.name}`
        const had = state.pieces.get(c.key)
        if (had?.sig === sig) return
        had?.els.forEach(e => e.remove())
        const pieces = piecesOf(start, costOf(c), cells)
        const mainAt = pieces.reduce((best, p, i) => (p.w * p.h > pieces[best].w * pieces[best].h ? i : best), 0)
        const els = pieces.map((p, i) => makePiece(c, p, i === mainAt))
        els.forEach(e => cargoLayer.appendChild(e))
        state.pieces.set(c.key, { sig, els, main: els[mainAt] })
        if (!had && !teamChanged) added.push(c.key)
      })
      for (const [k, p] of state.pieces) {
        if (!keep.has(k)) { p.els.forEach(e => e.remove()); state.pieces.delete(k) }
      }

      const draught = draughtFor(load, capacity, hold.draught)
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
