/**
 * cut-layer.js — where "Make a layer" puts a part lifted out of a stage picture: over its own pixels, no jump.
 *
 * The stage gives the cut's bottom middle and top middle in the world, on the plane of the picture it came from
 * (Stage.pictureToWorld). The new layer stands one step nearer (so it draws over that picture), and everything on
 * its plane is scaled about the eye by the ratio of the two distances: from the camera that is the same picture, to
 * the pixel. Then the world point is turned back into the layer values placeLayer reads (layout.ts): x as a share of
 * the view at that distance, y above the ground there (or above a sky prop's float line), z with the depth step of
 * its order undone, and its height in metres (the server divides by the cut-out's own metres for Size). Pure.
 */
import { SAME_DEPTH_STEP_M, groundHeight, viewWidthAt, fovRad, HOUSE } from '@stage25d/stage25d/layout'

/** The farthest a layer may stand: LayerKeys::RANGE z (app/Services/Stage25d/LayerKeys.php). */
export const Z_FAR_MAX = 120

const round = (v, k = 1e6) => Math.round(v * k) / k

/**
 * @param {{ bottom: {x:number,y:number,z:number}, top: {x:number,y:number,z:number}, eye: {x:number,y:number,z:number},
 *   depth: string, order: number, land?: number, rotation?: number }} p
 *   order: the new layer's slot among the layers of its depth (how many of that depth come before it)
 * @returns {{ depth: string, x: number, y: number, z: number, rotation: number, height_m: number } | null}
 */
export function layerOverCut ({ bottom, top, eye, depth, order, land = 0, rotation = 0 }) {
  const height = Math.hypot(top.x - bottom.x, top.y - bottom.y, top.z - bottom.z)
  if (!(height > 0) || !(bottom.z - eye.z > SAME_DEPTH_STEP_M)) return null
  // one step nearer than its picture, and never past the farthest a layer may stand (LayerKeys z: a backdrop is 380 m off)
  const zPlane = Math.min(bottom.z - SAME_DEPTH_STEP_M, Z_FAR_MAX - order * SAME_DEPTH_STEP_M)
  const k = (zPlane - eye.z) / (bottom.z - eye.z)
  const foot = { x: eye.x + (bottom.x - eye.x) * k, y: eye.y + (bottom.y - eye.y) * k }
  const z = zPlane + order * SAME_DEPTH_STEP_M
  const base = depth === 'sky' ? zPlane * Math.tan(fovRad(HOUSE.fov) / 2) * 0.45 : groundHeight(z, land)
  return {
    depth,
    x: round(foot.x / viewWidthAt(zPlane) + 0.5),
    y: round(foot.y - base),
    z: round(z),
    rotation: round(rotation, 100),
    height_m: round(height * k),
  }
}
