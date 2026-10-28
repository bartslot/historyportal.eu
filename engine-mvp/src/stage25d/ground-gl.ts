// The floor and its contact stains on the GPU. The ground is one big plane at y 0: its art tiles in world metres
// (so perspective is real), a watercolour grain sits on world positions (it never slides when the camera moves), and
// toward the horizon it fades into the colour the far landscape ends in, so the bg strip's feathered edge meets it.
import { GROUND_SLOT } from './layout'
import { GROUND_TILE_M } from './ground'
import { Constants, Effect, Matrix, MeshBuilder, RawTexture, ShaderMaterial, Texture, Vector3, type Mesh, type Scene, type TransformNode } from '@babylonjs/core'

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
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${NOISE}
  vec3 tileAt(vec2 uv) { return mix(texture2D(tex, uv, 4.0).rgb, texture2D(tex, uv).rgb, detail); }
  void main(void) {
    vec2 uv = vW.xz / tile;
    // anti-tiling: a second, turned and scaled read of the same tile, swapped in over big soft world patches, so the
    // rows of one repeating tile break up (mixTile 0 = the plain tile)
    vec3 c = base;
    if (useTex > 0.5) {
      vec2 uv2 = mat2(0.866, -0.5, 0.5, 0.866) * uv * 1.37 + vec2(0.31, 0.57);
      float m = smoothstep(0.3, 0.7, fbm(vW.xz * 0.06 + 11.0));
      c = mix(tileAt(uv), tileAt(uv2), m * mixTile);
    }
    // low-frequency value and hue drift over the field (vary), the way a hand wash is never even
    c *= 1.0 + vary * 0.32 * (fbm(vW.xz * 0.022) - 0.5);
    c.rb *= 1.0 + vary * vec2(0.08, -0.08) * (fbm(vW.xz * 0.017 + 7.0) - 0.5);
    // watercolour on the floor: broad wash variation, then fine granulation, both fixed to the world
    float wash = fbm(vW.xz * 0.18), gran = fbm(vW.xz * 2.7);
    // pigment pools in the wash (broad, +-18 %) and settles in the paper tooth (fine, up to 12 % darker)
    c *= 1.0 - grain * (0.18 * (wash - 0.5) * 2.0 + 0.12 * smoothstep(0.35, 0.8, gran));
    float d = distance(vW.xz, camPos.xz);
    c = mix(c, horizonTint, smoothstep(fadeNear, fadeFar, d));
    // the near band: a strip painted from eye height, projected back onto the floor from the house camera, so from
    // there it looks exactly as painted and still lies on the ground (parallax when the camera moves); its upper part
    // fades into the far floor (t: 0 at the frame's bottom edge, 1 at the band's far edge)
    if (useNear > 0.5) {
      vec4 cl = nearVP * vec4(vW, 1.0);
      if (cl.w > 0.0) {
        vec2 n = cl.xy / cl.w;
        float t = (n.y + 1.0) / max(nearTop + 1.0, 1e-3);
        vec4 b = texture2D(nearTex, vec2(n.x / nearSpan * 0.5 + 0.5, 1.0 - clamp(t, 0.0, 1.0)));   // premultiplied
        float k = 1.0 - smoothstep(0.7, 1.0, t);
        c = b.rgb * k + c * (1.0 - b.a * k);
      }
    }
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
/** The near band (set.near): its texture and the house camera's view-projection it is projected from. */
export interface NearBand { tex: RawTexture; vp: Matrix; top: number; span: number }
/** Live floor values (lesson.look): read every frame. */
export interface FloorLive { detail: number; vary: number; mixTile: number; tileScale: number }

export function makeGround(scene: Scene): { mesh: Mesh; set(look: GroundLook): void; follow(cam: Vector3): void; live(f: FloorLive): void; near(b: NearBand | null): void } {
  const mesh = MeshBuilder.CreateGround('ground', { width: 2400, height: 2400 }, scene)
  const mat = new ShaderMaterial('ground', scene, 'stageGround', {
    attributes: ['position'],
    uniforms: ['world', 'viewProjection', 'useTex', 'tile', 'grain', 'fadeNear', 'fadeFar', 'detail', 'vary', 'mixTile', 'useNear', 'nearTop', 'nearSpan', 'nearVP', 'base', 'horizonTint', 'camPos'],
    samplers: ['tex', 'nearTex'],
    needAlphaBlending: true,   // sorted with the layers (it outputs alpha 1): see GROUND_SLOT
  })
  const blank = new RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, Constants.TEXTUREFORMAT_RGBA, scene)
  mat.setTexture('tex', blank).setTexture('nearTex', blank)
  mat.setFloat('detail', 1).setFloat('vary', 0).setFloat('mixTile', 0).setFloat('useNear', 0)
  let tile = GROUND_TILE_M, tileScale = 1
  mesh.material = mat
  mesh.metadata = { noGBuffer: true }   // no ink line where the floor meets the far landscape
  // drawn after the sky, before the far landscape: the sky plane (380 m) is nearer than the floor beyond 380 m, so an
  // opaque floor drawn first let the sky's lower part show over it as a pale line under a raised strip
  mesh.alphaIndex = GROUND_SLOT
  mat.forceDepthWrite = true   // still hides what stands below the floor (a far strip lowered by set.horizon)
  mesh.isPickable = false
  return {
    mesh,
    set(l) {
      if (l.tex) { l.tex.wrapU = Texture.WRAP_ADDRESSMODE; l.tex.wrapV = Texture.WRAP_ADDRESSMODE }
      mat.setTexture('tex', l.tex ?? blank)
      tile = l.tile
      mat.setFloat('useTex', l.tex ? 1 : 0).setFloat('tile', tile * tileScale).setFloat('grain', l.grain)
        .setFloat('fadeNear', l.fadeNear).setFloat('fadeFar', l.fadeFar)
        .setVector3('base', Vector3.FromArray(l.base)).setVector3('horizonTint', Vector3.FromArray(l.tint))
    },
    follow(cam) { mat.setVector3('camPos', cam) },
    live(f) {
      tileScale = f.tileScale
      mat.setFloat('detail', f.detail).setFloat('vary', f.vary).setFloat('mixTile', f.mixTile).setFloat('tile', tile * tileScale)
    },
    near(b) {
      mat.setFloat('useNear', b ? 1 : 0)
      if (!b) return
      b.tex.wrapU = Texture.CLAMP_ADDRESSMODE; b.tex.wrapV = Texture.CLAMP_ADDRESSMODE
      mat.setTexture('nearTex', b.tex).setMatrix('nearVP', b.vp).setFloat('nearTop', b.top).setFloat('nearSpan', b.span)
    },
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
