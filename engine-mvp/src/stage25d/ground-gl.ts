// The floor and its contact stains on the GPU. The ground is one big plane at y 0: its art tiles in world metres
// (so perspective is real), a watercolour grain sits on world positions (it never slides when the camera moves), and
// toward the horizon it fades into the colour the far landscape ends in, so the bg strip's feathered edge meets it.
import { Constants, Effect, MeshBuilder, RawTexture, ShaderMaterial, Texture, Vector3, type Mesh, type Scene, type TransformNode } from '@babylonjs/core'

const NOISE = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`
export const GL_NOISE = NOISE

Effect.ShadersStore.stageGroundVertexShader = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`

Effect.ShadersStore.stageGroundFragmentShader = `
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex;
  uniform float useTex, tile, grain, fadeNear, fadeFar;
  uniform vec3 base, horizonTint, camPos;
  ${NOISE}
  void main(void) {
    vec3 c = useTex > 0.5 ? texture2D(tex, vW.xz / tile).rgb : base;
    // watercolour on the floor: broad wash variation, then fine granulation, both fixed to the world
    float wash = fbm(vW.xz * 0.18), gran = fbm(vW.xz * 2.7);
    // pigment pools in the wash (broad, +-18 %) and settles in the paper tooth (fine, up to 12 % darker)
    c *= 1.0 - grain * (0.18 * (wash - 0.5) * 2.0 + 0.12 * smoothstep(0.35, 0.8, gran));
    float d = distance(vW.xz, camPos.xz);
    c = mix(c, horizonTint, smoothstep(fadeNear, fadeFar, d));
    gl_FragColor = vec4(c, 1.0);
  }`

Effect.ShadersStore.stageStainVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`

Effect.ShadersStore.stageStainFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${NOISE}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`

export interface GroundLook { tex: RawTexture | null; tile: number; base: [number, number, number]; tint: [number, number, number]; fadeNear: number; fadeFar: number; grain: number }

export function makeGround(scene: Scene): { mesh: Mesh; set(look: GroundLook): void; follow(cam: Vector3): void } {
  const mesh = MeshBuilder.CreateGround('ground', { width: 2400, height: 2400 }, scene)
  const mat = new ShaderMaterial('ground', scene, 'stageGround', {
    attributes: ['position'],
    uniforms: ['world', 'viewProjection', 'useTex', 'tile', 'grain', 'fadeNear', 'fadeFar', 'base', 'horizonTint', 'camPos'],
    samplers: ['tex'],
  })
  const blank = new RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, Constants.TEXTUREFORMAT_RGBA, scene)
  mat.setTexture('tex', blank)
  mesh.material = mat
  mesh.metadata = { noGBuffer: true }   // no ink line where the floor meets the far landscape
  mesh.isPickable = false
  return {
    mesh,
    set(l) {
      if (l.tex) { l.tex.wrapU = Texture.WRAP_ADDRESSMODE; l.tex.wrapV = Texture.WRAP_ADDRESSMODE }
      mat.setTexture('tex', l.tex ?? blank)
      mat.setFloat('useTex', l.tex ? 1 : 0).setFloat('tile', l.tile).setFloat('grain', l.grain)
        .setFloat('fadeNear', l.fadeNear).setFloat('fadeFar', l.fadeFar)
        .setVector3('base', Vector3.FromArray(l.base)).setVector3('horizonTint', Vector3.FromArray(l.tint))
    },
    follow(cam) { mat.setVector3('camPos', cam) },
  }
}

let stainSeed = 0

/** A soft painted stain lying on the ground, centred on `parent`'s origin (its anchor), w x d metres. */
export function makeStain(parent: TransformNode, w: number, d: number, scene: Scene): { mesh: Mesh; setOpacity(o: number): void } {
  const mesh = MeshBuilder.CreatePlane(`stain:${parent.name}`, { width: w, height: d }, scene)
  mesh.rotation.x = Math.PI / 2                 // flat on the floor
  mesh.position.set(0, 0.02, -d * 0.18)         // a little toward the camera: the dark core shows in front of the foot
  mesh.parent = parent
  const mat = new ShaderMaterial(`stain:${parent.name}`, scene, 'stageStain', {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'opacity', 'seed'], needAlphaBlending: true,
  })
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true
  mat.backFaceCulling = false
  mat.setFloat('seed', (stainSeed++ * 7.31) % 97).setFloat('opacity', 0)
  mesh.material = mat
  mesh.metadata = { noGBuffer: true }
  mesh.isPickable = false
  return { mesh, setOpacity: (o) => { mat.setFloat('opacity', o); mesh.isVisible = o > 0.001 } }
}
