/**
 * timeline-cut.js — the cut tool's half in the browser (Bart, 2026-11-24: "there should be a cut tool,
 * splitting up clips"). A scene cut at the playhead becomes two scenes (app/Services/Editor/SceneCut.php);
 * this splits the scene's keys between them with the very sampling that plays them, so neither piece
 * jumps at the cut: the first ends on the value the scene had there, the second starts on it.
 *
 * Pure: tracks in, two new lists of tracks out.
 */
import { sortedKeys, sameTime } from './keyframes.js'
import { sampleFrame } from './properties.js'

/** The key in force at `time`: a word row (an expression) steps from key to key, it never blends. */
const stepAt = (keys, time) => {
  const before = keys.filter((k) => k.time <= time || sameTime(k.time, time))
  return (before.length ? before[before.length - 1] : keys[0]).value
}

/** What a track shows at `time`: the shared sampler's value for a number, the key in force for a word or a row it does not know. */
const valueAt = (track, keys, time) => {
  if (keys.some((k) => typeof k.value !== 'number')) return stepAt(keys, time)
  const sampled = sampleFrame([track], time)[track.target]?.[track.property]
  return Number.isFinite(sampled) ? sampled : stepAt(keys, time)
}

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

    // The key on the cut keeps its easing in the second piece: it is the one that leaves from there.
    const atCut = { time: round(at), value: hold }
    first.push({ ...rest, keyframes: [...before, atCut] })
    second.push({
      ...rest,
      keyframes: [
        { ...(on?.easing ? { easing: on.easing } : {}), time: 0, value: hold },
        ...after.map((k) => ({ ...k, time: round(k.time - at) })),
      ],
    })
  }
  return { first, second }
}
