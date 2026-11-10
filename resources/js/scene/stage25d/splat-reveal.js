/**
 * The world builds itself around the class (Bart, 2026-11-10): Spark's "Spread" splat reveal
 * (sparkjs.dev/examples/#splat-reveal-effects, MIT) as a plugin on Babylon's GaussianSplattingMaterial, so a
 * World Labs world needs no second 3D engine. Proven in harness/splat-reveal first.
 *
 * CUSTOM_VERTEX_UPDATE runs after the splat is read and right before it is projected, with splat.center (local),
 * worldPos, covA/covB (the covariance: scale squared) and vColor in scope. revealUnit turns the world's own metres
 * into the few units Spark's timing was tuned for, so a big World Labs world builds as fast as Spark's small one.
 *
 * PAINT then puts the world in our style (Bart, 2026-11-10, "splat in our art style"): calmer colour on the warm
 * wash the pictures are painted over, flat bands instead of photo gradients, and its far edge left to the paper,
 * the way a Verbree vignette stops before the page does. paintK 0 = the world as captured.
 */
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'
import { WASH_COLOUR } from '@stage25d/stage25d/look'

const SPREAD = /* glsl */ `
{
  float t = revealT;
  vec3 p = splat.center.xyz;
  float l = length(p.xz) * revealUnit;
  float tt = t * t * .4 + .5;
  p.xz *= min(1., .3 + max(0., tt * .05));
  worldPos = splatWorld * vec4(p, 1.0);
  float k = max(clamp(tt - 7. - l * 2.5, 0., 1.), .2 * clamp(tt - 1. - l * 2., 0., 1.));
  covA *= k * k;
  covB *= k * k;
  vColor = mix(vec4(.3), vColor, clamp(tt - l * 2.5 - 3., 0., 1.));
}
`

/** l is the same unit as SPREAD's: 3 = where 80 % of the world lies. */
const PAINT = /* glsl */ `
{
  vec3 c = vColor.rgb;
  vec3 g = mix(vec3(dot(c, vec3(.299, .587, .114))), c, .75);
  g = mix(g, g * washColour, .35);
  g = floor(g * 6. + .5) / 6.;
  float far = smoothstep(2.4, 4.5, length(splat.center.xz) * revealUnit);
  g = mix(g, washColour, far * .85);
  vColor.rgb = mix(c, g, paintK);
}
`

export class SplatRevealPlugin extends MaterialPluginBase {
  constructor (material, unit = 1) {
    super(material, 'SplatReveal', 300)
    this.time = 0
    this.unit = unit
    this.paint = 1
    this._enable(true)
  }

  getClassName () { return 'SplatRevealPlugin' }

  isCompatible (shaderLanguage) { return shaderLanguage === 0 }   // ponytail: GLSL only, port to WGSL if the stage moves to WebGPU

  getUniforms () { return { externalUniforms: ['revealT', 'revealUnit', 'paintK', 'washColour'] } }

  bindForSubMesh (_ubo, _scene, _engine, subMesh) {
    subMesh.effect?.setFloat('revealT', this.time)
    subMesh.effect?.setFloat('revealUnit', this.unit)
    subMesh.effect?.setFloat('paintK', this.paint)
    subMesh.effect?.setFloat3('washColour', ...WASH_COLOUR)
  }

  getCustomCode (shaderType) {
    if (shaderType !== 'vertex') return null
    return { CUSTOM_VERTEX_DEFINITIONS: 'uniform float revealT;\nuniform float revealUnit;\nuniform float paintK;\nuniform vec3 washColour;', CUSTOM_VERTEX_UPDATE: SPREAD + PAINT }
  }
}
