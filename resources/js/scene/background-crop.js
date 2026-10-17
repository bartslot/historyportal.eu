/**
 * background-crop.js — a scene's background as a layer the timeline can animate.
 *
 * Bart, 2026-10-17: "why can't we animate the background? i would like to animate it just like any
 * other layer." A background has one crop wherever it is drawn: which point of the picture stays in
 * view (x, y in %, as a split panel's Uitsnede already stores it), how far it is zoomed in about
 * that point, and its opacity. Each renderer (SplitStage's panels, the player's background layer,
 * the editor's stage) applies the crop with one of the functions below, and publishes its pictures
 * through backgroundSource() as `window.__backgrounds`, which the timeline reads and writes.
 */

import { normalizeFocus } from './split-layout.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/** A crop with every field filled in: the middle, no zoom, fully opaque unless it says otherwise. */
export function normalizeCrop (crop = {}) {
  const opacity = Number(crop?.opacity)
  return { ...normalizeFocus(crop), opacity: crop?.opacity != null && Number.isFinite(opacity) ? clamp01(opacity) : 1 }
}

const position = ({ x, y }) => `${x}% ${y}%`

/** A fade that leaves the element's own `opacity` to whatever crossfades it. */
export function fade (el, opacity) {
  el.style.filter = opacity < 1 ? `opacity(${opacity})` : ''
}

/** An <img> drawn object-fit: cover (SplitStage's panels, ParallaxScene's plates). */
export function cropImage (img, crop) {
  const c = normalizeCrop(crop)
  const pos = position(c)
  img.style.objectPosition = pos
  img.style.transformOrigin = pos
  img.style.transform = c.zoom > 1 ? `scale(${c.zoom})` : ''
  fade(img, c.opacity)
}

/**
 * A box with a cover background-image (the player's background layer). Zooms with the separate
 * `scale` property and fades with a filter, so it composes with the `transform` a scene slides in
 * with and the `opacity` it crossfades with.
 */
export function cropBox (el, crop) {
  const c = normalizeCrop(crop)
  const pos = position(c)
  el.style.backgroundPosition = pos
  el.style.transformOrigin = pos
  el.style.scale = c.zoom > 1 ? String(c.zoom) : ''
  fade(el, c.opacity)
}

/**
 * The repeat and offset of a cover texture (the editor's flat stage) cropped like CSS crops a cover
 * picture: `cover` is the {rX, rY} that fills the stage, a zoom shows 1/zoom of it about the same
 * point. Textures are flipped, so y 0 (the picture's top) is v near 1.
 */
export function textureCrop (cover, crop) {
  const c = normalizeCrop(crop)
  const rX = cover.rX / c.zoom
  const rY = cover.rY / c.zoom
  return { rX, rY, oX: (1 - rX) * (c.x / 100), oY: (1 - rY) * (1 - c.y / 100) }
}

/**
 * The pictures one renderer shows, as the timeline reads and writes them:
 * `{ list, value(id, property), patch(id, values), hide(id, hidden) }`. Each entry has an `id` ('0'
 * for a single scene, the panel index on a split), `get()` its crop now, `set(crop)` to draw a new
 * one and `el()` the element the timeline's eye hides while the teacher works on what is in front.
 */
export function backgroundSource (entries) {
  const find = (id) => entries.find((e) => e.id === String(id))
  return {
    list: () => entries.map((e) => ({ id: e.id })),
    value: (id, property) => find(id)?.get()?.[property] ?? null,
    patch: (id, values) => {
      const e = find(id)
      if (e) e.set(normalizeCrop({ ...e.get(), ...values }))
    },
    hide: (id, hidden) => {
      const el = find(id)?.el?.()
      if (el) el.style.visibility = hidden ? 'hidden' : ''
    },
  }
}

/**
 * One background picture (a scene that is not split): its crop starts at `base` and every change
 * is drawn by `draw(crop)`. `draw` looks its element up when it runs, so a source made before the
 * picture is on screen still reaches it.
 */
export function singleSource ({ base = {}, draw, el = () => null }) {
  let crop = normalizeCrop(base)
  return backgroundSource([{ id: '0', get: () => crop, set: (c) => { crop = c; draw(c) }, el }])
}

/** Every cover picture ParallaxScene draws under `root`: its plates, cropped together. */
export const cropPlates = (root, crop) => {
  for (const img of root?.querySelectorAll?.('.px-layer-bg img') ?? []) cropImage(img, crop)
}

let published = ''

/**
 * Make `source` the backgrounds the timeline lists (null: none). The timeline re-reads its objects
 * only when the list itself changed, since the stage republishes on every scene load.
 */
export function publishBackgrounds (source) {
  window.__backgrounds = source
  const list = JSON.stringify(source?.list() ?? [])
  if (list === published) return
  published = list
  window.dispatchEvent(new CustomEvent('scene-objects-changed'))
}
