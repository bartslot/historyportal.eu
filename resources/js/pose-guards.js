/**
 * Anatomy guards for posing any rig.
 *
 * Pose presets are Euler offsets in each bone's LOCAL space. Different auto-riggers (Ready Player Me, Mixamo,
 * Tripo, Blender exports) roll their bones differently, so the same offset can bend a knee BACKWARDS. A human knee
 * only bends one way, so instead of trusting the sign we measure the result in world space and mirror the offset
 * when it is wrong:
 *   - the shin always swings backwards relative to the thigh (a knee never bends backwards)
 *   - the thigh never swings more than 45° behind the body (hip extension stops around 30°)
 *   - an upper arm never crosses through the torso (T-pose-tuned offsets on an A-pose rig)
 */
import * as THREE from 'three'

const MAX_HIP_EXTENSION = Math.cos(THREE.MathUtils.degToRad(45))   // thigh may point at most 45° backwards
const MIN_KNEE_BEND = 0.035                                         // sin of ~2°: below this the leg counts as straight

/** Facing direction in world space: heel-to-toe of the feet, flattened. Falls back to the root's +Z (glTF). */
export function characterForward (boneMap, root) {
  const dir = new THREE.Vector3()
  for (const side of ['Left', 'Right']) {
    const foot = boneMap[`${side}Foot`]
    const toe = boneMap[`${side}ToeBase`]
    if (!foot || !toe) continue
    dir.add(toe.getWorldPosition(new THREE.Vector3()).sub(foot.getWorldPosition(new THREE.Vector3())))
  }
  dir.y = 0
  if (dir.lengthSq() > 1e-8) return dir.normalize()
  const fallback = new THREE.Vector3(0, 0, 1)
  return root ? fallback.transformDirection(root.matrixWorld).setY(0).normalize() : fallback
}

const worldPos = (bone) => bone.getWorldPosition(new THREE.Vector3())

/** Same offset from rest, mirrored: rest * offset⁻¹. */
function mirrorOffset (restQ, target) {
  const offset = restQ.clone().invert().multiply(target)
  return restQ.clone().multiply(offset.invert())
}

function measure (upLeg) {
  upLeg.parent?.updateWorldMatrix(true, true)
  const leg = upLeg.children.find((c) => c.isBone)
  const foot = leg?.children.find((c) => c.isBone)
  return { hip: worldPos(upLeg), knee: worldPos(leg), ankle: worldPos(foot) }
}

/**
 * Returns `targets` (bone name → target quaternion) with every leg corrected so it bends like a human leg.
 * Bones are restored to their current rotation before returning.
 */
export function guardKnees (boneMap, restQ, targets, forward) {
  const fixed = { ...targets }
  for (const side of ['Left', 'Right']) {
    const up = `${side}UpLeg`
    const low = `${side}Leg`
    const upLeg = boneMap[up]
    const leg = boneMap[low]
    if (!upLeg || !leg || !boneMap[`${side}Foot`]) continue
    if (!fixed[up] && !fixed[low]) continue

    const saved = [upLeg.quaternion.clone(), leg.quaternion.clone()]
    const apply = () => {
      if (fixed[up]) upLeg.quaternion.copy(fixed[up])
      if (fixed[low]) leg.quaternion.copy(fixed[low])
      return measure(upLeg)
    }

    let { hip, knee } = apply()
    const thigh = knee.clone().sub(hip).normalize()
    if (fixed[up] && restQ[up] && thigh.dot(forward) < -MAX_HIP_EXTENSION) {
      fixed[up] = mirrorOffset(restQ[up], fixed[up])
    }

    // A knee hinges about the body's left-right axis and the shin always swings BACKWARDS relative to the thigh:
    // (thigh × shin) must point along (up × forward). The opposite sign is a knee bent backwards.
    const p = apply()
    const thighDir = p.knee.clone().sub(p.hip).normalize()
    const shinDir = p.ankle.clone().sub(p.knee).normalize()
    const hinge = new THREE.Vector3().crossVectors(thighDir, shinDir)
    const kneeAxis = new THREE.Vector3(0, 1, 0).cross(forward)
    if (fixed[low] && restQ[low] && hinge.length() > MIN_KNEE_BEND && hinge.dot(kneeAxis) < 0) {
      fixed[low] = mirrorOffset(restQ[low], fixed[low])
    }

    upLeg.quaternion.copy(saved[0])
    leg.quaternion.copy(saved[1])
    upLeg.parent?.updateWorldMatrix(true, true)
  }
  return fixed
}

const ARM_CROSSING = -0.1   // upper arm pointing this far towards the OTHER side of the body = through the torso

/** Local quaternion that turns `bone` so the direction bone → child points along `worldDir`. */
function aimLocal (bone, child, worldDir) {
  bone.parent?.updateWorldMatrix(true, true)
  const current = worldPos(child).sub(worldPos(bone)).normalize()
  const delta = new THREE.Quaternion().setFromUnitVectors(current, worldDir.clone().normalize())
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta)
  const parentWorld = bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()
  return parentWorld.invert().multiply(world)
}

/**
 * Arm presets are offsets tuned for a T-pose rest. On an A-pose rig (Tripo, ChatGPT A-pose sheets) the same
 * offset overshoots and drives the arm through the torso, which tears sleeves and shoulders. When an upper arm
 * would cross the body, aim it instead: hanging down, slightly out and forward, in the character's own frame.
 */
export function guardArms (boneMap, targets, forward) {
  const fixed = { ...targets }
  const up = new THREE.Vector3(0, 1, 0)
  const left = up.clone().cross(forward).normalize()
  for (const side of ['Left', 'Right']) {
    const arm = boneMap[`${side}Arm`]
    const fore = boneMap[`${side}ForeArm`]
    if (!arm || !fore || !fixed[`${side}Arm`]) continue
    const outward = side === 'Left' ? left : left.clone().negate()
    const saved = arm.quaternion.clone()

    arm.quaternion.copy(fixed[`${side}Arm`])
    arm.parent?.updateWorldMatrix(true, true)
    const upper = worldPos(fore).sub(worldPos(arm)).normalize()
    if (upper.dot(outward) < ARM_CROSSING) {
      const hang = outward.clone().multiplyScalar(0.25).addScaledVector(forward, 0.1).addScaledVector(up, -0.96)
      fixed[`${side}Arm`] = aimLocal(arm, fore, hang)
    }
    arm.quaternion.copy(saved)
    arm.parent?.updateWorldMatrix(true, true)
  }
  return fixed
}
