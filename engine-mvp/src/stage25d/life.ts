// A little life in the picture (look.ts smoke, birds): smoke rising from fires, now and then a few birds crossing the
// far sky. Painted, not simulated: soft washed puffs and two-stroke birds, all driven by the lesson clock, so a seek or
// a pause shows the same frame every time. Calm by default.
import { Constants, Effect, Mesh, MeshBuilder, ShaderMaterial, Vector3, type Scene } from '@babylonjs/core'
import { GL_NOISE } from './ground-gl'

Effect.ShadersStore.stagePuffVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`

// a puff of smoke: a soft wash with a ragged rim, warm grey, a touch darker at its heart
Effect.ShadersStore.stagePuffFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${GL_NOISE}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`

// a bird far off: two thin ink arcs, the wings beating (flap -1..1)
Effect.ShadersStore.stageBirdFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, flap;
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float x = abs(p.x);
    float wing = -0.35 * flap * x + 0.55 * x * x * (0.6 + 0.4 * flap);   // the wing line, bent at the tip
    float d = abs(p.y - wing) - 0.09 * (1.0 - x);                        // thicker at the body
    float a = (1.0 - smoothstep(0.0, 0.06, d)) * step(x, 1.0) * alpha;
    gl_FragColor = vec4(vec3(0.3, 0.26, 0.22) * a, a);
  }`

function quad(name: string, shader: string, scene: Scene, alphaIndex: number): { mesh: Mesh; mat: ShaderMaterial } {
  const mesh = MeshBuilder.CreatePlane(name, { size: 1 }, scene)
  const mat = new ShaderMaterial(name, scene, { vertex: 'stagePuff', fragment: shader }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'alpha', 'seed', 'flap'], needAlphaBlending: true,
  })
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true
  mat.backFaceCulling = false
  mesh.material = mat
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
  mesh.alphaIndex = alphaIndex
  mesh.metadata = { noGBuffer: true }
  mesh.isPickable = false
  return { mesh, mat }
}

export const PUFFS = 9
const PUFF_LIFE_S = 9

/** One fire's smoke: puffs rise from `at`, grow and drift with the wind, then thin out. `size` = the fire's height. */
export function makeSmoke(scene: Scene, at: Vector3, size: number, alphaIndex: number) {
  const puffs = Array.from({ length: PUFFS }, (_, i) => {
    const q = quad(`smoke:${i}`, 'stagePuff', scene, alphaIndex)
    q.mat.setFloat('seed', i * 3.7)
    return q
  })
  return {
    /** amount 0..1 (look.smoke); clock = lesson seconds */
    update(clock: number, amount: number) {
      puffs.forEach(({ mesh, mat }, i) => {
        const k = smokeAge(clock, i)
        const s = size * (0.6 + 3.2 * k)
        mesh.scaling.setAll(s)
        mesh.position.set(at.x + size * 1.6 * k * k + 0.15 * size * Math.sin(i * 2.1 + clock * 0.3), at.y + size * (0.4 + 7 * k), at.z)
        mat.setFloat('alpha', amount * 0.7 * Math.sin(Math.PI * k))
        mesh.isVisible = amount > 0.001
      })
    },
    dispose() { puffs.forEach(({ mesh, mat }) => { mat.dispose(); mesh.dispose() }) },
  }
}

/** A puff's age 0..1 at `clock`: puffs leave one after the other and loop. */
export const smokeAge = (clock: number, i: number) => (((clock / PUFF_LIFE_S + i / PUFFS) % 1) + 1) % 1

export const FLOCK_EVERY_S = 40
export const FLOCK_CROSS_S = 16

/** Where a crossing flock is (0..1 across, null = no flock now) at `clock`: one crossing every FLOCK_EVERY_S. */
export function flockAt(clock: number): number | null {
  const t = ((clock % FLOCK_EVERY_S) + FLOCK_EVERY_S) % FLOCK_EVERY_S
  return t < FLOCK_CROSS_S ? t / FLOCK_CROSS_S : null
}

/** A few birds crossing the far sky now and then (birds 0..1 = how many and how clearly). */
export function makeBirds(scene: Scene, z: number, width: number, alphaIndex: number) {
  const birds = Array.from({ length: 6 }, (_, i) => quad(`bird:${i}`, 'stageBird', scene, alphaIndex))
  return {
    update(clock: number, amount: number) {
      const across = flockAt(clock)
      const count = Math.round(2 + amount * 4)
      birds.forEach(({ mesh, mat }, i) => {
        mesh.isVisible = amount > 0.001 && across !== null && i < count
        if (!mesh.isVisible || across === null) return
        const lag = i * 0.025
        mesh.position.set((across - lag - 0.5) * width * 1.2, 22 + 3 * Math.sin(i * 1.7) + 4 * across, z + i * 1.5)
        mesh.scaling.setAll(3.2)
        mat.setFloat('alpha', 0.85 * Math.min(1, amount * 2)).setFloat('flap', Math.sin(clock * 7 + i * 1.3))
      })
    },
    dispose() { birds.forEach(({ mesh, mat }) => { mat.dispose(); mesh.dispose() }) },
  }
}

/** Does this asset make smoke (a fire, a hearth, a chimney)? */
export const smokes = (asset: { id: string; tags: string[] }) => /fire|hearth|chimney|smoke/.test([asset.id, ...asset.tags].join(' '))
