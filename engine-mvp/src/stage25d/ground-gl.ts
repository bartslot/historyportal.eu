// The floor and its contact stains on the GPU. The ground is one big plane at y 0: its art tiles in world metres
// (so perspective is real), a watercolour grain sits on world positions (it never slides when the camera moves), and
// toward the horizon it fades into the colour the far landscape ends in, so the bg strip's feathered edge meets it.
import { GROUND_SLOT } from './layout'
import { GROUND_TILE_M } from './ground'
import { Constants } from '@babylonjs/core/Engines/constants'
import { Effect } from '@babylonjs/core/Materials/effect'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'

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

/** Slots 1..5 of the floor (slot 0 is `tex`): each one's own sampler, blended in over a noise-broken border. */
const SLOT_GLSL = [1, 2, 3, 4, 5].map((i) => `
    if (slotCount > ${i}.5) { float k${i} = smoothstep(slotFrom[${i}] * 0.85, slotFrom[${i}] * 1.15 + 0.5, dn); c = mix(c, slotTile(tex${i}, slotTiles[${i}], slotPersp[${i}]), k${i}); own = mix(own, slotColour[${i}], k${i}); rec = mix(rec, slotRecolour[${i}], k${i}); pp = mix(pp, slotPersp[${i}], k${i}); }`).join('')

Effect.ShadersStore.stageGroundFragmentShader = `
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, tex1, tex2, tex3, tex4, tex5, nearTex;
  uniform float useTex, grain, fadeNear, fadeFar, detail, vary, mixTile, tileScale, wash, grainSize, slotCount;
  uniform float slotFrom[6], slotTiles[6], slotPersp[6];
  uniform mat4 houseVP;         // the house camera: a perspective terrain is laid from where it was painted
  uniform float houseTop;       // where the horizon is in that view (ndc y)
  uniform vec3 slotColour[6];   // each slot's own median colour: its far floor fades into it, not into one tint
  uniform vec3 slotRecolour[6]; // each slot times this per channel: its soil onto the world's (soil.ts), else 1 1 1
  uniform vec3 base, horizonTint, camPos;
  uniform vec3 ambient;         // the time of day's light (daylight.ts) on the painted ground
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${NOISE}
  vec3 tileAt(sampler2D t, vec2 uv) { return mix(texture2D(t, uv, 4.0).rgb, texture2D(t, uv).rgb, detail); }
  // one slot's art tiled in world metres; anti-tiling: a second, turned and scaled read of the same tile, swapped in
  // over big soft world patches, so the rows of one repeating tile break up (mixTile 0 = the plain tile)
  vec3 slotTile(sampler2D t, float tl, float persp) {
    // a terrain painted from eye height down to the horizon (Bart 11-11: the sea): read through the house camera, so
    // from there it is exactly the painting, and it still lies on the floor (true parallax sideways); its top row is
    // the horizon, it repeats only sideways (tl = how often across one frame)
    if (persp > 0.5) {
      vec4 cl = houseVP * vec4(vW.x, 0.0, vW.z, 1.0);
      vec2 n = cl.xy / max(cl.w, 1e-4);
      float v = clamp((n.y + 1.0) / max(houseTop + 1.0, 1e-3), 0.0, 1.0);
      // read sharp: tileAt's blurred mip mix hides a small tile's repeats, but on a painting it is only smear
      // (Bart 11-11: "all these terrain layers look very blurry")
      return texture2D(t, vec2((n.x * 0.5 + 0.5) * abs(tl), 1.0 - v)).rgb;
    }
    // the picture's top row lies FAR from the camera (textures load top row first, invertY false): a tuft drawn
    // standing reads standing, not upside down (Bart 11-10: "the floor is flipped"). A negative tl (a slot the teacher
    // flipped) mirrors it top to bottom.
    vec2 uv = vec2(vW.x / abs(tl), -vW.z / tl) / tileScale;
    vec2 uv2 = mat2(0.866, -0.5, 0.5, 0.866) * uv * 1.37 + vec2(0.31, 0.57);
    float m = smoothstep(0.3, 0.7, fbm(vW.xz * 0.06 + 11.0));
    return mix(tileAt(t, uv), tileAt(t, uv2), m * mixTile);
  }
  // the watercolour grain in whole octaves of distance (ground.ts grainOctave): a dot is as big on screen near as far
  float grainAt(float d) {
    float L = log2(max(d, 0.5) / 10.0), o = floor(L);
    float s = 2.7 / exp2(o) / max(0.1, grainSize);
    return mix(fbm(vW.xz * s), fbm(vW.xz * s * 0.5), L - o);
  }
  void main(void) {
    float d = distance(vW.xz, camPos.xz);
    vec3 c = base, own = base, rec = vec3(1.0);
    float pp = 0.0;   // how much of this pixel is a perspective painting (it does its own distance)
    if (useTex > 0.5) {
      // near to far, each ground picture from its distance on (set.groundSlots), the borders broken by a world noise
      float dn = d * (1.0 + 0.35 * (fbm(vW.xz * 0.05 + 3.0) - 0.5));
      c = slotTile(tex, slotTiles[0], slotPersp[0]); own = slotColour[0]; rec = slotRecolour[0]; pp = slotPersp[0];${SLOT_GLSL}
      c *= rec; own *= rec;
    }
    // the time of day lights the ground; the horizon it fades into is lit already where it is ground (stage.ts)
    c *= ambient; own *= ambient;
    // low-frequency value and hue drift over the field (vary), the way a hand wash is never even
    c *= 1.0 + vary * 0.32 * (fbm(vW.xz * 0.022) - 0.5);
    c.rb *= 1.0 + vary * vec2(0.08, -0.08) * (fbm(vW.xz * 0.017 + 7.0) - 0.5);
    // watercolour on the floor: broad wash variation, then fine granulation, both fixed to the world (wash: Watercolour)
    float broad = fbm(vW.xz * 0.18), gran = grainAt(d);
    // pigment pools in the wash (broad, +-18 %) and settles in the paper tooth (fine, up to 12 % darker)
    c *= 1.0 - grain * wash * 2.0 * (0.18 * (broad - 0.5) * 2.0 + 0.12 * smoothstep(0.35, 0.8, gran));
    // far off the tile's rows squeeze into streaks: the art fades into its own slot's colour, and only far beyond
    // that into the colour the far landscape (or the sky) ends in, so a far slot still shows as itself
    c = mix(c, own, smoothstep(fadeNear, fadeFar, d) * (1.0 - pp));
    c = mix(c, horizonTint, smoothstep(fadeFar, fadeFar * 3.0, d) * (1.0 - pp));   // a painting runs on to its own horizon
    // the near band: a strip painted from eye height, projected back onto the floor from the house camera, so from
    // there it looks exactly as painted and still lies on the ground (parallax when the camera moves); its upper part
    // fades into the far floor (t: 0 at the frame's bottom edge, 1 at the band's far edge)
    if (useNear > 0.5) {
      vec4 cl = nearVP * vec4(vW, 1.0);
      if (cl.w > 0.0) {
        vec2 n = cl.xy / cl.w;
        float t = (n.y + 1.0) / max(nearTop + 1.0, 1e-3);
        vec4 b = texture2D(nearTex, vec2(n.x / nearSpan * 0.5 + 0.5, 1.0 - clamp(t, 0.0, 1.0)));   // premultiplied
        // fades out at its far edge (t) and below its bottom edge (a camera behind the house sees nearer floor); across
        // it never ends: u runs on and the texture repeats (tileable) or mirrors (one painting)
        float k = (1.0 - smoothstep(0.7, 1.0, t)) * smoothstep(-0.08, 0.0, t);
        c = b.rgb * ambient * k + c * (1.0 - b.a * k);
      }
    }
    gl_FragColor = vec4(c, 1.0);
  }`

/**
 * Hatching that never shimmers: `t` runs one per stroke, `wid` is a stroke's half width in those units. The stroke's edge
 * is as soft as one screen pixel; strokes too fine to draw (a far picture, a floor seen at a low angle) fade into their
 * even tone, so they cannot beat against the pixels as a moire when the picture moves. Comments here hold no ';'.
 */
export const HATCH_GLSL = `
  float hatched(float t, float wid, float gap, float gapMean) {
    float px = fwidth(t);
    float d = abs(fract(t) - 0.5);
    float line = (1.0 - smoothstep(wid - px, wid + px, d)) * gap;
    return mix(line, clamp(2.0 * wid, 0.0, 1.0) * gapMean, smoothstep(0.25, 0.6, px));
  }`

Effect.ShadersStore.stageStainVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`

Effect.ShadersStore.stageStainFragmentShader = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed, etch, aspect;
  uniform vec3 tint;   // the time of day's shadow colour (daylight.ts)
  ${NOISE}
  ${HATCH_GLSL}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    vec3 colour = tint;
    // etched: a few light pencil strokes over the stain, in its own colour a step darker, denser toward the foot.
    // The wash stays under them (Bart 11-13: no black bars), and they fade out with the stain, never cut off
    if (etch > 0.0) {
      vec2 q = vec2(vUV.x, vUV.y * aspect) * 12.0;
      float t = q.x + q.y + 0.9 * fbm(q * 0.35 + seed);
      float body = 1.0 - smoothstep(0.25, 1.0, r);
      float gap = smoothstep(0.25, 0.4, fbm(vec2((q.x - q.y) * 0.5, floor(t) * 3.1 + seed)) + 0.4 * body);
      float ink = hatched(t, 0.06 + 0.14 * body, gap, 0.6) * body * etch * min(1.0, opacity * 1.6);
      colour = mix(colour, colour * 0.55, ink);
      a = max(a, 0.45 * ink);
    }
    gl_FragColor = vec4(colour * a, a);
  }`

/** One ground picture of the floor: its texture, the metres one tile covers, from how far out it lies. */
/** persp: painted from eye height to the horizon (library `perspective`), laid through the house camera; its `tile` is
 *  then how often it repeats across one frame. */
export interface FloorSlot { tex: RawTexture; tile: number; from: number; colour: [number, number, number]; persp?: boolean; recolour?: readonly number[] }
export interface GroundLook { slots: FloorSlot[]; base: [number, number, number]; tint: [number, number, number]; fadeNear: number; fadeFar: number; grain: number }
/** The near band (set.near): its texture and the house camera's view-projection it is projected from. */
export interface NearBand { tex: RawTexture; vp: Matrix; top: number; span: number; tileable: boolean }
/** Across the near band never ends: tileable art repeats, one painting mirrors (never CLAMP: its last column would
 *  smear across the floor on a sideways move). */
export const nearWrapU = (tileable: boolean) => (tileable ? Texture.WRAP_ADDRESSMODE : Texture.MIRROR_ADDRESSMODE)
/** Live floor values (lesson.look): read every frame. */
export interface FloorLive { detail: number; vary: number; mixTile: number; tileScale: number; wash: number; grainSize: number }

export function makeGround(scene: Scene): { mesh: Mesh; set(look: GroundLook): void; follow(cam: Vector3): void; live(f: FloorLive): void; near(b: NearBand | null): void; house(p: { vp: Matrix; top: number }): void; light(ambient: readonly number[]): void } {
  const mesh = MeshBuilder.CreateGround('ground', { width: 2400, height: 2400 }, scene)
  const mat = new ShaderMaterial('ground', scene, 'stageGround', {
    attributes: ['position'],
    uniforms: ['world', 'viewProjection', 'useTex', 'tileScale', 'wash', 'grainSize', 'slotCount', 'slotFrom', 'slotTiles', 'slotPersp', 'houseVP', 'houseTop', 'slotColour', 'slotRecolour', 'grain', 'fadeNear', 'fadeFar', 'detail', 'vary', 'mixTile', 'useNear', 'nearTop', 'nearSpan', 'nearVP', 'base', 'horizonTint', 'camPos', 'ambient'],
    samplers: ['tex', 'tex1', 'tex2', 'tex3', 'tex4', 'tex5', 'nearTex'],
    needAlphaBlending: true,   // sorted with the layers (it outputs alpha 1): see GROUND_SLOT
  })
  const blank = new RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, Constants.TEXTUREFORMAT_RGBA, scene)
  for (const t of SLOT_SAMPLERS) mat.setTexture(t, blank)
  mat.setTexture('nearTex', blank)
  mat.setVector3('ambient', new Vector3(1, 1, 1))
  mat.setFloat('detail', 1).setFloat('vary', 0).setFloat('mixTile', 0).setFloat('useNear', 0).setFloat('tileScale', 1).setFloat('wash', 0.5).setFloat('grainSize', 1)
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
      const slots = l.slots.slice(0, SLOT_SAMPLERS.length)
      slots.forEach((sl) => { sl.tex.wrapU = Texture.WRAP_ADDRESSMODE; sl.tex.wrapV = sl.persp ? Texture.CLAMP_ADDRESSMODE : Texture.WRAP_ADDRESSMODE })
      SLOT_SAMPLERS.forEach((name, i) => mat.setTexture(name, slots[i]?.tex ?? blank))
      const pad = (f: (sl: FloorSlot) => number, none: number) => SLOT_SAMPLERS.map((_, i) => (slots[i] ? f(slots[i]) : none))
      mat.setFloat('useTex', slots.length ? 1 : 0).setFloat('slotCount', slots.length)
        .setFloats('slotFrom', pad((sl) => sl.from, 1e6)).setFloats('slotTiles', pad((sl) => sl.tile || GROUND_TILE_M, GROUND_TILE_M)).setFloats('slotPersp', pad((sl) => (sl.persp ? 1 : 0), 0))
        .setArray3('slotColour', SLOT_SAMPLERS.flatMap((_, i) => slots[i]?.colour ?? l.base))
        .setArray3('slotRecolour', SLOT_SAMPLERS.flatMap((_, i) => [...(slots[i]?.recolour ?? [1, 1, 1])]))
        .setFloat('grain', l.grain).setFloat('fadeNear', l.fadeNear).setFloat('fadeFar', l.fadeFar)
        .setVector3('base', Vector3.FromArray(l.base)).setVector3('horizonTint', Vector3.FromArray(l.tint))
    },
    follow(cam) { mat.setVector3('camPos', cam) },
    light(ambient) { mat.setVector3('ambient', Vector3.FromArray(ambient)) },
    house(p) { mat.setMatrix('houseVP', p.vp).setFloat('houseTop', p.top) },
    live(f) {
      mat.setFloat('detail', f.detail).setFloat('vary', f.vary).setFloat('mixTile', f.mixTile).setFloat('tileScale', f.tileScale)
        .setFloat('wash', f.wash).setFloat('grainSize', f.grainSize)
    },
    near(b) {
      mat.setFloat('useNear', b ? 1 : 0)
      if (!b) return
      b.tex.wrapU = nearWrapU(b.tileable); b.tex.wrapV = Texture.CLAMP_ADDRESSMODE
      mat.setTexture('nearTex', b.tex).setMatrix('nearVP', b.vp).setFloat('nearTop', b.top).setFloat('nearSpan', b.span)
    },
  }
}

/** The floor's samplers: slot 0 is `tex`, then one per further slot (ground.ts GROUND_SLOTS_MAX). */
const SLOT_SAMPLERS = ['tex', 'tex1', 'tex2', 'tex3', 'tex4', 'tex5'] as const

let stainSeed = 0

/** A soft painted stain lying on the ground, centred on `parent`'s origin (its anchor), w x d metres. With `cast`,
 *  it is a cast shadow instead: `length` metres long from the anchor along `dir` (the light's direction on the ground,
 *  x and z), w wide. */
export function makeStain(parent: TransformNode, w: number, d: number, scene: Scene, cast?: { dir: [number, number]; length: number }): { mesh: Mesh; setOpacity(o: number): void; setEtch(e: number): void; setTint(c: readonly number[]): void } {
  const mesh = MeshBuilder.CreatePlane(`stain${cast ? '-cast' : ''}:${parent.name}`, { width: w, height: cast ? cast.length : d }, scene)
  mesh.rotation.x = Math.PI / 2                 // flat on the floor
  if (cast) {                                   // turned along the light, starting at the anchor
    const [dx, dz] = cast.dir, n = Math.hypot(dx, dz) || 1
    mesh.rotation.y = Math.atan2(dx / n, dz / n)
    mesh.position.set((dx / n) * cast.length * 0.42, 0.015, (dz / n) * cast.length * 0.42)
  } else mesh.position.set(0, 0.02, -d * 0.18)  // a little toward the camera: the dark core shows in front of the foot
  mesh.parent = parent
  const mat = new ShaderMaterial(mesh.name, scene, 'stageStain', {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'opacity', 'seed', 'etch', 'aspect', 'tint'], needAlphaBlending: true,
  })
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true
  mat.backFaceCulling = false
  mat.setVector3('tint', new Vector3(0.27, 0.23, 0.18))
  mat.setFloat('seed', (stainSeed++ * 7.31) % 97).setFloat('opacity', 0).setFloat('etch', 0).setFloat('aspect', (cast ? cast.length : d) / Math.max(w, 0.01))
  mesh.material = mat
  mesh.metadata = { noGBuffer: true }
  mesh.isPickable = false
  return { mesh, setOpacity: (o) => { mat.setFloat('opacity', o); mesh.isVisible = o > 0.001 }, setEtch: (e) => { mat.setFloat('etch', e) }, setTint: (c) => { mat.setVector3('tint', Vector3.FromArray(c)) } }
}
