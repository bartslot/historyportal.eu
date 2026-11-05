/**
 * stage25d/live: what a teacher can change on a layer WITHOUT rebuilding the stage, and the ids the editor
 * uses for the rows. Pure, so the editor, the engine and the tests agree on one definition.
 */

/** Layer fields that move or restyle a built picture (play: an animation's speed and start), and the speaker handle a balloon points at (`figure`: the stage
 *  only reads it to find a head). Anything else (asset, depth, need, flat) is a rebuild. */
export const EDITABLE = ['x', 'y', 'z', 'scale', 'rotation', 'opacity', 'keys', 'figure', 'play', 'outline', 'etch', 'bones']

/** 'layer-3' -> 3; anything else (the camera) -> -1. */
export const layerIndex = (id) => {
  const m = /^layer-(\d+)$/.exec(String(id))
  return m ? Number(m[1]) : -1
}

const without = (layer) => Object.fromEntries(Object.entries(layer).filter(([k]) => !EDITABLE.includes(k)))

/** The config minus the editable fields of the layers, the ground bands and the sky picture, and the camera move: equal
 *  signatures = the same set, nothing to rebuild. */
export const structureSig = (cfg) => {
  const { layers = [], groundBands = [], skyLayer = {}, ...rest } = cfg?.set ?? {}
  const { camera, camera_more, camera_motion, ...unframed } = cfg ?? {}   // the camera is framed live (framing.js), never a rebuild
  return JSON.stringify({ ...unframed, set: { ...rest, layers: layers.map(without), groundBands: groundBands.map(without), skyLayer: without(skyLayer) } })
}

const edits = (l) => EDITABLE.map((f) => l?.[f] ?? null)

/** Only the editable fields and the camera move: changes when the server's copy of an edit changes (undo, redo, import). */
export const editSig = (cfg) => JSON.stringify([
  (cfg?.set?.layers ?? []).map(edits), (cfg?.set?.groundBands ?? []).map(edits), edits(cfg?.set?.skyLayer), cfg?.camera ?? null, cfg?.camera_more ?? [], cfg?.camera_motion ?? null,
])
