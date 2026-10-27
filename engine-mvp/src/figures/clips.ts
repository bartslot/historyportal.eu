// Mixamo-named clips (Ready Player Me animation library: Hips, Spine, LeftUpLeg...) retargeted onto the
// standard body's Auto-Rig Pro deform rig with Babylon's AnimatorAvatar.
//
// Crouch fix: the source skeleton has long legs; replayed on the cartoon body's short legs its hip height
// makes the figure walk in a squat. The hips' vertical keys are rescaled by targetHipHeight / sourceHipHeight
// (and the in-place sway with them), so the legs reach full stretch at mid-stance like the source's do.
import {
  Animation, AnimatorAvatar, LoadAssetContainerAsync, Vector3,
  type AnimationGroup, type AssetContainer, type Scene, type TransformNode,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { ARP } from './pose'

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

/** extra crouch correction on top of the measured ratio (knob: 1 = measured only) */
export const STRIDE = { hipLift: 1 }

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

function hipHeight(hips: TransformNode, foot: TransformNode) {
  hips.computeWorldMatrix(true)
  foot.computeWorldMatrix(true)
  return hips.getAbsolutePosition().y - foot.getAbsolutePosition().y
}

/** retarget one clip onto a figure; returns a stopped, looping group on the figure's own bones */
export async function retarget(clip: ClipName, rigRoot: TransformNode, scene: Scene): Promise<AnimationGroup> {
  const c = await source(CLIPS[clip], scene)
  const src = c.animationGroups[0]
  const byName = new Map(c.transformNodes.map((n) => [n.name, n]))
  const avatar = new AnimatorAvatar(`fig-${clip}`, rigRoot, false, false)
  const tgt = (n: string) => rigRoot.getDescendants(false).find((d) => d.name === n) as TransformNode
  const ratio = hipHeight(tgt(ARP.hips), tgt(ARP.footL)) / hipHeight(byName.get('Hips')!, byName.get('LeftFoot')!)
  const group = avatar.retargetAnimationGroup(src, {
    animationGroupName: `${rigRoot.name}-${clip}`,
    mapNodeNames: MIXAMO_TO_ARP,
    retargetAnimationKeys: true,
    fixAnimations: true,
    checkHierarchy: false,
  })
  for (const ta of [...group.targetedAnimations]) {
    const name = (ta.target as TransformNode).name
    // hips translation: in place, at the TARGET's hip height (the crouch fix)
    if (name === ARP.hips && ta.animation.targetProperty === 'position') {
      const keys = ta.animation.getKeys()
      const rest = (ta.target as TransformNode).position.clone()
      const top = Math.max(...keys.map((k) => (k.value as Vector3).y)) // mid-stance: legs at full stretch
      ta.animation.setKeys(keys.map((k) => {
        const v = k.value as Vector3
        return { ...k, value: new Vector3(rest.x, rest.y + (v.y - top) * ratio * STRIDE.hipLift, rest.z) }
      }))
    }
    const twin = TWINS.find(([a]) => a === name)?.[1]
    if (twin && ta.animation.targetProperty === 'rotationQuaternion') {
      const a = new Animation(`${twin}-${clip}`, 'rotationQuaternion', ta.animation.framePerSecond, Animation.ANIMATIONTYPE_QUATERNION)
      a.setKeys(ta.animation.getKeys().map((k) => ({ ...k })))
      group.addTargetedAnimation(a, tgt(twin))
    }
  }
  group.loopAnimation = true
  return group
}
