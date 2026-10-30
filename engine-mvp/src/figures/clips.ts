// Mixamo-named clips (Ready Player Me animation library: Hips, Spine, LeftUpLeg...) retargeted onto the
// standard body's Auto-Rig Pro deform rig with Babylon's AnimatorAvatar.
//
// Crouch / float fix: Babylon's own root + ground correction (hips scaled by leg length, the lowest foot kept
// on the ground every frame), then the hips are held in place on x/z (the stage moves the figure).
// Guard bake: a frame where a knee bends backwards (retargeted hyperextension) gets that shin aimed straight
// along the thigh, written back into the keys. The walk ships with zero guard violations.
import {
  Animation, AnimatorAvatar, LoadAssetContainerAsync, Quaternion, Vector3,
  type AnimationGroup, type AssetContainer, type Scene, type TransformNode,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { aim, ARP, checkPose, frameOf, pos, refresh, resetToRest, type RestPose, type Rig } from './pose'

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


/** stride: the leg swing scaled toward rest (1 = the source's long-legged stride; shorter legs, shorter steps,
 *  and the hips bob less: at 1 the cartoon body bobs 7 cm, the limit is 6) */
export const STRIDE = { scale: 0.8 }
const LEGS = new Set<string>([ARP.thighL, ARP.thighR, ARP.shinL, ARP.shinR])

const sources = new Map<string, Promise<AssetContainer>>()
function source(url: string, scene: Scene) {
  const key = `${scene.uid}:${url}` // per scene: a container belongs to the scene it loaded into
  if (!sources.has(key)) {
    sources.set(key, LoadAssetContainerAsync(url, scene, { pluginExtension: '.glb' }).then((c) => {
      c.animationGroups.forEach((g) => g.stop())
      c.addAllToScene() // retargetAnimationKeys reads the source nodes' world matrices
      c.meshes.forEach((m) => m.setEnabled(false))
      return c
    }))
    sources.get(key)!.catch(() => sources.delete(key)) // a failed load is retried next time
  }
  return sources.get(key)!
}

/** retarget one clip onto a figure; returns a stopped, looping group on the figure's own bones */
export async function retarget(clip: ClipName, rig: Rig, rest: RestPose, scene: Scene): Promise<AnimationGroup> {
  return retargetFrom(await source(CLIPS[clip], scene), clip, rig, rest)
}

/** the same from a clip container already in the scene (the vitest loads it from disk) */
export function retargetFrom(c: AssetContainer, clip: string, rig: Rig, rest: RestPose): AnimationGroup {
  const rigRoot = rig.root
  const src = c.animationGroups[0]
  resetToRest(rest) // the ground fix and the in-place hips read the rig as it stands now: make that the rest pose
  const avatar = new AnimatorAvatar(`fig-${clip}`, rigRoot, false, false)
  avatar.showWarnings = false // the source's finger bones (Thumb2..4 etc.) have no deform bone here: expected
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
  // shorter steps for shorter legs: every leg rotation key is pulled toward the rest pose
  for (const ta of group.targetedAnimations) {
    const node = ta.target as TransformNode
    if (!LEGS.has(node.name) || ta.animation.targetProperty !== 'rotationQuaternion') continue
    const restQ = rest.get(node)!.q
    ta.animation.setKeys(ta.animation.getKeys().map((k) => ({ ...k, value: Quaternion.Slerp(restQ, k.value as Quaternion, STRIDE.scale) })))
  }
  group.loopAnimation = true
  avatar.dispose() // made with disposeResources = false: frees the avatar only, never the figure
  guardBake(group, rig, rest)
  return group
}

/** the lowest sole of the two feet above the ground, in rig space (0 = planted); rest = standing on the ground */
export function soleHeight(rig: Rig, restUp: { toe: number; foot: number }, up: Vector3): number {
  refresh(rig)
  return Math.min(...(['L', 'R'] as const).flatMap((s) => [
    Vector3.Dot(pos(rig, `toe${s}`), up) - restUp.toe,
    Vector3.Dot(pos(rig, `foot${s}`), up) - restUp.foot,
  ]))
}

/** straighten every backward knee in the clip's keys (see header) */
function guardBake(group: AnimationGroup, rig: Rig, rest: RestPose) {
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
  // planted foot: Babylon's ground fix still lets both feet leave the ground mid-cycle (up to 13 cm, check F1).
  // Every hips key moves along up so the lower foot's sole sits on the ground. The hips hang from the rig root,
  // so its position keys are already in rig space.
  resetToRest(rest)
  const f = frameOf(rig)
  const restUp = { toe: Vector3.Dot(pos(rig, 'toeL'), f.up), foot: Vector3.Dot(pos(rig, 'footL'), f.up) }
  const hipKeys = group.targetedAnimations.find((ta) => ta.target === rig.node('hips') && ta.animation.targetProperty === 'position')?.animation
  if (hipKeys) {
    // resampled on EVERY frame: the hips track has fewer keys than the legs, and between keys a foot would lift
    const hips = rig.node('hips')
    const keys: { frame: number; value: Vector3 }[] = []
    for (let fr = Math.floor(group.from); fr <= Math.ceil(group.to); fr += 1) {
      group.goToFrame(Math.min(fr, group.to))
      keys.push({ frame: fr, value: hips.position.subtract(f.up.scale(soleHeight(rig, restUp, f.up))) })
    }
    hipKeys.setKeys(keys)
  }
  group.stop()
  resetToRest(rest) // goToFrame left the bones on the last key
}
