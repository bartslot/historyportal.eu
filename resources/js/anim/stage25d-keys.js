/**
 * stage25d-keys.js: a stage25d layer keeps its keys as the engine reads them (config.stage25d.set.layers[i].keys:
 * `{ t, x?, z?, y?, scale?, opacity?, rotation? }`), the timeline keeps one track per property
 * (`s25:layer-3` / `x` / keyframes `{ time, value }`). This is the one place that converts between them, both ways.
 */
import { sameTime } from './keyframes.js'
import { BONE_ROWS } from './properties.js'

/** The properties of a layer the engine can move (engine-mvp stage25d/layout.ts layerAt). */
export const LAYER_KEY_FIELDS = ['x', 'z', 'y', 'scale', 'opacity', 'rotation', ...BONE_ROWS]

/** A figure's expression (a string that steps, layout.ts faceAt): its own row, next to the numbers. */
export const FACE_FIELD = 'face'

const valueOk = (property, v) => (property === FACE_FIELD ? typeof v === 'string' && v !== '' : Number.isFinite(v))

/** Layers' keys → timeline tracks. `items`: `[{ id: 'layer-3', keys: [...] }]` (stage.items()). A key's `ease`
 *  ('smooth', an animation preset's) rides on each of its keyframes, so it comes back with them. */
export const tracksFromKeys = (items) => items.flatMap((item) => [...LAYER_KEY_FIELDS, FACE_FIELD].flatMap((property) => {
  const keyframes = (item.keys ?? [])
    .filter((k) => valueOk(property, k[property]))
    .map((k) => ({ time: k.t, value: k[property], ...(k.ease ? { ease: k.ease } : {}) }))
    .sort((a, b) => a.time - b.time)
  return keyframes.length ? [{ target: `s25:${item.id}`, property, keyframes }] : []
}))

/** Timeline tracks → `{ 'layer-3': [keys sorted by t] }`. Tracks of other kinds are ignored. */
export const keysFromTracks = (tracks) => {
  const byLayer = {}
  for (const track of tracks ?? []) {
    const [kind, id] = String(track.target).split(':')
    if (kind !== 's25' || !(LAYER_KEY_FIELDS.includes(track.property) || track.property === FACE_FIELD)) continue
    const keys = (byLayer[id] ??= [])
    for (const { time, value, ease } of track.keyframes ?? []) {
      if (!Number.isFinite(time) || !valueOk(track.property, value)) continue
      let key = keys.find((k) => sameTime(k.t, time))
      if (!key) keys.push(key = { t: time })
      key[track.property] = value
      if (ease && track.property !== FACE_FIELD) key.ease = ease
    }
  }
  for (const keys of Object.values(byLayer)) keys.sort((a, b) => a.t - b.t)
  return byLayer
}
