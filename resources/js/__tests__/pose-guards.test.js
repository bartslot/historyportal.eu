import * as THREE from 'three'
import { guardKnees, characterForward } from '../pose-guards.js'

// One leg facing +Z (glTF forward). `flipped` gives the bones a 180° roll about Y, the way a different
// auto-rigger can orient its local axes: the same local +X rotation then bends the knee the other way.
function makeLeg (flipped) {
  const root = new THREE.Group()
  const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), flipped ? Math.PI : 0)
  const upLeg = new THREE.Bone(); upLeg.position.set(0.1, 1, 0); upLeg.quaternion.copy(roll)
  const leg = new THREE.Bone(); leg.position.set(0, -0.45, 0)
  const foot = new THREE.Bone(); foot.position.set(0, -0.45, 0)
  const toe = new THREE.Bone(); toe.position.set(0, -0.05, flipped ? -0.15 : 0.15)   // local; the 180° roll turns -0.15 into +Z
  root.add(upLeg); upLeg.add(leg); leg.add(foot); foot.add(toe)
  root.updateMatrixWorld(true)
  const boneMap = { LeftUpLeg: upLeg, LeftLeg: leg, LeftFoot: foot, LeftToeBase: toe }
  const restQ = Object.fromEntries(Object.entries(boneMap).map(([k, b]) => [k, b.quaternion.clone()]))
  return { root, boneMap, restQ }
}

// The RPM-tuned "sitting" offsets: UpLeg Rx +78 (hip flexion), Leg Rx -82 (knee bend)
function sittingTargets (restQ) {
  const q = (deg) => new THREE.Quaternion().setFromEuler(new THREE.Euler(deg * Math.PI / 180, 0, 0))
  return { LeftUpLeg: restQ.LeftUpLeg.clone().multiply(q(-78)), LeftLeg: restQ.LeftLeg.clone().multiply(q(82)) }
}

function kneeAndAnkle (boneMap, targets) {
  for (const [k, q] of Object.entries(targets)) boneMap[k].quaternion.copy(q)
  boneMap.LeftUpLeg.parent.updateMatrixWorld(true)
  const w = (b) => b.getWorldPosition(new THREE.Vector3())
  return { hip: w(boneMap.LeftUpLeg), knee: w(boneMap.LeftLeg), ankle: w(boneMap.LeftFoot) }
}

test.each([false, true])('sitting never bends the knee backwards (flipped rig: %s)', (flipped) => {
  const { boneMap, restQ } = makeLeg(flipped)
  const forward = characterForward(boneMap, null)
  const targets = guardKnees(boneMap, restQ, sittingTargets(restQ), forward)

  const { hip, knee, ankle } = kneeAndAnkle(boneMap, targets)
  expect(knee.clone().sub(hip).dot(forward)).toBeGreaterThan(0.2)   // thigh points forward
  expect(knee.y - ankle.y).toBeGreaterThan(0.2)                     // shin hangs down from the knee
  expect(ankle.clone().sub(knee).dot(forward)).toBeLessThan(0.15)   // foot not kicked out in front
})

test('forward comes from foot to toe, so it works for any rig orientation', () => {
  // both rigs face +Z; only their local bone axes differ
  expect(characterForward(makeLeg(false).boneMap, null).z).toBeCloseTo(1)
  expect(characterForward(makeLeg(true).boneMap, null).z).toBeCloseTo(1)
})

test('leaves bones as they were after checking', () => {
  const { boneMap, restQ } = makeLeg(true)
  guardKnees(boneMap, restQ, sittingTargets(restQ), characterForward(boneMap, null))
  expect(boneMap.LeftLeg.quaternion.equals(restQ.LeftLeg)).toBe(true)
})
