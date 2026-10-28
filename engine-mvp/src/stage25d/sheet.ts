// The even part of the one warm wash the whole picture is painted over (look.ts sheetWash), after the shared post
// chain. No pattern here: the paper's tooth, grain and wash patches belong to each picture (layer.ts PAPER_GLSL) and
// the floor, so they move with what they are painted on; a pattern fixed to the screen would slide over a pan.
import { Effect, PostProcess, Vector3, type Camera } from '@babylonjs/core'
import { WASH_COLOUR } from './look'

Effect.ShadersStore.stageSheetFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`

export function makeSheet(camera: Camera, num: (k: string) => number): PostProcess {
  const pp = new PostProcess('stageSheet', 'stageSheet', ['wash', 'washColour'], null, 1, camera)
  pp.onApply = (fx) => {
    fx.setFloat('wash', num('sheetWash')).setVector3('washColour', Vector3.FromArray(WASH_COLOUR))
  }
  return pp
}
