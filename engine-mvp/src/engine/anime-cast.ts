// Screen-space cast shadows, the anime way. A fringe lies ON the forehead, so a real shadow map puts
// its shadow right under the strands, hidden by them; drawn anime has a clear band below the hair, and
// a hard shadow under the chin. So: draw a mask of every anime actor (red = hair, green = head,
// blue = any anime pixel), shift it along the light as seen on screen, and let face and skin shade
// wherever the shifted mask lands. Blue also tells the studio's post ink to leave anime faces alone:
// their lines are painted and hulled, a Sobel pass would only ring the eyes like glasses.
// ONE mask per scene, shared by all anime actors.
import {
  Color3, RenderTargetTexture, Vector3,
  type AbstractMesh, type Camera, type DirectionalLight, type Mesh, type Scene,
} from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials'
import { clampPitch, type AnimeHandle } from './anime-look'

function flat(name: string, rgb: Color3, scene: Scene) {
  const m = new CustomMaterial(name, scene)
  m.disableLighting = true
  m.backFaceCulling = false
  m.AddUniform('maskColor', 'vec3', null)
  m.Fragment_Before_FragColor('color = vec4(maskColor, 1.0);')
  m.onBindObservable.add(() => m.getEffect()?.setColor3('maskColor', rgb))
  return m
}

type Mask = { rtt: RenderTargetTexture; hair: CustomMaterial; head: CustomMaterial; other: CustomMaterial }
const masks = new WeakMap<Scene, Mask>()

export function animeMask(scene: Scene): RenderTargetTexture | null {
  return masks.get(scene)?.rtt ?? null
}

function maskFor(scene: Scene, camera: Camera): Mask {
  const found = masks.get(scene)
  if (found) return found
  const rtt = new RenderTargetTexture('anime-mask', { ratio: 1 }, scene, false)
  rtt.clearColor = new Color3(0, 0, 0).toColor4(1)
  rtt.activeCamera = camera
  rtt.samples = 4 // MSAA: an aliased mask gives the shadow a staircase edge
  rtt.renderList = []
  scene.customRenderTargets.push(rtt)
  const mask = {
    rtt,
    hair: flat('mask-hair', new Color3(1, 0, 1), scene),
    head: flat('mask-head', new Color3(0, 1, 1), scene),
    other: flat('mask-other', new Color3(0, 0, 1), scene), // still drawn: it hides hair behind the body
  }
  masks.set(scene, mask)
  return mask
}

const isHair = (m: AbstractMesh) => /HAIR/i.test(m.material?.name ?? '') && !/HairBack/i.test(m.material?.name ?? '')

// Adds one actor to the scene's mask; returns its undo (for when the actor is deleted).
export function animeCastShadows(look: AnimeHandle, meshes: AbstractMesh[], light: DirectionalLight, camera: Camera, scene: Scene): () => void {
  const engine = scene.getEngine()
  const mask = maskFor(scene, camera)
  const list = meshes.filter((m) => m.getTotalVertices() > 0 && !m.metadata?.inkHull) as Mesh[]
  list.forEach((m) => {
    const role = look.roles.get(m)
    const name = m.material?.name ?? ''
    mask.rtt.renderList!.push(m)
    mask.rtt.setMaterialForRendering(m, isHair(m) ? mask.hair : role === 'face' || /FACE|EYE/i.test(name) ? mask.head : mask.other)
  })
  look.cast.tex = mask.rtt

  // where the light goes, seen on screen: its view-space x/y (length = how sideways it is);
  // the shift is in pixels at 1 m on a 1080p frame, so a far actor gets a shorter band than a close-up
  const headCentre = () => look.faces[0]?.getBoundingInfo().boundingBox.centerWorld ?? Vector3.Zero()
  const tick = scene.onBeforeRenderObservable.add(() => {
    const w = engine.getRenderWidth(), h = engine.getRenderHeight()
    const key = clampPitch(light.direction, look.settings.facePitchMax)
    look.cast.faceLight.copyFrom(key)
    const d = Vector3.TransformNormal(key, camera.getViewMatrix())
    const dist = Math.max(0.1, Vector3.Distance(camera.globalPosition, headCentre()))
    const px = (look.settings.castPx * (h / 1080)) / dist
    look.cast.res.set(w, h)
    look.cast.offset.set((d.x * px) / w, (d.y * px) / h)
  })
  return () => {
    scene.onBeforeRenderObservable.remove(tick)
    mask.rtt.renderList = mask.rtt.renderList!.filter((m) => !list.includes(m as Mesh))
    look.cast.tex = null
  }
}
