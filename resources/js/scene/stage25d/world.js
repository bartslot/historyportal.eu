/**
 * A Gaussian-splat world on the stage (config.stage25d.world: { src, x, y, z, scale, rot }), e.g. a World Labs
 * world, that builds itself around the class over the scene's first seconds (look.worldReveal, 0 = there at once).
 * The splat loader only downloads for a scene that has a world.
 */

/** Spark's Spread is complete about this many seconds in, for a world `REVEAL_SPAN` units across. */
const NATURAL_S = 6
const REVEAL_SPAN = 3
/** Past the end of the reveal: everything drawn as it is. */
const DONE_T = 60

/** The reveal's own clock at scene time t, for a build-up of `seconds` (0 or less: no build-up). */
export const revealTime = (t, seconds) => (seconds > 0 ? Math.max(0, t) * NATURAL_S / seconds : DONE_T)

/**
 * How far out most of the world lies on the ground plane: the 80th percentile of the splats' distance from its
 * middle, so a few stray splats far out do not stretch the reveal. stride 4: Babylon's xyzw centres.
 */
export function worldRadius (positions, stride = 4, samples = 4000) {
  const n = Math.floor((positions?.length ?? 0) / stride)
  if (!n) return 1
  const step = Math.max(1, Math.floor(n / samples))
  const d = []
  for (let i = 0; i < n; i += step) d.push(Math.hypot(positions[i * stride], positions[i * stride + 2]))
  d.sort((a, b) => a - b)
  return d[Math.floor(d.length * 0.8)] || 1
}

/** Load the world into a Babylon scene. Resolves { at(t, seconds), dispose() }. */
export async function loadWorld (babylonScene, world) {
  const [{ ImportMeshAsync }, { SplatRevealPlugin }] = await Promise.all([
    import('@babylonjs/core/Loading/sceneLoader'),
    import('./splat-reveal.js'),
    import('@babylonjs/loaders/SPLAT'),
  ])
  const { meshes } = await ImportMeshAsync(world.src, babylonScene, { pluginExtension: '.spz' })   // a signed URL has no .spz at its end
  const mesh = meshes.find((m) => m.getClassName?.().startsWith('GaussianSplatting')) ?? meshes[0]
  const scale = Number(world.scale) || 1
  mesh.position.set(Number(world.x) || 0, Number(world.y) || 0, Number(world.z) || 0)
  mesh.scaling.scaleInPlace(scale)   // keeps the loader's own axis flip
  mesh.rotation.y = ((Number(world.rot) || 0) * Math.PI) / 180
  const reveal = new SplatRevealPlugin(mesh.material, REVEAL_SPAN / worldRadius(mesh._splatPositions))
  return {
    mesh,
    at (t, seconds) { reveal.time = revealTime(t, seconds) },
    dispose () { mesh.dispose(false, true) },
  }
}
