/**
 * Diorama keyframe playback, pure. An item's `keys` ([{t, cell, walk?}], seconds, on its floor)
 * say where it stands when; between two keys it moves in a straight line at constant speed.
 * A key with `walk` names the sprite animation for the stretch that ENDS at that key.
 *
 * Constant speed, not eased: a walking figure keeps its pace, and the walk frame is chosen from
 * the DISTANCE walked (one stride = one full cycle), so the feet never slide whatever the speed.
 */

/**
 * @param {{cell: number[], keys?: Array<{t: number, cell: number[], walk?: string}>}} item
 * @param {number} t          seconds into the scene
 * @param {number} cellM      metres per cell on the item's floor
 * @returns {{cell: number[], anim: string|null, walkedM: number, dir: number[]|null}}
 *   anim: the animation playing now (null = standing), walkedM: metres walked so far in walk
 *   stretches (drives the frame), dir: the current or last direction of travel in cells.
 */
export function poseAt (item, t, cellM) {
  const keys = item.keys ?? []
  if (!keys.length) return { cell: item.cell, anim: null, walkedM: 0, dir: null }
  if (t <= keys[0].t) return { cell: keys[0].cell, anim: null, walkedM: 0, dir: null }

  let walkedM = 0
  let dir = null
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    const d = [b.cell[0] - a.cell[0], b.cell[1] - a.cell[1]]
    const lengthM = Math.hypot(d[0], d[1]) * cellM
    if (lengthM > 0) dir = d
    if (t < b.t) {
      const f = (t - a.t) / (b.t - a.t)
      const cell = [a.cell[0] + d[0] * f, a.cell[1] + d[1] * f]
      return { cell, anim: b.walk && lengthM > 0 ? b.walk : null, walkedM: walkedM + (b.walk ? lengthM * f : 0), dir }
    }
    if (b.walk) walkedM += lengthM
  }
  return { cell: keys[keys.length - 1].cell, anim: null, walkedM, dir }
}

/**
 * Which sheet frame to show. A walk clip (it has `stride_m`) plays its frames once per stride walked,
 * so the feet match the floor at any speed; any other clip (it has `fps`) plays by time. Standing
 * shows the sheet's idle clip (looping by time when it has an fps), else frame 0.
 * @param {{frames: number, anims: object}|undefined} sheet
 * @param {number} t  seconds into the scene, for clips that play by time
 */
export function frameFor (sheet, anim, walkedM, t = 0) {
  if (!sheet) return 0
  const clip = (anim && sheet.anims?.[anim]) || sheet.anims?.idle
  if (!clip?.frames?.length) return 0
  const n = clip.frames.length
  if (anim && clip.stride_m) return clip.frames[Math.floor((walkedM / clip.stride_m) * n) % n]
  if (clip.fps) return clip.frames[Math.floor(Math.max(0, t) * clip.fps) % n]
  return clip.frames[0]
}
