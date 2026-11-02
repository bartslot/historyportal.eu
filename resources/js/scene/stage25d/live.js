/**
 * stage25d/live: what a teacher can change on a layer WITHOUT rebuilding the stage, and the ids the editor
 * uses for the rows. Pure, so the editor, the engine and the tests agree on one definition.
 */

/** Layer fields that move or restyle a built picture. Anything else (asset, depth, need, flat) is a rebuild. */
export const EDITABLE = ['x', 'y', 'scale', 'rotation', 'opacity', 'keys']

/** 'layer-3' -> 3; anything else (the camera) -> -1. */
export const layerIndex = (id) => {
  const m = /^layer-(\d+)$/.exec(String(id))
  return m ? Number(m[1]) : -1
}

const without = (layer) => Object.fromEntries(Object.entries(layer).filter(([k]) => !EDITABLE.includes(k)))

/** The config minus the editable layer fields: equal signatures = the same set, nothing to rebuild. */
export const structureSig = (cfg) => JSON.stringify({ ...cfg, set: { ...cfg?.set, layers: (cfg?.set?.layers ?? []).map(without) } })

/** Only the editable layer fields: changes when the server's copy of an edit changes (undo, redo, import). */
export const editSig = (cfg) => JSON.stringify((cfg?.set?.layers ?? []).map((l) => EDITABLE.map((f) => l[f] ?? null)))
