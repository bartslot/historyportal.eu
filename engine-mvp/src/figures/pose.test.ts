// Pose guards on the REAL standard body (git-ignored GLB: skipped where it is missing).
// Rules: a knee never bends backwards, an arm never passes through the body; checked in world/rig space.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, beforeAll } from 'vitest'
import { LoadAssetContainerAsync, NullEngine, Scene, Vector3, type TransformNode } from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { aim, applyPose, captureRest, checkPose, frameOf, pos, POSES, resetToRest, rigOf, type RestPose, type Rig } from './pose'

const GLB = fileURLToPath(new URL('../../public/assets/models/customizable-man/man-lite.glb', import.meta.url))
const have = existsSync(GLB)

describe.skipIf(!have)('standard body poses', () => {
  let rig: Rig
  let rest: RestPose
  beforeAll(async () => {
    const scene = new Scene(new NullEngine())
    const c = await LoadAssetContainerAsync(new Uint8Array(readFileSync(GLB)), scene, {
      pluginExtension: '.glb', pluginOptions: { gltf: { skipMaterials: true } },
    })
    c.addAllToScene()
    rig = rigOf(c.transformNodes.find((n) => n.name === 'Man_Rig') as TransformNode)
    rest = captureRest(rig)
  }, 60_000)

  it('reads the character frame from the feet: forward is horizontal, left is the .l side', () => {
    resetToRest(rest)
    const f = frameOf(rig)
    expect(Math.abs(Vector3.Dot(f.fwd, f.up))).toBeLessThan(1e-6)
    expect(Vector3.Dot(pos(rig, 'shoulderL').subtract(pos(rig, 'shoulderR')), f.left)).toBeGreaterThan(0.05)
    // toes are in front of the heels
    expect(Vector3.Dot(pos(rig, 'toeL').subtract(pos(rig, 'footL')), f.fwd)).toBeGreaterThan(0)
  })

  for (const name of Object.keys(POSES) as (keyof typeof POSES)[]) {
    it(`${name}: no knee backwards, no arm through the body`, () => {
      expect(applyPose(rig, rest, POSES[name])).toEqual([])
    })
  }

  it('kneel puts a knee on the ground and the hips down', () => {
    resetToRest(rest)
    const f = frameOf(rig)
    const hipStand = Vector3.Dot(pos(rig, 'hips'), f.up)
    const ground = Math.min(Vector3.Dot(pos(rig, 'footL'), f.up), Vector3.Dot(pos(rig, 'footR'), f.up))
    applyPose(rig, rest, POSES.kneel)
    expect(Vector3.Dot(pos(rig, 'hips'), f.up)).toBeLessThan(hipStand - 0.2)
    expect(Vector3.Dot(pos(rig, 'shinR'), f.up)).toBeLessThan(ground + 0.12) // the right knee rests on the ground
  })

  it('sit and lie rest the body on the ground, not in the air', () => {
    for (const p of ['sit', 'lie'] as const) {
      resetToRest(rest)
      const f = frameOf(rig)
      const ground = Math.min(Vector3.Dot(pos(rig, 'toeL'), f.up), Vector3.Dot(pos(rig, 'toeR'), f.up))
      applyPose(rig, rest, POSES[p])
      expect(Vector3.Dot(pos(rig, 'hips'), f.up) - ground, p).toBeLessThan(0.2)
    }
  })

  it('point aims the right hand ahead of the body at shoulder height', () => {
    applyPose(rig, rest, POSES.point)
    const f = frameOf(rig)
    const reach = pos(rig, 'handR').subtract(pos(rig, 'armR'))
    expect(Vector3.Dot(reach.normalize(), f.fwd)).toBeGreaterThan(0.8)
  })

  // the guard must FAIL a broken pose, or a green test proves nothing
  it('catches a knee bent backwards', () => {
    applyPose(rig, rest, POSES.stand)
    const f = frameOf(rig)
    // thigh straight down, shin swung forward: the knee now sits BEHIND the hip-ankle line
    aim(rig, 'shinL', 'footL', f.fwd.scale(0.8).add(f.up.scale(-0.6)))
    const v = checkPose(rig, f)
    expect(v.some((x) => x.limb === 'legL' && x.kind === 'knee-backwards')).toBe(true)
  })

  it('catches an arm through the torso', () => {
    applyPose(rig, rest, {
      arms: { L: { upper: [0.1, -0.6, -0.8], lower: [0, -1, 0] } },
    })
    expect(checkPose(rig).some((x) => x.limb === 'armL' && x.kind === 'arm-through-body')).toBe(true)
  })
})
