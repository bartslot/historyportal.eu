// Strewn ground on the GPU (scatter.ts has the pure parts): every clump of one picture in one distance bucket is one
// mesh of quads, turned to the camera about the vertical in the vertex shader, so 600 clumps cost a few draw calls.
// A clump's foot takes the colour of the ground it stands on, its top sways a very small amount (look.grassSway).
import { Constants, Effect, Mesh, ShaderMaterial, Vector3, VertexBuffer, VertexData, type RawTexture, type Scene } from '@babylonjs/core'
import { BUCKET_EDGES, bucketOf, type Clump, type Sprite } from './scatter'
import { bandSlot } from './layout'

Effect.ShadersStore.stageStrewnVertexShader = `
  precision highp float;
  attribute vec3 position;     // the clump's anchor on the floor (y 0)
  attribute vec4 quad;         // corner across (-0.5..0.5), corner up (0..1), height m, width m
  attribute vec2 uv;           // the corner's uv in the sheet
  attribute vec4 extra;        // sway phase, foot colour
  uniform mat4 viewProjection;
  uniform vec3 camPos;
  uniform float time, sway, land;
  varying vec2 vUV;
  varying float vUp, vDist;
  varying vec3 vFoot;
  // layout.ts groundHeight (GLSL twin): the floor rises onto the far landscape's land line from 22 m to 70 m
  float groundY(float z) {
    if (z <= 70.0 || land == 0.0) return clamp((z - 22.0) / 48.0, 0.0, 1.0) * land;
    return 1.6 + (land - 1.6) * z / 70.0;
  }
  void main(void) {
    vec2 to = camPos.xz - position.xz;
    vec3 right = normalize(vec3(-to.y, 0.0, to.x));
    float up = quad.y;
    float bend = sway * 0.05 * quad.z * up * up * (0.6 * sin(time * 1.3 + extra.x) + 0.4 * sin(time * 2.1 + extra.x * 1.7));
    vec3 p = position + right * (quad.x * quad.w + bend) + vec3(0.0, up * quad.z + groundY(position.z), 0.0);
    vUV = uv; vUp = up; vFoot = extra.yzw; vDist = length(to);
    gl_Position = viewProjection * vec4(p, 1.0);
  }`

Effect.ShadersStore.stageStrewnFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  varying float vUp, vDist;
  varying vec3 vFoot;
  uniform sampler2D tex;
  uniform vec3 haze;
  uniform float opacity;
  void main(void) {
    vec4 c = texture2D(tex, vUV);   // premultiplied
    if (c.a < 0.01) discard;
    // the foot sinks into the ground it stands on, the far ones go toward the horizon's colour
    float foot = (1.0 - smoothstep(0.0, 0.3, vUp)) * 0.65;
    c.rgb = mix(c.rgb, vFoot * c.a, foot);
    c.rgb = mix(c.rgb, haze * c.a, smoothstep(40.0, 320.0, vDist) * 0.55);
    gl_FragColor = c * opacity;
  }`

export interface Strewn { meshes: Mesh[]; update(time: number, sway: number, land: number, cam: Vector3, opacity: number): void; dispose(): void }

/** Quads for the clumps of one picture (picks[c.pick] whose file is `tex`), one mesh per distance bucket. foot(z):
 *  the ground colour at that distance. */
export function makeStrewn(scene: Scene, tex: RawTexture, picks: Sprite[], clumps: Clump[], foot: (z: number) => [number, number, number], haze: [number, number, number], name: string): Strewn {
  const mat = new ShaderMaterial(`strewn:${name}`, scene, 'stageStrewn', {
    attributes: ['position', 'quad', 'uv', 'extra'],
    uniforms: ['viewProjection', 'camPos', 'time', 'sway', 'land', 'haze', 'opacity'],
    samplers: ['tex'],
    needAlphaBlending: true,
  })
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true
  mat.backFaceCulling = false
  mat.setTexture('tex', tex).setVector3('haze', Vector3.FromArray(haze))
  const byBucket = new Map<number, Clump[]>()
  for (const c of clumps) byBucket.set(bucketOf(c.z), [...(byBucket.get(bucketOf(c.z)) ?? []), c])
  const meshes = [...byBucket].map(([b, list]) => {
    const pos: number[] = [], quad: number[] = [], uv: number[] = [], extra: number[] = [], idx: number[] = []
    list.forEach((c, i) => {   // far to near (scatter sorts them): the nearer quad blends over the farther one
      const s = picks[c.pick], [u0, v0, du, dv] = s.cell, w = c.h * s.aspect, f = foot(c.z)
      for (const [cx, cy] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
        pos.push(c.x, 0, c.z); quad.push(cx, cy, c.h, w)
        uv.push(u0 + (cx + 0.5) * du, v0 + (1 - cy) * dv)   // v 0 at the sheet's top (layer textures are not flipped on upload)
        extra.push(c.phase, f[0], f[1], f[2])
      }
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3)
    })
    const mesh = new Mesh(`strewn:${name}:${b}`, scene)
    Object.assign(new VertexData(), { positions: pos, indices: idx }).applyToMesh(mesh)
    mesh.setVerticesData('quad', quad, false, 4)
    mesh.setVerticesData(VertexBuffer.UVKind, uv, false, 2)
    mesh.setVerticesData('extra', extra, false, 4)
    mesh.material = mat
    mesh.alphaIndex = bandSlot(Math.min(BUCKET_EDGES[b], 2000))   // drawn as if at its far edge: what stands in it covers it
    mesh.alwaysSelectAsActiveMesh = true   // the shader moves the quads up and to the camera: the CPU box is wrong
    mesh.isPickable = false
    mesh.metadata = { noGBuffer: true }
    return mesh
  })
  return {
    meshes,
    update(time, sway, land, cam, opacity) {
      mat.setFloat('time', time).setFloat('sway', sway).setFloat('land', land).setFloat('opacity', opacity)
        .setVector3('camPos', cam)
      meshes.forEach((m) => { m.isVisible = opacity > 0.001 })
    },
    dispose() { meshes.forEach((m) => m.dispose()); mat.dispose() },
  }
}
