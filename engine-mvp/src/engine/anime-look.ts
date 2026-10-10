// Anime look for 3D actors: what real-time anime games do, not a post effect.
//   1 cel shade   one hard lit/shade step (MToon's shade colour, toony, shift), no PBR
//   2 ink hull    an inverted hull: the mesh drawn again, front faces culled, pushed out along a
//                 SMOOTHED normal by a constant number of PIXELS (not metres), tinted ink;
//                 a width mask texture thins it where the face needs no line
//   3 face lines  eyes, lashes, brows, mouth are PAINTED parts of the model (VRoid/MToon faces);
//                 geometry and post edges cannot find a line on a smooth cheek
// Settings come from the model's own VRMC_materials_mtoon block when it is a VRM, else defaults.
import {
  Color3, Mesh, PBRMaterial, RawTexture, ShadowGenerator, StandardMaterial, Texture, Vector2, Vector3, VertexBuffer, VertexData,
  type DirectionalLight,
  type AbstractMesh, type BaseTexture, type Scene,
} from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials'

export type ToonParams = {
  shadeColor: Color3        // gamma space
  toony: number             // 0 soft .. 1 razor step
  shift: number             // moves the terminator: <0 more lit
  outline: boolean
  outlineColor: Color3
  widthTex: BaseTexture | null
}

export type AnimeSettings = {
  outlinePx: number         // ink width at the actor's scale, in pixels
  outlineColor: Color3 | null // null = each material's own
  toonyBoost: number        // added to every material's toony
  shiftBoost: number
  shadeMix: number          // 0 shade = lit colour .. 1 the model's shade colour
  rim: number               // thin light rim on the shadow side
  castPx: number            // screen-space hair / chin shadow: how far it falls, in pixels at 1 m
  castStrength: number      // 0 off .. 1 full shade
  faceSphere: number        // 0 the model's face normals .. 1 an ellipsoid's (one clean shadow curve)
}

// Who receives the screen-space cast shadow: the face gets the fringe's, the body skin the chin's.
export type CastRole = 'none' | 'face' | 'skin'
export type CastShared = { tex: BaseTexture | null; offset: Vector2; res: Vector2 }

export const DEFAULTS: AnimeSettings = {
  outlinePx: 2,
  outlineColor: null,
  toonyBoost: 0,
  shiftBoost: 0,
  shadeMix: 1,
  rim: 0.15,
  castPx: 14,
  castStrength: 1,
  faceSphere: 0.8,
}

const toGamma = (c: number[]) => new Color3(c[0] ** (1 / 2.2), c[1] ** (1 / 2.2), c[2] ** (1 / 2.2))

// ---------- reading MToon settings straight from the .vrm (a glb) ----------
type MToonJson = Record<string, any>
export async function readMToon(url: string): Promise<Map<string, MToonJson>> {
  const buf = await (await fetch(url)).arrayBuffer()
  const dv = new DataView(buf)
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb/vrm file: ' + url)
  const len = dv.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, len)))
  const binStart = 20 + len + 8
  // texture index -> a blob URL of its image, so masks the loader ignores (outline width) can be read
  const imageUrl = (texIndex: number): string | null => {
    const img = json.images?.[json.textures?.[texIndex]?.source]
    const view = img && json.bufferViews[img.bufferView]
    if (!view) return null
    const bytes = new Uint8Array(buf, binStart + (view.byteOffset ?? 0), view.byteLength)
    return URL.createObjectURL(new Blob([bytes], { type: img.mimeType }))
  }
  const out = new Map<string, MToonJson>()
  ;(json.materials || []).forEach((m: any) => {
    const ext = m.extensions?.VRMC_materials_mtoon
    if (!ext) return
    const w = ext.outlineWidthMultiplyTexture
    out.set(m.name, { ...ext, widthUrl: w ? imageUrl(w.index) : null })
  })
  return out
}

function paramsFor(mtoon: MToonJson | undefined, scene: Scene): ToonParams {
  if (!mtoon) return { shadeColor: new Color3(0.75, 0.62, 0.68), toony: 0.9, shift: -0.05, outline: true, outlineColor: new Color3(0.12, 0.08, 0.1), widthTex: null }
  return {
    shadeColor: toGamma(mtoon.shadeColorFactor ?? [0.8, 0.7, 0.75]),
    toony: mtoon.shadingToonyFactor ?? 0.9,
    shift: mtoon.shadingShiftFactor ?? 0,
    outline: (mtoon.outlineWidthMode ?? 'none') !== 'none' && (mtoon.outlineWidthFactor ?? 0) > 0,
    outlineColor: toGamma(mtoon.outlineColorFactor ?? [0, 0, 0]),
    widthTex: mtoon.widthUrl ? new Texture(mtoon.widthUrl, scene, true, false) : null, // glTF UVs: no flip
  }
}

let blankTex: RawTexture | null = null
const blank = (scene: Scene) => (blankTex ??= new RawTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, 5, scene))

// ---------- 1 cel shade ----------
function celMaterial(name: string, base: BaseTexture | null, alphaCut: boolean, p: ToonParams, s: () => AnimeSettings, role: CastRole, cast: CastShared, scene: Scene) {
  const m = new CustomMaterial(name + '_anime', scene)
  m.diffuseTexture = base as Texture | null
  if (base && alphaCut) { m.diffuseTexture!.hasAlpha = true; m.useAlphaFromDiffuseTexture = false }
  m.specularColor = Color3.Black()
  m.backFaceCulling = false // VRoid hair and clothes are single sheets
  m.AddUniform('shadeTint', 'vec3', null)
  m.AddUniform('toony', 'float', null)
  m.AddUniform('toonShift', 'float', null)
  m.AddUniform('shadeMix', 'float', null)
  m.AddUniform('rimAmount', 'float', null)
  m.AddUniform('castMask', 'sampler2D', null)
  m.AddUniform('castOffset', 'vec2', null)
  m.AddUniform('castRes', 'vec2', null)
  m.AddUniform('castRole', 'float', null)
  m.AddUniform('castStrength', 'float', null)
  m.Fragment_Before_FragColor(`
    vec3 n = normalize(vNormalW);
    #ifdef DIFFUSE
      vec4 tex = texture2D(diffuseSampler, vDiffuseUV);
    #else
      vec4 tex = vec4(1.0);
    #endif
    // the scene's own lights did the work: diffuseBase = N·L x shadow x light colour, summed.
    // One hard step turns it into lit / shade, so cast shadows (hair on the forehead) step too.
    float light = dot(diffuseBase, vec3(0.299, 0.587, 0.114));
    float thr = clamp(0.12 - toonShift, 0.01, 0.99);
    float soft = (1.0 - clamp(toony, 0.0, 0.999)) * 0.5;
    float lit = smoothstep(thr - soft, thr + soft, light);
    // anime cast shadow: the hair (and for the neck, the head) mask, shifted along the light on screen
    if (castRole > 0.5) {
      vec4 mk = texture2D(castMask, gl_FragCoord.xy / castRes - castOffset);
      float castHit = castRole > 1.5 ? max(mk.r, mk.g) : mk.r;
      lit = min(lit, 1.0 - step(0.5, castHit) * castStrength);
    }
    vec3 shade = mix(tex.rgb, tex.rgb * shadeTint, shadeMix);
    vec3 c = mix(shade, tex.rgb, lit);
    vec3 v = normalize(vEyePosition.xyz - vPositionW);
    float rim = smoothstep(0.72, 0.78, 1.0 - max(dot(n, v), 0.0)) * (1.0 - lit) * rimAmount;
    color.rgb = c + rim;
  `)
  m.onBindObservable.add(() => {
    const e = m.getEffect()
    if (!e) return
    const cur = s()
    e.setColor3('shadeTint', p.shadeColor)
    e.setFloat('toony', p.toony + cur.toonyBoost)
    e.setFloat('toonShift', p.shift + cur.shiftBoost)
    e.setFloat('shadeMix', cur.shadeMix)
    e.setFloat('rimAmount', cur.rim)
    e.setTexture('castMask', cast.tex ?? blank(scene))
    e.setVector2('castOffset', cast.offset)
    e.setVector2('castRes', cast.res)
    e.setFloat('castRole', !cast.tex || role === 'none' ? 0 : role === 'face' ? 1 : 2)
    e.setFloat('castStrength', cur.castStrength)
  })
  if (alphaCut) { m.alphaCutOff = 0.5; m.transparencyMode = 1 } // ALPHATEST: painted lines keep a hard edge
  return m
}

// ---------- 2 ink hull ----------
// Smoothed normals: vertices split at UV seams / hard edges would tear the hull apart; average the
// normals of every vertex sharing a position and push along that instead.
function smoothNormals(mesh: Mesh): Float32Array {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind)!
  let nor = mesh.getVerticesData(VertexBuffer.NormalKind)
  if (!nor) { nor = new Float32Array(pos.length); VertexData.ComputeNormals(pos, mesh.getIndices()!, nor) }
  const key = (i: number) => `${Math.round(pos[i] * 1e4)},${Math.round(pos[i + 1] * 1e4)},${Math.round(pos[i + 2] * 1e4)}`
  const sum = new Map<string, [number, number, number]>()
  for (let i = 0; i < pos.length; i += 3) {
    const k = key(i)
    const a = sum.get(k) ?? [0, 0, 0]
    sum.set(k, [a[0] + nor[i], a[1] + nor[i + 1], a[2] + nor[i + 2]])
  }
  const out = new Float32Array(pos.length)
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = sum.get(key(i))!
    const l = Math.hypot(x, y, z) || 1
    out[i] = x / l; out[i + 1] = y / l; out[i + 2] = z / l
  }
  return out
}

function hullMaterial(name: string, p: ToonParams, s: () => AnimeSettings, scene: Scene) {
  const m = new CustomMaterial(name + '_ink', scene)
  m.disableLighting = true
  m.specularColor = Color3.Black()
  m.backFaceCulling = true
  m.cullBackFaces = false // cull FRONT faces: only the shell behind the body shows, as a rim of ink
  m.AddAttribute('smoothNormal')
  m.AddUniform('inkPx', 'float', null)          // world metres per pixel at depth 1 * width in px
  m.AddUniform('inkColor', 'vec3', null)
  m.AddUniform('useWidthTex', 'float', null)
  m.AddUniform('widthTex', 'sampler2D', null)
  m.Vertex_Definitions('attribute vec3 smoothNormal;')
  // after skinning + morphs: push the world position out by N px at this vertex's own depth
  m.Vertex_After_WorldPosComputed(`
    float inkDepth = (viewProjection * worldPos).w;
    float inkMask = 1.0;
    #ifdef UV1
      if (useWidthTex > 0.5) inkMask = texture2D(widthTex, uvUpdated).r;
    #endif
    vec3 sn = normalize(mat3(finalWorld) * smoothNormal);
    worldPos.xyz += sn * inkPx * inkDepth * inkMask;
  `)
  m.Fragment_Before_FragColor('color = vec4(inkColor, 1.0);')
  m.onBindObservable.add(() => {
    const e = m.getEffect()
    if (!e) return
    const cur = s()
    const cam = scene.activeCamera!
    const h = scene.getEngine().getRenderHeight()
    e.setFloat('inkPx', cur.outlinePx * 2 * Math.tan(cam.fov / 2) / h)
    e.setColor3('inkColor', cur.outlineColor ?? p.outlineColor)
    e.setFloat('useWidthTex', p.widthTex ? 1 : 0)
    e.setTexture('widthTex', p.widthTex)
  })
  return m
}

function addHull(mesh: Mesh, p: ToonParams, s: () => AnimeSettings, scene: Scene) {
  mesh.setVerticesData('smoothNormal', smoothNormals(mesh), false, 3)
  const hull = mesh.clone(mesh.name + '_hull', mesh.parent, true) as Mesh
  hull.skeleton = mesh.skeleton
  hull.morphTargetManager = mesh.morphTargetManager // blinks and mouths move the ink too
  hull.material = hullMaterial(mesh.name, p, s, scene)
  hull.isPickable = false
  hull.metadata = { ...(hull.metadata || {}), inkHull: true }
  return hull
}

// ---------- apply to a loaded model ----------
// ---------- face normals: one clean shadow curve ----------
// A modelled face has dents round the eyes, nose and mouth; lit by its own normals the shade breaks
// into blotches. Anime faces shade like a simple egg, so the normals are bent toward an ellipsoid's.
export function sphereFaceNormals(mesh: Mesh, amount: number) {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind)
  if (!pos) return
  const md = (mesh.metadata ??= {})
  const orig: Float32Array = md.faceNormals ??= Float32Array.from(mesh.getVerticesData(VertexBuffer.NormalKind) ?? [])
  if (orig.length !== pos.length) return
  const { minimum: lo, maximum: hi } = mesh.getBoundingInfo().boundingBox
  let nz = 0
  for (let i = 2; i < orig.length; i += 3) nz += orig[i]
  const depth = hi.z - lo.z
  const c = new Vector3((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, nz > 0 ? hi.z - 0.7 * depth : lo.z + 0.7 * depth)
  const r = new Vector3((hi.x - lo.x) / 2, (hi.y - lo.y) / 2, 0.7 * depth)
  const out = new Float32Array(orig.length)
  for (let i = 0; i < pos.length; i += 3) {
    let ex = (pos[i] - c.x) / (r.x * r.x), ey = (pos[i + 1] - c.y) / (r.y * r.y), ez = (pos[i + 2] - c.z) / (r.z * r.z)
    const el = Math.hypot(ex, ey, ez) || 1
    ex /= el; ey /= el; ez /= el
    const x = orig[i] + (ex - orig[i]) * amount, y = orig[i + 1] + (ey - orig[i + 1]) * amount, z = orig[i + 2] + (ez - orig[i + 2]) * amount
    const l = Math.hypot(x, y, z) || 1
    out[i] = x / l; out[i + 1] = y / l; out[i + 2] = z / l
  }
  mesh.updateVerticesData(VertexBuffer.NormalKind, out)
}

// ---------- apply to a loaded model ----------
export type AnimeHandle = {
  settings: AnimeSettings
  hulls: Mesh[]
  faces: Mesh[]
  cast: CastShared
  roles: Map<AbstractMesh, CastRole>
  setOutline(on: boolean): void
  setFaceSphere(amount: number): void
}

// VRoid material names say what a part is; other models can pass their own rule
export const vroidRole = (material: string): CastRole => (/^Face_00_SKIN/.test(material) ? 'face' : /^Body_00_SKIN/.test(material) ? 'skin' : 'none')

export function applyAnimeLook(meshes: AbstractMesh[], scene: Scene, mtoon = new Map<string, MToonJson>(), settings: AnimeSettings = { ...DEFAULTS }, roleOf = vroidRole): AnimeHandle {
  const s = () => settings
  const hulls: Mesh[] = []
  const faces: Mesh[] = []
  const roles = new Map<AbstractMesh, CastRole>()
  const cast: CastShared = { tex: null, offset: new Vector2(0, 0), res: new Vector2(1, 1) }
  meshes.forEach((am) => {
    const mesh = am as Mesh
    if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0 || !mesh.material) return
    const old = mesh.material as PBRMaterial | StandardMaterial
    const base = (old as PBRMaterial).albedoTexture ?? (old as StandardMaterial).diffuseTexture ?? null
    const p = paramsFor(mtoon.get(old.name), scene)
    const cut = old.needAlphaTesting() || old.needAlphaBlending() || /FACE|EYE/i.test(old.name)
    const role = roleOf(old.name)
    roles.set(mesh, role)
    mesh.material = celMaterial(old.name, base, cut, p, s, role, cast, scene)
    if (role === 'face') { faces.push(mesh); sphereFaceNormals(mesh, settings.faceSphere) }
    if (p.outline) hulls.push(addHull(mesh, p, s, scene))
  })
  return {
    settings, hulls, faces, cast, roles,
    setOutline(on) { hulls.forEach((h) => h.setEnabled(on)) },
    setFaceSphere(amount) { settings.faceSphere = amount; faces.forEach((f) => sphereFaceNormals(f, amount)) },
  }
}

// ---------- cast shadows the anime way ----------
// Hair and clothes cast; everything receives. The face itself never casts, so the nose throws no
// shadow across the cheek (anime faces stay clean; only the fringe shades the forehead).
export function animeShadows(light: DirectionalLight, meshes: AbstractMesh[], mapSize = 2048): ShadowGenerator {
  const gen = new ShadowGenerator(mapSize, light)
  gen.usePercentageCloserFiltering = true
  gen.filteringQuality = ShadowGenerator.QUALITY_HIGH
  // a head is 20 cm: biases in millimetres, or the fringe's contact shadow on the forehead vanishes
  gen.bias = 0.0004
  gen.normalBias = 0.002
  meshes.forEach((m) => {
    if (m.metadata?.inkHull || m.getTotalVertices() === 0) return
    m.receiveShadows = true
    const mat = m.material?.name ?? ''
    if (!/FACE|EYE|Face_00_SKIN/i.test(mat)) gen.addShadowCaster(m, false)
  })
  return gen
}
