// The figure's paint: one flat dye, one hard cel step, lit by the figure's OWN light direction (not the
// scene's lights), so a figure reads the same on every painted set.
// Ink, two kinds: (1) the contour = an inverted hull, a copy of each part pushed out by a SCREEN-pixel width
// (inkPxMin..inkPxMax at 1080p, wider near) and nudged away from the camera so it only shows past the silhouette
// (the first hulls drew over the cloth because the vendor meshes carry vertex alpha, which made them transparent:
// figure.ts clears hasVertexAlpha; the nudge keeps a hull behind its own part whatever the winding);
// (2) fold lines inside = where the surface turns from the eye (N.V small): sleeve, collar, knee.
import { Color3, Matrix, Vector3, type BaseTexture, type Mesh, type Scene } from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials'
import { smoothNormals } from '../engine/anime-look'

// the face's middle as an oval stretched down past the mouth to the chin: the parted lips' plug edges lie there
// and must get neither contour ink nor the stage pencil (check F5a)
const FACE_OVAL = 'float faceOval(vec2 p) { return length(vec2(p.x, p.y < 0.0 ? p.y * 0.72 : p.y)); }'

// every number is a knob: the figure lab (figure-lab.ts) puts each on a slider
export const TOON = {
  light: new Vector3(0.55, 0.55, -0.62).normalize(), // toward the light: upper left, in front of the figure
  step: 0.18,                                         // N.L below this = shade: a HARD two-step, no gradient
  shadeMul: 0.72,                                     // the shade colour of a dye: darker...
  shadeCool: new Color3(-0.02, 0.0, 0.035),           // ...and a touch cooler, never mixed with black
  ink: Color3.FromHexString('#241912'),               // History Lines ink: near-black warm brown, never #000
  inkPxMin: 1.6,                                      // contour width in px at 1080p: far figures (the floor)...
  inkPxMax: 3.0,                                      // ...near figures (the ceiling)
  inkPxAt: 18,                                        // px = inkPxAt / distance (m), clamped to min..max
  inkPush: 0.02,                                      // m the hull steps back from the camera: never over the cloth
  inkEdge: 0.2,                                       // fold lines: N.V below this = ink
  inkSoft: 0.06,
  paper: new Color3(0.94, 0.91, 0.84),                // the lit side lets this much paper through (paperLift)
  paperLift: 0.12,
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
  m.Fragment_Definitions('varying float vZone;\n' + FACE_OVAL)
  m.AddUniform('shadeMul', 'float', null)
  m.AddUniform('shadeCool', 'vec3', null)
  m.AddUniform('toLight', 'vec3', null)
  m.AddUniform('celStep', 'float', null)
  m.AddUniform('paperTone', 'vec3', null)
  m.AddUniform('paperLift', 'float', null)
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
    // faces are lit by the light's horizontal angle only (anime/comic rule: no shadow climbing up from the chin)
    if (hasFace > 0.5) {
      vec2 lh = normalize(toLight.xz + vec2(1e-4)), nh = n.xz;
      nl = length(nh) < 1e-3 ? 1.0 : dot(normalize(nh), lh);
    }
    float lit = step(celStep, nl); // a hard two-step: lit or shade, nothing between
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
        float middle = 1.0 - smoothstep(0.36, 0.46, faceOval(fp.xy));
        lit = mix(lit, 1.0, middle);
        inked *= 1.0 - middle;
      }
    }
    vec3 shadeCol = clamp(base * shadeMul + shadeCool, 0.0, 1.0);
    vec3 paint = mix(shadeCol, mix(base, paperTone, paperLift), lit); // lights go a little pale, as a wash does
    paint = mix(paint, inkColor, faceInk);
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
    e.setFloat('shadeMul', TOON.shadeMul)
    e.setColor3('shadeCool', TOON.shadeCool)
    e.setVector3('toLight', TOON.light)
    e.setFloat('celStep', m.step ?? TOON.step)
    e.setColor3('paperTone', TOON.paper)
    e.setFloat('paperLift', TOON.paperLift)
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
  m.Fragment_Definitions(FACE_OVAL)
  m.Fragment_Before_FragColor(`
    vec3 fp = (faceBox * vec4(vPositionW, 1.0)).xyz;
    float inFace = step(faceOval(fp.xy), 0.46) * step(abs(fp.z), 0.5);
    color = vec4(0.0, 0.0, inFace, 1.0);
  `)
  m.onBindObservable.add(() => m.getEffect()?.setMatrix('faceBox', face.toBox))
  return m
}

/** the contour: an inverted hull of `mesh`, its width in screen pixels (see TOON.inkPx*); shares the skeleton */
export function addInkHull(mesh: Mesh, scene: Scene): Mesh {
  if (!mesh.getVerticesData('smoothNormal')) mesh.setVerticesData('smoothNormal', smoothNormals(mesh), false, 3)
  const hull = mesh.clone(`${mesh.name}_ink`, mesh.parent, true) as Mesh
  hull.skeleton = mesh.skeleton
  hull.isPickable = false
  hull.metadata = { ...(hull.metadata ?? {}), noGBuffer: true, inkHull: true } // the stage post inks the real body
  const m = new CustomMaterial(`${mesh.name}_ink`, scene)
  m.disableLighting = true
  m.specularColor = Color3.Black()
  m.backFaceCulling = false // the step back from the camera hides it inside the silhouette, whatever the winding
  m.AddAttribute('smoothNormal')
  m.AddUniform('camPos', 'vec3', null)
  m.AddUniform('inkPxSize', 'float', null)
  m.AddUniform('inkPx', 'vec3', null) // min, max, at
  m.AddUniform('inkPush', 'float', null)
  m.AddUniform('inkColor', 'vec3', null)
  m.Vertex_Definitions('attribute vec3 smoothNormal;')
  m.Vertex_After_WorldPosComputed(`
    vec3 toCam = camPos - worldPos.xyz;
    float dist = max(length(toCam), 0.05);
    float px = clamp(inkPx.z / dist, inkPx.x, inkPx.y);
    vec3 sn = normalize(mat3(finalWorld) * smoothNormal);
    worldPos.xyz += sn * px * inkPxSize * dist - toCam / dist * inkPush;
  `)
  m.Fragment_Before_FragColor('color = vec4(inkColor, 1.0);')
  m.onBindObservable.add(() => {
    const e = m.getEffect(), cam = scene.activeCamera
    if (!e || !cam) return
    e.setVector3('camPos', cam.globalPosition)
    e.setFloat('inkPxSize', (2 * Math.tan(cam.fov / 2)) / 1080) // metres per 1080p pixel at 1 m
    e.setVector3('inkPx', new Vector3(TOON.inkPxMin, TOON.inkPxMax, TOON.inkPxAt))
    e.setFloat('inkPush', TOON.inkPush)
    e.setColor3('inkColor', TOON.ink)
  })
  hull.material = m
  return hull
}
