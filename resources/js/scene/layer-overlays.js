/**
 * layer-overlays.js — finding the overlay a layer is actually being looked at in.
 *
 * A map or voyage scene has TWO artwork overlays alive at once: `__voyageArtworkLayer`, whose host
 * sits over the map, and `__lessonArtworkLayer`, the slideshow stage's. Both render the same
 * layers from the same data, so `[data-layer-id="art_232"]` matches two nodes.
 *
 * That bit the Format panel twice in one sitting:
 *
 *   • WRITES went to `__lessonArtworkLayer` only, so on a map scene every live preview in the
 *     panel — opacity, blur, the new Dimensions row — updated a node the teacher was not looking
 *     at. Nothing errored; the canvas simply did not move until the value was saved and the scene
 *     re-rendered.
 *   • READS are worse than useless from the wrong one. The Dimensions row asks for the layer's
 *     width-to-height ratio in stage percentages, and that depends on the HOST's proportion — so
 *     measuring the stage's copy while the map's copy is on screen hands the aspect lock a
 *     proportion belonging to a different box.
 *
 * The voyage overlay is preferred for reads, matching the pin toggle, which has always reached for
 * its own handle first: "the shared one can be repointed by a slideshow render, and pinning the
 * wrong overlay's layer would silently do nothing."
 */

/** Every overlay currently on the page, most specific first. */
const all = () => [window.__voyageArtworkLayer, window.__lessonArtworkLayer].filter(Boolean)

/** Whether an overlay is rendering this layer right now. */
const owns = (overlay, assetId) =>
  !!overlay?._layers?.some((l) => String(l.asset_id) === String(assetId))

/**
 * The overlay to READ a layer from: the map's own, when it has it, else the stage's.
 * Returns null when nothing on the page is rendering the layer.
 */
export function layerOverlay (assetId) {
  return all().find((o) => owns(o, assetId)) ?? null
}

/**
 * Set a property on EVERY overlay rendering the layer.
 *
 * All of them, not just the preferred one: which copy is on screen depends on the scene kind and
 * on what a slideshow render last did, and a live preview that updates the wrong node is
 * indistinguishable from one that is broken.
 */
export function setLayerPropEverywhere (assetId, key, value) {
  all().forEach((o) => {
    if (owns(o, assetId)) o.setLayerProp?.(assetId, key, value)
  })
}
