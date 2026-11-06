/**
 * puppet-pose.js — the sums behind the picture editor's Bones tab, on plain data. A figure is cut into rigid parts
 * (stage25d/bones.ts bindPuppet): a pose only moves and turns each part, so one matrix says where a part stands and a point
 * can be found on it again. A bone's turn is a number on the layer (`bone:head`), or on its keys, like x or scale.
 */
import { BONE_PREFIX } from '@stage25d/stage25d/layout'

/** The bones a teacher can turn: those with a part of their own. The hips stay where they stand. */
export const movableBones = (puppet) => {
  const withPart = new Set(puppet.parts.map((p) => p.bone))
  return puppet.bones.map((b) => b.name).filter((name) => withPart.has(name) && name !== 'hips')
}

/** Where a rigid part stands: [a, b, c, d, e, f] as a canvas transform from its place in the drawing. */
export const matrixOf = (quad, x0, y0, x1, y1) => {
  const angle = Math.atan2(y1 - y0, x1 - x0) - Math.atan2(quad[1][1] - quad[0][1], quad[1][0] - quad[0][0])
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return [cos, sin, -sin, cos, x0 - (cos * quad[0][0] - sin * quad[0][1]), y0 - (sin * quad[0][0] + cos * quad[0][1])]
}

/** Every part's matrix for the flat vertices bend() gave: four corners per part, in the puppet's order. */
export const matricesOf = (puppet, vertices) => puppet.parts.map((part, i) => matrixOf(part.quad, vertices[i * 8], vertices[i * 8 + 1], vertices[i * 8 + 2], vertices[i * 8 + 3]))

export const apply = ([a, b, c, d, e, f], x, y) => [a * x + c * y + e, b * x + d * y + f]

export const invert = ([a, b, c, d, e, f], x, y) => {
  const det = a * d - b * c
  const dx = x - e, dy = y - f
  return [(d * dx - c * dy) / det, (a * dy - b * dx) / det]
}

/** Where a bone's joint stands in this pose. */
export const jointAt = (puppet, matrices, name) => {
  const bone = puppet.bones.find((b) => b.name === name)
  const part = puppet.parts.findIndex((p) => p.bone === name)
  return bone && part >= 0 ? apply(matrices[part], bone.from[0], bone.from[1]) : null
}

/**
 * The bone under a point of the drawing, front part first. `opaque(u, v)` says whether the atlas has paint there, so the
 * air in a part's box never takes a click. Null: nothing there that can turn.
 */
export const partUnder = (puppet, matrices, x, y, opaque, movable) => {
  for (let i = puppet.parts.length - 1; i >= 0; i--) {
    const part = puppet.parts[i]
    if (!movable.includes(part.bone)) continue
    const [px, py] = invert(matrices[i], x, y)
    const [[x0, y0], , [x1, y1]] = part.quad
    if (px < x0 || px > x1 || py < y0 || py > y1) continue
    const [u0, v0, u1, v1] = part.uv
    if (opaque(u0 + ((px - x0) / (x1 - x0)) * (u1 - u0), v0 + ((py - y0) / (y1 - y0)) * (v1 - v0))) return part.bone
  }
  return null
}

/** How far a drag from one point to another turns round a joint, degrees clockwise on screen, the short way round. */
export const turnBetween = ([jx, jy], [ax, ay], [bx, by]) => {
  const deg = ((Math.atan2(by - jy, bx - jx) - Math.atan2(ay - jy, ax - jx)) * 180) / Math.PI
  return ((deg + 540) % 360) - 180
}

const isBoneField = (field) => field.startsWith(BONE_PREFIX)

/** A pose { head: 10 } as a layer's or a key's fields { 'bone:head': 10 }. */
export const poseFields = (pose) => Object.fromEntries(Object.entries(pose).map(([name, deg]) => [BONE_PREFIX + name, deg]))

/** Same moment on the timeline: anim/keyframes.js TIME_EPSILON. */
const KEY_EPSILON = 1 / 120

/** The moments that hold a pose. */
export const poseTimes = (keys) => keys.filter((k) => Object.keys(k).some(isBoneField)).map((k) => k.t).sort((a, b) => a - b)

export const poseKeyAt = (keys, t) => poseTimes(keys).find((u) => Math.abs(u - t) < KEY_EPSILON) ?? null

/** The keys with this whole pose at t; whatever else a key there holds (x, scale) stays. */
export const withPoseKey = (keys, t, pose) => {
  const at = keys.findIndex((k) => Math.abs(k.t - t) < KEY_EPSILON)
  if (at >= 0) return keys.map((k, i) => (i === at ? { ...k, ...poseFields(pose) } : k))
  return [...keys, { t, ...poseFields(pose) }].sort((a, b) => a.t - b.t)
}

/** The keys without a pose at t. A key that held nothing else goes. */
export const withoutPoseKey = (keys, t) => keys.flatMap((k) => {
  if (Math.abs(k.t - t) >= KEY_EPSILON) return [k]
  const rest = Object.fromEntries(Object.entries(k).filter(([field]) => !isBoneField(field)))
  return Object.keys(rest).length > 1 ? [rest] : []
})
