/**
 * timeline-cut.js — the cut tool's half in the browser (Bart, 2026-11-24: "there should be a cut tool,
 * splitting up clips"). A scene cut at the playhead becomes two scenes (app/Services/Editor/SceneCut.php);
 * this splits the scene's keys between them with the very sampling that plays them, so neither piece
 * jumps at the cut: the first ends on the value the scene had there, the second starts on it.
 *
 * A 2.5D stage row (s25:…) is sampled with the stage's own key code (layout.ts keyedAt), and the stage's
 * camera is split with its framing code (framing.js), because that is what plays them.
 *
 * Pure: tracks in, two new lists of tracks out.
 */
import { keyedAt } from '@stage25d/stage25d/layout'
import { sortedKeys, sameTime, segmentEasing } from './keyframes.js'
import { sampleFrame, propertyFor, kindOfTarget } from './properties.js'
import { cameraPoseAt, shotsOfKeys, withCameraKey } from '../scene/stage25d/framing.js'

/** The key in force at `time`: a word row (an expression) steps from key to key, it never blends. */
const stepAt = (keys, time) => {
  const before = keys.filter((k) => k.time <= time || sameTime(k.time, time))
  return (before.length ? before[before.length - 1] : keys[0]).value
}

const isStageRow = (track) => kindOfTarget(track.target) === 's25'

/** What a track shows at `time`: the stage's value for a stage row, the shared sampler's for the rest (numbers and colours
 *  blend), the key in force for a row that steps. */
const valueAt = (track, keys, time) => {
  if (isStageRow(track) && keys.every((k) => Number.isFinite(k.value))) {
    return keyedAt(keys.map((k) => ({ t: k.time, [track.property]: k.value, ...(k.ease ? { ease: k.ease } : {}) })), track.property, time)
  }
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

    if (isStageRow(track)) {
      // The stage eases every segment in-out, or smooth from the key's own `ease`: the key on the cut keeps the ease of
      // the segment it splits, and nothing else changes.
      const ease = (on ?? before[before.length - 1])?.ease
      first.push({ ...rest, keyframes: [...before, { time: round(at), value: hold }] })
      second.push({ ...rest, keyframes: [{ time: 0, value: hold, ...(ease ? { ease } : {}) }, ...after.map((k) => ({ ...k, time: round(k.time - at) }))] })
      continue
    }
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

/**
 * The stage's camera cut at `at` (framing.js keys: `[{ t, pose }]`, as the stage's cameraInfo() gives them), as the shots
 * of each piece: the first ends on the framing at the cut, the second starts on it and keeps the keys after it, earlier
 * by `at`. Null with no camera keys.
 */
export const cutCamera = (keys, at, dur) => {
  if (!keys?.length) return null
  const [cam = null, ...more] = shotsOfKeys(keys)
  const pose = cameraPoseAt(cam, more, at, dur)
  const firstKeys = withCameraKey(keys.filter((k) => k.t < at), at, pose)
  const secondKeys = withCameraKey(keys.filter((k) => k.t > at).map((k) => ({ ...k, t: round(k.t - at) })), 0, pose)
  const shots = (list) => { const [camera = null, ...rest] = shotsOfKeys(list); return { camera, camera_more: rest } }
  return { first: shots(firstKeys), second: shots(secondKeys) }
}
