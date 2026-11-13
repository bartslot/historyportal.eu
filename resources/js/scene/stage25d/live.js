/**
 * stage25d/live: what a teacher can change on a layer WITHOUT rebuilding the stage, and the ids the editor
 * uses for the rows. Pure, so the editor, the engine and the tests agree on one definition.
 */

/** Layer fields that move or restyle a built picture (play: an animation's speed and start), and the speaker handle a balloon points at (`figure`: the stage
 *  only reads it to find a head). Anything else (asset, depth, need, flat) is a rebuild. */
export const EDITABLE = ['x', 'y', 'z', 'scale', 'rotation', 'opacity', 'keys', 'figure', 'play', 'outline', 'etch']

/** A bone's turn (`bone:head`) is an editable field too: which bones a figure has is up to its puppet. */
export const isBoneField = (field) => field.startsWith('bone:')

/** The bone fields of a layer, as they are. */
export const boneFields = (layer) => Object.fromEntries(Object.entries(layer ?? {}).filter(([k]) => isBoneField(k)))

/** 'layer-3' -> 3; anything else (the camera) -> -1. */
export const layerIndex = (id) => {
  const m = /^layer-(\d+)$/.exec(String(id))
  return m ? Number(m[1]) : -1
}

const without = (layer) => Object.fromEntries(Object.entries(layer).filter(([k]) => !EDITABLE.includes(k) && !isBoneField(k)))

/** The scene draws its own sky (set.daylight, daylight.ts isDynamic) instead of loading its sky picture. */
const ownSky = (daylight) => !!daylight && !daylight.painted

/** The config minus the editable fields of the layers, the ground bands and the sky picture, the camera move, the look
 *  sliders and the time of day: equal signatures = the same set, nothing to rebuild. Only whether the scene paints its
 *  own sky is structure (a painted sky has a picture to load). */
export const structureSig = (cfg) => {
  const { layers = [], groundBands = [], skyLayer = {}, daylight, soil, ...rest } = cfg?.set ?? {}   // the soil colour is live (stage.ts resoil), never a rebuild
  const { camera, camera_more, camera_motion, look, ...unframed } = cfg ?? {}   // the camera is framed live (framing.js), never a rebuild
  return JSON.stringify({ ...unframed, set: { ...rest, ownSky: ownSky(daylight), layers: layers.map(without), groundBands: groundBands.map(without), skyLayer: without(skyLayer) } })
}

const edits = (l) => [...EDITABLE.map((f) => l?.[f] ?? null), boneFields(l)]

/** Only the editable fields, the camera move, the time of day and the look: changes when the server's copy of an edit
 *  changes (undo, redo, import). */
export const editSig = (cfg) => JSON.stringify([
  (cfg?.set?.layers ?? []).map(edits), (cfg?.set?.groundBands ?? []).map(edits), edits(cfg?.set?.skyLayer), cfg?.camera ?? null, cfg?.camera_more ?? [], cfg?.camera_motion ?? null,
  cfg?.set?.daylight ?? null, cfg?.look ?? {}, cfg?.set?.soil ?? null,
])

/** A picture set below the floor (its y, or any key's, under 0): a close-up framed by the teacher, a portrait or a bust,
 *  not a figure standing in the world. Its corners resize it where it is (resizedInPlace), never by distance. */
export const isSunk = (layer) => (layer?.y ?? 0) < 0 || (layer?.keys ?? []).some((k) => (k.y ?? 0) < 0)

/**
 * A sunk picture made `scale` big about its middle, so its framing stays (Bart 11-13: "resize in place"): its height
 * (y, and every key's y with it, so a breathing bob keeps its shape) moves by half of what the size grew.
 * `heightM`: the picture's height in metres at scale 1.
 */
export function resizedInPlace (layer, scale, heightM) {
  const dy = (heightM * ((layer.scale ?? 1) - scale)) / 2
  const shift = (y) => Math.round((y + dy) * 1000) / 1000
  const keys = layer.keys?.some((k) => k.y !== undefined) ? layer.keys.map((k) => (k.y === undefined ? k : { ...k, y: shift(k.y) })) : undefined
  return { scale, y: shift(layer.y ?? 0), ...(keys ? { keys } : {}) }
}
