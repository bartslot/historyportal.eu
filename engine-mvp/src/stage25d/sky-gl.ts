// A scene's own sky (set.daylight): a colour gradient the teacher can change, with the watercolour over it. The stage
// is one WebGL canvas and the sky stands behind the landscape inside it, so the blend is done here, not in CSS: the
// gradient is the pigment, the wash's pools, blooms and dry streaks and the paper's tooth multiply over it (Bart 11-12:
// "the texture is then showing over the blue hues"). The sun, or the moon at night, stands where the light comes from.
import { Constants } from '@babylonjs/core/Engines/constants'
import { Effect } from '@babylonjs/core/Materials/effect'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { GL_NOISE } from './ground-gl'
import { LINE_BY_DEPTH_GLSL, PAPER_GLSL } from './layer'
import type { Paper } from './look'
import type { RGB } from './daylight'

Effect.ShadersStore.stageSkyVertexShader = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, worldViewProjection;
  varying vec3 vW;
  void main(void) { vW = (world * vec4(position, 1.0)).xyz; gl_Position = worldViewProjection * vec4(position, 1.0); }`

Effect.ShadersStore.stageSkyFragmentShader = `
  precision highp float;
  varying vec3 vW;
  uniform vec3 top, mid, horizon, fill, sunColour, washColour;
  uniform float eyeY, spanY, pxPerM, skyWash, paper, grain, patches, wash, opacity;
  uniform vec2 sunAt;
  uniform float sunR, glow, moon, stars;
  ${GL_NOISE}
  ${LINE_BY_DEPTH_GLSL}
  ${PAPER_GLSL}
  void main(void) {
    vec2 px = vW.xy * pxPerM;                    // 1080p px on the sky at the house pose: the grain never swims
    float k = (vW.y - eyeY) / spanY;             // 0 on the horizon, 1 at the top of the house frame
    // wet in wet: the bands of colour bleed into each other unevenly, never a straight digital ramp
    k += skyWash * (0.08 * (fbm(px / 260.0 + 2.0) - 0.5) + 0.03 * (fbm(px / 55.0 + 9.0) - 0.5));
    // the far landscape stands a little over the eye line: the horizon colour reaches up past it (daylight.ts skyAt)
    vec3 c = k < 0.5 ? mix(horizon, mid, clamp((k - 0.1) / 0.4, 0.0, 1.0)) : mix(mid, top, clamp((k - 0.5) / 0.5, 0.0, 1.0));
    // the wash: pigment pools in big soft patches and dries with a darker rim where a bloom stopped
    c *= 1.0 + skyWash * 0.16 * (fbm(px / 420.0 + 7.0) - 0.5);
    float bloom = fbm(px / 170.0 + 13.0);
    float rim = smoothstep(0.5, 0.53, bloom) - smoothstep(0.53, 0.6, bloom);
    c *= 1.0 - skyWash * (0.04 * smoothstep(0.53, 0.62, bloom) + 0.07 * rim);
    // the brush ran dry in long sideways streaks: lighter there, the paper coming through
    float dry = smoothstep(0.58, 0.82, fbm(vec2(px.x / 320.0, px.y / 80.0) + 21.0));
    c = mix(c, mix(c, vec3(1.0), 0.3), skyWash * dry * 0.6);
    // stars: a few small four-point sparks, only well above the horizon
    if (stars > 0.0) {
      vec2 g = floor(px / 44.0);
      float h = hash(g);
      if (h > 0.982) {
        vec2 o = fract(px / 44.0) - 0.5 - 0.5 * (vec2(hash(g + 1.3), hash(g + 2.7)) - 0.5);
        float spark = max(0.0, 1.0 - length(o) * 10.0) + 0.6 * max(0.0, 1.0 - abs(o.x) * 30.0) * max(0.0, 1.0 - abs(o.y) * 5.0)
          + 0.6 * max(0.0, 1.0 - abs(o.y) * 30.0) * max(0.0, 1.0 - abs(o.x) * 5.0);
        c = mix(c, vec3(1.0, 0.97, 0.88), stars * clamp(spark, 0.0, 1.0) * smoothstep(0.12, 0.3, k));
      }
    }
    // the sun or the moon: a soft glow around it, a pale disc with a ragged painted edge and a thin ink line
    vec2 d = vW.xy - sunAt;
    float r = length(d);
    c = mix(c, sunColour, clamp(glow * 0.6 * exp(-r / (sunR * 3.5)), 0.0, 1.0));
    float edge = sunR * (1.0 + 0.06 * (fbm(d / sunR * 2.0 + 5.0) - 0.5));
    float disc = 1.0 - smoothstep(edge * 0.96, edge, r);
    float ink = smoothstep(edge * 0.93, edge * 0.97, r) * (1.0 - smoothstep(edge, edge * 1.03, r));
    if (moon > 0.5) {   // a crescent: a second disc takes a bite out of it
      float bite = 1.0 - smoothstep(edge * 0.8, edge * 0.86, length(d - vec2(sunR * 0.5, sunR * 0.28)));
      disc *= 1.0 - bite;
      ink *= 1.0 - bite;
    }
    c = mix(c, sunColour, disc);
    c = mix(c, vec3(0.2, 0.17, 0.14), ink * 0.55 * moon);
    // the paper every picture is painted on, its tooth and granulation over the whole sky
    c = paperOn(c, px, paper, grain, patches, wash, washColour);
    // under the eye line it is far floor, painted over by the floor itself: the horizon colour, no seam
    if (vW.y < eyeY) c = fill;
    gl_FragColor = vec4(c * opacity, opacity);
  }`

export interface SkyLook {
  top: RGB; mid: RGB; horizon: RGB
  /** below the eye line (the colour the floor fades into) */
  fill: RGB
  sun: { at: [number, number]; r: number; colour: RGB; glow: number; moon: boolean }
  stars: number
  /** the watercolour (look.groundWash): 0 = a flat gradient */
  wash: number
}

/** The sky plane: placed on the box a painted sky picture takes (placeLayer), drawn first (alphaIndex) like it. */
export function makeSky(scene: Scene): { mesh: Mesh; place(p: { x: number; y: number; z: number; w: number; h: number }, eyeY: number, spanY: number, pxPerM: number): void; set(l: SkyLook, paper: Paper): void; setOpacity(o: number): void; dispose(): void } {
  const mesh = MeshBuilder.CreatePlane('sky:own', { size: 1 }, scene)
  const mat = new ShaderMaterial('sky:own', scene, 'stageSky', {
    attributes: ['position'],
    uniforms: ['world', 'worldViewProjection', 'top', 'mid', 'horizon', 'fill', 'sunColour', 'washColour', 'eyeY', 'spanY', 'pxPerM', 'skyWash', 'paper', 'grain', 'patches', 'wash', 'opacity', 'sunAt', 'sunR', 'glow', 'moon', 'stars'],
    needAlphaBlending: true,
  })
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true
  mat.backFaceCulling = false
  mat.setFloat('opacity', 1)
  mesh.material = mat
  mesh.metadata = { noGBuffer: true, painted: true }
  mesh.isPickable = false
  mesh.alphaIndex = 1   // the painted sky picture's own slot (placeLayer: sky order 0)
  const v3 = (c: RGB) => Vector3.FromArray(c)
  return {
    mesh,
    place(p, eyeY, spanY, pxPerM) {
      mesh.scaling.set(p.w, p.h, 1)
      mesh.position.set(p.x, p.y + p.h / 2, p.z)
      mat.setFloat('eyeY', eyeY).setFloat('spanY', spanY).setFloat('pxPerM', pxPerM)
    },
    set(l, pp) {
      mat.setVector3('top', v3(l.top)).setVector3('mid', v3(l.mid)).setVector3('horizon', v3(l.horizon)).setVector3('fill', v3(l.fill))
        .setVector3('sunColour', v3(l.sun.colour)).setVector2('sunAt', new Vector2(l.sun.at[0], l.sun.at[1])).setFloat('sunR', l.sun.r)
        .setFloat('glow', l.sun.glow).setFloat('moon', l.sun.moon ? 1 : 0).setFloat('stars', l.stars).setFloat('skyWash', l.wash)
        .setFloat('paper', pp.paper).setFloat('grain', pp.grain).setFloat('patches', pp.patches).setFloat('wash', pp.wash).setVector3('washColour', v3(pp.washColour))
    },
    setOpacity(o) { mat.setFloat('opacity', o); mesh.isVisible = o > 0.001 },
    dispose() { mesh.dispose(); mat.dispose() },
  }
}
