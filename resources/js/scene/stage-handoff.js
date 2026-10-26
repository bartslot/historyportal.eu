/**
 * Whatever is leaving the player's layer host (a layered panel, a split stage of comic panels), as
 * ONE `replaces` handle for ParallaxScene.show: it stays on screen until the incoming panel is
 * drawn, then goes, after `lingerMs` when that panel slides, wipes or dissolves in over it.
 *
 * A split stage used to be torn down the moment the next panel was asked for, so the next panel
 * faded in over the flat layer underneath: a picture from scenes before (Bart, 2026-10-24).
 * Null when nothing is leaving.
 */
export function outgoingStages (...stages) {
  const live = stages.filter(Boolean)
  if (!live.length) return null

  return {
    destroy (lingerMs = 0) {
      for (const stage of live) {
        if (lingerMs > 0) setTimeout(() => stage.destroy(), lingerMs)
        else stage.destroy()
      }
    },
  }
}

/** The flat layers hold an older picture once something covers them: hide them, so no gap shows it. */
export function hideFlatLayers (layers) {
  for (const el of layers) if (el) Object.assign(el.style, { transition: 'none', opacity: '0' })
}
