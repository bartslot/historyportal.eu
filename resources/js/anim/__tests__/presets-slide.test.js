import { describe, it, expect } from 'vitest'
import { appendFileSync } from 'node:fs'
import { expandClip, legShareOf } from '../presets.js'
import { bonesAt, layerAt } from '@stage25d/stage25d/layout'
import { bindPuppet } from '@stage25d/stage25d/bones'
import { footLockOffset, heldBones } from '@stage25d/stage25d/foot-lock'
import kitGirl from '../../../../tests/Fixtures/animations/kit-girl-368.json'
import walk from '../../../animations/clips/walk.json'

const SAMPLES = 24               // between two keys

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

describe('the walk on a kit body with a skirt (girl 368): a standing foot stays put', () => {
  it(`as the stage plays it (foot lock and all): under ${KIT_SLIDE_MAX_CM} cm`, () => {
    const cm = kitSlide(walk, kitGirl)
    if (process.env.SLIDE_REPORT) appendFileSync(process.env.SLIDE_REPORT, `girl368-walk ${cm.toFixed(2)}\n`)
    expect(cm).toBeLessThan(KIT_SLIDE_MAX_CM)
  }, 60_000)

})
