/**
 * The PLATE box: where a scene's backdrop shows WHOLE ("Whole image", background_fit 'contain')
 * inside the stage, letterboxed. The backdrop plane and the figure layers both live in this box,
 * so a figure's x/y (% of the box) stays on the same spot of the drawn floor at any stage size.
 *
 * Shared by the editor canvas (wizard-bridge.js) and the player (lesson-player.js) through
 * ParallaxScene and the ArtworkOverlay host: the same rule in every renderer.
 */

/** Contain-fit of a plate with aspect `aspect` (w/h) in a W×H stage, in px. Null aspect = the whole stage. */
export function containBox (stageW, stageH, aspect) {
  if (!(aspect > 0) || !(stageW > 0) || !(stageH > 0)) return { left: 0, top: 0, width: stageW, height: stageH }
  const width = Math.min(stageW, stageH * aspect)
  const height = width / aspect

  return { left: (stageW - width) / 2, top: (stageH - height) / 2, width, height }
}

/**
 * The plate's box at any stage shape. Landscape: contain (the whole plate, letterboxed). Portrait
 * (a phone held upright): a 16:9 plate contained there is a thin strip of tiny figures, so it is
 * cover-fitted instead, centred horizontally on the scene's subject (subjectFocusX of `layers`) and
 * clamped so the crop never runs past the plate's edge. The box simply grows past the stage;
 * figures keep their x/y in it, so they stay on their floor spot.
 */
export function plateBox (stageW, stageH, aspect, layers = null) {
  if (!(aspect > 0) || !(stageW > 0) || !(stageH > 0) || stageW >= stageH) return containBox(stageW, stageH, aspect)
  const height = Math.max(stageH, stageW / aspect)
  const width = height * aspect
  const fx = subjectFocusX(layers, stageW / width) ?? 0.5
  const left = Math.min(0, Math.max(stageW - width, stageW / 2 - fx * width))

  return { left, top: (stageH - height) / 2, width, height }
}

/** Share of the visible width the people's centres may span and still all be framed (the rest is their own width). */
const GROUP_FIT = 0.8

/**
 * Where a scene's subject stands, as a 0..1 fraction of the plate's width, for a crop that shows
 * `span` (0..1) of it. When the people fit in that window: their centroid, weighted by height. When
 * they cannot (a street scene with figures across the whole plate), a centroid lands BETWEEN them,
 * on nobody, so the crop centres on the tallest person instead: the one the scene is staged around.
 *
 * x is a layer's centre, in % of the plate. Library figures (/figures/) are the people; the nature/
 * shelf (a cypress, clouds, birds) only counts when a scene has no people at all. Null = no figures.
 */
export function subjectFocusX (layers, span = 1) {
  const figs = (Array.isArray(layers) ? layers : []).filter(l => l?.kind === 'figure' && Number.isFinite(l.x))
  // ponytail: "/figures/" is the art library's own shelf name; a per-layer subject flag if non-library figures ever need it.
  const people = figs.filter(l => /\/figures\//.test(String(l.url || l.path || '')))
  const use = people.length ? people : figs
  if (!use.length) return null
  const weight = l => Math.max(0, Number(l.height) || 1)
  const xs = use.map(l => l.x)
  if (Math.max(...xs) - Math.min(...xs) > span * 100 * GROUP_FIT) {
    return use.reduce((a, l) => (weight(l) > weight(a) ? l : a)).x / 100
  }
  const total = use.reduce((a, l) => a + weight(l), 0)

  return use.reduce((a, l) => a + l.x * weight(l), 0) / total / 100
}

const aspects = new Map()

/** Natural w/h of an image url, once per url. Resolves null when it will not load. */
export function plateAspect (url) {
  const key = String(url || '').split('?')[0]
  if (!key) return Promise.resolve(null)
  if (!aspects.has(key)) {
    aspects.set(key, new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null)
      img.onerror = () => resolve(null)
      img.src = url
    }))
  }

  return aspects.get(key)
}

/**
 * Keep `el` (absolutely positioned) on the plate's box inside `stageEl`, following resizes.
 * `layers` are the scene's layers, for where a portrait crop centres (plateBox). A null aspect puts
 * it back to the full stage. Returns the observer's disconnect.
 */
export function fitToPlate (el, stageEl, aspect, layers = null) {
  el.__plateObserver?.disconnect()
  el.__plateObserver = null
  if (!aspect) {
    for (const k of ['left', 'top', 'width', 'height', 'right', 'bottom']) el.style.removeProperty(k)
    return () => {}
  }
  const apply = () => {
    const b = plateBox(stageEl.clientWidth, stageEl.clientHeight, aspect, layers)
    Object.assign(el.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`, right: 'auto', bottom: 'auto' })
  }
  apply()
  if (typeof ResizeObserver === 'function') {
    el.__plateObserver = new ResizeObserver(apply)
    el.__plateObserver.observe(stageEl)
  }

  return () => { el.__plateObserver?.disconnect(); el.__plateObserver = null }
}
