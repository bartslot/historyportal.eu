/**
 * mountStage25d: the ONE way a stage25d scene gets onto a page, for the editor canvas and the player alike.
 *
 *   const stage = await mountStage25d(host)          // creates the canvas + Babylon (lazy chunk)
 *   await stage.show(scene.config.stage25d)          // build the set
 *   stage.play(() => audio.currentTime)  |  stage.update(t)
 *   stage.destroy()
 *
 * Same shape as DioramaStage so wizard-bridge / lesson-player / scene-objects treat both alike. This file stays
 * small and static-importable; Babylon only loads when mountStage25d() runs.
 */
export async function mountStage25d (host) {
  const { createStage25d } = await import('./engine.js')
  return createStage25d(host)
}
