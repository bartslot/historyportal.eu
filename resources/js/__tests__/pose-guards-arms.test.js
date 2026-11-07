import * as THREE from 'three'
import { guardArms } from '../pose-guards.js'

// Character faces +Z, left side is +X. Left arm in A-pose: the upper arm already hangs 45° down at rest.
function makeAposeArm () {
  const root = new THREE.Group()
  const shoulder = new THREE.Bone(); shoulder.position.set(0.15, 1.4, 0)
  const arm = new THREE.Bone()   // LeftArm, points along its local +Y like Mixamo bones
  arm.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 3 / 4)   // local +Y → down and out (+X)
  const fore = new THREE.Bone(); fore.position.set(0, 0.28, 0)
  const hand = new THREE.Bone(); hand.position.set(0, 0.25, 0)
  root.add(shoulder); shoulder.add(arm); arm.add(fore); fore.add(hand)
  root.updateMatrixWorld(true)
  const boneMap = { LeftShoulder: shoulder, LeftArm: arm, LeftForeArm: fore, LeftHand: hand }
  const restQ = Object.fromEntries(Object.entries(boneMap).map(([k, b]) => [k, b.quaternion.clone()]))
  return { root, boneMap, restQ }
}

const dir = (from, to) => to.getWorldPosition(new THREE.Vector3()).sub(from.getWorldPosition(new THREE.Vector3())).normalize()

test('arm offsets tuned for a T-pose never push an A-pose arm through the body', () => {
  const { boneMap, restQ } = makeAposeArm()
  // "relaxed" for a T-pose rig: rotate the upper arm 75° further down. On an A-pose rest that overshoots inwards.
  const extra = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -75 * Math.PI / 180)
  const targets = { LeftArm: restQ.LeftArm.clone().multiply(extra) }

  const fixed = guardArms(boneMap, targets, new THREE.Vector3(0, 0, 1))
  for (const [k, q] of Object.entries(fixed)) boneMap[k].quaternion.copy(q)
  boneMap.LeftShoulder.parent.updateMatrixWorld(true)

  const upper = dir(boneMap.LeftArm, boneMap.LeftForeArm)
  expect(upper.x).toBeGreaterThan(0)      // stays on the left side of the body
  expect(upper.y).toBeLessThan(-0.8)      // hangs down
})

test('a sensible arm target is left alone', () => {
  const { boneMap, restQ } = makeAposeArm()
  const targets = { LeftArm: restQ.LeftArm.clone() }
  expect(guardArms(boneMap, targets, new THREE.Vector3(0, 0, 1)).LeftArm.equals(restQ.LeftArm)).toBe(true)
})
