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
import { resolveAsset } from '@stage25d/stage25d/library'
import { layerAt, bandOf, DEPTH_Z, isGroundStrip, liesFlat } from '@stage25d/stage25d/layout'
import { LOOK_RANGE, lookNum } from '@stage25d/stage25d/look'
import { STAGE_LOOK } from '@stage25d/stage25d/stage'
import { libraryUrl } from './config.js'
import { layerLabel, numbered } from './labels.js'
import { createAlphaMaps } from './alpha.js'
import { attachInteraction } from './interact.js'
import { groundUnderRay, settle, groundOf, layerOf, alongSight, GROUND } from './floor.js'
import { structureSig, editSig, layerIndex, EDITABLE } from './live.js'

/** The look sliders the scene panel offers (look.ts LOOK_RANGE has the range of each). */
export const LOOK_KEYS = ['sheetGrain', 'groundDetail', 'sunLight', 'castShadow', 'smoke', 'birds', 'cloudDrift', 'housePitch']

/** What a picture dragged out of the Assets tab carries: the library asset id. */
export const DROP_TYPE = 'application/x-lp-stage25d'

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
  let bands = []            // the ground bands (set.groundBands), live like the layers
  let skyNow = {}           // the sky picture's own values (set.skyLayer), live like the layers
  let hidden = new Set()    // layer indexes the eye took off the canvas (never saved)
  let seenEdit = null       // editSig of the last server config adopted
  let libData = null        // the library on stage: { bundle, base, assets }
  let alpha = null
  let backdrop = null        // the backdrop row that is the selection: 'sky' or 'band-<n>' (it has no box on the canvas)
  let lookNow = {}          // the scene's look values as edited (config.stage25d.look + the sliders)
  let pointer = null
  let stills = 0            // pictures being taken right now (the grid stays hidden until the last is done)

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
    scene = { ...scene, set: { ...scene.set, groundBands: bands, skyLayer: skyNow, layers: layers.map((l, i) => (hidden.has(i) ? { ...l, opacity: 0, keys: [] } : l)) } }
    stage.rebind(scene)
  }
  /** 'band-2' -> 2 when that ground band exists, else -1. */
  const bandIndex = (id) => { const m = /^band-(\d+)$/.exec(String(id ?? '')); return m && bands[Number(m[1])] ? Number(m[1]) : -1 }
  /** The values of a row: a layer, a ground band or the sky picture (one shape: layout.ts layerAt reads all three). */
  const valuesOf = (id) => (id === 'sky' ? (cfg?.set?.sky ? { ...skyNow, depth: 'sky' } : null)
    : bandIndex(id) >= 0 ? { ...bands[bandIndex(id)], depth: 'bg' } : layers[layerIndex(id)] ?? null)
  /** Change a row live. Returns what the server saves it as: a layer's index, `{ band }`, `{ skyLayer }`; null: no such row. */
  const edit = (id, patch) => {
    let saved = null
    if (id === 'sky' && cfg?.set?.sky) {
      skyNow = { ...skyNow, ...patch }
      saved = { skyLayer: patch }
    } else if (bandIndex(id) >= 0) {
      const n = bandIndex(id)
      bands = bands.map((g, k) => (k === n ? { ...g, ...patch } : g))
      saved = { band: { index: n, ...patch } }
    } else if (layers[layerIndex(id)]) {
      const i = layerIndex(id)
      layers = layers.map((l, n) => (n === i ? { ...l, ...patch } : l))
      saved = i
    }
    if (saved === null) return null
    seenEdit = editSig({ set: { layers, groundBands: bands, skyLayer: skyNow } })   // what the server will hold once saved: an undo then differs from it
    redraw()
    return saved
  }
  /** The set as the teacher sees it now: a rebuild (an asset swap, a new layer) keeps every live edit. */
  const liveSet = () => ({ ...cfg.set, layers, groundBands: bands, skyLayer: skyNow })
  /** Change a row and save it (onCommit: a layer by index; a band or the sky as its own patch). */
  const commit = (id, patch) => {
    const saved = edit(id, patch)
    if (saved === null || api.sceneId == null) return
    if (typeof saved === 'number') opts.onCommit?.(saved, patch, api.sceneId)
    else opts.onCommit?.(0, saved, api.sceneId)
  }
  const nowT = () => (clock ? clock() : manualT)

  /** The sky picture on stage: set.sky is an asset id or just tags ("sky morning"), which the stage resolves to the best match. */
  const skyAsset = () => (cfg?.set?.sky && libData ? (assets.get(cfg.set.sky) ?? resolveAsset(libData, { asset: cfg.set.sky }, 'sky')) : null)

  /** Does a layer stand on the ground? Backdrops that span the view (sky picture, bg strips) and sky-depth pictures
   *  don't; a floor tile (a 'ground' picture, lying flat) does, at its distance. */
  const onGround = (i) => {
    const a = assets.get(layers[i]?.asset)
    return !!(layers[i] && a && (!a.tileable_x || a.layer === 'ground') && a.layer !== 'bg' && a.layer !== 'sky' && layers[i].depth !== 'sky')
  }
  /** Backdrop rows: the sky and the ground bands (set.groundBands, 'band-<n>'). */
  const isBackdrop = (id) => id === 'sky' || bandIndex(id) >= 0
  /** The backdrop painted under a canvas point (CSS px) where no standing picture is: the nearest ground band or far
   *  strip whose paint is there, else the sky. Selected like a row; null when there is nothing to select. */
  const backdropAt = (x, y) => {
    const hit = stage?.pickBackdrops?.(x, y).find((h) => alpha.opaque(h.asset, h.u, h.v))
    const id = hit ? (hit.band !== undefined ? `band-${hit.band}` : `layer-${hit.index}`) : (cfg?.set?.sky ? 'sky' : null)
    if (id) api.select(id)
    return !!id
  }
  /** A painted strip of ground and a picture lying flat stand on the floor itself, not on the ground rising into the
   *  far landscape. */
  const floorOnly = (layer, a) => isGroundStrip(a) || liesFlat(layer, a)
  const onFloor = (i) => { const a = assets.get(layers[i]?.asset); return !!a && floorOnly(layers[i], a) }
  /** A layer's distance in metres at the playhead: its z (keyed or not), else its band's (scenes from before z). */
  const zNow = (i) => layerAt(layers[i], nowT()).z ?? DEPTH_Z[layers[i].depth]
  /** Resizing moves a picture in distance (its real height never changes); a keyed scale still scales. */
  const byDistance = (i) => onGround(i) && !(layers[i].keys ?? []).some((k) => k.scale !== undefined)
  const round3 = (n) => Math.round(n * 1000) / 1000
  /** Where the camera stands now on the ground, [x, z]: sizes and screen columns count from there. */
  const eye = () => (stage?.camera?.position ? [stage.camera.position.x, stage.camera.position.z] : [0, 0])

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
      bands = (next.set.groundBands ?? []).map((g) => ({ ...g }))
      skyNow = { ...(next.set.skyLayer ?? {}) }
      hidden = new Set()
      seenEdit = editSig(cfgNow)
      cfg = cfgNow
      assets = new Map(lib.assets.map(a => [a.id, a]))
      libData = lib
      alpha = alphaFor(lib.base)
      alpha.prime(next.set.layers.map((l) => assets.get(l.asset)).filter(Boolean))
      if (opts.editable && !pointer) {
        canvas.style.pointerEvents = 'auto'
        window.addEventListener('scene-object-selected', (e) => { if (e.detail?.id !== `s25_${backdrop}`) backdrop = null })
        canvas.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes(DROP_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } })
        canvas.addEventListener('drop', (e) => {
          const id = e.dataTransfer?.getData(DROP_TYPE)
          if (!id) return
          e.preventDefault()
          const r = canvas.getBoundingClientRect()
          api.addLayer(id, { x: e.clientX - r.left, y: e.clientY - r.top })
        })
        pointer = attachInteraction({
          canvas, host, stage: () => stage, alpha: { opaque: (a, u, v) => alpha.opaque(a, u, v) },
          valueOf: (i, prop) => (prop === 'z' ? zNow(i) : layerAt(layers[i], nowT())[prop]),
          onGround, byDistance,
          // the feet slide over the ground as it rises into the far landscape, at their own height above it (a ground
          // strip stays on the floor itself: layout.ts isGroundStrip)
          groundUnder: (x, y, lift, i) => groundUnderRay(stage.pointerRay(x, y), onFloor(i) ? lift : (z) => stage.groundHeightAt(z) + lift),
          footY: (i) => stage.layerFootY(i) - (onFloor(i) ? 0 : stage.groundHeightAt(zNow(i))),
          eye,
          onSettled: (i) => api.settleBand(i),
          // a press on no standing picture selects the backdrop painted there: a ground band, a far strip, the sky
          onEmpty: (x, y) => backdropAt(x, y),
          onChange: (i, prop, v) => api.moveLayer(`layer-${i}`, prop, v),
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
      const take = (now, from) => {
        const next = { ...now }
        for (const f of EDITABLE) { if (from?.[f] === undefined) delete next[f]; else next[f] = from[f] }
        return next
      }
      layers = layers.map((l, i) => take(l, cfgNow.set?.layers?.[i]))
      bands = bands.map((g, i) => take(g, cfgNow.set?.groundBands?.[i]))
      skyNow = take(skyNow, cfgNow.set?.skyLayer)
      cfg = cfgNow
      redraw()
      return true
    },
    /** Live, no rebuild: one base value of one layer (a field edit, the timeline's frame). */
    setLayerProp (id, prop, v) { edit(id, { [prop]: v }) },
    /** Live: a row's keys (a layer, a ground band, the sky), as the timeline holds them. */
    setLayerKeys (id, keys) {
      const now = valuesOf(id)
      if (now && JSON.stringify(now.keys ?? []) !== JSON.stringify(keys)) edit(id, { keys })
    },
    /** A base value to save (the editor persists it through onCommit). */
    commitLayerProp (id, prop, v) { commit(id, { [prop]: v }) },
    /** What the row shows at the playhead, for its field. */
    readLayerProp (id, prop) {
      const l = valuesOf(id)
      const v = !l ? null : prop === 'z' && layerIndex(id) >= 0 ? zNow(layerIndex(id)) : prop === 'z' ? (layerAt(l, nowT()).z ?? l.z) : layerAt(l, nowT())[prop]
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
    /** A drag on the canvas changed a layer's x, scale or angle: through the timeline when it is keyed, else on the layer. */
    moveLayer (id, prop, value) {
      if (window.__timelineKeying?.edit?.(`s25:${id}`, prop, value, { flush: false })) return
      api.commitLayerProp(id, prop, value)
    },
    /** Select a layer by editor id (a timeline row was clicked); the canvas draws its box. A backdrop row (the sky, a
     *  ground band) has no box: it is the selection for the panel and the Assets tab. */
    select (id) {
      backdrop = isBackdrop(id) ? id : null
      pointer?.select(layerIndex(id) >= 0 ? layerIndex(id) : null, !backdrop)
      if (backdrop) window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: `s25_${backdrop}` } }))
    },
    get skySelected () { return backdrop === 'sky' },
    /** The selected backdrop row ('sky', 'band-<n>'), or null. */
    get backdrop () { return backdrop },
    get selection () { return pointer?.selected ?? null },
    /** Another scene is opening: nothing stays selected from the one before. */
    clearSelection () { pointer?.select(null) },
    /** Is the stage at the scene's first frame with nothing hidden? Only then is its picture a thumbnail of the scene. */
    atStart () { return manualT === 0 && clock === null && hidden.size === 0 },
    /** What the inspector shows for a layer: its name, picture, depth and motion. */
    layerInfo (id) {
      const motionOf = (l, a) => {
        const own = typeof l.motion === 'string' ? { kind: l.motion } : (l.motion ?? {})
        return { kind: own.kind ?? a?.motion ?? 'none', amount: own.amount ?? 1, speed: own.speed ?? 1 }
      }
      // fields: the values its panel offers. The sky moves up and down; a ground band stands at a distance, always
      // on the floor; a far strip moves across, up and away; a picture on the ground moves along it.
      if (id === 'sky') {
        const sky = skyAsset()
        return sky ? { id, asset: sky.id, depth: 'sky', figure: null, backdrop: true, role: 'sky', fields: ['y', 'scale', 'opacity'], label: layerLabel({}, sky, (document.documentElement.lang || 'en').slice(0, 2)), file: `${libData.base}${sky.file}`, motion: motionOf(skyNow, sky) } : null
      }
      if (bandIndex(id) >= 0) {
        const band = bands[bandIndex(id)]
        const a = assets.get(band.asset)
        return { id, asset: band.asset, depth: 'bg', figure: null, backdrop: true, role: a?.layer ?? null, fields: ['z', 'scale', 'opacity'], label: api.items().find((row) => row.id === id)?.label ?? '', file: a ? `${libData.base}${a.file}` : null, motion: motionOf(band, a) }
      }
      const l = layers[layerIndex(id)]
      if (!l) return null
      const asset = assets.get(l.asset) ?? null
      const ground = onGround(layerIndex(id))
      const showScale = !ground || (l.scale ?? 1) !== 1 || (l.keys ?? []).some((k) => k.scale !== undefined)
      const strip = asset?.layer === 'bg' && !asset.tileable_x
      return {
        id, asset: l.asset ?? null, depth: l.depth, figure: l.figure ?? null, role: asset?.layer ?? null,
        ground, showScale,
        fields: ground ? ['x', 'z', ...(showScale ? ['scale'] : []), 'rotation', 'opacity'] : ['x', ...(strip ? ['z'] : []), 'y', 'scale', 'rotation', 'opacity'],
        label: api.items().find((row) => row.id === id)?.label ?? layerLabel(l, asset, (document.documentElement.lang || 'en').slice(0, 2)),
        file: asset ? `${libData.base}${asset.file}` : null,
        motion: motionOf(l, asset),
      }
    },
    /** Motion of one layer: kind, amount, speed. Live, and saved on the layer. */
    setLayerMotion (id, motion) {
      const now = valuesOf(id)
      if (!now) return
      commit(id, { motion: { ...(typeof now.motion === 'object' ? now.motion : { kind: now.motion }), ...motion } })
    },
    /**
     * The object list was dragged: `order` is the layer indexes front first, `moved` the one dragged. On the floor it
     * takes a distance between its new neighbours, keeping its size and place on screen; `call` saves the new order
     * and the stage rebuilds from what the server sends back.
     */
    reorderLayers (order, moved, call) {
      if (!onGround(moved)) { call(order, moved, api.sceneId, null, null, null); return }   // strips and sky pictures restack by band
      const zOf = (i) => layers[i]?.z ?? DEPTH_Z[layers[i]?.depth]
      // its neighbours on the ground (a strip or a sky picture in between has no distance to stand between)
      const onGroundOrder = order.filter((i) => i === moved || onGround(i))
      const at = onGroundOrder.indexOf(moved)
      const front = onGroundOrder[at - 1]
      const back = onGroundOrder[at + 1]
      const z = zNow(moved)
      const lo = front === undefined ? 0 : zOf(front)
      const hi = back === undefined ? Infinity : zOf(back)
      if ((front !== undefined || back !== undefined) && (z < lo || z > hi)) {
        // On the ground, "in front of that one" means standing nearer than it: a distance between its neighbours (not
        // snapped: a snap could carry it past one), keeping its column across the screen and its apparent size.
        const p = groundOf(layerAt(layers[moved], nowT()).x, z)
        const to = front === undefined ? hi / 1.25 : back === undefined ? lo * 1.25 : (lo + hi) / 2
        const nz = Math.round(Math.min(GROUND.cells[1][1], Math.max(GROUND.cells[0][1], to)) * 100) / 100
        const e = eye()
        const k = (nz - e[1]) / Math.max(0.1, z - e[1])
        const scaleBy = (s) => round3(Math.min(20, Math.max(0.01, s * k)))
        // a keyed distance or size wins over the base: the keys move with it, by the same step
        const keys = layers[moved].keys?.some((key) => key.z !== undefined || key.scale !== undefined)
          ? layers[moved].keys.map((key) => ({
            ...key,
            ...(key.z !== undefined && { z: Math.min(GROUND.cells[1][1], Math.max(GROUND.cells[0][1], round3(key.z + nz - z))) }),
            ...(key.scale !== undefined && { scale: scaleBy(key.scale) }),
          }))
          : null
        call(order, moved, api.sceneId, layerOf(alongSight(p, nz, e)).x, nz, scaleBy(layers[moved].scale ?? 1), keys)
        return
      }
      // already between them: only the order changes; its place is saved as it is (a scene from before z gets one)
      call(order, moved, api.sceneId, layers[moved].x ?? 0.5, zOf(moved), layers[moved].scale ?? 1)
    },
    /** The library on stage, for the asset browser: [{ id, layer, file, url, label }]. */
    library () {
      if (!libData) return null
      const lang = (document.documentElement.lang || 'en').slice(0, 2)
      return { bundle: libData.bundle, assets: libData.assets.map((a) => ({ id: a.id, layer: a.layer, tags: a.tags ?? [], url: libData.base + a.file, label: layerLabel({}, a, lang) })) }
    },
    /** Put another picture on a layer: rebuilds the set (the one case that must), saved on the layer. */
    async swapAsset (id, assetId) {
      if (id === 'sky') {
        if (assets.get(assetId)?.layer !== 'sky' || skyAsset()?.id === assetId) return
        await api.show({ ...cfg, set: { ...liveSet(), sky: assetId } })
        if (api.sceneId != null) opts.onCommit?.(0, { sky: assetId }, api.sceneId)
        window.dispatchEvent(new CustomEvent('stage25d-synced'))
        return
      }
      const band = bands[bandIndex(id)]
      if (band) {
        const a = assets.get(assetId)
        if (!a || ['sky', 'figure'].includes(a.layer) || band.asset === assetId) return
        const n = Number(id.slice(5))
        const groundBands = bands.map((g, k) => (k === n ? { ...g, asset: assetId } : g))
        await api.show({ ...cfg, set: { ...liveSet(), groundBands } })
        if (api.sceneId != null) opts.onCommit?.(0, { band: { index: n, asset: assetId } }, api.sceneId)
        window.dispatchEvent(new CustomEvent('stage25d-synced'))
        api.select(id)
        return
      }
      const i = layerIndex(id)
      if (i < 0 || !layers[i] || !assets.has(assetId) || layers[i].asset === assetId) return
      layers = layers.map((l, n) => (n === i ? { ...l, asset: assetId } : l))
      await api.show({ ...cfg, set: liveSet() })
      opts.onCommit?.(i, { asset: assetId }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
    },
    /** A new layer from a library picture, standing on the ground where it was dropped (snapped to the grid), else
     *  mid-view at its own band's distance. Saved at the end of the layers. */
    async addLayer (assetId, at = null) {
      const a = assets.get(assetId)
      if (!a) return
      const depth = ['mid', 'fg', 'near', 'bg', 'sky'].includes(a.layer) ? a.layer : 'mid'
      let layer = { asset: assetId, depth, x: 0.5, scale: 1 }
      if (!(a.tileable_x || a.layer === 'bg' || a.layer === 'sky')) {
        const hit = at && stage ? groundUnderRay(stage.pointerRay(at.x, at.y), floorOnly({}, a) ? 0 : (z) => stage.groundHeightAt(z)) : null
        const spot = layerOf(settle(hit ?? [0, DEPTH_Z[depth]]))
        layer = { ...layer, ...spot, depth: bandOf(spot.z) }
      }
      layers = [...layers, layer]
      await api.show({ ...cfg, set: liveSet() })
      opts.onCommit?.(layers.length - 1, { add: layer }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
      pointer?.select(layers.length - 1, true)   // the new layer is the selection: its panel opens
    },
    /** After a drag: when the picture crossed into another depth band, name that band (line weight and haze follow it). */
    async settleBand (i) {
      const l = layers[i]
      if (!l || !onGround(i)) return
      const band = bandOf(zNow(i))
      if (band === l.depth) return
      layers = layers.map((n, k) => (k === i ? { ...n, depth: band } : n))
      const keep = hidden   // the rebuild forgets the eye; pictures hidden with it stay hidden
      await api.show({ ...cfg, set: liveSet() })
      hidden = keep
      redraw()
      if (api.sceneId != null) opts.onCommit?.(i, { depth: band }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
      pointer?.select(i, false)
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
      stills++
      stage.gridHidden = true   // the editor's grid is not part of the scene (hidden while any picture is being taken)
      return new Promise((resolve) => {
        let frames = 0
        const done = (url) => { stage.engine.onEndFrameObservable.remove(watch); clearTimeout(timer); stage.gridHidden = --stills > 0; resolve(url) }
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
    items: () => {
      const lang = (document.documentElement.lang || 'en').slice(0, 2)
      // one numbering over the layers and the painted landscape (ground bands, nearest first): no two rows read alike
      const labels = numbered([
        ...layers.map((l, i) => layerLabel(l, assets.get(l.asset), lang) || `layer ${i + 1}`),
        ...bands.map((g) => layerLabel({}, assets.get(g.asset) ?? { id: g.asset }, lang)),
      ])
      return [
        ...layers.map((l, i) => ({ id: `layer-${i}`, label: labels[i], depth: l.depth, z: l.z ?? DEPTH_Z[l.depth], keys: l.keys ?? [] })),
        ...bands.map((g, n) => ({ id: `band-${n}`, label: labels[layers.length + n], depth: 'bg', z: g.z, keys: g.keys ?? [], backdrop: true })),
        ...(cfg?.set?.sky ? [{ id: 'sky', label: 'Sky', depth: 'sky', keys: skyNow.keys ?? [], backdrop: true }] : []),
        { id: 'camera', label: 'Camera', depth: null, keys: [] },
      ]
    },
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
