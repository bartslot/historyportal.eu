/**
 * An expression keyed on a figure's timeline (LayerKey.face, stage25d layout.ts faceAt): the inspector's Expression row
 * writes one at the playhead through the timeline (window.__timelineKeying), so it is an ordinary key: it shows in the
 * figure's face row, moves with a drag and goes with one undo.
 */
import { EXPRESSIONS } from './recipe.js'

const SAME_T = 0.01   // s: a key this close to the playhead is the key at the playhead

/** The keys with `face` at time t: set on the key already there, else a key of its own; a new array, the old untouched. */
export function withFace (keys, t, face) {
  const at = keys.findIndex((k) => Math.abs(k.t - t) < SAME_T)
  if (at >= 0) return keys.map((k, i) => (i === at ? { ...k, face } : k))
  return [...keys, { t: Math.round(t * 1000) / 1000, face }].sort((a, b) => a.t - b.t)
}

/** The expression the keys show at time t: the last face key at or before it (layout.ts faceAt), else calm. */
export function faceAtTime (keys, t) {
  let at = -Infinity, face = 'calm'
  for (const k of keys ?? []) if (typeof k.face === 'string' && k.t <= t + 1e-6 && k.t >= at) { at = k.t; face = k.face }
  return face
}

/** The timeline's Expression row (animation-timeline.blade.php): the face at the playhead, and a new one keyed there. */
export const timelineFace = {
  at (target) {
    const keying = window.__timelineKeying
    return keying ? faceAtTime(keying.layerKeys(target), keying.time()) : 'calm'
  },
  key (target, face) {
    const keying = window.__timelineKeying
    if (keying?.setLayerKeys) keying.setLayerKeys(target, withFace(keying.layerKeys(target), keying.time(), face))
  },
}

/** Alpine: the Expression row of a figure whose puppet has faces (stage25d-inspector, character-expressions.blade.php). */
export function characterExpressions (layerId) {
  return {
    order: EXPRESSIONS,
    /** Key this expression at the playhead. */
    key (face) {
      const keying = window.__timelineKeying
      if (!keying?.setLayerKeys) return
      const target = `s25:${layerId}`   // the timeline's own track target (presets-picker uses the same)
      keying.setLayerKeys(target, withFace(keying.layerKeys(target), keying.time(), face))
    },
  }
}
