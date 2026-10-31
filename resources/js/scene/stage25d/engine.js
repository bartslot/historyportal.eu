/**
 * stage25d/engine: the Babylon 2.5D stage for ONE scene at a time, drawn into a host element.
 *
 * This file is the lazy chunk: it is only ever reached through mount.js's dynamic import, so no page that
 * has no stage25d scene downloads Babylon. The stage itself (engine-mvp/src/stage25d) is imported through
 * the @stage25d alias, never copied; this file only feeds it a scene and a clock.
 *
 * The editor and the lesson player both use createStage25d(), so what a teacher edits is what the class sees.
 */
import { Stage } from '@stage25d/stage25d/stage'
import { loadLibrary } from '@stage25d/stage25d/library'
import { libraryUrl } from './config.js'

const libraries = new Map()

/** One library per bundle per page; a failed load is forgotten so the next scene tries again. */
function libraryOf (bundle) {
  if (!libraries.has(bundle)) {
    libraries.set(bundle, loadLibrary(libraryUrl(bundle)).catch(err => { libraries.delete(bundle); throw err }))
  }
  return libraries.get(bundle)
}

/** The director's scene fields the stage reads, from config.stage25d. */
export const stageScene = (cfg) => ({
  id: cfg.id ?? 'scene',
  set: cfg.set ?? { layers: [] },
  camera: cfg.camera ?? null,
  camera_more: cfg.camera_more ?? [],
  dur_s: cfg.dur_s,
  est_s: cfg.est_s,
})

export async function createStage25d (host) {
  const canvas = document.createElement('canvas')
  canvas.className = 'stage25d-canvas'
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;'
  host.appendChild(canvas)

  let stage = null
  let scene = null
  let cfgSig = null
  let manualT = 0
  let clock = null
  let lead = 0   // the narration starts this many seconds into the scene (director's narration_at_s)
  let motionClock = 0
  let last = performance.now()
  let destroyed = false

  const startLoop = () => {
    stage.engine.runRenderLoop(() => {
      const now = performance.now()
      motionClock += Math.min(0.1, (now - last) / 1000)
      last = now
      stage.tick(now)
      if (scene) stage.pose(scene, clock ? clock() : manualT, motionClock)
      stage.scene.render()
    })
  }

  return {
    canvas,
    /** Build a scene's set (the old picture stays until every texture is ready). Resolves when drawn. */
    async show (cfg) {
      const lib = await libraryOf(cfg.bundle)
      if (destroyed) return
      if (!stage) {
        stage = new Stage(canvas, lib)
        startLoop()
      }
      stage.setLook(cfg.look)
      const next = stageScene(cfg)
      await stage.build(next, lib)
      scene = next
      lead = Number(cfg.narration_at_s) || 0
      cfgSig = JSON.stringify(cfg)
      host.dataset.stage25dReady = '1'
    },
    /** Same config already on stage: nothing to do. */
    matches: (cfg) => cfgSig === JSON.stringify(cfg),
    /** The editor poses the scene at t seconds. */
    update (t) { clock = null; manualT = Math.max(0, t) },
    /** The player follows a clock (the narration's currentTime). */
    play (getT) { clock = () => lead + getT() },
    /** Layers as rows for the object list / timeline (Phase 2 wires them to keyframes). */
    items: () => (scene?.set.layers ?? []).map((l, i) => ({ id: `layer-${i}`, label: l.asset ?? l.need ?? `layer ${i + 1}`, depth: l.depth })),
    destroy () {
      destroyed = true
      delete host.dataset.stage25dReady
      try { stage?.engine.stopRenderLoop(); stage?.scene.dispose(); stage?.engine.dispose() } catch (_) { /* context already lost */ }
      canvas.remove()
    },
  }
}
