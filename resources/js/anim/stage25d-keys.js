/**
 * stage25d-keys.js: a stage25d layer keeps its keys as the engine reads them (config.stage25d.set.layers[i].keys:
 * `{ t, x?, y?, scale?, opacity?, rotation? }`), the timeline keeps one track per property
 * (`s25:layer-3` / `x` / keyframes `{ time, value }`). This is the one place that converts between them, both ways.
 */
import { sameTime } from './keyframes.js'

/** The properties of a layer the engine can move (engine-mvp stage25d/layout.ts layerAt). */
export const LAYER_KEY_FIELDS = ['x', 'y', 'scale', 'opacity', 'rotation']

/** Layers' keys → timeline tracks. `items`: `[{ id: 'layer-3', keys: [...] }]` (stage.items()). */
export const tracksFromKeys = (items) => items.flatMap((item) => LAYER_KEY_FIELDS.flatMap((property) => {
  const keyframes = (item.keys ?? [])
    .filter((k) => Number.isFinite(k[property]))
    .map((k) => ({ time: k.t, value: k[property] }))
    .sort((a, b) => a.time - b.time)
  return keyframes.length ? [{ target: `s25:${item.id}`, property, keyframes }] : []
}))

/** Timeline tracks → `{ 'layer-3': [keys sorted by t] }`. Tracks of other kinds are ignored. */
export const keysFromTracks = (tracks) => {
  const byLayer = {}
  for (const track of tracks ?? []) {
    const [kind, id] = String(track.target).split(':')
    if (kind !== 's25' || !LAYER_KEY_FIELDS.includes(track.property)) continue
    const keys = (byLayer[id] ??= [])
    for (const { time, value } of track.keyframes ?? []) {
      if (!Number.isFinite(time) || !Number.isFinite(value)) continue
      const key = keys.find((k) => sameTime(k.t, time))
      if (key) key[track.property] = value
      else keys.push({ t: time, [track.property]: value })
    }
  }
  for (const keys of Object.values(byLayer)) keys.sort((a, b) => a.t - b.t)
  return byLayer
}
