/**
 * The world builds itself around the class (Bart, 2026-11-10): Spark's "Spread" splat reveal
 * (sparkjs.dev/examples/#splat-reveal-effects, MIT) as a plugin on Babylon's GaussianSplattingMaterial, so a
 * World Labs world needs no second 3D engine. Proven in harness/splat-reveal first.
 *
 * CUSTOM_VERTEX_UPDATE runs after the splat is read and right before it is projected, with splat.center (local),
 * worldPos, covA/covB (the covariance: scale squared) and vColor in scope. revealUnit turns the world's own metres
 * into the few units Spark's timing was tuned for, so a big World Labs world builds as fast as Spark's small one.
 */
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase'

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

export class SplatRevealPlugin extends MaterialPluginBase {
  constructor (material, unit = 1) {
    super(material, 'SplatReveal', 300)
    this.time = 0
    this.unit = unit
    this._enable(true)
  }

  getClassName () { return 'SplatRevealPlugin' }

  isCompatible (shaderLanguage) { return shaderLanguage === 0 }   // ponytail: GLSL only, port to WGSL if the stage moves to WebGPU

  getUniforms () { return { externalUniforms: ['revealT', 'revealUnit'] } }

  bindForSubMesh (_ubo, _scene, _engine, subMesh) {
    subMesh.effect?.setFloat('revealT', this.time)
    subMesh.effect?.setFloat('revealUnit', this.unit)
  }

  getCustomCode (shaderType) {
    if (shaderType !== 'vertex') return null
    return { CUSTOM_VERTEX_DEFINITIONS: 'uniform float revealT;\nuniform float revealUnit;', CUSTOM_VERTEX_UPDATE: SPREAD }
  }
}
