// Where a figure stands on screen at time t, from the same camera the stage plays (stage25d/layout). Used to put a
// balloon's tail on the speaker's head and to drop a balloon whose speaker is out of frame.
import { DEPTH_Z, HOUSE_PITCH_DEG, cameraAt, layerAt, sceneDuration, shotAt, viewWidthAt } from '../stage25d/layout'
import type { Scene, SceneLayer } from '../stage25d/types'

const ASPECT = 16 / 9
const EDGE = 0.92 // share of the half-frame a speaker must be inside

/** x and y (shares of the frame, y from the top) of the top of a figure's head, or null when it is out of frame. */
export function headOnScreen(scene: Scene, layer: SceneLayer, heightM: number, t: number): { x: number; y: number } | null {
  const { cam, t: ct } = shotAt(scene, t)
  const c = cameraAt(cam, ct, sceneDuration(scene))
  const z = DEPTH_Z[layer.depth]
  const dz = z - c.z
  if (dz <= 0.5) return null
  const at = layerAt(layer, t)
  const worldX = (at.x - 0.5) * viewWidthAt(z)
  const tanHalf = Math.tan(c.fov / 2)
  const nx = (worldX - c.x) / (dz * tanHalf * ASPECT)
  const pitch = (-HOUSE_PITCH_DEG * Math.PI) / 180 // the house camera looks up a touch
  const ny = Math.tan(Math.atan2(at.y + heightM * at.scale - c.y, dz) - pitch) / tanHalf
  if (Math.abs(nx) > EDGE) return null
  return { x: (nx + 1) / 2, y: Math.min(1, Math.max(0, (1 - ny) / 2)) }
}
