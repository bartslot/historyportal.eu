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
  soft: 0.12,                                         // edge softness: a wash edge, not a razor cel
  ink: Color3.FromHexString('#4a3526'),               // History Lines ink: warm sepia brown, never black
  inkEdge: 0.2,                                       // N.V below this = ink (bigger = heavier line)
  inkSoft: 0.1,                                       // a soft edge: no stair-stepped line
  paper: new Color3(0.94, 0.91, 0.84),                // the lit side lets this much paper through (paperLift)
  paperLift: 0.18,
  wash: 0.1,                                          // watercolour: pigment pools and thins over the paper (0 = flat)
  washScale: 38,                                      // its blotch size in screen pixels
}

// The painted face: a projector box in front of the head (unit cube -> world, refreshed per frame from the head
// bone); the expression image is projected onto whatever skin/eyeball lies inside it and faces it.
export type FaceProjector = { tex: BaseTexture | null; toBox: Matrix; fwd: Vector3 }
// zones: the garment's painted parts (per vertex 0 = base dye, 1..3 = zones[0..2]; null = keep the base dye)
export type ToonMaterial = CustomMaterial & { dye: Color3; zones?: (Color3 | null)[]; inkEdge?: number; step?: number; face?: FaceProjector }

export function toonMaterial(name: string, dye: Color3, scene: Scene, withZones = false): ToonMaterial {
  const m = new CustomMaterial(name, scene) as ToonMaterial
  m.dye = dye.clone()
  m.specularColor = Color3.Black()
  m.backFaceCulling = true // two-sided under the loader's mirror shades in a staircase; the body under a garment fills its gaps
  m.AddUniform('dye', 'vec3', null)
  m.AddUniform('zoneDye1', 'vec3', null)
  m.AddUniform('zoneDye2', 'vec3', null)
  m.AddUniform('zoneDye3', 'vec3', null)
  m.AddUniform('zoneOn', 'vec3', null)
  // 'zone' (0..3 per vertex, see figure.ts paintZones): painted sleeves, tunic, stockings, collar, belt
  if (withZones) {
    m.AddAttribute('zone')
    m.Vertex_Definitions('attribute float zone;\nvarying float vZone;')
    m.Vertex_MainEnd('vZone = zone;')
  } else {
    m.Vertex_Definitions('varying float vZone;')
    m.Vertex_MainEnd('vZone = 0.0;')
  }
  m.Fragment_Definitions('varying float vZone;')
  m.AddUniform('shadeTint', 'vec3', null)
  m.AddUniform('toLight', 'vec3', null)
  m.AddUniform('celStep', 'float', null)
  m.AddUniform('celSoft', 'float', null)
  m.AddUniform('paperTone', 'vec3', null)
  m.AddUniform('paperLift', 'float', null)
  m.AddUniform('washAmount', 'float', null)
  m.AddUniform('washScale', 'float', null)
  m.AddUniform('inkColor', 'vec3', null)
  m.AddUniform('inkEdge', 'float', null)
  m.AddUniform('inkSoft', 'float', null)
  m.AddUniform('faceBox', 'mat4', null)
  m.AddUniform('faceFwd', 'vec3', null)
  m.AddUniform('faceTex', 'sampler2D', null)
  m.AddUniform('hasFace', 'float', null)
  m.Fragment_Before_FragColor(`
    #ifdef NORMAL
      vec3 n = normalize(vNormalW);
    #else
      vec3 n = normalize(cross(dFdx(vPositionW), dFdy(vPositionW))); // a part exported without normals
    #endif
    vec3 toEye = normalize(vEyePosition.xyz - vPositionW);
    float nv = abs(dot(n, toEye));
    float nl = dot(n, normalize(toLight));
    // a watercolour wash: screen-anchored blotches (the paper does not move) darken and thin the pigment and
    // wander the shade edge, so it reads as a brushed wash, not a printed cel step
    vec2 wq = gl_FragCoord.xy / washScale;
    vec2 wi = floor(wq), wf = fract(wq);
    wf = wf * wf * (3.0 - 2.0 * wf);
    float wn = mix(mix(fract(sin(dot(wi, vec2(12.9898, 78.233))) * 43758.5453), fract(sin(dot(wi + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453), wf.x),
                   mix(fract(sin(dot(wi + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453), fract(sin(dot(wi + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453), wf.x), wf.y) - 0.5;
    float lit = smoothstep(celStep - celSoft, celStep + celSoft, nl + wn * washAmount * 2.0);
    float inked = 1.0 - smoothstep(inkEdge - inkSoft, inkEdge, nv);
    float z = floor(vZone + 0.5);
    vec3 base = dye;
    if (z == 1.0 && zoneOn.x > 0.5) base = zoneDye1;
    if (z == 2.0 && zoneOn.y > 0.5) base = zoneDye2;
    if (z == 3.0 && zoneOn.z > 0.5) base = zoneDye3;
    float faceInk = 0.0;
    if (hasFace > 0.5) {
      vec3 fp = (faceBox * vec4(vPositionW, 1.0)).xyz;
      if (abs(fp.x) < 0.5 && abs(fp.y) < 0.5 && abs(fp.z) < 0.5) {
        float facing = smoothstep(0.15, 0.4, abs(dot(n, normalize(faceFwd)))); // abs: the loader's mirror can flip vNormalW
        faceInk = smoothstep(0.05, 0.45, texture2D(faceTex, fp.xy + 0.5).a) * facing; // the art is pure ink: its alpha
        // the face's middle is lit flat with no contour ink: the modelled sockets, nostrils and parted lips would
        // otherwise shade and line as boxes; the painted face draws what a face needs
        float middle = 1.0 - smoothstep(0.36, 0.46, length(fp.xy));
        lit = mix(lit, 1.0, middle);
        inked *= 1.0 - middle;
      }
    }
    vec3 paint = mix(base * shadeTint, mix(base, paperTone, paperLift), lit); // lights go pale, as a wash does
    paint = mix(paint, inkColor, faceInk);
    paint *= 1.0 + wn * washAmount;
    color = vec4(mix(paint, inkColor, inked), 1.0);
  `)
  m.onBindObservable.add(() => {
    const e = m.getEffect()
    if (!e) return
    e.setColor3('dye', m.dye)
    const zs = m.zones ?? []
    e.setVector3('zoneOn', new Vector3(zs[0] ? 1 : 0, zs[1] ? 1 : 0, zs[2] ? 1 : 0))
    e.setColor3('zoneDye1', zs[0] ?? m.dye)
    e.setColor3('zoneDye2', zs[1] ?? m.dye)
    e.setColor3('zoneDye3', zs[2] ?? m.dye)
    e.setColor3('shadeTint', TOON.shade)
    e.setVector3('toLight', TOON.light)
    e.setFloat('celStep', m.step ?? TOON.step)
    e.setFloat('celSoft', TOON.soft)
    e.setColor3('paperTone', TOON.paper)
    e.setFloat('paperLift', TOON.paperLift)
    e.setFloat('washAmount', TOON.wash)
    e.setFloat('washScale', TOON.washScale * (scene.getEngine().getRenderHeight() / 1080))
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

/** the anime mask's blue for the face's middle only: the look chain's post ink skips those pixels (the modelled
 *  lips and sockets would get pencil lines that read as stubble), the silhouette keeps its ink */
export function faceMaskMaterial(name: string, face: FaceProjector, scene: Scene): CustomMaterial {
  const m = new CustomMaterial(name, scene)
  m.specularColor = Color3.Black()
  m.AddUniform('faceBox', 'mat4', null)
  m.Fragment_Before_FragColor(`
    vec3 fp = (faceBox * vec4(vPositionW, 1.0)).xyz;
    float inFace = step(length(fp.xy), 0.46) * step(abs(fp.z), 0.5);
    color = vec4(0.0, 0.0, inFace, 1.0);
  `)
  m.onBindObservable.add(() => m.getEffect()?.setMatrix('faceBox', face.toBox))
  return m
}
