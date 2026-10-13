/**
 * The comic title poster: a lesson series' title screen drawn as data
 * (public/lesson-titles/{translation_group}/poster.json, parsed and URL-resolved by
 * App\Support\TitlePoster). Letters with their outline and hard shadow, a little scene masked
 * into the letter shapes, and the lesson's subtitle as live text.
 *
 * Every box is a share of the FRAME (x/w of its width, y/h of its height), so the poster scales
 * as one picture. Layers in a group sit inside that group's box: a masked group (the scene)
 * carries the shared letter-union mask, so a layer can move inside it while the mask stays put;
 * a shadow group (TASMAN) casts one hard shadow for all its letters, as Figma does.
 *
 * Motion reuses the scene ambient system (scene/ambient.js): swell, roll, breeze. The entrance
 * drops the letters in, then fades the scene up; nothing of it plays under reduced motion.
 */
import { applyAmbient, trackStage } from './scene/ambient.js'

export const PHONE_GUTTER_PX = 16

// Entrance: the letters drop in one after another, then the scene inside them starts.
// Ease-out (decelerate, no overshoot); the whole sequence stays under ENTRANCE_BUDGET_MS.
export const ENTRANCE = {
  dropMs: 420,
  staggerMs: 45,
  dropShare: 0.35,             // of the letter's own height
  fadeMs: 320,
  sceneGapMs: -120,            // the scene starts fading just before the last letter lands
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
}
export const ENTRANCE_BUDGET_MS = 1200

const pct = (n) => `${Math.round(n * 10000) / 10000}%`

/**
 * Pure: where the frame goes in a view, in px. Landscape views fit the whole frame (object-fit:
 * contain), centred. A portrait view (a phone) would make the letters tiny that way, so there the
 * letters' own box (poster.focus) fills the width less a gutter each side, centred; the flat
 * background colour runs past the frame's edges, so nothing is lost but empty poster.
 *
 * @returns {{left: number, top: number, width: number, height: number}}
 */
export function posterFit (viewW, viewH, poster, gutter = PHONE_GUTTER_PX) {
  const { w: fw, h: fh } = poster.frame
  if (!(viewW > 0 && viewH > 0)) return { left: 0, top: 0, width: 0, height: 0 }
  if (poster.fit === 'cover') return coverFit(viewW, viewH, poster, gutter)
  const contain = Math.min(viewW / fw, viewH / fh)
  const f = poster.focus
  const portrait = viewW < viewH && f
  const scale = portrait
    ? Math.max(contain, Math.min((viewW - 2 * gutter) / (f.w / 100 * fw), (viewH - 2 * gutter) / (f.h / 100 * fh)))
    : contain
  const width = fw * scale
  const height = fh * scale
  const cx = portrait ? (f.x + f.w / 2) / 100 : 0.5
  const cy = portrait ? (f.y + f.h / 2) / 100 : 0.5

  return { left: viewW / 2 - cx * width, top: viewH / 2 - cy * height, width, height }
}

// Where a tall phone puts the cover's focus: a little above the middle, clear of the Start bar.
export const COVER_FOCUS_Y = 0.42

/**
 * Pure: the fit of a painted cover (poster.fit 'cover'). A painting has no flat colour to
 * letterbox in, so the frame always fills the width (no side bars) and, in a landscape view, the
 * height too (object-fit: cover), slid so the focus box stays in sight. A view too tall for that
 * (a phone) shows the focus box across the width less a gutter, at COVER_FOCUS_Y; the poster's
 * background (above) and background_bottom (below) fill the rest.
 *
 * @returns {{left: number, top: number, width: number, height: number}}
 */
export function coverFit (viewW, viewH, poster, gutter = PHONE_GUTTER_PX) {
  const { w: fw, h: fh } = poster.frame
  const f = poster.focus ?? { x: 0, y: 0, w: 100, h: 100 }
  const cover = Math.max(viewW / fw, viewH / fh)
  const focusFit = Math.min((viewW - 2 * gutter) / (f.w / 100 * fw), (viewH - 2 * gutter) / (f.h / 100 * fh))
  const scale = Math.max(viewW / fw, Math.min(cover, focusFit))
  const width = fw * scale
  const height = fh * scale
  const fcx = (f.x + f.w / 2) / 100
  const fcy = (f.y + f.h / 2) / 100
  // Centre the focus, then pull back so no edge of the frame shows inside the view.
  const clamp = (pos, size, view) => (size >= view ? Math.min(0, Math.max(view - size, pos)) : pos)
  const left = clamp(viewW / 2 - fcx * width, width, viewW)
  const top = height >= viewH
    ? clamp(viewH / 2 - fcy * height, height, viewH)
    : viewH * COVER_FOCUS_Y - fcy * height

  return { left, top, width, height }
}

/**
 * Pure: the backdrop behind a cover on a tall phone: background above the frame's middle,
 * background_bottom below it (a hard edge, hidden behind the painting). Null when one colour does.
 */
export function coverBackdrop (poster, fit) {
  const below = poster.background_bottom
  if (!below || below === poster.background) return null
  const split = Math.round(fit.top + fit.height / 2)

  return `linear-gradient(to bottom, ${poster.background} ${split}px, ${below} ${split}px)`
}

/** Pure: a frame box re-expressed as a share of the group box it sits in. */
export function boxInGroup (box, group) {
  const g = group ?? { x: 0, y: 0, w: 100, h: 100 }

  return {
    x: (box.x - g.x) / g.w * 100,
    y: (box.y - g.y) / g.h * 100,
    w: box.w / g.w * 100,
    h: box.h / g.h * 100,
  }
}

/** Pure: consecutive layers of the same group share one wrapper; order (z) is kept. */
export function groupRuns (layers) {
  const runs = []
  for (const layer of layers ?? []) {
    const key = layer.group ?? null
    const last = runs[runs.length - 1]
    if (last && last.group === key) last.layers.push(layer)
    else runs.push({ group: key, layers: [layer] })
  }

  return runs
}

/** Pure: frame px (the Figma frame) to container-width units of the poster stage. */
export const frameCqw = (px, poster) => `${Math.round(px / poster.frame.w * 100 * 10000) / 10000}cqw`

/** Pure: the CSS transform for a layer's flip and rotation (flip first, as Figma composes it). */
export function layerTransform (layer) {
  const parts = []
  if (layer.rotate) parts.push(`rotate(${Number(layer.rotate)}deg)`)
  if (layer.flip === 'x' || layer.flip === 'xy') parts.push('scaleX(-1)')
  if (layer.flip === 'y' || layer.flip === 'xy') parts.push('scaleY(-1)')

  return parts.join(' ')
}

/**
 * Pure: the entrance timeline. Letters ('drop') stagger in order; every 'fade' layer starts
 * together once the letters are nearly down.
 *
 * @returns {{steps: Array<{id: string, kind: string, delay: number, duration: number}>, totalMs: number}}
 */
export function entrancePlan (layers, e = ENTRANCE) {
  const drops = (layers ?? []).filter(l => l.enter === 'drop')
  const lettersEnd = drops.length ? (drops.length - 1) * e.staggerMs + e.dropMs : 0
  const sceneAt = Math.max(0, lettersEnd + e.sceneGapMs)
  let i = 0
  const steps = (layers ?? []).filter(l => l.enter === 'drop' || l.enter === 'fade').map(l => (l.enter === 'drop'
    ? { id: l.id, kind: 'drop', delay: (i++) * e.staggerMs, duration: e.dropMs }
    : { id: l.id, kind: 'fade', delay: sceneAt, duration: e.fadeMs }))
  const totalMs = steps.reduce((max, s) => Math.max(max, s.delay + s.duration), 0)

  return { steps, totalMs }
}

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function groupEl (run, poster) {
  const def = run.group ? poster.groups?.[run.group] : null
  const el = document.createElement('div')
  el.className = 'title-poster-group'
  const box = def?.box ?? { x: 0, y: 0, w: 100, h: 100 }
  Object.assign(el.style, { position: 'absolute', left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) })
  if (def?.mask_url) {
    for (const p of ['maskImage', 'webkitMaskImage']) el.style[p] = `url("${def.mask_url}")`
    for (const p of ['maskSize', 'webkitMaskSize']) el.style[p] = '100% 100%'
    for (const p of ['maskRepeat', 'webkitMaskRepeat']) el.style[p] = 'no-repeat'
  }
  if (def?.shadow) {
    // The comic hard shadow is part of the artwork (radius 0), scaled with the frame.
    const s = def.shadow
    el.style.filter = `drop-shadow(${frameCqw(s.x, poster)} ${frameCqw(s.y, poster)} 0 ${s.color ?? '#000'})`
  }

  return { el, box }
}

function layerEl (layer, groupBox, index) {
  const b = boxInGroup(layer.box, groupBox)
  const box = document.createElement('div')
  box.dataset.posterLayer = layer.id
  Object.assign(box.style, { position: 'absolute', left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) })
  const transform = layerTransform(layer)
  if (transform) box.style.transform = transform

  // The ambient motion goes on its own wrapper, so it never overwrites the flip/rotation above.
  const motion = document.createElement('div')
  Object.assign(motion.style, { position: 'absolute', inset: '0' })
  const img = document.createElement('img')
  img.src = layer.url
  img.alt = ''
  img.draggable = false
  img.decoding = 'async'
  Object.assign(img.style, { display: 'block', width: '100%', height: '100%' })
  motion.appendChild(img)
  box.appendChild(motion)

  return { box, motion, start: () => applyAmbient(motion, layer, index) }
}

/**
 * Build the poster into `stage` (an element the page sizes; anything already in it, the live
 * subtitle, stays on top) and keep it fitted to `host`.
 *
 * @returns {() => void} stop: disconnects the observers and listeners
 */
export function mountTitlePoster (host, stage, poster) {
  if (!host || !stage || !poster?.layers?.length) return () => {}
  const before = stage.firstChild
  const starters = []
  const byId = {}
  let index = 0
  for (const run of groupRuns(poster.layers)) {
    const { el, box } = groupEl(run, poster)
    for (const layer of run.layers) {
      const made = layerEl(layer, box, index++)
      byId[layer.id] = made.box
      starters.push(made.start)
      el.appendChild(made.box)
    }
    stage.insertBefore(el, before)
  }

  const fit = () => {
    const r = posterFit(host.clientWidth, host.clientHeight, poster)
    Object.assign(stage.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    if (poster.fit === 'cover') host.style.backgroundImage = coverBackdrop(poster, r) ?? ''
  }
  fit()
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
  ro?.observe(host)
  const stageRo = trackStage(stage)

  const startLoops = () => starters.forEach(start => start())
  let timer = null
  if (reducedMotion() || typeof stage.animate !== 'function') {
    startLoops()
  } else {
    const plan = entrancePlan(poster.layers)
    for (const step of plan.steps) {
      const el = byId[step.id]
      const frames = step.kind === 'drop'
        ? [{ transform: `translateY(-${ENTRANCE.dropShare * 100}%)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]
        : [{ opacity: 0 }, { opacity: 1 }]
      // A fade touches only opacity, so a flipped/rotated layer keeps its own transform.
      el.animate(frames, { duration: step.duration, delay: step.delay, easing: ENTRANCE.easing, fill: 'backwards' })
    }
    timer = setTimeout(startLoops, plan.totalMs)
  }

  // Loops rest while nobody can see them.
  const onVisibility = () => stage.classList.toggle('is-paused', document.hidden)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    clearTimeout(timer)
    ro?.disconnect()
    stageRo?.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
