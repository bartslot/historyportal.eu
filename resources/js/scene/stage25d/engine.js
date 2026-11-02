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
import { LOOK_RANGE, lookNum } from '@stage25d/stage25d/look'
import { STAGE_LOOK } from '@stage25d/stage25d/stage'
import { libraryUrl } from './config.js'
import { layerLabel } from './labels.js'
import { createAlphaMaps } from './alpha.js'
import { attachInteraction } from './interact.js'
import { structureSig, editSig, layerIndex, EDITABLE } from './live.js'

/** The look sliders the scene panel offers (look.ts LOOK_RANGE has the range of each). */
export const LOOK_KEYS = ['sheetGrain', 'groundDetail', 'sunLight', 'castShadow', 'smoke', 'birds', 'cloudDrift', 'housePitch']

const libraries = new Map()
const alphaMaps = new Map()   // one per library, kept across scenes: every picture is read once
const alphaFor = (base) => { if (!alphaMaps.has(base)) alphaMaps.set(base, createAlphaMaps(base)); return alphaMaps.get(base) }

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
 * @param {{ editable?: boolean, onCommit?: (index: number, patch: object, sceneId: any) => void }} [opts] editable: the
 *        canvas picks and drags layers (the editor, not the player). onCommit: a base value the teacher set
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
  let assets = new Map()    // library asset id -> asset, for readable row names
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
  let libData = null        // the library on stage: { bundle, base, assets }
  let alpha = null
  let lookNow = {}          // the scene's look values as edited (config.stage25d.look + the sliders)
  let pointer = null

  const startLoop = () => {
    stage.engine.runRenderLoop(() => {
      const now = performance.now()
      motionClock += Math.min(0.1, (now - last) / 1000)
      last = now
      stage.tick(now)
      if (scene) stage.pose(scene, nowT(), motionClock)
      stage.scene.render()
      pointer?.place()
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
    seenEdit = editSig({ set: { layers } })   // what the server will hold once saved: an undo then differs from it
    redraw()
    return i
  }
  const nowT = () => (clock ? clock() : manualT)

  const api = {
    canvas,
    /** The scene row this stage shows (set by the editor): a save must never land on another scene. */
    sceneId: null,
    /** Build a scene's set (the old picture stays until every texture is ready). Resolves when drawn. */
    async show (cfgNow) {
      const lib = await libraryOf(cfgNow.bundle)
      if (destroyed) return
      if (!stage) {
        stage = new Stage(canvas, lib)
        startLoop()
      }
      lookNow = { ...(cfgNow.look ?? {}) }
      stage.setLook(lookNow)
      const next = stageScene(cfgNow)
      await stage.build(next, lib)
      scene = next
      layers = next.set.layers
      hidden = new Set()
      seenEdit = editSig(cfgNow)
      cfg = cfgNow
      assets = new Map(lib.assets.map(a => [a.id, a]))
      libData = lib
      alpha = alphaFor(lib.base)
      alpha.prime(next.set.layers.map((l) => assets.get(l.asset)).filter(Boolean))
      if (opts.editable && !pointer) {
        canvas.style.pointerEvents = 'auto'
        pointer = attachInteraction({
          canvas, host, stage: () => stage, alpha: { opaque: (a, u, v) => alpha.opaque(a, u, v) },
          xOf: (i) => layerAt(layers[i], nowT()).x,
          onMove: (i, x) => api.moveLayer(`layer-${i}`, x),
        })
      }
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
    setLayerKeys (id, keys) {
      const i = layerIndex(id)
      if (JSON.stringify(layers[i]?.keys ?? []) !== JSON.stringify(keys)) edit(id, { keys })
    },
    /** A base value to save (the editor persists it through onCommit). */
    commitLayerProp (id, prop, v) {
      const i = edit(id, { [prop]: v })
      if (i >= 0 && this.sceneId != null) opts.onCommit?.(i, { [prop]: v }, this.sceneId)
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
    /** A drag (or the inspector) moved a layer's x: through the timeline when it is keyed, else as the layer's own x. */
    moveLayer (id, x) {
      if (window.__timelineKeying?.edit?.(`s25:${id}`, 'x', x, { flush: false })) return
      api.commitLayerProp(id, 'x', x)
    },
    /** Select a layer by editor id (a timeline row was clicked); the canvas draws its box. */
    select (id) { pointer?.select(layerIndex(id) >= 0 ? layerIndex(id) : null, true) },
    get selection () { return pointer?.selected ?? null },
    /** Another scene is opening: nothing stays selected from the one before. */
    clearSelection () { pointer?.select(null) },
    /** Is the stage at the scene's first frame with nothing hidden? Only then is its picture a thumbnail of the scene. */
    atStart () { return manualT === 0 && clock === null && hidden.size === 0 },
    /** What the inspector shows for a layer: its name, picture, depth and motion. */
    layerInfo (id) {
      const l = layers[layerIndex(id)]
      if (!l) return null
      const asset = assets.get(l.asset) ?? null
      const own = typeof l.motion === 'string' ? { kind: l.motion } : (l.motion ?? {})
      const base = asset?.motion ?? 'none'
      return {
        id, asset: l.asset ?? null, depth: l.depth, figure: l.figure ?? null,
        label: layerLabel(l, asset, (document.documentElement.lang || 'en').slice(0, 2)),
        file: asset ? `${libData.base}${asset.file}` : null,
        motion: { kind: own.kind ?? base, amount: own.amount ?? 1, speed: own.speed ?? 1 },
      }
    },
    /** Motion of one layer: kind, amount, speed. Live, and saved on the layer. */
    setLayerMotion (id, motion) {
      const i = layerIndex(id)
      if (i < 0 || !layers[i]) return
      const next = { ...(typeof layers[i].motion === 'object' ? layers[i].motion : { kind: layers[i].motion }), ...motion }
      const idx = edit(id, { motion: next })
      if (idx >= 0) opts.onCommit?.(idx, { motion: next }, api.sceneId)
    },
    /** The library on stage, for the asset browser: [{ id, layer, file, url, label }]. */
    library () {
      if (!libData) return null
      const lang = (document.documentElement.lang || 'en').slice(0, 2)
      return { bundle: libData.bundle, assets: libData.assets.map((a) => ({ id: a.id, layer: a.layer, tags: a.tags ?? [], url: libData.base + a.file, label: layerLabel({}, a, lang) })) }
    },
    /** Put another picture on a layer: rebuilds the set (the one case that must), saved on the layer. */
    async swapAsset (id, assetId) {
      const i = layerIndex(id)
      if (i < 0 || !layers[i] || !assets.has(assetId) || layers[i].asset === assetId) return
      layers = layers.map((l, n) => (n === i ? { ...l, asset: assetId } : l))
      await api.show({ ...cfg, set: { ...cfg.set, layers } })
      opts.onCommit?.(i, { asset: assetId }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
    },
    /** A new layer from a library picture, standing mid-view at its own depth; saved at the end of the layers. */
    async addLayer (assetId) {
      const a = assets.get(assetId)
      if (!a) return
      const depth = ['mid', 'fg', 'near', 'bg', 'sky'].includes(a.layer) ? a.layer : 'mid'
      const layer = { asset: assetId, depth, x: 0.5, scale: 1 }
      layers = [...layers, layer]
      await api.show({ ...cfg, set: { ...cfg.set, layers } })
      opts.onCommit?.(layers.length - 1, { add: layer }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
      pointer?.select(layers.length - 1)
    },
    /** The scene look sliders: [{ key, value, min, max, step }]. */
    lookControls () {
      return LOOK_KEYS.map((key) => {
        const [min, max, step] = LOOK_RANGE[key] ?? [0, 1, 0.01]
        return { key, min, max, step, value: lookNum({ ...STAGE_LOOK, ...lookNow }, key) }
      })
    },
    /** One look value: live on the stage, saved on the scene. */
    setLook (key, value) {
      if (!LOOK_KEYS.includes(key) || !Number.isFinite(value) || !stage) return
      lookNow = { ...lookNow, [key]: value }
      stage.setLook(lookNow)
      opts.onLook?.(key, value, api.sceneId)
    },
    /** The first frame as a small JPEG data URL (rail thumbnail, player fallback); resolves null before anything is shown. */
    async still (width = 480) {
      if (!stage || !scene || !canvas.width) return null
      await stage.scene.whenReadyAsync()   // shaders compile in the background: a frame drawn before they are ready is missing meshes
      const grab = () => {
        const out = document.createElement('canvas')
        out.width = width
        out.height = Math.max(1, Math.round((width * canvas.height) / canvas.width))
        out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height)
        return out.toDataURL('image/jpeg', 0.72)
      }
      // Copy what the loop draws, in the task of a frame (a WebGL canvas only holds its picture until the next one
      // starts). A hidden page draws no frames: no picture beats a wrong one.
      stage.engine.resize()
      return new Promise((resolve) => {
        let frames = 0
        const done = (url) => { stage.engine.onEndFrameObservable.remove(watch); clearTimeout(timer); resolve(url) }
        const watch = stage.engine.onEndFrameObservable.add(() => { if (++frames >= 6) done(grab()) })
        const timer = setTimeout(() => done(null), 4000)
      })
    },
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
      ...layers.map((l, i) => ({ id: `layer-${i}`, label: layerLabel(l, assets.get(l.asset), (document.documentElement.lang || 'en').slice(0, 2)) || `layer ${i + 1}`, depth: l.depth, keys: l.keys ?? [] })),
      { id: 'camera', label: 'Camera', depth: null, keys: [] },
    ],
    destroy () {
      destroyed = true
      delete host.dataset.stage25dReady
      try { stage?.engine.stopRenderLoop(); stage?.scene.dispose(); stage?.engine.dispose() } catch (_) { /* context already lost */ }
      pointer?.destroy()
      canvas.remove()
    },
  }
  return api
}
