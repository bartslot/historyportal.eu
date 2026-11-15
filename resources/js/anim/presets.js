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

// Lazy: 88 KB of clips stay out of app.js until a figure's Animation section opens (the chunk budget).
const files = import.meta.glob('../../animations/clips/*.json', { import: 'default' })

/** Every preset, by id, in the order the picker lists them. Empty until loadClips() resolves. */
export const CLIPS = {}
let loading = null
/** Loads every clip once; resolves to CLIPS. */
export function loadClips () {
  loading ??= Promise.all(Object.values(files).map((load) => load()))
    .then((clips) => Object.assign(CLIPS, Object.fromEntries(clips.map((clip) => [clip.id, clip]))))
  return loading
}

const round3 = (v) => Math.round(v * 1000) / 1000 + 0   // + 0: a mirrored 0 is 0, not -0
const BONE = 'bone:'
/** A root move smaller than this (body heights) is rounding: no x keys for it. A clip in place that moves the hips does
 *  write them, so its planted feet stay put; where the teacher keys x themselves, theirs win (applyClip inPlace). */
export const MOVE_MIN = 0.0005
/** A walk or a run with no length of its own crosses the shot this many cycles, not the whole scene off screen. */
export const TRAVEL_CYCLES = 3
/** The leg room a clip is fitted for (engine-mvp/tools/rig_parts.py LIMIT, anim_fit RIG_LIMIT): thigh swing, knee bend;
 *  share: the standard skeleton's leg (thigh and shin) as a share of its height (anim_fit SKELETON, Ana). */
export const FITTED_LEGS = { thigh: 45, shin: 120, share: 607 / 1475 }
/** A loop ends by settling into the drawn pose this long after its last cycle, at most half a cycle, never mid-stride. */
export const SETTLE_S = 0.5

/**
 * How much of a clip's root movement a figure's legs can carry: a long robe holds the legs to a shuffle (thigh +-6,
 * knee 0..8, the Character tab's robeLimits), so a walk covers less ground and a crouch sinks less, or the feet slide
 * and the hem goes into the floor. `limits`: the figure's bone limits by name. 1 and 1 for a figure with the full room.
 */
export function legRoom (limits = {}, legShare = null) {
  const swing = limits.thigh_n ? (limits.thigh_n[1] - limits.thigh_n[0]) / FITTED_LEGS.thigh : 1
  const bend = limits.shin_n ? limits.shin_n[1] / FITTED_LEGS.shin : 1
  // longer legs for the body cover more ground and drop further for the same turns (the kits' 0.52 against Ana's 0.41)
  const legs = legShare > 0 ? legShare / FITTED_LEGS.share : 1
  return { travel: Math.min(1, Math.max(0, swing)) * legs, sink: Math.min(1, Math.max(0, bend)) * legs }
}

/** A puppet's leg (thigh and shin) as a share of its body's height (head top to foot), or null when it cannot say. */
export function legShareOf (bones = []) {
  const at = Object.fromEntries(bones.map((b) => [b.name, b]))
  const len = (b) => (b?.to ? Math.hypot(b.to[0] - b.from[0], b.to[1] - b.from[1]) : 0)
  const legs = len(at.thigh_n) + len(at.shin_n)
  const tall = at.foot_n?.to && at.head?.to ? Math.max(at.foot_n.to[1], at.foot_n.from[1]) - at.head.to[1] : 0
  return legs > 0 && tall > 0 ? legs / tall : null
}

/** The face a figure shows when nothing says otherwise (the Character tab's kits: the rest head). */
export const REST_FACE = 'calm'

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
export function expandClip (clip, { start = 0, length = null, speed = 1, bones = [], facing = 1, x0 = 0.5, y0 = 0, r0 = 0, xPerHeight = 0, yPerHeight = 0, limits = {}, legShare = null } = {}) {
  const room = legRoom(limits, legShare)
  const { cycles, cycle } = clipSpan(clip, { length, speed })
  const moves = clip.keys.some((k) => Math.abs(k.dx ?? 0) > MOVE_MIN) || Math.abs(clip.travel ?? 0) > 1e-6
  const bobs = clip.keys.some((k) => Math.abs(k.bob ?? 0) > 1e-6)
  const tips = clip.keys.some((k) => Math.abs(k.rot ?? 0) > 1e-6)   // the whole body tips over (a fall): the layer's angle
  const has = new Set(bones)
  const out = []
  let face = null
  for (let c = 0; c < cycles; c++) {
    clip.keys.forEach((k, i) => {
      if (c > 0 && i === 0) return   // the seam: a loop's first key is the last one of the cycle before
      const key = { t: round3(start + (c + k.t) * cycle), ease: 'smooth' }
      for (const [field, deg] of Object.entries(k)) {
        if (field.startsWith(BONE) && has.has(field.slice(BONE.length))) key[field] = round3(deg * facing)
      }
      if (moves) key.x = round3(x0 + facing * (c * (clip.travel ?? 0) + (k.dx ?? 0)) * room.travel * xPerHeight)
      if (bobs) key.y = round3(y0 + (k.bob ?? 0) * (k.bob < 0 ? room.sink : 1) * yPerHeight)   // a jump's lift stays
      if (tips) key.rotation = round3(r0 + (k.rot ?? 0) * facing)
      if (k.face && k.face !== face) key.face = face = k.face   // a face steps: only where it changes
      if (k.contact) key.contact = k.contact   // which feet stand: the stage keeps them on their spots (foot-lock.ts)
      out.push(key)
    })
  }
  if (clip.loop && out.length) {   // a loop settles into the drawn pose where it stops, never frozen mid-stride
    const last = out[out.length - 1]
    const settle = { t: round3(last.t + Math.min(SETTLE_S, cycle / 2)) }
    for (const field of Object.keys(last)) if (field.startsWith(BONE)) settle[field] = 0
    if (moves) settle.x = last.x
    if (bobs) settle.y = round3(y0)
    if (tips) settle.rotation = round3(r0)
    if (clip.keys.some((k) => k.contact)) settle.contact = 'both'
    out.push(settle)
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
export function applyClip (keys, added, { inPlace = false } = {}) {
  // a clip that stays in place shifts the hips a little; where the teacher moves the figure themselves, their x wins
  if (inPlace && (keys ?? []).some((k) => Number.isFinite(k.x))) added = added.map(({ x, ...rest }) => rest)
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
  // a clip's faces are its own: when it ends the figure shows the face it had before it, not the clip's last one
  if (fields.has('face')) {
    const before = (keys ?? []).filter((k) => k.face && k.t < from).sort((a, b) => a.t - b.t).pop()?.face ?? REST_FACE
    out.find((k) => sameTime(k.t, added[added.length - 1].t)).face = before
  }
  return out.sort((a, b) => a.t - b.t)
}
