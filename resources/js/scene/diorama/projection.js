/**
 * Diorama projection: the diorama JSON (App\Services\Diorama\DioramaSpec) → where things land on
 * the plate, and back from a pointer to a floor cell. Pure functions, no DOM, one set of maths for
 * the editor, the player and the AI.
 *
 * World axes follow Blender: x right, y forward, z up, metres. The camera is level (v1 contract):
 * it sits at `position_m`, turned `yaw_deg` about z (0 looks along +y). Plate pixels: u right,
 * v down, in the camera's own image size (`width` × `height`); `plateToStage` maps them onto a
 * responsive stage.
 *
 * Every layer anchors at its bottom centre, so an item's screen point IS its floor point.
 * Resizing never changes world height: `cellForScreenHeight` moves the item in depth instead.
 */

const DEG = Math.PI / 180

/** Camera basis in world space: right and forward on the ground plane (level camera). */
function basis (camera) {
  const yaw = (camera.yaw_deg ?? 0) * DEG
  return {
    right: [Math.cos(yaw), Math.sin(yaw)],
    forward: [-Math.sin(yaw), Math.cos(yaw)],
  }
}

/**
 * World point [x, y, z] → plate pixel. `depth` is the distance along the camera's view axis
 * (not the ray length); points at or behind the camera give depth ≤ 0 and no pixel.
 * @returns {{u: number, v: number, depth: number} | null}
 */
export function projectPoint (camera, [x, y, z]) {
  const [px, py, pz] = camera.position_m
  const { right, forward } = basis(camera)
  const dx = x - px
  const dy = y - py
  const depth = dx * forward[0] + dy * forward[1]
  if (depth <= 0) return null
  const side = dx * right[0] + dy * right[1]
  const [cx, cy] = camera.principal_px
  const f = camera.focal_px
  return { u: cx + f * side / depth, v: cy - f * (z - pz) / depth, depth }
}

/**
 * Where every floor sits in the world: `{id → {origin: [x, y], z, cellM, cells}}`.
 * A floor riding on an item (`on`) takes that item's floor point as its origin, so a deck moves
 * with its boat. The spec is assumed valid (DioramaSpec rejects cycles).
 */
export function resolveFloors (spec) {
  const floors = new Map(spec.floors.map(f => [f.id, f]))
  const items = new Map((spec.items ?? []).map(i => [i.id, i]))
  const resolved = new Map()

  const resolve = (id) => {
    if (resolved.has(id)) return resolved.get(id)
    const floor = floors.get(id)
    const [ox, oy] = floor.origin_m ?? [0, 0]
    let base = [0, 0, 0]
    if (floor.on) {
      const carrier = items.get(floor.on)
      base = cellToWorld(resolve(carrier.floor), carrier.cell)
    }
    const out = { id, origin: [base[0] + ox, base[1] + oy], z: base[2] + floor.height_m, cellM: floor.cell_m, cells: floor.cells, on: floor.on ?? null }
    resolved.set(id, out)
    return out
  }

  for (const id of floors.keys()) resolve(id)
  return resolved
}

/** A cell (decimals allowed) on a resolved floor → world point. */
export function cellToWorld (floor, [cx, cy]) {
  return [floor.origin[0] + cx * floor.cellM, floor.origin[1] + cy * floor.cellM, floor.z]
}

/** A world point on a resolved floor → its cell (unclamped). */
export function worldToCell (floor, [x, y]) {
  return [(x - floor.origin[0]) / floor.cellM, (y - floor.origin[1]) / floor.cellM]
}

export function cellInRange (floor, [cx, cy]) {
  const [[x0, y0], [x1, y1]] = floor.cells
  return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1
}

export function clampCell (floor, [cx, cy]) {
  const [[x0, y0], [x1, y1]] = floor.cells
  return [Math.min(x1, Math.max(x0, cx)), Math.min(y1, Math.max(y0, cy))]
}

/** Snap to the grid in steps of `step` cells (drag snaps to 1/4 cell by default). */
export function snapCell ([cx, cy], step = 0.25) {
  const snap = n => Math.round(n / step) * step
  return [snap(cx), snap(cy)]
}

/**
 * Where an item lands on the plate: its bottom-centre point, its depth, and the display scale
 * for its picture (plate pixels per source pixel) given the asset's `pxPerM` (source pixels per
 * metre of the real thing). Null when the item is at or behind the camera.
 */
export function placeItem (camera, floors, item, pxPerM) {
  const floor = floors.get(item.floor)
  const hit = projectPoint(camera, cellToWorld(floor, item.cell))
  if (!hit) return null
  return { ...hit, scale: camera.focal_px / (hit.depth * pxPerM) }
}

/** On-plate height in pixels of something `heightM` tall standing at `depth`. */
export function screenHeight (camera, heightM, depth) {
  return camera.focal_px * heightM / depth
}

/**
 * Pointer → floor. Casts the ray through plate pixel (u, v) at every floor plane and returns the
 * nearest hit that lands inside that floor's cells, or null ("no floor here": the item does not
 * fly). `only` / `except` limit the floors tried (dragging a boat must not hit its own deck).
 * @returns {{floor: string, cell: [number, number], world: number[], depth: number} | null}
 */
export function hitTest (camera, floors, u, v, { only = null, except = [] } = {}) {
  const [px, py, pz] = camera.position_m
  const { right, forward } = basis(camera)
  const [cx, cy] = camera.principal_px
  const f = camera.focal_px
  // Ray per unit of depth: sideways and up offsets.
  const side = (u - cx) / f
  const up = -(v - cy) / f

  let best = null
  for (const floor of floors.values()) {
    if (only && !only.includes(floor.id)) continue
    if (except.includes(floor.id)) continue
    if (up === 0) continue                       // looking along the horizon: never meets a floor
    const depth = (floor.z - pz) / up
    if (!(depth > 0) || (best && depth >= best.depth)) continue
    const world = [
      px + depth * (forward[0] + side * right[0]),
      py + depth * (forward[1] + side * right[1]),
      floor.z,
    ]
    const cell = worldToCell(floor, world)
    if (!cellInRange(floor, cell)) continue
    best = { floor: floor.id, cell, world, depth }
  }
  return best
}

/**
 * Resize = depth (Bart, 2026-09-29): the cell on the same floor where an item `heightM` tall
 * shows `targetPx` high, keeping its feet's screen column. Clamped to the floor, so pulling
 * the handle past the floor's edge stops at the edge instead of leaving the grid.
 */
export function cellForScreenHeight (camera, floor, item, heightM, targetPx) {
  const now = projectPoint(camera, cellToWorld(floor, item.cell))
  const depth = camera.focal_px * heightM / targetPx
  const [px, py] = camera.position_m
  const { right, forward } = basis(camera)
  const side = (now ? now.u - camera.principal_px[0] : 0) * depth / camera.focal_px
  const world = [
    px + depth * forward[0] + side * right[0],
    py + depth * forward[1] + side * right[1],
  ]
  return clampCell(floor, worldToCell(floor, world))
}

/** Back to front: far first; same depth → higher on the plate (smaller v) first. */
export function drawOrder (placements) {
  return [...placements].sort((a, b) => (b.depth - a.depth) || (a.v - b.v))
}

/**
 * Angle (degrees) the camera looks down at a floor point: 0 = at eye level, positive = from
 * above. Compared with the angle an asset was drawn at to warn about a wrong-looking figure.
 */
export function viewAngleDeg (camera, floor, depth) {
  return Math.atan2(camera.position_m[2] - floor.z, depth) / DEG
}

/** Parallax pan multiplier for ParallaxScene: 1 at the focal depth, >1 nearer, <1 further. */
export function panDepth (depth, focalDepth) {
  return focalDepth / depth
}

/**
 * Plate pixel → stage pixel for a plate shown `object-fit: cover` on a `stageW × stageH` stage
 * (centred crop). Everything placed on the plate goes through this, so a phone and a
 * whiteboard crop the same scene the same way.
 */
export function plateToStage (camera, stageW, stageH, { u, v }) {
  const s = Math.max(stageW / camera.width, stageH / camera.height)
  return {
    x: (u - camera.width / 2) * s + stageW / 2,
    y: (v - camera.height / 2) * s + stageH / 2,
    scale: s,
  }
}

/** Stage pixel → plate pixel (the inverse of plateToStage), for pointer events. */
export function stageToPlate (camera, stageW, stageH, { x, y }) {
  const s = Math.max(stageW / camera.width, stageH / camera.height)
  return { u: (x - stageW / 2) / s + camera.width / 2, v: (y - stageH / 2) / s + camera.height / 2 }
}
