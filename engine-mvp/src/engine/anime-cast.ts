// Screen-space cast shadows, the anime way. A fringe lies ON the forehead, so a real shadow map puts
// its shadow right under the strands, hidden by them; drawn anime has a clear band below the hair, and
// a hard shadow under the chin. So: draw a mask of the character (red = hair, green = head), shift it
// along the light as seen on screen, and let face and skin shade wherever the shifted mask lands.
import {
  Color3, RenderTargetTexture, Vector3,
  type AbstractMesh, type Camera, type DirectionalLight, type Mesh, type Scene,
} from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials'
import type { AnimeHandle } from './anime-look'

function flat(name: string, rgb: Color3, scene: Scene) {
  const m = new CustomMaterial(name, scene)
  m.disableLighting = true
  m.backFaceCulling = false
  m.AddUniform('maskColor', 'vec3', null)
  m.Fragment_Before_FragColor('color = vec4(maskColor, 1.0);')
  m.onBindObservable.add(() => m.getEffect()?.setColor3('maskColor', rgb))
  return m
}

const isHair = (m: AbstractMesh) => /HAIR/i.test(m.material?.name ?? '') && !/HairBack/i.test(m.material?.name ?? '')

export function animeCastShadows(look: AnimeHandle, meshes: AbstractMesh[], light: DirectionalLight, camera: Camera, scene: Scene) {
  const engine = scene.getEngine()
  const rtt = new RenderTargetTexture('anime-cast-mask', { ratio: 1 }, scene, false)
  rtt.clearColor = new Color3(0, 0, 0).toColor4(1)
  rtt.activeCamera = camera
  const hair = flat('mask-hair', new Color3(1, 0, 0), scene)
  const head = flat('mask-head', new Color3(0, 1, 0), scene)
  const other = flat('mask-other', new Color3(0, 0, 0), scene) // still drawn: it hides hair behind the body
  const list = meshes.filter((m) => m.getTotalVertices() > 0 && !m.metadata?.inkHull) as Mesh[]
  rtt.renderList = list
  list.forEach((m) => {
    const role = look.roles.get(m)
    const name = m.material?.name ?? ''
    rtt.setMaterialForRendering(m, isHair(m) ? hair : role === 'face' || /FACE|EYE/i.test(name) ? head : other)
  })
  scene.customRenderTargets.push(rtt)
  look.cast.tex = rtt

  // where the light goes, seen on screen: its view-space x/y (length = how sideways it is)
  const headCentre = () => {
    const f = look.faces[0]
    return f ? f.getBoundingInfo().boundingBox.centerWorld : Vector3.Zero()
  }
  scene.onBeforeRenderObservable.add(() => {
    const w = engine.getRenderWidth(), h = engine.getRenderHeight()
    const d = Vector3.TransformNormal(light.direction.normalize(), camera.getViewMatrix())
    const dist = Math.max(0.1, Vector3.Distance(camera.globalPosition, headCentre()))
    const px = look.settings.castPx / dist
    look.cast.res.set(w, h)
    look.cast.offset.set((d.x * px) / w, (d.y * px) / h)
  })
  return rtt
}
