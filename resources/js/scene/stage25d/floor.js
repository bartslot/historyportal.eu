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
 * front of the camera (the pointer above the horizon): the picture stays put. `lift`: the height of the ground the
 * feet stand on, in metres, or that height per distance (`z => metres`: the ground rising into the far landscape),
 * found by walking the ray onto it.
 * @param {{origin: number[], dir: number[]}} ray
 * @param {number | ((z: number) => number)} [lift]
 */
export function groundUnderRay (ray, lift = 0) {
  const heightAt = typeof lift === 'function' ? lift : () => lift
  const at = (t) => [ray.origin[0] + t * ray.dir[0], ray.origin[2] + t * ray.dir[2]]
  // how far the ray is above the ground at t (negative: it went under)
  const above = (t) => ray.origin[1] + t * ray.dir[1] - (GROUND.z + heightAt(at(t)[1]))
  if (!(ray.dir[2] > 0)) return null
  const tFar = (GROUND_FAR_M * SURFACE_REACH - ray.origin[2]) / ray.dir[2]
  // walk out to where it first crosses the ground (from above, or from below for feet higher than the eye), then
  // halve the step until it lands on it
  const side = Math.sign(above(0))
  if (side === 0) return worldToCell(GROUND, at(0))
  let lo = 0
  let hi = null
  for (let i = 1; i <= SURFACE_STEPS; i++) {
    const t = (tFar * i) / SURFACE_STEPS
    if (Math.sign(above(t)) !== side) { hi = t; break }
    lo = t
  }
  if (hi === null) return null
  for (let i = 0; i < SURFACE_HALVINGS; i++) {
    const mid = (lo + hi) / 2
    if (Math.sign(above(mid)) === side) lo = mid; else hi = mid
  }
  return worldToCell(GROUND, at(hi))
}
/** Walking a pointer ray onto the ground: how far out (a share past the far end), in how many steps, then halvings. */
const SURFACE_REACH = 4
const SURFACE_STEPS = 400
const SURFACE_HALVINGS = 30

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

/**
 * A corner resize on the ground (ratio: the size asked for, as a multiple of the picture at scale 1 where it stands):
 * the snapped point that gives it by distance, and the scale left over when the distance stops at the grid's near or far
 * edge. Folding everything into distance threw that rest away: a portrait at 7x went back to its real size at the near
 * edge and sank under the floor (Bart 11-13).
 */
export function sizeByDistance (p0, ratio, eye = [0, 0]) {
  const point = settle(pointForSizeRatio(p0, ratio, eye))
  const [[, near], [, far]] = GROUND.cells
  const d0 = Math.max(0.1, p0[1] - eye[1])
  const free = eye[1] + d0 / Math.max(0.01, ratio)
  if (free >= near && free <= far) return { point, scale: 1 }
  const d = Math.max(0.1, point[1] - eye[1])
  return { point, scale: Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, (ratio * d) / d0)) * 1000) / 1000 }
}
const MIN_SCALE = 0.05
const MAX_SCALE = 20

/** The grid drawn while editing: [from, to, every] metres. Few lines: a guide, not a pattern over the picture. */
const GRID_ROWS = [[GROUND_NEAR_M, 12, 2], [12, 40, 10], [40, GROUND_FAR_M, 40]]
/** Lines run this many grid steps out to each side (far past the frame: a camera move never finds the edge). */
const GRID_SIDE_STEPS = 20

/**
 * The ground grid in pieces, nearest first: each piece is the stretch up to one row line, with the row at its far
 * edge (`z`) and the lines running away from the camera across it, as polylines of ground points [x, z] sampled every
 * metre (the stage lifts each point onto the ground there). The stage draws each piece in the pictures' order at `z`.
 * @returns {{ z: number, lines: number[][][] }[]}
 */
export function gridPieces () {
  return GRID_ROWS.flatMap(([z0, z1, every], section) => {
    const span = every * GRID_SIDE_STEPS
    const pieces = []
    let from = z0
    for (let z = Math.ceil(z0 / every) * every; z <= z1; z += every) {
      if (z === z0 && section > 0) continue   // the row the section before ended on
      const part = { ...GROUND, cells: [[-span, from], [span, z]] }
      const lines = gridLines(part, every, Math.max(1, Math.round(z - from)))
        .filter((line) => (line[0][0] !== line[line.length - 1][0] ? line[0][1] === z : z > from))   // its own row, and the lines across it
      pieces.push({ z, lines: lines.map((line) => line.map((c) => cellToWorld(GROUND, c).slice(0, 2))) })
      from = z
    }
    return pieces
  })
}
