// The paper sheet under the whole frame (look.ts): runs after the shared post chain, in screen space, because the
// painting IS one sheet of paper: its tooth and the pigment settling in it belong to the page, not to a layer.
import { Effect, PostProcess, Vector2, Vector3, type Camera } from '@babylonjs/core'
import { GL_NOISE } from './ground-gl'

Effect.ShadersStore.stageSheetFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec2 sheetSize;                    // the frame in 1080p px (grain is the same size at any render size)
  uniform float paper, grain, wash, patches;
  uniform vec3 washColour;
  ${GL_NOISE}
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main(void) {
    vec3 c = texture2D(textureSampler, vUV).rgb;
    vec2 px = vUV * sheetSize;
    float l = lum(c);
    // paper tooth: fine fibre and a medium cockle, light on the light washes too (it is the sheet)
    c *= 1.0 + paper * (0.12 * (fbm(px / 1.6) - 0.5) + 0.08 * (fbm(px / 9.0 + 17.0) - 0.5));
    // granulation: pigment settling in the tooth, in the darker and more coloured washes only
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    c *= 1.0 + grain * 0.5 * (fbm(px / 1.3 + 31.0) - 0.5) * (1.0 - 0.6 * l) * (0.4 + sat);
    // one light wash over everything (the same warm tone ties the layers), thicker and thinner in big soft patches
    float b = fbm(px / 380.0 + 5.0) - 0.5;
    c *= mix(vec3(1.0), washColour, wash * (1.0 + patches * 1.6 * b));
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`

export const WASH_COLOUR: [number, number, number] = [0.93, 0.86, 0.74]   // warm raw-sienna paper wash

export function makeSheet(camera: Camera, num: (k: string) => number): PostProcess {
  const pp = new PostProcess('stageSheet', 'stageSheet', ['sheetSize', 'paper', 'grain', 'wash', 'patches', 'washColour'], null, 1, camera)
  pp.onApply = (fx) => {
    fx.setVector2('sheetSize', new Vector2((1080 * pp.width) / Math.max(pp.height, 1), 1080))
    fx.setFloat('paper', num('sheetPaper')).setFloat('grain', num('sheetGrain')).setFloat('wash', num('sheetWash')).setFloat('patches', num('sheetPatches'))
    fx.setVector3('washColour', Vector3.FromArray(WASH_COLOUR))
  }
  return pp
}
