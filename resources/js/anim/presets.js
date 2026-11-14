/**
 * presets.js: the animation preset library (resources/animations/clips/*.json, made by engine-mvp/tools/anim_fit.py)
 * turned into ordinary layer keys, the ones a teacher edits on the timeline and the stage plays.
 *
 * A clip's keys are `{ t (0..1), 'bone:<name>': deg, dx, bob, face? }`: turns for a figure facing right, dx and bob in
 * body heights. expandClip lays them out in scene seconds for one figure; applyClip puts them over the figure's keys
 * in that stretch of time. The server does the same for agents and the composer (App\Services\Stage25d\AnimationPresets);
 * tests/Fixtures/animations/expand.json holds both to one answer.
 */
import { sameTime } from './keyframes.js'

const files = import.meta.glob('../../animations/clips/*.json', { eager: true, import: 'default' })

/** Every preset, by id, in the order the picker lists them. */
export const CLIPS = Object.fromEntries(Object.values(files).map((clip) => [clip.id, clip]))

const round3 = (v) => Math.round(v * 1000) / 1000
const BONE = 'bone:'

/** How long the clip runs from `start`: a loop fills `length` with whole cycles, a move plays once at its own pace. */
export const clipSpan = (clip, { length = null, speed = 1 } = {}) => {
  const cycle = clip.duration / Math.max(0.1, speed)
  if (!clip.loop) return { cycles: 1, cycle: length ?? cycle }
  const cycles = Math.max(1, Math.round((length ?? cycle) / cycle))
  return { cycles, cycle: (length ?? cycle) / cycles }
}

/**
 * The clip as layer keys from `start` (seconds). `bones`: the bones the figure's rig has (a missing one skips its
 * track); `facing` -1 mirrors it for a figure looking left; `x0`/`y0` where the figure stands at `start`;
 * `xPerHeight` the layer's x for one body height (its height over the view's width there), `yPerHeight` metres.
 */
export function expandClip (clip, { start = 0, length = null, speed = 1, bones = [], facing = 1, x0 = 0.5, y0 = 0, xPerHeight = 0, yPerHeight = 0 } = {}) {
  const { cycles, cycle } = clipSpan(clip, { length, speed })
  const moves = clip.keys.some((k) => Math.abs(k.dx ?? 0) > 1e-6) || Math.abs(clip.travel ?? 0) > 1e-6
  const bobs = clip.keys.some((k) => Math.abs(k.bob ?? 0) > 1e-6)
  const has = new Set(bones)
  const out = []
  for (let c = 0; c < cycles; c++) {
    clip.keys.forEach((k, i) => {
      if (c > 0 && i === 0) return   // the seam: a loop's first key is the last one of the cycle before
      const key = { t: round3(start + (c + k.t) * cycle), ease: 'smooth' }
      for (const [field, deg] of Object.entries(k)) {
        if (field.startsWith(BONE) && has.has(field.slice(BONE.length))) key[field] = round3(deg * facing)
      }
      if (moves) key.x = round3(x0 + facing * (c * (clip.travel ?? 0) + (k.dx ?? 0)) * xPerHeight)
      if (bobs) key.y = round3(y0 + (k.bob ?? 0) * yPerHeight)
      if (k.face) key.face = k.face
      out.push(key)
    })
  }
  if (out.length) delete out[out.length - 1].ease   // from its last pose the figure eases into whatever comes next
  return out
}

/** The fields the clip writes: its keys' bones and root, never a field it leaves alone. */
const fieldsOf = (keys) => new Set(keys.flatMap((k) => Object.keys(k)).filter((f) => f !== 't' && f !== 'ease'))

/**
 * The figure's keys with the clip's over them: in the clip's stretch of time the fields it moves are its own (an
 * older key there loses those fields, and goes when nothing is left on it); every other field and every key outside
 * that stretch stays as the teacher left it. Pure: a new list.
 */
export function applyClip (keys, added) {
  if (!added.length) return [...(keys ?? [])]
  const fields = fieldsOf(added)
  const from = added[0].t - 1e-6
  const to = added[added.length - 1].t + 1e-6
  const kept = (keys ?? []).flatMap((k) => {
    if (k.t < from || k.t > to) return [k]
    const rest = Object.fromEntries(Object.entries(k).filter(([f]) => !fields.has(f)))
    return Object.keys(rest).some((f) => f !== 't' && f !== 'ease') ? [rest] : []
  })
  const out = kept.map((k) => ({ ...k }))
  for (const a of added) {
    const same = out.find((k) => sameTime(k.t, a.t))
    if (same) Object.assign(same, a)
    else out.push({ ...a })
  }
  return out.sort((a, b) => a.t - b.t)
}
