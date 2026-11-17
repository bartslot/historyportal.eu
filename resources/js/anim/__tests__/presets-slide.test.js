import { describe, it, expect } from 'vitest'
import { appendFileSync } from 'node:fs'
import { expandClip, legShareOf } from '../presets.js'
import { bonesAt, layerAt } from '@stage25d/stage25d/layout'
import { bindPuppet } from '@stage25d/stage25d/bones'
import { footLockOffset, heldBones } from '@stage25d/stage25d/foot-lock'
import kitGirl from '../../../../tests/Fixtures/animations/kit-girl-368.json'

// The standard skeleton the clips are fitted on (engine-mvp/tools/anim_fit.py SKELETON, Ana's flat rig), picture px.
const SKELETON = {
  hips: [null, [507.47, 820.06]], chest: ['hips', [551.39, 646.86]], head: ['chest', [494.0, 302.0]],
  upperarm_n: ['chest', [383.53, 399.83]], upperarm_f: ['chest', [629.06, 399.83]],
  forearm_n: ['upperarm_n', [336.5, 610.38]], forearm_f: ['upperarm_f', [677.11, 611.97]],
  thigh_n: ['hips', [411.97, 805.32]], thigh_f: ['hips', [602.97, 834.8]],
  shin_n: ['thigh_n', [421.99, 1136.24]], shin_f: ['thigh_f', [557.27, 1134.53]],
  foot_n: ['shin_n', [394.5, 1410.75]], foot_f: ['shin_f', [546.0, 1386.93]],
}
const HEIGHT_PX = 1475           // one body height of the standard skeleton
const SLIDE_MAX_CM = 0.5         // Bart 11-15: a planted foot stays planted between keys
const CM_PER_HEIGHT = 170        // a grown-up
const SAMPLES = 24               // between two keys

const rot = ([x, y], deg) => { const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180); return [c * x - s * y, s * x + c * y] }

/** Where an ankle stands in the picture, hips at rest, with these turns (the same sums as anim_fit.world). */
function ankle (bones, side) {
  const at = {}
  for (const [name, [parent, from]] of Object.entries(SKELETON)) {
    if (!parent) { at[name] = { p: from, turn: bones[name] ?? 0 }; continue }
    const up = at[parent], off = rot([from[0] - SKELETON[parent][1][0], from[1] - SKELETON[parent][1][1]], up.turn)
    at[name] = { p: [up.p[0] + off[0], up.p[1] + off[1]], turn: up.turn + (bones[name] ?? 0) }
  }
  return at[`foot_${side}`].p
}

const clips = Object.values(import.meta.glob('../../../animations/clips/*.json', { eager: true, import: 'default' }))
const bones = Object.keys(SKELETON)

/** The worst slide (cm) of a foot that stands at two keys in a row, between them, as the stage plays the clip. */
function worstSlide (clip) {
  const cycles = clip.loop ? 2 : 1
  const keys = expandClip(clip, { start: 0, length: clip.loop ? 2 * clip.duration : null, bones, xPerHeight: 1, yPerHeight: 1, x0: 0, y0: 0 })
  const layer = { depth: 'fg', keys }
  const contactAt = (t) => { const u = (t / clip.duration) % 1; return clip.keys.find((k) => Math.abs(k.t - u) < 1e-3 || (u < 1e-3 && k.t === 1))?.contact ?? 'both' }
  const feet = (c) => ({ n: ['n'], f: ['f'], both: ['n', 'f'], none: [] })[c] ?? []
  const where = (t, side) => ankle(bonesAt(layer, t), side)[0] + layerAt(layer, t).x * HEIGHT_PX
  let worst = 0
  const times = [...new Set(keys.map((k) => k.t))].filter((t) => t <= clip.duration * cycles + 1e-6)
  for (let i = 1; i < times.length; i++) {
    const [a, b] = [times[i - 1], times[i]]
    const tipped = keys.some((k) => (k.t === a || k.t === b) && 'rotation' in k && Math.abs(k.rotation) > 1e-6)   // a fall turns about the feet
    const stand = tipped ? [] : feet(contactAt(a)).filter((s) => feet(contactAt(b)).includes(s))
    for (const side of stand) {   // on the line between its spots at the two keys (a heel may lift, the foot does not slide)
      const xa = where(a, side), xb = where(b, side)
      for (let n = 1; n < SAMPLES; n++) worst = Math.max(worst, Math.abs(where(a + (b - a) * n / SAMPLES, side) - (xa + (xb - xa) * n / SAMPLES)))
      worst = Math.max(worst, Math.abs(xb - xa))   // and on the same spot at both keys
    }
  }
  return (worst / HEIGHT_PX) * CM_PER_HEIGHT
}

describe('a planted foot stays planted between keys, as the stage plays a preset', () => {
  for (const clip of clips) {
    it(`${clip.id}: under ${SLIDE_MAX_CM} cm`, () => {
      const cm = worstSlide(clip)
      if (process.env.SLIDE_REPORT) appendFileSync(process.env.SLIDE_REPORT, `${clip.id} ${cm.toFixed(2)}\n`)
      expect(cm).toBeLessThan(SLIDE_MAX_CM)
    })
  }
})

// A kit body from the Character tab (girl 368): longer legs, a skirt that holds them back. On the stage her standing
// feet are kept by the foot lock (foot-lock.ts: one foot, or the point between both) and her legs bend only as deep as
// the skirt lets them (BentPuppet.legHold), the same sums as stage.ts. PM 11-15: under 2 cm for her.
const KIT_SLIDE_MAX_CM = 2
const KIT_CM = 166   // her height: puppet.height px is her picture's height, height_m 1.66 on the stage

function kitSlide (clip, puppet) {
  const bent = bindPuppet(puppet)
  const limits = Object.fromEntries(puppet.bones.filter((b) => b.limit).map((b) => [b.name, b.limit]))
  const keys = expandClip(clip, { start: 0, length: clip.loop ? 2 * clip.duration : null, bones: puppet.bones.map((b) => b.name), facing: puppet.facing ?? 1,
    xPerHeight: puppet.height, yPerHeight: puppet.height, x0: 0, y0: 0, limits, legShare: legShareOf(puppet.bones) })
  const layer = { depth: 'fg', keys }
  const ankleX = (t, side) => bent.ankles(heldBones(bonesAt(layer, t), bent.legHold))[side]?.[0] ?? 0
  const foot = (t, side) => layerAt(layer, t).x + ankleX(t, side)
  const at = (t, side) => foot(t, side) + footLockOffset(keys, t, foot)
  const feet = (c) => ({ n: ['n'], f: ['f'], both: ['n', 'f'], none: [] })[c] ?? []
  const contact = keys.filter((k) => k.contact)
  let worst = 0
  for (let i = 1; i < contact.length; i++) {
    const [a, b] = [contact[i - 1], contact[i]]
    if ((a.rotation ?? 0) || (b.rotation ?? 0)) continue
    for (const side of feet(a.contact).filter((s) => feet(b.contact).includes(s))) {
      const xa = at(a.t, side), xb = at(b.t, side)
      worst = Math.max(worst, Math.abs(xb - xa))
      for (let n = 1; n < SAMPLES; n++) worst = Math.max(worst, Math.abs(at(a.t + (b.t - a.t) * n / SAMPLES, side) - (xa + (xb - xa) * n / SAMPLES)))
    }
  }
  return (worst / puppet.height) * KIT_CM
}

describe('on a kit body with a skirt, a standing foot stays within 2 cm as the stage plays a preset', () => {
  for (const id of ['walk']) {   // Bart 11-17: the other presets went
    const clip = clips.find((c) => c.id === id)
    it(`girl 368, ${id}: under ${KIT_SLIDE_MAX_CM} cm`, () => {
      const cm = kitSlide(clip, kitGirl)
      if (process.env.SLIDE_REPORT) appendFileSync(process.env.SLIDE_REPORT, `girl368-${id} ${cm.toFixed(2)}\n`)
      expect(cm).toBeLessThan(KIT_SLIDE_MAX_CM)
    }, 60_000)
  }
})
