// A History Lines comic figure: the standard body, dyed flat, inked with a pixel-width hull, a two-step cel
// shade, a painted face (an expression image projected from the head bone) and a pose. Lessons ask for one by recipe.
//
//   const fig = await createFigure(scene, recipeFor('boer-vrouw'))
//   fig.setPose('carry'); fig.setExpression('worried')
//   placeFigure(scene, fig, { x: 0.4, depth: 'mid', facing: 'left' }, stage)   // stage = S1's Stage25D
import {
  Color3, LoadAssetContainerAsync, Matrix, Texture, TransformNode, Vector3, VertexBuffer,
  type AbstractMesh, type AnimationGroup, type AssetContainer, type Mesh, type Scene,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { retarget, type ClipName } from './clips'
import { faceMaskMaterial, toonMaterial, type FaceProjector, type ToonMaterial } from './toon'
import { addMaskMesh } from '../engine/anime-cast'
import { applyPose, captureRest, frameOf, pos, POSES, resetToRest, rigOf, type Rig, type Violation } from './pose'
import { BEARDS, DEFAULT_DYES, EXPRESSIONS, HAIRS, HATS, type DyeRole, type Expression, type FigureRecipe, type Hex, type Pose } from './recipes'

export const BODY_URL = 'assets/models/customizable-man/man-wardrobe.glb'
export const FACE_URL = (e: Expression) => `figures/faces/${e}.png`

// face decal placement, in eye-distances (eyes sit at 30/70 % across and 38 % down the decal art)
export const FACE = { scale: 2.5, down: 0.12, depth: 0.22 } // depth: nose tip to cheeks, never the back of the head
// facing: 'left'/'right' turn this far from the camera toward that side (90 = pure profile; 3/4 reads best)
export const FACING_TURN_DEG = 62
// skin shades only where it turns fully away: a comic face is lit flat (the modelled lips and sockets would shade as boxes)
export const SKIN_STEP = -0.3
export const SKIN_INK = 0.14

export type Facing = 'left' | 'right' | 'front' | 'back'
export type Placement = { x: number; depth: 'bg' | 'mid' | 'fg'; facing: Facing }
export type StageLike = { groundPoint(x: number, depth: 'bg' | 'mid' | 'fg'): Vector3 }

export type Figure = {
  root: TransformNode        // move/rotate THIS; the model hangs under it
  recipe: FigureRecipe
  rig: Rig
  pose: Pose
  clip: AnimationGroup | null // the playing clip (walk), for audits and the timeline
  nativeHeading: number       // the body's own facing at rest (radians about +y), so facing never depends on the pose
  setPose(p: Pose): Violation[]
  setExpression(e: Expression): void
  setDye(role: DyeRole, hex: Hex): void
  dispose(): void
}

// ---------- shared loads ----------
const bodies = new Map<string, Promise<AssetContainer>>() // per scene: a container belongs to the scene it loaded into
function loadBody(scene: Scene) {
  if (!bodies.has(scene.uid)) {
    const p = LoadAssetContainerAsync(BODY_URL, scene, { pluginExtension: '.glb' })
    p.catch(() => bodies.delete(scene.uid)) // a failed load is retried next time, not cached
    bodies.set(scene.uid, p)
  }
  return bodies.get(scene.uid)!
}
const faceTex = new Map<string, Texture>()
function face(e: Expression, scene: Scene) {
  const key = `${scene.uid}:${e}`
  if (!faceTex.has(key)) {
    const t = new Texture(FACE_URL(e), scene, true, true) // no mipmaps: thin ink lines would average away
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
  if (node === 'Geo_Body') {
    if (mat.startsWith('Skin')) return { role: 'skin', show: () => true }
    // the lips are modelled parted: teeth and gum, dyed skin and unlined like the eyeballs, plug the mouth shut
    if (mat === 'teeth' || mat === 'gum') return { role: 'eye', show: () => true }
    return null // 3D brows and lashes: painted instead
  }
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
const COVERED = /^(root\.x|spine_|shoulder\.|thigh_|leg_|foot\.|toes_)/ // arms stay: short sleeves, an empty sleeve shows the paper through it
const SLEEVE = /^(arm_|c_arm_twist|forearm_)/
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
  // long sleeves are painted, not modelled: arm skin (upper arm + forearm, never the hand) takes the coat dye
  const sleeve = new Float32Array(mi.length / 4)
  for (let v = 0; v < sleeve.length; v++) {
    let best = 0
    for (let k = 1; k < 4; k++) if (mw[v * 4 + k] > mw[v * 4 + best]) best = k
    sleeve[v] = SLEEVE.test(bones[mi[v * 4 + best]]?.name ?? '') ? 1 : 0
  }
  mesh.setVerticesData('sleeve', sleeve, false, 1)
  trimmed.add(geo)
}

// ---------- create ----------
export async function createFigure(scene: Scene, recipe: FigureRecipe, name = 'figure'): Promise<Figure> {
  const container = await loadBody(scene)
  const inst = container.instantiateModelsToScene((n) => n, true, { doNotInstantiate: true })
  inst.animationGroups.forEach((g) => g.dispose())
  const root = new TransformNode(name, scene)
  inst.rootNodes.forEach((n) => (n.parent = root))
  root.scaling.setAll(recipe.scale ?? 1)
  const meshes = inst.rootNodes.flatMap((n) => n.getChildMeshes(false))
  const rigRoot = inst.rootNodes[0].getDescendants(false).find((n) => n.name === 'Man_Rig') as TransformNode
  if (!rigRoot) throw new Error('standard body has no Man_Rig node')
  const rig = rigOf(rigRoot)
  const rest = captureRest(rig)
  root.computeWorldMatrix(true)
  meshes.forEach((m) => m.computeWorldMatrix(true)) // the face box reads world bounds: scale is already applied

  // flat dye + cel + ink per part (src/figures/toon.ts); 3D brows, teeth, cornea stay hidden
  const restFwd = Vector3.TransformNormal(frameOf(rig).fwd, rigRoot.getWorldMatrix())
  const nativeHeading = Math.atan2(restFwd.x, restFwd.z) // facing is measured once, at rest: a kneel re-aims the feet

  const live: { mesh: AbstractMesh; part: Part }[] = []
  for (const m of meshes) {
    const part = partOf(m)
    if (!part || !part.show(recipe)) { m.setEnabled(false); continue }
    if (part.role === 'skin') trimCoveredSkin(m as Mesh)
    const mat = toonMaterial(`${name}_${part.role}_${live.length}`, hexRgb(colourOf(part, recipe)), scene, part.role === 'skin')
    if (part.role === 'skin' || part.role === 'eye') mat.step = SKIN_STEP
    if (part.role === 'skin') mat.inkEdge = SKIN_INK // thin fingers would fill with contour ink: a lighter line on skin
    if (part.role === 'skin' && recipe.sleeves !== false) mat.sleeve = hexRgb(recipe.dyes.coat ?? DEFAULT_DYES.coat)
    if (part.role === 'eye') {
      mat.inkEdge = 0 // the eyeballs carry the painted eyes, no contour of their own
      mat.backFaceCulling = false // one eyeball is exported mirrored (flipped winding): culled, the socket shows through
    }
    m.material = mat
    live.push({ mesh: m, part })
  }

  // painted face: one projector box riding the head bone, read by the skin and eyeball materials
  const faceMats = live.filter((l) => l.part.role === 'skin' || l.part.role === 'eye').map((l) => l.mesh.material as ToonMaterial)
  const projector = faceProjector(rig, live.filter((l) => l.mesh.name.startsWith('Geo_Eyes')).map((l) => l.mesh))
  faceMats.forEach((m) => (m.face = projector.face))
  const follow = scene.onBeforeRenderObservable.add(projector.update)
  const setExpression = (e: Expression) => { projector.face.tex = face(e, scene) }
  // the stage look's pencil pass leaves the painted face alone (needs a camera: the lab and the stage have one)
  const maskMat = faceMaskMaterial(`${name}_facemask`, projector.face, scene)
  const unmask = scene.activeCamera
    ? live.filter((l) => l.part.role === 'skin' || l.part.role === 'eye').map((l) => addMaskMesh(scene, scene.activeCamera!, l.mesh, maskMat))
    : []
  setExpression(recipe.expression)
  EXPRESSIONS.forEach((e) => face(e, scene)) // preload: a swap mid-scene never blinks

  let clip: AnimationGroup | null = null
  const clips = new Map<ClipName, Promise<AnimationGroup>>()
  const fig: Figure = {
    root, recipe, rig, pose: 'stand', clip: null, nativeHeading,
    setPose(p) {
      fig.pose = p
      clip?.stop()
      clip = fig.clip = null
      if (p === 'walk') {
        if (!clips.has('walk')) { resetToRest(rest); clips.set('walk', retarget('walk', rig, rest, scene)) } // retarget reads the rest pose
        void clips.get('walk')!.then((g) => {
          if (fig.pose === 'walk') { resetToRest(rest); clip = fig.clip = g; g.start(true) }
          else fig.setPose(fig.pose) // the load (and its guard bake) moved the bones meanwhile: pose again
        })
        return []
      }
      return applyPose(rig, rest, POSES[p])
    },
    setExpression,
    setDye(role, hex) {
      live.filter((l) => l.part.role === role).forEach((l) => (l.mesh.material as ToonMaterial).dye.copyFrom(hexRgb(hex)))
      if (role === 'coat') live.forEach((l) => (l.mesh.material as ToonMaterial).sleeve?.copyFrom(hexRgb(hex)))
    },
    dispose() {
      clips.forEach((p) => void p.then((g) => g.dispose()))
      scene.onBeforeRenderObservable.remove(follow)
      unmask.forEach((u) => u())
      maskMat.dispose()
      inst.skeletons.forEach((sk) => sk.dispose())
      root.dispose(false, true)
    },
  }
  fig.setPose('stand')
  return fig
}

function faceProjector(rig: Rig, eyes: AbstractMesh[]) {
  const f = frameOf(rig)
  const world = rig.root.getWorldMatrix()
  const N = (v: Vector3) => Vector3.TransformNormal(v, world).normalize()
  const side = N(f.left), up = N(f.up), fwd = N(f.fwd)
  // eyes: the eyeball pair's box gives the centre and, minus one eyeball, the centre-to-centre distance
  const lo = new Vector3(Infinity, Infinity, Infinity), hi = lo.negate()
  eyes.forEach((e) => { const b = e.getBoundingInfo().boundingBox; lo.minimizeInPlace(b.minimumWorld); hi.maximizeInPlace(b.maximumWorld) })
  const found = eyes.length > 0
  const centre = found ? lo.add(hi).scale(0.5) : Vector3.TransformCoordinates(pos(rig, 'head'), world)
  const span = found ? Math.abs(Vector3.Dot(hi.subtract(lo), side)) : 0.1
  const size = span * 0.7 * FACE.scale
  const at = centre.subtract(up.scale(size * FACE.down)).add(fwd.scale(0.03))
  const axes = Matrix.FromValues(
    side.x, side.y, side.z, 0,
    up.x, up.y, up.z, 0,
    fwd.x, fwd.y, fwd.z, 0,
    0, 0, 0, 1)
  const boxToWorld = Matrix.Scaling(size, size, FACE.depth).multiply(axes).multiply(Matrix.Translation(at.x, at.y, at.z))
  const head = rig.node('head')
  head.computeWorldMatrix(true)
  const boxInHead = boxToWorld.multiply(Matrix.Invert(head.getWorldMatrix())) // fixed: the face moves with the head
  const fwdInHead = Vector3.TransformNormal(fwd, Matrix.Invert(head.getWorldMatrix()))
  const headToBox = Matrix.Invert(boxInHead)
  const face: FaceProjector = { tex: null, toBox: Matrix.Identity(), fwd: fwd.clone() }
  const update = () => {
    const w = head.getWorldMatrix()
    Matrix.Invert(w).multiplyToRef(headToBox, face.toBox) // world -> head -> box
    Vector3.TransformNormalToRef(fwdInHead, w, face.fwd)
  }
  update()
  return { face, update }
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

/** turn the figure so its own forward (from the feet, at rest) points along the heading (radians about +y, 0 = +z) */
export function faceHeading(fig: Figure, heading: number) {
  fig.root.rotationQuaternion = null
  fig.root.rotation.y = heading - fig.nativeHeading
}

// S1's stage maths (src/stage25d/layout.ts), only for when no stage is passed (the figure lab)
const DEPTH_Z = { bg: 70, mid: 22, fg: 7 }
function fallbackGround(x: number, depth: 'bg' | 'mid' | 'fg') {
  const z = DEPTH_Z[depth]
  return new Vector3((x - 0.5) * 2 * z * Math.tan((50 * Math.PI) / 360) * (16 / 9), 0, z)
}
