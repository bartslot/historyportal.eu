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
import { headOnScreen } from '@stage25d/play/frame'
import { layerAt } from '@stage25d/stage25d/layout'
import { libraryUrl } from './config.js'
import { structureSig, editSig, layerIndex, EDITABLE } from './live.js'

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
  set: { ...(cfg.set ?? {}), layers: (cfg.set?.layers ?? []).map((l) => ({ ...l })) },
  camera: cfg.camera ?? null,
  camera_more: cfg.camera_more ?? [],
  figures: cfg.figures ?? [],
  dur_s: cfg.dur_s,
  est_s: cfg.est_s,
})

/**
 * @param {HTMLElement} host
 * @param {{ onCommit?: (index: number, patch: object) => void }} [opts] onCommit: a base value the teacher set
 *        (not a keyed one) that the editor should save into config.stage25d.set.layers[index].
 */
export async function createStage25d (host, opts = {}) {
  const canvas = document.createElement('canvas')
  canvas.className = 'stage25d-canvas'
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;'
  host.appendChild(canvas)

  let stage = null
  let scene = null
  let cfgSig = null
  let cfg = null
  let heights = new Map()   // library asset id -> height in metres, for the speaker's head
  let manualT = 0
  let clock = null
  let lead = 0   // the narration starts this many seconds into the scene (director's narration_at_s)
  let motionClock = 0
  let last = performance.now()
  let destroyed = false
  let layers = []           // the teacher's layers, live: the editor edits these, the stage draws them
  let hidden = new Set()    // layer indexes the eye took off the canvas (never saved)
  let seenEdit = null       // editSig of the last server config adopted
  let lib = null

  const startLoop = () => {
    stage.engine.runRenderLoop(() => {
      const now = performance.now()
      motionClock += Math.min(0.1, (now - last) / 1000)
      last = now
      stage.tick(now)
      if (scene) stage.pose(scene, nowT(), motionClock)
      stage.scene.render()
    })
  }

  /** Draw the live layers without a rebuild: only an asset swap rebuilds. */
  const redraw = () => {
    if (!scene || !stage) return
    scene = { ...scene, set: { ...scene.set, layers: layers.map((l, i) => (hidden.has(i) ? { ...l, opacity: 0, keys: [] } : l)) } }
    stage.rebind(scene)
  }
  const edit = (id, patch) => {
    const i = layerIndex(id)
    if (i < 0 || !layers[i]) return -1
    layers = layers.map((l, n) => (n === i ? { ...l, ...patch } : l))
    redraw()
    return i
  }
  const nowT = () => (clock ? clock() : manualT)

  return {
    canvas,
    /** Build a scene's set (the old picture stays until every texture is ready). Resolves when drawn. */
    async show (cfgNow) {
      const lib = await libraryOf(cfgNow.bundle)
      if (destroyed) return
      if (!stage) {
        stage = new Stage(canvas, lib)
        startLoop()
      }
      stage.setLook(cfgNow.look)
      const next = stageScene(cfgNow)
      await stage.build(next, lib)
      scene = next
      layers = next.set.layers
      hidden = new Set()
      seenEdit = editSig(cfgNow)
      cfg = cfgNow
      heights = new Map(lib.assets.map(a => [a.id, a.height_m ?? 1.7]))
      lead = Number(cfgNow.narration_at_s) || 0
      cfgSig = structureSig(cfgNow)
      host.dataset.stage25dReady = '1'
    },
    /** Same set already on stage (an edit of x, y, scale, rotation, opacity or keys is not a different set). */
    matches: (cfg) => cfgSig === structureSig(cfg),
    /** The server's copy changed under us (an undo, a redo): take its layer values. Our own saves are skipped. */
    adopt (cfgNow) {
      const sig = editSig(cfgNow)
      if (sig === seenEdit) return false
      seenEdit = sig
      const incoming = cfgNow.set?.layers ?? []
      layers = layers.map((l, i) => {
        const next = { ...l }
        for (const f of EDITABLE) { if (incoming[i]?.[f] === undefined) delete next[f]; else next[f] = incoming[i][f] }
        return next
      })
      cfg = cfgNow
      redraw()
      return true
    },
    /** Live, no rebuild: one base value of one layer (a field edit, the timeline's frame). */
    setLayerProp (id, prop, v) { edit(id, { [prop]: v }) },
    /** Live: a layer's keys, as the timeline holds them. */
    setLayerKeys (id, keys) { edit(id, { keys }) },
    /** A base value to save (the editor persists it through onCommit). */
    commitLayerProp (id, prop, v) {
      const i = edit(id, { [prop]: v })
      if (i >= 0) opts.onCommit?.(i, { [prop]: v })
    },
    /** What the layer shows at the playhead, for the row's field. */
    readLayerProp (id, prop) {
      const l = layers[layerIndex(id)]
      const v = l ? layerAt(l, nowT())[prop] : null
      return Number.isFinite(v) ? v : null
    },
    setHidden (id, off) {
      const i = layerIndex(id)
      if (i < 0) return
      hidden = new Set(off ? [...hidden, i] : [...hidden].filter((n) => n !== i))
      redraw()
    },
    /** The editor poses the scene at t seconds. */
    update (t) { clock = null; manualT = Math.max(0, t) },
    /** The player follows a clock (the narration's currentTime). */
    play (getT) { clock = () => lead + getT() },
    /** The config on stage now (tests and the editor read it). */
    get config () { return cfg },
    /** The head of the figure that speaks as `char`, as a DOMRect on screen (balloon tails point at it); null when out of frame. */
    figureBox (char) {
      const layer = layers.find(l => l.figure === char)
      if (!layer?.asset) return null
      const head = headOnScreen(scene, layer, heights.get(layer.asset) ?? 1.7, nowT())
      if (!head) return null
      const r = canvas.getBoundingClientRect()
      const w = r.width * 0.05
      return new DOMRect(r.left + head.x * r.width - w / 2, r.top + head.y * r.height, w, r.height * 0.08)
    },
    /** Rows for the object list and timeline: every layer, then the camera. */
    items: () => [
      ...layers.map((l, i) => ({ id: `layer-${i}`, label: l.figure ?? l.asset ?? (Array.isArray(l.need) ? l.need[0] : l.need) ?? `layer ${i + 1}`, depth: l.depth, keys: l.keys ?? [] })),
      { id: 'camera', label: 'Camera', depth: null, keys: [] },
    ],
    destroy () {
      destroyed = true
      delete host.dataset.stage25dReady
      try { stage?.engine.stopRenderLoop(); stage?.scene.dispose(); stage?.engine.dispose() } catch (_) { /* context already lost */ }
      canvas.remove()
    },
  }
}
