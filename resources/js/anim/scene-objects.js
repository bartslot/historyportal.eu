/**
 * scene-objects.js — what is on the scene that can be animated.
 *
 * Bart, on the first draft: *"These are all layers — camera should be added to maps for example."*
 * So the timeline's rows are the scene's OBJECTS. Text layers are already there and need no adding;
 * a camera is the one an author puts on a map.
 *
 * Read from the live overlay, which is the same place the Object list panel reads
 * (`objectList()` in step3-scene-configurator.blade.php). That panel does more — ordering,
 * icons, drag-reordering — and should come through here too rather than keep its own copy.
 */

/** Text layers, front-most first, in the order the Object list shows them. */
export const textObjects = () => {
  const texts = window.__lessonTextLayer?._texts ?? []
  return texts.map((t) => ({
    target: `${t.kind === 'rect' ? 'rect' : 'text'}:${t.id}`,
    kind: t.kind === 'rect' ? 'rect' : 'text',
    label: t.kind === 'rect'
      ? `${t.side || 'left'} half`
      : (String(t.text || 'Text').trim().slice(0, 28) || 'Text'),
  }))
}

/** Artwork layers — icons, paintings, embeds — from whichever overlay is actually on screen. */
export const artObjects = () => {
  const overlay = window.__artOverlay?.() ?? window.__lessonArtworkLayer
  return [...(overlay?._layers ?? [])].reverse().map((l) => ({
    target: `art:${l.asset_id}`,
    kind: 'art',
    label: l.title || (l.embed ? (l.embed.type === 'video' ? 'Video' : '3D model') : 'Icon'),
  }))
}

/** Speech and thought balloons (config.lines), as the Object list shows them: `bal_3` → `bal:3`. */
export const balloonObjects = () => (window.__balloons?.list() ?? []).map((b) => ({
  target: `bal:${String(b.id).slice(4)}`,
  kind: 'bal',
  label: String(b.text || '').trim().slice(0, 28) || 'Balloon',
  start: b.start,
  end: b.end,
}))

/**
 * Diorama items (config.diorama), front-most last like the stage lists them. They have no property
 * rows: an item's movement is ONE clip, its path, moved and stretched as a whole (clip.js).
 */
export const dioramaObjects = () => (window.__diorama?.items() ?? []).map((i) => ({
  target: `dio:${i.id}`,
  kind: 'dio',
  label: i.label || i.id,
}))

/** Read one animatable property off the live layer, so a row never shows a number nothing uses. */
export const readObjectProperty = (target, property) => {
  const [kind, id] = String(target).split(':')

  if (kind === 'art') {
    const overlay = window.__artOverlay?.() ?? window.__lessonArtworkLayer
    const layer = (overlay?._layers ?? []).find((l) => String(l.asset_id) === id)
    const value = layer?.[property]
    if (Number.isFinite(value)) return value
    if (property === 'tint') return typeof value === 'string' ? value : ''
    // No explicit width: the layer takes it from the picture's aspect. Read the width it is drawn
    // at, in the same units as its height (the Dimensions row does the same), or the row shows 0
    // and its diamond keys a zero-width layer.
    const ratio = property === 'width' ? overlay?.measure?.(id)?.ratio : null
    return Number.isFinite(ratio) && Number.isFinite(layer?.height) ? Math.round(ratio * layer.height * 10) / 10 : null
  }

  if (kind === 'bal') return window.__balloons?.value?.(`bal_${id}`, property) ?? null
  if (kind !== 'text' && kind !== 'rect') return null
  const item = (window.__lessonTextLayer?._texts ?? []).find((t) => String(t.id) === id)
  const value = item?.[property]
  if (property === 'color' && kind === 'text') return typeof value === 'string' && value ? value : TEXT_LOOK.color
  if (Number.isFinite(value)) return value
  // An unset look reads what it is drawn at: a diamond keys what the row shows, and 0 would key a
  // text to nothing at scale or opacity.
  if (kind === 'text' && item && property in TEXT_LOOK) return TEXT_LOOK[property]
  // No stored width: the box wraps to its content. Read the width it is drawn at.
  if (kind === 'text' && property === 'w') return measuredWidth(id)
  return null
}

/** What TextOverlayLayer draws a text with when the field is not set. */
const TEXT_LOOK = { color: '#f8fafc', colorOpacity: 1, scale: 1, rotation: 0, blur: 0, opacity: 1 }

/** A text box's drawn width, as a % of the stage, or null while it is not on screen. */
const measuredWidth = (id) => {
  const host = window.__lessonTextLayer?.host
  const node = host?.querySelector?.(`[data-text-id="${CSS.escape(id)}"]`)
  const w = node?.offsetWidth
  const hostW = host?.clientWidth
  return w && hostW ? Math.round((w / hostW) * 1000) / 10 : null
}

/**
 * Take an object off the canvas, or put it back — the eye on its timeline row.
 *
 * A WORKING state, not lesson data, so it is written straight onto the rendered node and never
 * saved. Hiding a title while you position the one behind it must not follow the lesson to a
 * classroom, and a flag that persisted would do exactly that.
 *
 * Every match is hidden, not the first: a map or voyage scene keeps TWO artwork overlays alive
 * over the same layers, so hiding one node leaves the copy nobody was looking at on screen.
 */
export const setObjectHidden = (target, hidden) => {
  const [kind, id] = String(target).split(':')
  const selector = kind === 'art'
    ? `[data-layer-id="art_${id}"], [data-layer-chrome="art_${id}"]`
    : kind === 'bal' ? `[data-balloon-id="bal_${id}"]` : `[data-text-id="${id}"]`

  for (const node of document.querySelectorAll(selector)) {
    node.style.visibility = hidden ? 'hidden' : ''
  }
}

/** Put one property back on the live layer. */
export const writeObjectProperty = (target, property, value) => {
  const [kind, id] = String(target).split(':')

  // A map or voyage scene keeps TWO artwork overlays alive over the same layers, so this has to go
  // through the helper that reaches both — see resources/js/scene/layer-overlays.js.
  if (kind === 'art') return void window.__setLayerProp?.(id, property, value)
  if (kind === 'bal') return void window.__balloons?.patch?.(`bal_${id}`, { [property]: value })

  if (kind !== 'text' && kind !== 'rect') return
  window.__lessonTextLayer?.patch?.(id, { [property]: value })
}
