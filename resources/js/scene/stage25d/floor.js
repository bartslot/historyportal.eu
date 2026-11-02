/**
 * stage25d/floor: the ground grid of the 2.5D stage, for the editor. A picture stands on the ground at a distance in
 * metres (layer.z) and a sideways place (layer.x, a share of the house view at that distance, as before). Dragging it
 * slides it along the ground and snaps it to the grid, the way a diorama item snaps to its floor.
 *
 * The grid maths (cells, snapping, clamping, grid lines) is the diorama's own (scene/diorama/projection.js), on one
 * floor: the ground, one cell per metre. Only the pointer differs: the stage is Babylon, so the ray comes from the
 * stage and meets the ground plane here. Stage axes: x sideways, y up, z away from the camera; a cell is [x, z].
 */
import { cellToWorld, worldToCell, clampCell, snapCell, gridLines } from '../diorama/projection.js'
import { GROUND_NEAR_M, GROUND_FAR_M, viewWidthAt } from '@stage25d/stage25d/layout'

export const GROUND = { id: 'ground', origin: [0, 0], z: 0, cellM: 1, cells: [[-80, GROUND_NEAR_M], [80, GROUND_FAR_M]] }

/** Grid spacing in metres at a distance: tight up close, wide far away, so the lines stay readable and few. */
export const gridStep = (z) => (z <= 12 ? 1 : z <= 40 ? 5 : 20)

/** A drag snaps to quarter steps of the grid there (the diorama's 1/4 cell). */
export const snapStepAt = (z) => gridStep(z) / 4

/**
 * Pointer ray → the ground point under it [x, z] in metres, unsnapped. Null when the ray never meets the ground in
 * front of the camera (the pointer above the horizon): the picture stays put.
 * @param {{origin: number[], dir: number[]}} ray
 */
export function groundUnderRay (ray) {
  const t = (GROUND.z - ray.origin[1]) / ray.dir[1]
  if (!Number.isFinite(t) || t <= 0) return null
  return worldToCell(GROUND, [ray.origin[0] + t * ray.dir[0], ray.origin[2] + t * ray.dir[2]])
}

/** Snap a ground point to the grid at its distance and keep it on the ground. Never off the grid. */
export function settle (cell) {
  const step = snapStepAt(clampCell(GROUND, cell)[1])
  return clampCell(GROUND, snapCell(cell, step))
}

/** A layer's ground point in metres from its x (share of the view at its distance) and z. */
export const groundOf = (x, z) => [(x - 0.5) * viewWidthAt(z), z]

/** A ground point in metres → the layer's x and z. */
export const layerOf = ([gx, gz]) => ({ x: Math.round((0.5 + gx / viewWidthAt(gz)) * 10000) / 10000, z: gz })

/** The ground point at distance `z` on the line of sight from the camera (`eye` [x, z]) through `p`: same screen column. */
export function alongSight ([gx, gz], z, eye = [0, 0]) {
  const k = (z - eye[1]) / Math.max(0.1, gz - eye[1])
  return [eye[0] + (gx - eye[0]) * k, z]
}

/**
 * Resize = distance: the picture stays as tall as the real thing (`height_m`), so a bigger one is a nearer one.
 * `ratio` is how much taller it should look than now; distances count from where the camera stands (`eye` [x, z]),
 * since a shot may have trucked in. Keeps its column on the screen.
 * @returns {[number, number]} the new ground point, held on the ground
 */
export function pointForSizeRatio ([gx, gz], ratio, eye = [0, 0]) {
  const [[, near], [, far]] = GROUND.cells
  const d = Math.max(0.1, gz - eye[1])
  const z = Math.min(far, Math.max(near, eye[1] + d / Math.max(0.01, ratio)))
  return clampCell(GROUND, alongSight([gx, gz], z, eye))
}

/** The ground grid as polylines of stage world points [x, y, z], ready for a projector. */
export function gridPolylines () {
  const [[x0], [x1]] = GROUND.cells
  return [[GROUND_NEAR_M, 12, 1], [12, 40, 5], [40, 100, 20]].flatMap(([z0, z1, every]) => {
    const span = Math.min(x1, every * 40)
    const part = { ...GROUND, cells: [[Math.max(x0, -span), z0], [Math.min(x1, span), z1]] }
    return gridLines(part, every, 12).map((line) => line.map((c) => {
      const [x, z, y] = cellToWorld(GROUND, c)
      return [x, y, z]
    }))
  })
}
