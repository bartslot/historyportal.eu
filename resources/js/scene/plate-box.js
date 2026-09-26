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
 * A null aspect puts it back to the full stage. Returns the observer's disconnect.
 */
export function fitToPlate (el, stageEl, aspect) {
  el.__plateObserver?.disconnect()
  el.__plateObserver = null
  if (!aspect) {
    for (const k of ['left', 'top', 'width', 'height', 'right', 'bottom']) el.style.removeProperty(k)
    return () => {}
  }
  const apply = () => {
    const b = containBox(stageEl.clientWidth, stageEl.clientHeight, aspect)
    Object.assign(el.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`, right: 'auto', bottom: 'auto' })
  }
  apply()
  if (typeof ResizeObserver === 'function') {
    el.__plateObserver = new ResizeObserver(apply)
    el.__plateObserver.observe(stageEl)
  }

  return () => { el.__plateObserver?.disconnect(); el.__plateObserver = null }
}
