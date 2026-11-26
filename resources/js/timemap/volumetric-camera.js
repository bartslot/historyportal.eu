/**
 * volumetric-camera.js — MapLibre's globe camera, handed to a three.js renderer that works in
 * earth-centred metres.
 *
 * Takram's cloud renderer reprojects last frame onto this one, so it needs a real camera: a rigid
 * view matrix and a perspective projection, not their frozen product. MapLibre hands a custom layer
 * only the product (`mainMatrix`, its unit globe frame to clip space), so it is taken apart here.
 * Exactly, with no fitting: every number comes out of the matrix itself, including where the
 * camera stands, so nothing depends on a MapLibre internal agreeing with the matrix it drew with.
 *
 * FRAMES. Planet space (sun.js, planet-mesh.js) is x toward lon 0, y the north pole, z toward
 * lon 90°E. MapLibre's globe frame is (planet.z, planet.y, planet.x). The cloud renderer's frame
 * is ECEF, z the pole: (planet.x, planet.z, planet.y).
 */
import { Matrix4, Vector3 } from 'three'
import { EARTH_RADIUS_M } from '../map/maplibre-compat.js'

/** planet space → ECEF. */
export const planetToEcef = ([x, y, z], target = new Vector3()) => target.set(x, z, y)

// ECEF → MapLibre's globe frame: ml = (ecef.y, ecef.z, ecef.x).
const ECEF_TO_ML = new Matrix4().set(
  0, 1, 0, 0,
  0, 0, 1, 0,
  1, 0, 0, 0,
  0, 0, 0, 1,
)
const TO_UNIT = new Matrix4().makeScale(1 / EARTH_RADIUS_M, 1 / EARTH_RADIUS_M, 1 / EARTH_RADIUS_M)

const M = new Matrix4()

/** Row r of a column-major 4x4, as [x, y, z, w]. */
const rowOf = (e, r) => [e[r], e[4 + r], e[8 + r], e[12 + r]]

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/**
 * Where the camera stands, from the matrix alone: the one point whose clip x, y and w are all zero.
 * Three planes, one intersection (Cramer's rule).
 */
const cameraCentre = (e) => {
  const a = rowOf(e, 0)
  const b = rowOf(e, 1)
  const c = rowOf(e, 3)
  const bc = cross(b, c)
  const ca = cross(c, a)
  const ab = cross(a, b)
  const det = dot(a, bc)
  if (!Number.isFinite(det) || Math.abs(det) < 1e-30) return null
  return [
    -(a[3] * bc[0] + b[3] * ca[0] + c[3] * ab[0]) / det,
    -(a[3] * bc[1] + b[3] * ca[1] + c[3] * ab[1]) / det,
    -(a[3] * bc[2] + b[3] * ca[2] + c[3] * ab[2]) / det,
  ]
}

/**
 * Set `camera` (a three PerspectiveCamera with matrixAutoUpdate off) from MapLibre's globe matrix.
 *
 * With the camera at c, the matrix restricted to directions is P·R: R the view rotation, P a
 * perspective [[a,0,b,0],[0,c,d,0],[·],[0,0,-1,0]]. Row 3 is -R₂ times a scale; rows 0 and 1 are
 * R₀ and R₁ scaled, plus an off-axis share of R₂ (MapLibre's centre offset). The depth row is NOT
 * taken from MapLibre: its globe depth is its own business, the clouds never test against it, and a
 * plain near/far keeps the cloud renderer's depth maths ordinary.
 *
 * @param {ArrayLike<number>} mainMatrix  MapLibre `defaultProjectionData.mainMatrix`
 * @param {import('three').PerspectiveCamera} camera
 * @returns {number|null} camera height above the sphere in metres, or null if the matrix is not a
 *                        perspective camera (mid projection change, say) and nothing was set
 */
export const cameraFromMapLibre = (mainMatrix, camera) => {
  M.fromArray(mainMatrix).multiply(TO_UNIT).multiply(ECEF_TO_ML)
  const e = M.elements
  const c = cameraCentre(e)
  if (!c || !c.every(Number.isFinite)) return null

  const w = rowOf(e, 3)
  const s = Math.hypot(w[0], w[1], w[2])
  if (!(s > 0)) return null
  const r2 = [-w[0] / s, -w[1] / s, -w[2] / s]

  const fit = (r) => {
    const row = rowOf(e, r)
    const v = [row[0] / s, row[1] / s, row[2] / s]
    const off = dot(v, r2)
    const flat = [v[0] - r2[0] * off, v[1] - r2[1] * off, v[2] - r2[2] * off]
    const scale = Math.hypot(flat[0], flat[1], flat[2])
    return { axis: flat.map((n) => n / scale), scale, off }
  }
  const x = fit(0)
  const y = fit(1)
  if (!(x.scale > 0) || !(y.scale > 0)) return null

  // Keep the basis right-handed. A matrix that flips the picture vertically comes apart as a
  // mirrored rotation; putting the flip in the projection instead leaves a camera that is a real
  // camera, which is what anything reading its orientation expects.
  if (dot(cross(x.axis, y.axis), r2) < 0) {
    y.axis = y.axis.map((n) => -n)
    y.scale = -y.scale
    y.off = -y.off
  }

  const height = Math.hypot(c[0], c[1], c[2]) - EARTH_RADIUS_M
  // Near well short of the cloud tops, far past the far limb.
  const near = Math.max(100, height * 0.02)
  const far = 4 * (height + 2 * EARTH_RADIUS_M)

  camera.matrixWorld.set(
    x.axis[0], y.axis[0], r2[0], c[0],
    x.axis[1], y.axis[1], r2[1], c[1],
    x.axis[2], y.axis[2], r2[2], c[2],
    0, 0, 0, 1,
  )
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  camera.position.set(c[0], c[1], c[2])
  camera.near = near
  camera.far = far
  camera.projectionMatrix.set(
    x.scale, 0, x.off, 0,
    0, y.scale, y.off, 0,
    0, 0, -(far + near) / (far - near), -2 * far * near / (far - near),
    0, 0, -1, 0,
  )
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  return height
}
