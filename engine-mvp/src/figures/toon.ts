// The figure's paint: one flat dye, one hard cel step, lit by the figure's OWN light direction (not the
// scene's lights), so a figure reads the same on every painted set.
// Ink: where the surface turns away from the eye (N.V small) the pixel is ink. That draws the contour AND the
// fold lines (sleeve, collar, knee) with a weight that swells on round forms and thins on flat ones.
// ponytail: anime-look's pixel-width inverted hull covered the garments on this skinned, mirrored rig (the
// hull drew in front of the cloth at any width); this needs no extra mesh. Upgrade: fix the hull, add it back.
import { Color3, Vector3, type Scene } from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials'

export const TOON = {
  light: new Vector3(0.55, 0.55, -0.62).normalize(), // toward the light: upper left, in front of the figure
  shade: new Color3(0.74, 0.68, 0.74),                // the shade step multiplies the dye by this
  step: 0.18,                                         // N.L below this = shade
  soft: 0.03,                                         // edge softness (0 = razor)
  ink: new Color3(0.17, 0.14, 0.125),                 // History Lines ink: warm black, never pure
  inkEdge: 0.3,                                       // N.V below this = ink (bigger = heavier line)
  inkSoft: 0.06,
}

export function toonMaterial(name: string, dye: Color3, scene: Scene): CustomMaterial & { dye: Color3; inkEdge?: number } {
  const m = new CustomMaterial(name, scene) as CustomMaterial & { dye: Color3; inkEdge?: number }
  m.dye = dye.clone()
  m.specularColor = Color3.Black()
  m.backFaceCulling = true // garments are closed or doubled shells: drawing the inner side z-fights
  m.AddUniform('dye', 'vec3', null)
  m.AddUniform('shadeTint', 'vec3', null)
  m.AddUniform('toLight', 'vec3', null)
  m.AddUniform('celStep', 'float', null)
  m.AddUniform('celSoft', 'float', null)
  m.AddUniform('inkColor', 'vec3', null)
  m.AddUniform('inkEdge', 'float', null)
  m.AddUniform('inkSoft', 'float', null)
  m.Fragment_Before_FragColor(`
    vec3 n = normalize(vNormalW);
    vec3 toEye = normalize(vEyePosition.xyz - vPositionW);
    float nv = abs(dot(n, toEye));
    float nl = dot(n, normalize(toLight));
    float lit = smoothstep(celStep - celSoft, celStep + celSoft, nl);
    float inked = 1.0 - smoothstep(inkEdge - inkSoft, inkEdge, nv);
    color = vec4(mix(mix(dye * shadeTint, dye, lit), inkColor, inked), 1.0);
  `)
  m.onBindObservable.add(() => {
    const e = m.getEffect()
    if (!e) return
    e.setColor3('dye', m.dye)
    e.setColor3('shadeTint', TOON.shade)
    e.setVector3('toLight', TOON.light)
    e.setFloat('celStep', TOON.step)
    e.setFloat('celSoft', TOON.soft)
    e.setColor3('inkColor', TOON.ink)
    e.setFloat('inkEdge', m.inkEdge ?? TOON.inkEdge)
    e.setFloat('inkSoft', TOON.inkSoft)
  })
  return m
}
