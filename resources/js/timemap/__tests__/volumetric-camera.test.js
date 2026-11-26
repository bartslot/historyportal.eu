import { describe, expect, it } from 'vitest'
import { Matrix4, PerspectiveCamera, Vector3, Vector4 } from 'three'
import { cameraFromMapLibre, planetToEcef } from '../volumetric-camera.js'
import { EARTH_RADIUS_M } from '../../map/maplibre-compat.js'

// MapLibre's globe frame from ECEF: ml = (ecef.y, ecef.z, ecef.x), on a unit sphere.
const mlFromEcef = (v) => new Vector3(v.y, v.z, v.x).divideScalar(EARTH_RADIUS_M)

/** A MapLibre-shaped matrix (unit globe frame → clip) for a known camera, built the long way. */
const mainMatrixFor = ({ eye, target, up, flipY = false, offset = [0, 0], wScale = 1 }) => {
  const view = new Matrix4().lookAt(mlFromEcef(eye), mlFromEcef(target), up)
    .setPosition(mlFromEcef(eye)).invert()
  const projection = new Matrix4().makePerspective(-0.2, 0.2, 0.15, -0.15, 0.01, 50)
  projection.elements[8] += offset[0]
  projection.elements[9] += offset[1]
  const post = new Matrix4().makeScale(wScale, flipY ? -wScale : wScale, wScale)
  post.elements[15] = wScale
  return post.multiply(projection).multiply(view).elements
}

const project = (camera, ecef) => {
  const clip = new Vector4(ecef.x, ecef.y, ecef.z, 1)
    .applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix)
  return [clip.x / clip.w, clip.y / clip.w]
}
const projectMain = (main, ecef) => {
  const p = mlFromEcef(ecef)
  const clip = new Vector4(p.x, p.y, p.z, 1).applyMatrix4(new Matrix4().fromArray(main))
  return [clip.x / clip.w, clip.y / clip.w]
}

const camera = () => {
  const c = new PerspectiveCamera()
  c.matrixAutoUpdate = false
  c.matrixWorldAutoUpdate = false
  return c
}

const R = EARTH_RADIUS_M
const eye = new Vector3(R + 700e3, 200e3, 900e3)
const target = new Vector3(R * 0.98, 300e3, 1500e3)
const points = [target, new Vector3(R, 0, 1000e3), new Vector3(R * 0.99, 500e3, 1200e3), new Vector3(R * 0.97, -100e3, 1700e3)]

describe('cameraFromMapLibre', () => {
  for (const [name, extra] of [
    ['a plain camera', {}],
    ['a vertically flipped matrix', { flipY: true }],
    ['an off-centre projection and a scaled w', { offset: [0.1, -0.25], wScale: 3.7 }],
  ]) {
    it(`agrees with MapLibre to the pixel for ${name}`, () => {
      const main = mainMatrixFor({ eye, target, up: new Vector3(0, 1, 0), ...extra })
      const c = camera()
      const height = cameraFromMapLibre(main, c)

      expect(height).toBeCloseTo(eye.length() - R, 0)
      expect(c.position.distanceTo(eye)).toBeLessThan(1)
      for (const point of points) {
        const [x, y] = project(c, point)
        const [wx, wy] = projectMain(main, point)
        expect(x).toBeCloseTo(wx, 6)
        expect(y).toBeCloseTo(wy, 6)
      }
    })

    it(`gives a real camera for ${name}: rigid, right-handed, ordinary depth`, () => {
      const c = camera()
      cameraFromMapLibre(mainMatrixFor({ eye, target, up: new Vector3(0, 1, 0), ...extra }), c)
      expect(c.matrixWorld.determinant()).toBeCloseTo(1, 9)
      expect(c.near).toBeGreaterThan(0)
      expect(c.far).toBeGreaterThan(eye.length() + R)
      // In front of the camera is negative view z, as three.js expects.
      expect(target.clone().applyMatrix4(c.matrixWorldInverse).z).toBeLessThan(0)
    })
  }

  it('refuses a matrix that is not a camera, and leaves the camera alone', () => {
    const c = camera()
    const before = c.projectionMatrix.clone()
    expect(cameraFromMapLibre(new Matrix4().identity().elements, c)).toBeNull()
    expect(cameraFromMapLibre(new Array(16).fill(NaN), c)).toBeNull()
    expect(c.projectionMatrix.equals(before)).toBe(true)
  })
})

describe('planetToEcef', () => {
  it('moves the pole from y to z and keeps longitude 0 on x', () => {
    expect(planetToEcef([1, 0, 0]).toArray()).toEqual([1, 0, 0])
    expect(planetToEcef([0, 1, 0]).toArray()).toEqual([0, 0, 1])
    expect(planetToEcef([0, 0, 1]).toArray()).toEqual([0, 1, 0])
  })
})
