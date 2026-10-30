// A catalog actor drawn as anime: the catalog entry's onCreate hook. Uses the studio's own sun and
// sun shadow map, so anime actors light and shade with the scene they stand in.
import { DirectionalLight, HemisphericLight, type ShadowGenerator, type TransformNode } from '@babylonjs/core'
import { addAnimeCasters, applyAnimeLook, readMToon, vroidArms } from './anime-look'
import { animeCastShadows } from './anime-cast'

const ARMS_DOWN_DEG = 70

export function animeActor(url: string) {
  return (root: TransformNode) => {
    const scene = root.getScene()
    const meshes = root.getChildMeshes(false)
    readMToon(url).then((mtoon) => {
      if (root.isDisposed()) return
      const look = applyAnimeLook(meshes, scene, mtoon)
      // the cel step reads the scene's direct light only: sky fill would lift every shadow to "lit"
      scene.lights.filter((l) => l instanceof HemisphericLight).forEach((l) => l.excludedMeshes.push(...meshes))
      const sun = scene.lights.find((l): l is DirectionalLight => l instanceof DirectionalLight)
      const gen = sun?.getShadowGenerator() as ShadowGenerator | null
      // ponytail: anime actors take no set shadows (a roof, a tree) yet; add a sharp actor-sized
      // map if scenes need a figure to stand in shade
      if (gen) addAnimeCasters(gen, meshes, false)
      if (sun && scene.activeCamera) {
        const undo = animeCastShadows(look, meshes, sun, scene.activeCamera, scene)
        root.onDisposeObservable.addOnce(undo)
      }
      vroidArms(root)(ARMS_DOWN_DEG)
      root.metadata = { ...(root.metadata || {}), anime: look }
    }).catch((err) => console.error('anime look failed for', url, err))
  }
}
