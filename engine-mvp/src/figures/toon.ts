// The figure's paint: one flat dye, one hard cel step, lit by the figure's OWN light direction (not the
// scene's lights), so a figure reads the same on every painted set.
// Ink: where the surface turns away from the eye (N.V small) the pixel is ink. That draws the contour AND the
// fold lines (sleeve, collar, knee) with a weight that swells on round forms and thins on flat ones.
// ponytail: anime-look's pixel-width inverted hull covered the garments on this skinned, mirrored rig (the
// hull drew in front of the cloth at any width); this needs no extra mesh. Upgrade: fix the hull, add it back.
import { Color3, Matrix, Vector3, type BaseTexture, type Scene } from '@babylonjs/core'
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

// The painted face: a projector box in front of the head (unit cube -> world, refreshed per frame from the head
// bone); the expression image is projected onto whatever skin/eyeball lies inside it and faces it.
export type FaceProjector = { tex: BaseTexture | null; toBox: Matrix; fwd: Vector3 }
export type ToonMaterial = CustomMaterial & { dye: Color3; inkEdge?: number; step?: number; face?: FaceProjector }

export function toonMaterial(name: string, dye: Color3, scene: Scene): ToonMaterial {
  const m = new CustomMaterial(name, scene) as ToonMaterial
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
  m.AddUniform('faceBox', 'mat4', null)
  m.AddUniform('faceFwd', 'vec3', null)
  m.AddUniform('faceTex', 'sampler2D', null)
  m.AddUniform('hasFace', 'float', null)
  m.Fragment_Before_FragColor(`
    vec3 n = normalize(vNormalW);
    vec3 toEye = normalize(vEyePosition.xyz - vPositionW);
    float nv = abs(dot(n, toEye));
    float nl = dot(n, normalize(toLight));
    float lit = smoothstep(celStep - celSoft, celStep + celSoft, nl);
    float inked = 1.0 - smoothstep(inkEdge - inkSoft, inkEdge, nv);
    vec3 paint = mix(dye * shadeTint, dye, lit);
    if (hasFace > 0.5) {
      vec3 fp = (faceBox * vec4(vPositionW, 1.0)).xyz;
      if (abs(fp.x) < 0.5 && abs(fp.y) < 0.5 && abs(fp.z) < 0.5) {
        float facing = smoothstep(0.15, 0.4, abs(dot(n, normalize(faceFwd)))); // abs: the loader's mirror can flip vNormalW
        vec4 f = texture2D(faceTex, fp.xy + 0.5);
        paint = mix(paint, inkColor, smoothstep(0.05, 0.45, f.a) * facing); // the art is pure ink: only its alpha counts
        // no contour ink on the face's middle (eye sockets, nostrils, the parted lips): the painted face draws it
        inked *= smoothstep(0.44, 0.5, length(fp.xy));
      }
    }
    color = vec4(mix(paint, inkColor, inked), 1.0);
  `)
  m.onBindObservable.add(() => {
    const e = m.getEffect()
    if (!e) return
    e.setColor3('dye', m.dye)
    e.setColor3('shadeTint', TOON.shade)
    e.setVector3('toLight', TOON.light)
    e.setFloat('celStep', m.step ?? TOON.step)
    e.setFloat('celSoft', TOON.soft)
    e.setColor3('inkColor', TOON.ink)
    e.setFloat('inkEdge', m.inkEdge ?? TOON.inkEdge)
    e.setFloat('inkSoft', TOON.inkSoft)
    const f = m.face
    e.setFloat('hasFace', f?.tex ? 1 : 0)
    if (f?.tex) {
      e.setMatrix('faceBox', f.toBox)
      e.setVector3('faceFwd', f.fwd)
      e.setTexture('faceTex', f.tex)
    }
  })
  return m
}
