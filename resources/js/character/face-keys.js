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

/** Alpine: the Expression row of a figure whose puppet has faces (stage25d-inspector, character-expressions.blade.php). */
export function characterExpressions (layerId) {
  return {
    order: EXPRESSIONS,
    /** Key this expression at the playhead. */
    key (face) {
      const keying = window.__timelineKeying
      if (!keying?.setLayerKeys) return
      const target = `s25_${layerId}`
      keying.setLayerKeys(target, withFace(keying.layerKeys(target), keying.time(), face))
    },
  }
}
