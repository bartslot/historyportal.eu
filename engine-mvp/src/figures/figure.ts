// A History Lines comic figure: the standard body, dyed flat, inked with a pixel-width hull, a two-step cel
// shade, a painted face (decals swapped per expression) and a pose. Lessons ask for one by recipe.
//
//   const fig = await createFigure(scene, recipeFor('boer-vrouw'))
//   fig.setPose('carry'); fig.setExpression('worried')
//   placeFigure(scene, fig, { x: 0.4, depth: 'mid', facing: 'left' }, stage)   // stage = S1's Stage25D
import {
  Color3, LoadAssetContainerAsync, MeshBuilder, StandardMaterial, Texture, TransformNode, Vector3, VertexBuffer,
  type AbstractMesh, type AnimationGroup, type AssetContainer, type Mesh, type Scene,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { retarget, type ClipName } from './clips'
import { toonMaterial } from './toon'
import { applyPose, captureRest, frameOf, pos, POSES, resetToRest, rigOf, type Rig, type Violation } from './pose'
import { BEARDS, DEFAULT_DYES, HAIRS, HATS, type DyeRole, type Expression, type FigureRecipe, type Hex, type Pose } from './recipes'

export const BODY_URL = 'assets/models/customizable-man/man-wardrobe.glb'
export const FACE_URL = (e: Expression) => `figures/faces/${e}.png`
const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'worried', 'surprised']

// face decal placement, in eye-distances (eyes sit at 30/70 % across and 38 % down the decal art)
export const FACE = { scale: 2.5, down: 0.3, depth: 0.09 }
// facing: 'left'/'right' turn this far from the camera toward that side (90 = pure profile; 3/4 reads best)
export const FACING_TURN_DEG = 62

export type Facing = 'left' | 'right' | 'front' | 'back'
export type Placement = { x: number; depth: 'bg' | 'mid' | 'fg'; facing: Facing }
export type StageLike = { groundPoint(x: number, depth: 'bg' | 'mid' | 'fg'): Vector3 }

export type Figure = {
  root: TransformNode        // move/rotate THIS; the model hangs under it
  recipe: FigureRecipe
  rig: Rig
  pose: Pose
  setPose(p: Pose): Violation[]
  setExpression(e: Expression): void
  setDye(role: DyeRole, hex: Hex): void
  dispose(): void
}

// ---------- shared loads ----------
let body: Promise<AssetContainer> | null = null
const loadBody = (scene: Scene) => (body ??= LoadAssetContainerAsync(BODY_URL, scene, { pluginExtension: '.glb' }))
const faceTex = new Map<string, Texture>()
function face(e: Expression, scene: Scene) {
  const key = `${scene.uid}:${e}`
  if (!faceTex.has(key)) {
    const t = new Texture(FACE_URL(e), scene, false, true)
    t.hasAlpha = true
    faceTex.set(key, t)
  }
  return faceTex.get(key)!
}

const hexRgb = (h: Hex) => Color3.FromHexString(h)

// ---------- which part is what ----------
type Part = { role: DyeRole | 'skin' | 'eye'; show: (r: FigureRecipe) => boolean }
function partOf(mesh: AbstractMesh): Part | null {
  const node = mesh.name.replace(/_primitive\d+$/, '')
  const mat = mesh.material?.name ?? ''
  if (node === 'Geo_Body') return mat.startsWith('Skin') ? { role: 'skin', show: () => true } : null // teeth, gum, 3D brows: painted instead
  if (node === 'Geo_Eyes') return mat === 'corneaMAT' ? null : { role: 'eye', show: () => true }  // eyeballs = skin; the eyes are painted on
  if (node === 'Geo_Shirt') return { role: 'coat', show: () => true }
  if (node === 'Geo_Pants') return { role: 'trousers', show: () => true }
  if (node === 'Geo_Shoes') return { role: 'shoes', show: () => true }
  if (node === 'Geo_Hair_Black_Base') return { role: 'hair', show: (r) => r.hair !== null }
  if ((HAIRS as readonly string[]).includes(node)) return { role: 'hair', show: (r) => r.hair === node && !(r.hat && r.hatKind === 'Bucket_Hat') }
  if ((BEARDS as readonly string[]).includes(node)) return { role: 'hair', show: (r) => r.beard === node }
  if ((HATS as readonly string[]).includes(node)) return { role: 'hat', show: (r) => r.hat && (r.hatKind ?? 'Cowboy_Hat') === node }
  return null
}

function colourOf(part: Part, r: FigureRecipe): Hex {
  if (part.role === 'skin' || part.role === 'eye') return r.skin
  return r.dyes[part.role] ?? DEFAULT_DYES[part.role]
}


// Skin under the clothes z-fights them and its ink hull covers them: keep only the skin no garment covers
// (head, neck, hands). A triangle goes when any corner's strongest bone is a covered one.
const COVERED = /^(root\.x|spine_|shoulder\.|arm_|c_arm_twist|thigh_|leg_|foot\.|toes_)/ // forearms stay: short sleeves
const trimmed = new WeakSet<object>()
function trimCoveredSkin(mesh: Mesh) {
  const geo = mesh.geometry
  if (!geo || trimmed.has(geo) || !mesh.skeleton) return
  const idx = mesh.getIndices()!, mi = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)!, mw = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind)!
  const bones = mesh.skeleton.bones
  const covered = (v: number) => {
    let best = 0
    for (let k = 1; k < 4; k++) if (mw[v * 4 + k] > mw[v * 4 + best]) best = k
    return COVERED.test(bones[mi[v * 4 + best]]?.name ?? '')
  }
  const keep: number[] = []
  for (let t = 0; t < idx.length; t += 3) {
    if (!covered(idx[t]) && !covered(idx[t + 1]) && !covered(idx[t + 2])) keep.push(idx[t], idx[t + 1], idx[t + 2])
  }
  mesh.setIndices(keep) // shared geometry: every figure gets the same trimmed body
  trimmed.add(geo)
}

// ---------- create ----------
export async function createFigure(scene: Scene, recipe: FigureRecipe, name = 'figure'): Promise<Figure> {
  const container = await loadBody(scene)
  const inst = container.instantiateModelsToScene((n) => n, true, { doNotInstantiate: true })
  inst.animationGroups.forEach((g) => g.dispose())
  const root = new TransformNode(name, scene)
  inst.rootNodes.forEach((n) => (n.parent = root))
  const meshes = inst.rootNodes.flatMap((n) => n.getChildMeshes(false))
  const rigRoot = inst.rootNodes[0].getDescendants(false).find((n) => n.name === 'Man_Rig') as TransformNode
  if (!rigRoot) throw new Error('standard body has no Man_Rig node')
  const rig = rigOf(rigRoot)
  const rest = captureRest(rig)

  // flat dye + cel + ink per part (src/figures/toon.ts); 3D brows, teeth, cornea stay hidden
  const live: { mesh: AbstractMesh; part: Part }[] = []
  for (const m of meshes) {
    const part = partOf(m)
    if (!part || !part.show(recipe)) { m.setEnabled(false); continue }
    if (part.role === 'skin') trimCoveredSkin(m as Mesh)
    const mat = toonMaterial(`${name}_${part.role}_${live.length}`, hexRgb(colourOf(part, recipe)), scene)
    if (part.role === 'eye') mat.inkEdge = 0 // the eyeballs carry the painted eyes, no contour of their own
    m.material = mat
    live.push({ mesh: m, part })
  }

  // painted face: one projector, decals on the skin and on the eyeballs so the eyes land in the sockets
  const decals = paintFace(scene, rig, live.filter((l) => l.part.role === 'skin' || l.part.role === 'eye').map((l) => l.mesh as Mesh), name)
  const setExpression = (e: Expression) => decals.forEach((d) => {
    const t = face(e, scene)
    const dm = d.material as StandardMaterial
    dm.emissiveTexture = t
    dm.opacityTexture = t
  })
  setExpression(recipe.expression)
  EXPRESSIONS.forEach((e) => face(e, scene)) // preload: a swap mid-scene never blinks

  let clip: AnimationGroup | null = null
  const clips = new Map<ClipName, Promise<AnimationGroup>>()
  const fig: Figure = {
    root, recipe, rig, pose: 'stand',
    setPose(p) {
      fig.pose = p
      clip?.stop()
      clip = null
      if (p === 'walk') {
        if (!clips.has('walk')) clips.set('walk', retarget('walk', rigRoot, scene))
        void clips.get('walk')!.then((g) => { if (fig.pose === 'walk') { resetToRest(rest); clip = g; g.start(true) } })
        return []
      }
      return applyPose(rig, rest, POSES[p])
    },
    setExpression,
    setDye(role, hex) {
      live.filter((l) => l.part.role === role).forEach((l) => (l.mesh.material as ReturnType<typeof toonMaterial>).dye.copyFrom(hexRgb(hex)))
    },
    dispose() {
      clips.forEach((p) => void p.then((g) => g.dispose()))
      decals.forEach((d) => d.dispose(false, true))
      root.dispose(false, true)
    },
  }
  fig.setPose('stand')
  return fig
}

function paintFace(scene: Scene, rig: Rig, targets: Mesh[], name: string): Mesh[] {
  const f = frameOf(rig)
  const world = rig.root.getWorldMatrix()
  const W = (v: Vector3) => Vector3.TransformCoordinates(v, world)
  const N = (v: Vector3) => Vector3.TransformNormal(v, world).normalize()
  const eyes = targets.find((t) => t.name.startsWith('Geo_Eyes'))
  // eye centre: the eyeball meshes' box centre; eye distance: their width across the face
  const box = eyes?.getBoundingInfo().boundingBox
  const centre = box ? box.centerWorld.clone() : W(pos(rig, 'head'))
  const side = N(f.left)
  const span = box ? Math.abs(Vector3.Dot(box.maximumWorld.subtract(box.minimumWorld), side)) : 0.1
  const eyeDist = span * 0.5 // two eyeballs: centre-to-centre is about half the pair's outer width
  const size = eyeDist * FACE.scale
  const up = N(f.up)
  const at = centre.subtract(up.scale(size * FACE.down))
  const normal = N(f.fwd)
  const mat = new StandardMaterial(`${name}_face`, scene)
  mat.disableLighting = true
  mat.diffuseColor = Color3.Black()
  mat.emissiveColor = Color3.Black()
  mat.zOffset = -2
  mat.backFaceCulling = true
  return targets.map((t) => {
    const d = MeshBuilder.CreateDecal(`${name}_decal_${t.name}`, t, { position: at.add(normal.scale(0.02)), normal, size: new Vector3(size, size, FACE.depth), angle: 0, cullBackFaces: true })
    d.material = mat
    d.isPickable = false
    d.metadata = { anime: true }
    return d
  })
}

// ---------- place ----------
/** stand a figure on the stage: x 0..1 across the house view at that depth, turned to face a side */
export function placeFigure(scene: Scene, fig: Figure, at: Placement, stage?: StageLike) {
  const p = stage ? stage.groundPoint(at.x, at.depth) : fallbackGround(at.x, at.depth)
  fig.root.position.copyFrom(p)
  // the camera looks down +z, so a figure facing the camera faces -z; left on screen = -x
  const turn = (FACING_TURN_DEG * Math.PI) / 180
  const heading = { front: Math.PI, back: 0, left: Math.PI + turn, right: Math.PI - turn }[at.facing]
  faceHeading(fig, heading)
  void scene
}

/** turn the figure so its own forward (from the feet) points along the heading (radians about +y, 0 = +z) */
export function faceHeading(fig: Figure, heading: number) {
  fig.root.rotationQuaternion = null
  fig.root.rotation.y = 0
  fig.root.computeWorldMatrix(true)
  const fwd = Vector3.TransformNormal(frameOf(fig.rig).fwd, fig.rig.root.getWorldMatrix())
  const native = Math.atan2(fwd.x, fwd.z)
  fig.root.rotation.y = heading - native
}

// S1's stage maths (src/stage25d/layout.ts), only for when no stage is passed (the figure lab)
const DEPTH_Z = { bg: 70, mid: 22, fg: 7 }
function fallbackGround(x: number, depth: 'bg' | 'mid' | 'fg') {
  const z = DEPTH_Z[depth]
  return new Vector3((x - 0.5) * 2 * z * Math.tan((50 * Math.PI) / 360) * (16 / 9), 0, z)
}
