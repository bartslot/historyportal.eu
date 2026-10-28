// Through the real entry point (createPuppet, warnings on), on the real cut parts in public/figures/puppets.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NullEngine, Scene, Vector3, type Mesh } from '@babylonjs/core'
import { afterEach, describe, expect, it } from 'vitest'
import { CHARACTERS, POSES, POSE_NAMES, VIEWS, createPuppet, placePuppet, seatFrom, violations, FRONT_POSES, GUARD_TOL, type Angles, type PuppetPose } from './puppet'

const PUBLIC = join(__dirname, '../../public')
const loadSheet = async (url: string) => JSON.parse(readFileSync(join(PUBLIC, url), 'utf8'))

async function make(id: string) {
  const warnings: string[] = [], logs: string[] = []
  const scene = new Scene(new NullEngine())
  const p = await createPuppet(scene, id, { loadSheet, warn: (m) => warnings.push(m), log: (m) => logs.push(m) })
  return { scene, p, warnings, logs }
}
const LIB = { version: 1, bundle: 'nl-prehistory', base: 'library/nl-prehistory/', assets: JSON.parse(readFileSync(join(PUBLIC, 'library/nl-prehistory/library.json'), 'utf8')).assets }
const STAGE = { groundPoint: (x: number) => new Vector3((x - 0.5) * 10, 0, 7), lib: LIB }
const shown = (scene: Scene) => scene.meshes.filter((m) => m.isEnabled()) as Mesh[]

describe('puppet figures', () => {
  for (const id of Object.keys(CHARACTERS)) {
    it(`${id}: every pose is a human pose in every view, standing on the ground`, async () => {
      const { scene, p, warnings } = await make(id)
      for (const pose of POSE_NAMES) {
        expect(p.setPose(pose), pose).toEqual([])
        for (const view of VIEWS) {
          p.setView(view)
          const j = p.joints()
          expect(violations(j, GUARD_TOL[view]), `${pose} ${view}: the guards on what this view draws`).toEqual([])
          const knees = Math.min(j.kneeN[1], j.kneeF[1]), ankles = Math.min(j.ankleN[1], j.ankleF[1])
          expect(knees, `${pose} ${view}: a knee in the ground`).toBeGreaterThan(0.02)
          expect(ankles, `${pose} ${view}: an ankle in the ground`).toBeGreaterThan(0.03)
          expect(Math.min(knees - 0.05, ankles - 0.07), `${pose} ${view}: floating`).toBeLessThan(0.03)
          expect(shown(scene).length, `${pose} ${view}: parts shown`).toBeGreaterThan(12)
        }
      }
      expect(warnings).toEqual([])
    })
  }

  it('kneel puts a knee on the ground; sit and kneel bring the hips down', async () => {
    const { p } = await make('voc-matroos')
    p.setPose('stand')
    const standHip = p.joints().hip[1]
    p.setPose('kneel')
    const j = p.joints()
    expect(Math.min(j.kneeN[1], j.kneeF[1])).toBeLessThan(0.08)
    expect(j.hip[1]).toBeLessThan(standHip * 0.8)
    p.setPose('sit')
    expect(p.joints().hip[1]).toBeLessThan(standHip * 0.7)
  })

  it('walk swings the legs: the knees pass each other', async () => {
    const { p } = await make('boer-man')
    expect(p.setPose('walk')).toEqual([])
    const ahead = (t: number) => { const a = POSES.walk(t); return a.hN - a.hF } // near leg ahead of the far one
    const cycle = Array.from({ length: 20 }, (_, i) => ahead(i / 20))
    expect(Math.max(...cycle)).toBeGreaterThan(20)
    expect(Math.min(...cycle)).toBeLessThan(-20)
  })

  // mutations: break a pose the way a bad rig or a sign slip would, through createPuppet, and the guards must say so
  describe('the guards catch broken poses', () => {
    const saved = { ...POSES }
    afterEach(() => Object.assign(POSES, saved))
    const breakPose = (pose: PuppetPose, change: Partial<Angles>) => { POSES[pose] = (t, c) => ({ ...saved[pose](t, c), ...change }) }
    const cases: [string, PuppetPose, Partial<Angles>, RegExp][] = [
      ['a knee bent forward', 'kneel', { kN: 40 }, /kneeN bends backwards/],
      ['a far knee bent forward', 'sit', { kF: 30 }, /kneeF bends backwards/],
      ['an elbow bent backward', 'carry', { eN: -45 }, /elbowN bends backwards/],
      ['an arm through the back', 'point', { sN: -80 }, /shoulderN/],
      ['a leg kicked past the hip', 'stand', { hF: 160 }, /hipF/],
      ['a knee folded flat', 'kneel', { kN: -175 }, /kneeN folded/],
    ]
    for (const [what, pose, change, msg] of cases) {
      it(`catches ${what}`, async () => {
        breakPose(pose, change)
        const { p, warnings } = await make('voc-kapitein')
        const found = p.setPose(pose)
        expect(found.join('\n')).toMatch(msg)
        expect(warnings.join('\n')).toMatch(msg)
        // every view is guarded on its own sheet, not only the 3/4 one
        expect(new Set(found.map((f) => f.split(':')[0]))).toEqual(new Set(['34', 'side', ...(found.some((f) => f.startsWith('front')) ? ['front'] : [])]))
      })
    }
  })

  it('dyes a garment, takes the hat off, swaps the face, mirrors for facing left', async () => {
    const { p, scene } = await make('voc-kapitein')
    expect(p.garments()).toEqual(expect.arrayContaining(['top', 'hat']))
    p.setDye('top', '#2b4a7a')
    const torso = scene.getMeshByName('voc-kapitein_34_torso_torso')!
    expect(torso.material!.name).toBe('voc-kapitein_34_torso_torso')
    const hat = () => scene.getMeshByName('voc-kapitein_34_hat_hat')!.isEnabled()
    expect(hat()).toBe(true)
    p.setHat(false)
    expect(hat()).toBe(false)
    p.setExpression('angry') // no angry head drawn: the worried one
    expect(scene.getMeshByName('voc-kapitein_34_head_head_worried')!.isEnabled()).toBe(true)
    expect(scene.getMeshByName('voc-kapitein_34_head_head_neutral')!.isEnabled()).toBe(false)
    p.setView('34', true)
    expect(scene.getTransformNodeByName('voc-kapitein_flip')!.scaling.x).toBe(-1)
  })

  it('the woman has no hat to put on, and her legs exist under the skirt', async () => {
    const { p, scene } = await make('boer-vrouw')
    p.setHat(true)
    expect(scene.getMeshByName('boer-vrouw_34_hat_hat')).toBeNull()
    expect(scene.getMeshByName('boer-vrouw_34_thigh_N_thigh')!.isEnabled()).toBe(true)
  })

  it('face-on, a pose that would read as standing shows in 3/4, and says so', async () => {
    const { p, logs } = await make('voc-matroos')
    for (const pose of POSE_NAMES) {
      p.setPose(pose)
      p.setView('front')
      expect(p.view, pose).toBe(FRONT_POSES.includes(pose) ? 'front' : '34')
    }
    expect(logs.join('\n')).toMatch(/point: face-on would hide the pose, shown in 3\/4/)
  })

  it('sits on a seat from the stage library, the seat under the hips; without one, on the ground', async () => {
    expect(seatFrom(LIB)).not.toBeNull()
    const { p, scene, warnings } = await make('boer-vrouw')
    p.setPose('sit')
    const onGround = p.joints().hip[1]
    placePuppet(p, { x: 0.4, depth: 'fg', facing: 'right' }, STAGE)
    expect(p.setPose('sit')).toEqual([])
    const j = p.joints()
    expect(j.hip[1]).toBeGreaterThan(onGround + 0.25)
    expect(Math.min(j.ankleN[1], j.ankleF[1])).toBeLessThan(0.15) // feet down on the ground
    expect(scene.getMeshByName('boer-vrouw_seat')!.isEnabled()).toBe(true)
    p.setPose('stand')
    expect(scene.getMeshByName('boer-vrouw_seat')!.isEnabled()).toBe(false)
    expect(warnings).toEqual([])
  })

  it('stands in contrapposto: weight on one leg, the other knee eased', async () => {
    const { p } = await make('voc-kapitein')
    const a = POSES.stand(0)
    expect(a.kN).toBeLessThan(-8)
    expect(Math.abs(a.kF)).toBeLessThan(3)
    expect(p.setPose('stand')).toEqual([])
  })

  it('placePuppet lays the stage contact stain under the figure', async () => {
    const { p, scene } = await make('voc-kapitein')
    placePuppet(p, { x: 0.5, depth: 'fg', facing: 'left' }, STAGE)
    const stain = scene.getMeshByName('stain:voc-kapitein')!
    expect(stain.parent).toBe(p.root)
    expect(stain.isVisible).toBe(true)
  })

  it('cut-out edges read as ink, not paper: no paper fringe around dark paint (measured at cut time)', () => {
    for (const id of Object.keys(CHARACTERS)) for (const view of VIEWS) {
      const parts = JSON.parse(readFileSync(join(PUBLIC, `figures/puppets/${id}/${view}/parts.json`), 'utf8')).parts
      for (const [slot, e] of Object.entries(parts) as [string, { edge_fringe: number }][]) {
        expect(e.edge_fringe, `${id} ${view} ${slot}`).toBeLessThan(0.03) // fde8a591 assets: mean 0.23, max 0.39
      }
    }
  })
})
