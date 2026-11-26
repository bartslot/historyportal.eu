// Checkpoints along a voyage leg (Bart 2026-11-26).
//
// "If I click on the route, I want to add a checkpoint, same method as adding images and text for a destination.
// [...] shown along the route, not having to click a button (option). Can also be a button. Standard it's a
// smaller image left bottom, 1/5th of the screen, 16:9 image card on top, text under (optional). If it's only
// images, it becomes a carousel if there are more than 1, fading in/out."
//
// A checkpoint lives on its leg's scene (config.checkpoints, shape in App\Support\VoyageCheckpoints). Its point is
// a plain coordinate; the map snaps it to the nearest point of the leg as it is sailed, so a route bent after the
// checkpoint was placed carries the checkpoint along instead of stranding it beside the line.

import { t } from './i18n.js'

/** How long each picture of a card shows before the next one fades in. */
export const CAROUSEL_MS = 3500
/** How long the cross-fade between two pictures takes. */
export const FADE_MS = 700

const filled = (s) => typeof s === 'string' && s.trim() !== ''

/** The pictures of a checkpoint, as URLs. */
export const checkpointImages = (cp) => (Array.isArray(cp?.images) ? cp.images : [])
  .map((im) => (typeof im === 'string' ? im : im && im.url))
  .filter(filled)

/** Something to show: a title, a story or a picture. An empty checkpoint never opens a blank card. */
export const checkpointHasContent = (cp) => !!cp && (filled(cp.title) || filled(cp.story) || checkpointImages(cp).length > 0)

/** The scene's checkpoints with a usable point, in their stored order. */
export function checkpointsOf (list) {
  return (Array.isArray(list) ? list : []).filter((cp) => cp && typeof cp.id === 'string'
    && Number.isFinite(Number(cp.lng)) && Number.isFinite(Number(cp.lat)))
}

/** Squared distance between two points in degrees, longitude shrunk by latitude and wrapped the short way. */
const dist2 = (a, b) => {
  let dLng = a.lng - b.lng
  while (dLng > 180) dLng -= 360
  while (dLng < -180) dLng += 360
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  const dLat = a.lat - b.lat
  return (dLng * k) ** 2 + dLat ** 2
}

/**
 * Where along the track the traveller passes the checkpoint: the fraction (between f0 and f1, the leg's span)
 * of the track point nearest to it. Sampled, then refined around the best sample.
 *
 * @param {{lng:number,lat:number}} cp
 * @param {(f:number) => ({lng:number,lat:number}|null)} pointAt  the track, as the ship sails it
 */
export function checkpointFraction (cp, pointAt, f0, f1, steps = 240) {
  const target = { lng: Number(cp.lng), lat: Number(cp.lat) }
  const span = f1 - f0
  if (!(Math.abs(span) > 0)) return f0
  let best = f0
  let bestD = Infinity
  const scan = (from, to, n) => {
    for (let i = 0; i <= n; i++) {
      const f = from + (to - from) * (i / n)
      const p = pointAt(f)
      if (!p) continue
      const d = dist2(p, target)
      if (d < bestD) { bestD = d; best = f }
    }
  }
  scan(f0, f1, steps)
  const step = span / steps
  const lo = Math.min(f0, f1)
  const hi = Math.max(f0, f1)
  scan(Math.max(lo, best - step), Math.min(hi, best + step), 40)
  return best
}

/**
 * Which checkpoints the traveller has just passed: those whose fraction lies in (from, to] and are not yet
 * in `shown`. Returned in the order the traveller meets them.
 */
export function passedCheckpoints (fractions, from, to, shown) {
  const out = []
  fractions.forEach((f, i) => {
    if (shown.has(i) || !Number.isFinite(f)) return
    if (f <= to + 1e-9 && f > from - 1e-9) out.push(i)
  })
  return out.sort((a, b) => fractions[a] - fractions[b])
}

/** How long a card stays up by itself: a beat to read, or long enough for every picture to come round once. */
export const autoCardMs = (cp) => Math.max(7000, checkpointImages(cp).length * CAROUSEL_MS + 1000)

/**
 * The checkpoint card: bottom-left, a fifth of the stage wide, a 16:9 picture on top and the text under it.
 * More than one picture cross-fades through them. Looks: app.css .lp-checkpoint-card.
 *
 * @param {HTMLElement} host  the tour's HUD
 * @returns {{ el: HTMLElement, id: string, close: () => void }}
 */
export function renderCheckpointCard (host, cp, { onClose = null } = {}) {
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const card = document.createElement('section')
  card.className = 'lp-checkpoint-card'
  card.dataset.checkpointCard = cp.id
  card.setAttribute('aria-label', filled(cp.title) ? cp.title : t('Checkpoint'))

  const imgs = checkpointImages(cp)
  let timer = null
  if (imgs.length) {
    const media = document.createElement('div')
    media.className = 'lp-checkpoint-media'
    const frames = imgs.map((src, i) => {
      const img = document.createElement('img')
      img.src = src
      img.alt = ''
      img.decoding = 'async'
      img.style.opacity = i === 0 ? '1' : '0'
      img.style.transition = reduced ? 'none' : `opacity ${FADE_MS}ms ease-in-out`
      img.onerror = () => { img.style.visibility = 'hidden' }
      media.appendChild(img)
      return img
    })
    card.appendChild(media)
    if (frames.length > 1) {
      let at = 0
      timer = setInterval(() => {
        frames[at].style.opacity = '0'
        at = (at + 1) % frames.length
        frames[at].style.opacity = '1'
      }, CAROUSEL_MS)
    }
  }

  if (filled(cp.title) || filled(cp.story)) {
    const text = document.createElement('div')
    text.className = 'lp-checkpoint-text'
    if (filled(cp.title)) {
      const h = document.createElement('h3')
      h.className = 'lp-checkpoint-title'
      h.textContent = cp.title   // text nodes only: a teacher's words never become markup
      text.appendChild(h)
    }
    if (filled(cp.story)) {
      const p = document.createElement('p')
      p.className = 'lp-checkpoint-story'
      p.textContent = cp.story
      text.appendChild(p)
    }
    card.appendChild(text)
  }

  const x = document.createElement('button')
  x.type = 'button'
  x.className = 'lp-checkpoint-close'
  x.setAttribute('aria-label', t('Close'))
  x.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>'
  card.appendChild(x)

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    clearInterval(timer)
    card.classList.remove('is-in')
    setTimeout(() => card.remove(), reduced ? 0 : 260)
    if (onClose) onClose()
  }
  x.addEventListener('click', (e) => { e.stopPropagation(); close() })
  card.addEventListener('pointerdown', (e) => e.stopPropagation())   // a press on the card never pans the map

  host.appendChild(card)
  // Next frame, so the fade in actually runs from the resting state.
  requestAnimationFrame(() => card.classList.add('is-in'))
  setTimeout(() => card.classList.add('is-in'), 50)   // rAF never runs in a background tab
  return { el: card, id: cp.id, close }
}
