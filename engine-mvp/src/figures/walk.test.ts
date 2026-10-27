// The retargeted walk on the real body (git-ignored GLBs: skipped where missing): every frame keeps one foot on the
// ground (within 2 cm) and no knee bends backwards.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { LoadAssetContainerAsync, NullEngine, Scene, Vector3, type AnimationGroup, type TransformNode } from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { retargetFrom, soleHeight } from './clips'
import { captureRest, checkPose, frameOf, pos, resetToRest, rigOf, type RestPose, type Rig } from './pose'

const dir = '../../public/assets/models/customizable-man/'
const BODY = fileURLToPath(new URL(dir + 'man-lite.glb', import.meta.url))
const WALK = fileURLToPath(new URL(dir + 'clips/M_Walk_001.glb', import.meta.url))
const load = (file: string, scene: Scene) =>
  LoadAssetContainerAsync(new Uint8Array(readFileSync(file)), scene, { pluginExtension: '.glb', pluginOptions: { gltf: { skipMaterials: true } } })

describe.skipIf(!existsSync(BODY) || !existsSync(WALK))('walk clip on the standard body', () => {
  let rig: Rig
  let rest: RestPose
  let walk: AnimationGroup
  beforeAll(async () => {
    const scene = new Scene(new NullEngine())
    const body = await load(BODY, scene)
    body.addAllToScene()
    rig = rigOf(body.transformNodes.find((n) => n.name === 'Man_Rig') as TransformNode)
    rest = captureRest(rig)
    const clip = await load(WALK, scene)
    clip.animationGroups.forEach((g) => g.stop())
    clip.addAllToScene()
    walk = retargetFrom(clip, 'walk', rig, rest)
  }, 60_000)

  it('keeps a foot on the ground and every knee bending forwards, every frame', () => {
    resetToRest(rest)
    const f = frameOf(rig)
    const restUp = { toe: Vector3.Dot(pos(rig, 'toeL'), f.up), foot: Vector3.Dot(pos(rig, 'footL'), f.up) }
    walk.start(true)
    walk.pause()
    const lifts: number[] = []
    const knees: string[] = []
    for (let fr = walk.from; fr <= walk.to; fr += 1) {
      walk.goToFrame(fr)
      lifts.push(soleHeight(rig, restUp, f.up))
      checkPose(rig, f).filter((v) => v.kind === 'knee-backwards').forEach((v) => knees.push(`${fr} ${v.limb}`))
    }
    walk.stop()
    expect(lifts.length).toBeGreaterThan(60)
    expect(Math.max(...lifts.map(Math.abs))).toBeLessThan(0.02)
    expect(knees).toEqual([])
  })
})
