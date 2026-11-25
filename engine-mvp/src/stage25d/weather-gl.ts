// Snow and rain drawn in the stage's own WebGL (weather.ts has the rules). Every flake is a quad whose place is worked
// out on the GPU from its seed and the time: it falls through a box of air in front of the camera and wraps round the
// box, so the air is never empty and the CPU never touches a flake. One mesh per slab of air (weather.ts slabsOf),
// drawn at that slab's distance among the painted pictures, so a figure standing in front covers the snow behind it.
//
// The look is History Lines: a snowflake is a soft dab of paper white with a ragged edge and a faint cool rim, a near
// one out of focus; rain is a thin pencil-grey stroke that fades at both ends. Nothing glossy, no glow.
import { Constants } from '@babylonjs/core/Engines/constants'
import { Effect } from '@babylonjs/core/Materials/effect'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { Camera } from '@babylonjs/core/Cameras/camera'
import type { Scene } from '@babylonjs/core/scene'
import { bandSlot } from './layout'
import { rng } from './scatter'
import { boxOf, MOTION, slabsOf, velocityOf, type WeatherNow } from './weather'
import type { WeatherKind } from './types'

Effect.ShadersStore.stageWeatherVertexShader = `
  precision highp float;
  attribute vec3 position;          // the quad's corner: x across (-0.5..0.5), y along (0..1)
  attribute vec4 seed;              // the flake's place in its box (0..1 each) and its rank (0..1: drawn below the amount)
  attribute vec4 extra;             // phase, size jitter, speed jitter
  uniform mat4 view, projection;
  uniform vec3 camPos, box, vel;
  uniform float zNear, time, size, grow, amount, sway, streak, rain, renderH, minPx;
  varying vec2 vCorner;
  varying float vAlpha, vPhase, vSoft;

  vec3 placeAt(float t) {
    vec3 v = vel * (0.8 + 0.4 * extra.z);
    vec3 p = seed.xyz * box + v * t;
    // a snowflake rocks from side to side as it falls, each on its own beat
    float beat = t * (0.6 + 0.5 * extra.x) + extra.x * 6.2832;
    p.x += sway * sin(beat);
    p.z += sway * 0.6 * cos(beat * 0.8);
    vec3 origin = vec3(camPos.x - box.x * 0.5, camPos.y - box.y * 0.45, camPos.z + zNear);
    return origin + mod(p - origin, box);
  }

  void main(void) {
    vCorner = position.xy;
    vPhase = extra.x;
    vec3 p = placeAt(time);
    float depthK = (p.z - camPos.z - zNear) / box.z;   // 0 at the slab's near edge, 1 at its far one
    // fade in and out at the slab's edges and the top of its box (a flake wrapping round never pops), under the ground
    float a = smoothstep(0.0, 0.1, depthK) * smoothstep(1.0, 0.9, depthK);
    a *= smoothstep(0.0, 0.08, 1.0 - (p.y - (camPos.y - box.y * 0.45)) / box.y);
    a *= smoothstep(-0.02, 0.12, p.y);
    a *= step(seed.w, amount);                         // a higher amount only adds flakes, never moves one
    vec4 head = view * vec4(p, 1.0);
    float depth = max(head.z, 0.05);
    float pxPerM = projection[1][1] * renderH * 0.5 / depth;
    float s = size * (0.6 + 0.8 * extra.y) * (1.0 + grow * depth);
    float px = s * pxPerM;
    // still under minPx: it keeps minPx and gets fainter instead of shimmering
    if (px < minPx) { a *= px / minPx; s = minPx / pxPerM; }
    vec4 q;
    if (rain > 0.5) {
      // a streak from where the drop is back along its fall: the blur of one short exposure
      vec4 tail = view * vec4(p - vel * (0.8 + 0.4 * extra.z) * streak, 1.0);
      vec2 d = tail.xy - head.xy;
      vec2 dir = length(d) > 1e-5 ? normalize(d) : vec2(0.0, -1.0);
      vec2 across = vec2(-dir.y, dir.x);
      q = mix(head, tail, position.y);
      q.xy += across * position.x * s;
      vSoft = 0.0;
    } else {
      q = head;
      q.xy += (position.xy - vec2(0.0, 0.5)) * s;
      vSoft = clamp(1.4 / depth, 0.0, 1.0);             // a flake close to the lens is out of focus
    }
    // the far air: fainter, a veil rather than flakes
    a *= mix(1.0, 0.55, clamp(depth / 70.0, 0.0, 1.0));
    vAlpha = a;
    gl_Position = projection * q;
  }`

Effect.ShadersStore.stageWeatherFragmentShader = `
  precision highp float;
  varying vec2 vCorner;
  varying float vAlpha, vPhase, vSoft;
  uniform float rain, opacity;
  uniform vec3 flake, rim, stroke;
  void main(void) {
    if (vAlpha < 0.003) discard;
    vec4 c;
    if (rain > 0.5) {
      // a pencil stroke: thickest in its middle, fading out at both ends and to its sides
      float along = sin(3.14159 * clamp(vCorner.y, 0.0, 1.0));
      float side = 1.0 - smoothstep(0.15, 0.5, abs(vCorner.x));
      float a = pow(along, 0.8) * side * 0.7 * vAlpha;
      c = vec4(stroke * a, a);
    } else {
      // a dab of white with a ragged, hand-made edge (never a perfect disc) and a faint cool rim where the paint thins
      vec2 o = vec2(vCorner.x, vCorner.y - 0.5) * 2.0;
      float r = length(o);
      float ang = atan(o.y, o.x);
      float edge = 0.8 + 0.045 * sin(ang * 3.0 + vPhase * 31.0) + 0.03 * sin(ang * 7.0 - vPhase * 17.0);
      float soft = mix(0.3, 0.65, vSoft);
      float a = (1.0 - smoothstep(edge - soft, edge, r)) * 0.9 * vAlpha;
      vec3 col = mix(flake, rim, smoothstep(edge - soft - 0.15, edge, r) * (1.0 - vSoft) * 0.8);
      c = vec4(col * a, a);
    }
    gl_FragColor = c * opacity;
  }`

export interface WeatherLayer {
  /** Draw this weather (null: none) for the camera now. ambient: the time of day's light (daylight.ts). */
  update(w: WeatherNow | null, time: number, camera: Camera, renderH: number, ambient: readonly number[]): void
  dispose(): void
}

/** The weather of a stage: its meshes are made for a kind the first time it falls, then only their uniforms change. */
export function makeWeather(scene: Scene): WeatherLayer {
  const built = new Map<WeatherKind, { mesh: Mesh; mat: ShaderMaterial; near: number; far: number; box: [number, number, number] }[]>()
  const slabsFor = (kind: WeatherKind) => {
    const have = built.get(kind)
    if (have) return have
    const list = slabsOf(kind).map((slab, n) => {
      const r = rng(0x5eed + n * 977 + (kind === 'rain' ? 31 : 0))
      const pos: number[] = [], seed: number[] = [], extra: number[] = [], idx: number[] = []
      for (let i = 0; i < slab.count; i++) {
        const sd = [r(), r(), r(), r()], ex = [r(), r(), r(), 0]
        for (const [cx, cy] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) { pos.push(cx, cy, 0); seed.push(...sd); extra.push(...ex) }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3)
      }
      const mesh = new Mesh(`weather:${kind}:${n}`, scene)
      Object.assign(new VertexData(), { positions: pos, indices: idx }).applyToMesh(mesh)
      mesh.setVerticesData('seed', seed, false, 4)
      mesh.setVerticesData('extra', extra, false, 4)
      const mat = new ShaderMaterial(`weather:${kind}:${n}`, scene, 'stageWeather', {
        attributes: ['position', 'seed', 'extra'],
        uniforms: ['view', 'projection', 'camPos', 'box', 'vel', 'zNear', 'time', 'size', 'grow', 'amount', 'sway', 'streak', 'rain', 'renderH', 'minPx', 'opacity', 'flake', 'rim', 'stroke'],
        needAlphaBlending: true,
      })
      mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
      mat.disableDepthWrite = true
      mat.depthFunction = Constants.ALWAYS   // in the air in front of the floor: the floor's depth never cuts a flake
      mat.backFaceCulling = false
      const box = boxOf(slab)
      mat.setVector3('box', Vector3.FromArray(box)).setFloat('zNear', slab.near).setFloat('rain', kind === 'rain' ? 1 : 0).setFloat('opacity', 1)
      mesh.material = mat
      mesh.alwaysSelectAsActiveMesh = true   // the shader places every quad: the CPU's box means nothing
      mesh.isPickable = false
      mesh.metadata = { noGBuffer: true }    // no pencil lines drawn round a flake
      mesh.setEnabled(false)
      return { mesh, mat, near: slab.near, far: slab.far, box }
    })
    built.set(kind, list)
    return list
  }

  return {
    update(w, time, camera, renderH, ambient) {
      for (const [kind, list] of built) if (!w || kind !== w.kind) list.forEach((s) => s.mesh.setEnabled(false))
      if (!w) return
      const m = MOTION[w.kind]
      const vel = Vector3.FromArray(velocityOf(w))
      const lit = (c: number[]) => new Vector3(c[0] * ambient[0], c[1] * ambient[1], c[2] * ambient[2])
      const cam = camera.position
      for (const s of slabsFor(w.kind)) {
        s.mesh.setEnabled(true)
        s.mesh.alphaIndex = bandSlot(Math.max(1, cam.z + s.far))   // drawn as if at its far edge: what stands in front covers it
        s.mat.setVector3('camPos', cam).setVector3('vel', vel).setFloat('time', time).setFloat('amount', w.amount)
          .setFloat('size', m.size * w.size).setFloat('grow', m.grow).setFloat('sway', m.sway * Math.min(1.5, w.speed)).setFloat('streak', m.streak)
          .setFloat('renderH', renderH).setFloat('minPx', w.kind === 'rain' ? 1.1 : 1.6)
          .setVector3('flake', lit([0.98, 0.975, 0.96])).setVector3('rim', lit([0.74, 0.79, 0.86])).setVector3('stroke', lit([0.52, 0.57, 0.64]))
      }
    },
    dispose() { for (const list of built.values()) list.forEach((s) => { s.mesh.dispose(); s.mat.dispose() }); built.clear() },
  }
}
