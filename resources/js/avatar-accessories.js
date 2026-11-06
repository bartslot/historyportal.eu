/**
 * Rigid accessories (hats, helmets, crowns) on a rigged character.
 *
 * A hat does not deform, so it needs no skin weights: it is parented to the head bone and
 * follows every animation for free. The base character stays hat-less; the same GLB is shown
 * with or without the hat by attaching or detaching it at runtime.
 *
 * Offsets and scale are in WORLD units (metres), measured at attach time, so the same numbers
 * work on a 0.01-scaled Mixamo armature and on a 1.0-scaled one.
 *
 * Clothes and boots are different: they bend with the body and need skin weights bound to
 * the same skeleton. That is done in Blender, not here.
 */
import * as THREE from 'three'

const ACCESSORY_PREFIX = 'accessory:'

/** Bone by name, accepting Mixamo's prefix ("Head" matches "mixamorigHead" and "mixamorig:Head"). */
export function findBone (root, name) {
  let found = null
  root.traverse((node) => {
    if (found || !node.isBone) return
    if (node.name === name || node.name.replace(/^mixamorig:?/, '') === name) found = node
  })
  return found
}

/**
 * Parent `object` to `bone` of `root`, placed `offset` metres from the bone with world `scale`
 * and extra `rotation` (Euler radians). Attach while the character is in its rest pose.
 */
export function attachAccessory (root, object, { id, bone = 'Head', offset = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const target = findBone(root, bone)
  if (!target) throw new Error(`[Accessory] bone "${bone}" not found for "${id}"`)

  detachAccessory(root, id)
  root.updateMatrixWorld(true)

  const boneWorld = new THREE.Vector3()
  target.getWorldPosition(boneWorld)
  object.name = ACCESSORY_PREFIX + id
  object.position.copy(boneWorld).add(new THREE.Vector3(...offset))
  object.rotation.set(...rotation)
  object.scale.setScalar(scale)
  object.updateMatrixWorld(true)

  target.attach(object)   // keeps the world transform set above
  return object
}

/** Remove a previously attached accessory. Returns false when it was not attached. */
export function detachAccessory (root, id) {
  const object = root.getObjectByName(ACCESSORY_PREFIX + id)
  if (!object) return false
  object.removeFromParent()
  return true
}
