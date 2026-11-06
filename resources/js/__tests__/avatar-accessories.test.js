import * as THREE from 'three'
import { attachAccessory, detachAccessory, findBone } from '../avatar-accessories.js'

// A Mixamo-style rig exported from Blender: armature scaled 0.01, bones named mixamorig:*.
function makeRig () {
  const root = new THREE.Group()
  const armature = new THREE.Group()
  armature.scale.setScalar(0.01)
  const hips = new THREE.Bone(); hips.name = 'mixamorigHips'
  const head = new THREE.Bone(); head.name = 'mixamorigHead'; head.position.set(0, 160, 0)
  hips.add(head); armature.add(hips); root.add(armature)
  root.updateMatrixWorld(true)
  return { root, head }
}

test('finds a bone with or without the mixamorig prefix', () => {
  const { root, head } = makeRig()
  expect(findBone(root, 'Head')).toBe(head)
  expect(findBone(root, 'mixamorigHead')).toBe(head)
  expect(findBone(root, 'Neck')).toBeNull()
})

test('hat follows the head bone and keeps its world size on a 0.01-scaled rig', () => {
  const { root, head } = makeRig()
  const hat = new THREE.Group()

  attachAccessory(root, hat, { id: 'pirate_hat', offset: [0, 0.1, 0], scale: 0.3 })

  expect(hat.parent).toBe(head)
  const world = new THREE.Vector3(); hat.getWorldPosition(world)
  expect(world.y).toBeCloseTo(1.7)
  const worldScale = new THREE.Vector3(); hat.getWorldScale(worldScale)
  expect(worldScale.x).toBeCloseTo(0.3)

  head.position.y += 10   // head moves (animation) → hat moves with it
  root.updateMatrixWorld(true); hat.getWorldPosition(world)
  expect(world.y).toBeCloseTo(1.8)
})

test('same character can be shown with and without the hat', () => {
  const { root, head } = makeRig()
  attachAccessory(root, new THREE.Group(), { id: 'pirate_hat' })

  expect(detachAccessory(root, 'pirate_hat')).toBe(true)
  expect(head.children).toHaveLength(0)
  expect(detachAccessory(root, 'pirate_hat')).toBe(false)
})

test('throws a clear error when the rig has no such bone', () => {
  const { root } = makeRig()
  expect(() => attachAccessory(root, new THREE.Group(), { id: 'x', bone: 'Tail' })).toThrow(/Tail/)
})
