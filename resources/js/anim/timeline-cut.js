/**
 * timeline-cut.js — the cut tool's half in the browser (Bart, 2026-11-24: "there should be a cut tool,
 * splitting up clips"). A scene cut at the playhead becomes two scenes (app/Services/Editor/SceneCut.php);
 * this splits the scene's keys between them with the very sampling that plays them, so neither piece
 * jumps at the cut: the first ends on the value the scene had there, the second starts on it.
 *
 * Pure: tracks in, two new lists of tracks out.
 */
import { sortedKeys, sameTime, segmentEasing } from './keyframes.js'
import { sampleFrame, propertyFor, kindOfTarget } from './properties.js'

/** The key in force at `time`: a word row (an expression) steps from key to key, it never blends. */
const stepAt = (keys, time) => {
  const before = keys.filter((k) => k.time <= time || sameTime(k.time, time))
  return (before.length ? before[before.length - 1] : keys[0]).value
}

/** What a track shows at `time`: the shared sampler's value (numbers and colours blend), the key in force for a row that steps. */
const valueAt = (track, keys, time) => {
  const descriptor = propertyFor(kindOfTarget(track.target), track.property)
  if (!descriptor || descriptor.interpolate === 'step') return stepAt(keys, time)
  const sampled = sampleFrame([track], time)[track.target]?.[track.property]
  return Number.isFinite(sampled) || (typeof sampled === 'string' && sampled !== '') ? sampled : stepAt(keys, time)
}

/**
 * The easing each segment had in the whole scene, written onto a piece's keys only where the piece
 * would otherwise pick another default (keyframes.js segmentEasing goes by position: a segment that
 * was in the middle becomes the first or the last). Untouched segments play exactly as before; the
 * segment the cut falls in keeps its curve on both sides. A key that ends the piece carries none.
 */
const keepEasing = (track, keys) => keys.map(({ was, ...k }, i) => {
  if (i === keys.length - 1) return was?.chosen ? { ...k, easing: was.easing } : k
  if (k.easing || !was) return k
  return segmentEasing(k, i, keys.length - 1, track) === was.easing ? k : { ...k, easing: was.easing }
})

const round = (t) => Math.round(t * 1000) / 1000

/**
 * The keys of a scene cut at `at` seconds, as `{ first, second }`. The first piece keeps the keys up to
 * the cut and holds the value there; the second starts on that value at 0 and keeps the keys after the
 * cut, `at` seconds earlier. A row that is still on one side holds one key there, its value.
 */
export const cutTracks = (tracks, at) => {
  const first = []
  const second = []
  for (const track of tracks ?? []) {
    const keys = sortedKeys(track)
    if (!keys.length) continue
    const hold = valueAt(track, keys, at)
    const on = keys.find((k) => sameTime(k.time, at))
    const before = keys.filter((k) => k.time < at && !sameTime(k.time, at))
    const after = keys.filter((k) => k.time > at && !sameTime(k.time, at))
    const { keyframes: _, ...rest } = track
    // The easing that leaves each key in the whole scene, and the segment the cut falls in.
    const was = (k) => {
      const i = keys.indexOf(k)
      return i < keys.length - 1 ? { easing: segmentEasing(k, i, keys.length - 1, track), chosen: Boolean(k.easing) } : (k.easing ? { easing: k.easing, chosen: true } : null)
    }
    const straddle = before.length && !on ? was(before[before.length - 1]) : null
    const leaving = on ? was(on) : straddle

    first.push({ ...rest, keyframes: keepEasing(track, [...before.map((k) => ({ ...k, was: was(k) })), { time: round(at), value: hold }]) })
    second.push({
      ...rest,
      keyframes: keepEasing(track, [
        { time: 0, value: hold, ...(leaving?.chosen ? { easing: leaving.easing } : {}), was: after.length ? leaving : null },
        ...after.map((k) => ({ ...k, time: round(k.time - at), was: was(k) })),
      ]),
    })
  }
  return { first, second }
}
