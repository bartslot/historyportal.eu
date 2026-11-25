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
import { keyedAt, EASES, ease } from '@stage25d/stage25d/layout'
import { sortedKeys, sameTime, segmentEasing } from './keyframes.js'
import { sampleFrame, propertyFor, kindOfTarget } from './properties.js'
import { cameraPoseAt } from '../scene/stage25d/framing.js'

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
 * The stage's named ease that best draws part [u0, u1] of the curve `name` stretched over a whole move. Cut in half, an
 * in-out move is exactly an ease-in and then an ease-out, so the camera keeps its speed at the cut; elsewhere it is the
 * closest of the stage's eases, and the ends are exact. In-out first: a part that is the whole curve keeps it.
 */
const EASE_NAMES = ['inOut', ...Object.keys(EASES).filter((n) => n !== 'inOut')]
export const easeOfPart = (name, u0, u1) => {
  const e = (u) => ease(name, u)
  const span = e(u1) - e(u0)
  if (Math.abs(span) < 1e-9) return 'linear'
  const part = (s) => (e(u0 + s * (u1 - u0)) - e(u0)) / span
  const miss = (n) => { let sum = 0; for (let i = 1; i < 20; i++) sum += (ease(n, i / 20) - part(i / 20)) ** 2; return sum }
  return EASE_NAMES.reduce((best, n) => (miss(n) < miss(best) - 1e-12 ? n : best))
}

/**
 * The stage's camera shots (`{ camera, camera_more }`, config.stage25d) cut at `at` in a scene `dur` seconds long, as
 * the shots of each piece. Shots on one side keep their ease and length (written out, since a piece is shorter than the
 * scene); the shot playing at the cut is split in two, ending and starting on the framing there, each half on the part
 * of its curve (easeOfPart). The shots after the cut start `at` seconds earlier. Null with no shots.
 */
export const cutCamera = (shots, at, dur) => {
  const list = [shots?.camera, ...(shots?.camera_more ?? [])].filter(Boolean)
  if (!list.length) return null
  const start = (s) => Number(s.at_s) || 0
  const length = (s) => Number(s.dur_s) || dur   // what layout.ts cameraAt plays
  const pose = cameraPoseAt(list[0], list.slice(1), at, dur)
  const still = { move: 'framed', ease: 'inOut', at_s: 0, from: pose, to: pose }
  // The shot playing at the cut: the last one started before it (layout.ts shotAt: one starting on the cut plays from it).
  const i = list.findLastIndex((s) => start(s) < at - 1e-3)
  const shot = list[i]
  const into = shot ? at - start(shot) : 0
  const moving = shot && into < length(shot)
  const u = moving ? into / length(shot) : 1

  const first = i < 0 ? [still] : [
    ...list.slice(0, i).map((s) => ({ ...s, dur_s: round(length(s)) })),
    moving
      ? { ...shot, at_s: start(shot), dur_s: round(into), to: pose, ease: easeOfPart(shot.ease, 0, u) }
      : { ...shot, dur_s: round(length(shot)) },
  ]
  const after = list.slice(i + 1).map((s) => ({ ...s, at_s: round(Math.max(0, start(s) - at)), dur_s: round(length(s)) }))
  const lead = after[0] && after[0].at_s < 1e-3 ? []
    : moving
      ? [{ ...shot, at_s: 0, dur_s: round(length(shot) - into), from: pose, to: cameraPoseAt(shot, [], start(shot) + length(shot), dur), ease: easeOfPart(shot.ease, u, 1) }]
      : [still]
  const second = [...lead, ...after]
  const out = ([camera, ...rest]) => ({ camera, camera_more: rest })
  return { first: out(first), second: out(second) }
}
