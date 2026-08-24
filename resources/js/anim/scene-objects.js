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

/** Read one animatable property off the live layer, so a row never shows a number nothing uses. */
export const readObjectProperty = (target, property) => {
  const [kind, id] = String(target).split(':')

  if (kind === 'art') {
    const overlay = window.__artOverlay?.() ?? window.__lessonArtworkLayer
    const layer = (overlay?._layers ?? []).find((l) => String(l.asset_id) === id)
    const value = layer?.[property]
    return Number.isFinite(value) ? value : null
  }

  if (kind !== 'text' && kind !== 'rect') return null
  const item = (window.__lessonTextLayer?._texts ?? []).find((t) => String(t.id) === id)
  const value = item?.[property]
  return Number.isFinite(value) ? value : null
}

/** Put one property back on the live layer. */
export const writeObjectProperty = (target, property, value) => {
  const [kind, id] = String(target).split(':')

  // A map or voyage scene keeps TWO artwork overlays alive over the same layers, so this has to go
  // through the helper that reaches both — see resources/js/scene/layer-overlays.js.
  if (kind === 'art') return void window.__setLayerProp?.(id, property, value)

  if (kind !== 'text' && kind !== 'rect') return
  window.__lessonTextLayer?.patch?.(id, { [property]: value })
}
