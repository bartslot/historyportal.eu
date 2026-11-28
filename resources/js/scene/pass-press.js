/**
 * pass-press: hand a press on to whatever is under a layer, as if the layer were not there (a locked layer, or the empty
 * pixels of a cut-out). One definition for ArtworkOverlay and TextOverlayLayer.
 *
 * The node stays out of hit-testing until the press has been handed on, so a layer under it that passes the press too
 * hands it on further, never back.
 */
export function passPress (node, e) {
  node.style.pointerEvents = 'none'
  try {
    document.elementFromPoint(e.clientX, e.clientY)?.dispatchEvent(new PointerEvent(e.type, e))
  } finally {
    node.style.pointerEvents = 'auto'
  }
}
