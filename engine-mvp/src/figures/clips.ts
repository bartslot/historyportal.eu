// Mixamo-named clips (Ready Player Me animation library: Hips, Spine, LeftUpLeg...) retargeted onto the
// standard body's Auto-Rig Pro deform rig with Babylon's AnimatorAvatar.
//
// Crouch / float fix: Babylon's own root + ground correction (hips scaled by leg length, the lowest foot kept
// on the ground every frame), then the hips are held in place on x/z (the stage moves the figure).
// Guard bake: a frame where a knee bends backwards (retargeted hyperextension) gets that shin aimed straight
// along the thigh, written back into the keys. The walk ships with zero guard violations.
import {
  Animation, AnimatorAvatar, LoadAssetContainerAsync, Vector3,
  type AnimationGroup, type AssetContainer, type Scene, type TransformNode,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { aim, ARP, checkPose, pos, type Rig } from './pose'

export const CLIPS = {
  walk: 'assets/models/customizable-man/clips/M_Walk_001.glb',
  stand: 'assets/models/customizable-man/clips/M_Standing_Idle_001.glb',
} as const
export type ClipName = keyof typeof CLIPS

export const MIXAMO_TO_ARP = new Map<string, string>([
  ['Hips', ARP.hips], ['Spine', ARP.spine], ['Spine1', ARP.spine1], ['Spine2', ARP.chest], ['Neck', ARP.neck], ['Head', ARP.head],
  ['LeftShoulder', ARP.shoulderL], ['LeftArm', ARP.armL], ['LeftForeArm', ARP.foreL], ['LeftHand', ARP.handL],
  ['RightShoulder', ARP.shoulderR], ['RightArm', ARP.armR], ['RightForeArm', ARP.foreR], ['RightHand', ARP.handR],
  ['LeftUpLeg', ARP.thighL], ['LeftLeg', ARP.shinL], ['LeftFoot', ARP.footL], ['LeftToeBase', ARP.toeL],
  ['RightUpLeg', ARP.thighR], ['RightLeg', ARP.shinR], ['RightFoot', ARP.footR], ['RightToeBase', ARP.toeR],
])
// ARP keeps a twist sibling beside the upper arm (same rest); it must follow or the sleeve tears
const TWINS: [string, string][] = [[ARP.armL, ARP.armTwistL], [ARP.armR, ARP.armTwistR]]


const sources = new Map<string, Promise<AssetContainer>>()
function source(url: string, scene: Scene) {
  if (!sources.has(url)) {
    sources.set(url, LoadAssetContainerAsync(url, scene, { pluginExtension: '.glb' }).then((c) => {
      c.animationGroups.forEach((g) => g.stop())
      c.addAllToScene() // retargetAnimationKeys reads the source nodes' world matrices
      c.meshes.forEach((m) => m.setEnabled(false))
      return c
    }))
  }
  return sources.get(url)!
}

/** retarget one clip onto a figure; returns a stopped, looping group on the figure's own bones */
export async function retarget(clip: ClipName, rig: Rig, scene: Scene): Promise<AnimationGroup> {
  const rigRoot = rig.root
  const c = await source(CLIPS[clip], scene)
  const src = c.animationGroups[0]
  const byName = new Map(c.transformNodes.map((n) => [n.name, n]))
  const avatar = new AnimatorAvatar(`fig-${clip}`, rigRoot, false, false)
  const tgt = (n: string) => rigRoot.getDescendants(false).find((d) => d.name === n) as TransformNode
  const group = avatar.retargetAnimationGroup(src, {
    animationGroupName: `${rigRoot.name}-${clip}`,
    mapNodeNames: MIXAMO_TO_ARP,
    retargetAnimationKeys: true,
    fixAnimations: true,
    checkHierarchy: false,
    fixRootPosition: true,
    fixGroundReference: true,
    fixGroundReferenceDynamicRefNode: true,
    rootNodeName: 'Hips',
    groundReferenceNodeName: 'LeftToeBase',
  })
  for (const ta of [...group.targetedAnimations]) {
    const name = (ta.target as TransformNode).name
    // hips: keep the vertical (ground-fixed) motion, hold x/z in place
    if (name === ARP.hips && ta.animation.targetProperty === 'position') {
      const rest = (ta.target as TransformNode).position.clone()
      ta.animation.setKeys(ta.animation.getKeys().map((k) => ({ ...k, value: new Vector3(rest.x, (k.value as Vector3).y, rest.z) })))
    }
    const twin = TWINS.find(([a]) => a === name)?.[1]
    if (twin && ta.animation.targetProperty === 'rotationQuaternion') {
      const a = new Animation(`${twin}-${clip}`, 'rotationQuaternion', ta.animation.framePerSecond, Animation.ANIMATIONTYPE_QUATERNION)
      a.setKeys(ta.animation.getKeys().map((k) => ({ ...k })))
      group.addTargetedAnimation(a, tgt(twin))
    }
  }
  group.loopAnimation = true
  guardBake(group, rig)
  return group
}

/** straighten every backward knee in the clip's keys (see header) */
function guardBake(group: AnimationGroup, rig: Rig) {
  group.start(true)
  group.pause() // goToFrame only moves a started group
  const shinKeys = (n: TransformNode) => group.targetedAnimations.find((ta) => ta.target === n && ta.animation.targetProperty === 'rotationQuaternion')?.animation
  for (const s of ['L', 'R'] as const) {
    const anim = shinKeys(rig.node(`shin${s}`))
    if (!anim) continue
    const keys = anim.getKeys()
    keys.forEach((k) => {
      group.goToFrame(k.frame)
      if (!checkPose(rig).some((v) => v.limb === `leg${s}` && v.kind === 'knee-backwards')) return
      aim(rig, `shin${s}`, `foot${s}`, pos(rig, `shin${s}`).subtract(pos(rig, `thigh${s}`)))
      k.value = rig.node(`shin${s}`).rotationQuaternion!.clone()
    })
    anim.setKeys(keys)
  }
  group.stop()
}
