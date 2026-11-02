/**
 * stage25d/live: what a teacher can change on a layer WITHOUT rebuilding the stage, and the ids the editor
 * uses for the rows. Pure, so the editor, the engine and the tests agree on one definition.
 */

/** Layer fields that move or restyle a built picture. Anything else (asset, depth, need, flat) is a rebuild. */
export const EDITABLE = ['x', 'y', 'z', 'scale', 'rotation', 'opacity', 'keys']

/** 'layer-3' -> 3; anything else (the camera) -> -1. */
export const layerIndex = (id) => {
  const m = /^layer-(\d+)$/.exec(String(id))
  return m ? Number(m[1]) : -1
}

const without = (layer) => Object.fromEntries(Object.entries(layer).filter(([k]) => !EDITABLE.includes(k)))

/** The config minus the editable fields of the layers, the ground bands and the sky picture: equal signatures = the
 *  same set, nothing to rebuild. */
export const structureSig = (cfg) => {
  const { layers = [], groundBands = [], skyLayer = {}, ...rest } = cfg?.set ?? {}
  return JSON.stringify({ ...cfg, set: { ...rest, layers: layers.map(without), groundBands: groundBands.map(without), skyLayer: without(skyLayer) } })
}

const edits = (l) => EDITABLE.map((f) => l?.[f] ?? null)

/** Only the editable fields: changes when the server's copy of an edit changes (undo, redo, import). */
export const editSig = (cfg) => JSON.stringify([
  (cfg?.set?.layers ?? []).map(edits), (cfg?.set?.groundBands ?? []).map(edits), edits(cfg?.set?.skyLayer),
])
