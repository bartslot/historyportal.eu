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
import { frameAt, isAnimation } from '@stage25d/stage25d/sprite'
import { puppetOf } from '@stage25d/stage25d/bones'
import { figureFromSheet } from '../../editor/puppet-sheet.js'
import { HOUSE, sceneDuration, layerAt, bonesAt, bandOf, DEPTH_Z, defaultMotion, isBandPicture, isGroundStrip, liesFlat } from '@stage25d/stage25d/layout'
import { LOOK_RANGE, lookNum } from '@stage25d/stage25d/look'
import { groundSlots, GROUND_SLOTS_MAX } from '@stage25d/stage25d/ground'
import { STAGE_LOOK } from '@stage25d/stage25d/stage'
import { libraryUrl } from './config.js'
import { assetIcon, layerLabel, numbered } from './labels.js'
import { libraryTiles, membersOf, charactersOf, sameStanceIn, poseOf, seriesOf } from './series.js'
import { createAlphaMaps } from './alpha.js'
import { loadWorld, WORLD_PLACE_DEFAULTS } from './world.js'
import { attachInteraction, figureInView, inFrontOf } from './interact.js'
import { groundUnderRay, settle, groundOf, layerOf, alongSight, GROUND } from './floor.js'
import { structureSig, editSig, layerIndex, EDITABLE, isBoneField, boneFields } from './live.js'
import { cameraKeys, cameraOverview, cameraPoseAt, clampPose, frameIn, frameSize, withFrameSize, nearestCameraKey, panPose, shotsOfKeys, wheelPose, withCameraKey, withoutCameraKey, movedCameraKey } from './framing.js'

/** The look sliders the scene panel offers (look.ts LOOK_RANGE has the range of each). */
/** The sky row's name in the object list and the timeline. */
const SKY_NAME = { nl: 'Lucht', de: 'Himmel', fr: 'Ciel', it: 'Cielo' }
const CAMERA_NAME = { nl: 'Camera', de: 'Kamera', fr: 'Caméra', it: 'Telecamera' }
const BONES_NAME = { en: 'bones', nl: 'botten', de: 'Knochen', fr: 'os', it: 'ossa' }

export const LOOK_KEYS = ['sheetGrain', 'groundDetail', 'sunLight', 'castShadow', 'smoke', 'birds', 'cloudDrift', 'housePitch', 'groundWash', 'groundGrain', 'grass', 'grassSway', 'horizonBushes', 'worldReveal']

/** The Assets tab shelf of a library picture: an animation is VFX, anything else its layer kind. */
const shelfOf = (a) => (a.cutout ? 'cutouts' : isAnimation(a) ? 'vfx' : a.layer)

/**
 * The teacher's own cut-outs (Uitknippen, app/Services/Editor/Cutouts.php) as rows of the library: the page lists
 * them (data-stage25d-cutouts) and a new one arrives with `cutouts-changed`. Their file is relative to the bundle's
 * folder, so the stage resolves them like any library picture.
 */
let cutoutRows = null
const ownCutouts = () => {
  if (cutoutRows) return cutoutRows
  try { cutoutRows = JSON.parse(document.querySelector('[data-stage25d-cutouts]')?.dataset.stage25dCutouts || '[]') } catch { cutoutRows = [] }
  return cutoutRows
}
export const withCutouts = (lib, rows = ownCutouts()) => {
  if (!rows.length) return lib
  const ids = new Set(rows.map((a) => a.id))
  return { ...lib, assets: [...lib.assets.filter((a) => !ids.has(a.id)), ...rows] }
}
if (typeof window !== 'undefined') {
  window.addEventListener('cutouts-changed', (e) => {
    const row = e.detail?.stage
    const gone = e.detail?.removed
    if (!row?.id && !gone) return
    // a removed one stays a row of the library while a scene on stage uses it: only the shelf stops offering it
    cutoutRows = gone ? ownCutouts().map((a) => (a.id === gone ? { ...a, removed: true } : a)) : [row, ...ownCutouts().filter((a) => a.id !== row.id)]
    window.dispatchEvent(new CustomEvent('stage25d-cutouts'))
  })
}
/** An animation's sheet, for a tile that plays it (CSS steps): null for a still picture. */
/** A layer's own pose, by bone name. */
const animOf = (a) => (isAnimation(a) ? { cols: a.cols, rows: a.rows, frames: a.frames ?? a.cols * a.rows, fps: a.fps ?? 12, w: a.w, h: a.h } : null)

/** What a picture dragged out of the Assets tab carries: the library asset id. */
export const DROP_TYPE = 'application/x-lp-stage25d'

const libraries = new Map()
const alphaMaps = new Map()   // one per library, kept across scenes: every picture is read once
/** A layer in front of the selected one, while they overlap (Bart 2026-11-05: 20% invisible). */
const IN_FRONT_OPACITY = 0.8

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
  set: { ...(cfg.set ?? {}), ...(cfg.world?.src ? { sky: null } : {}), layers: (cfg.set?.layers ?? []).map((l) => ({ ...l })) },
  camera: cfg.camera ?? null,
  camera_more: cfg.camera_more ?? [],
  camera_motion: cfg.camera_motion ?? null,
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
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;visibility:hidden;'
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
  let heldAt = -1           // the scene's time at the last frame
  let framesAhead = 0       // how far animations ran on while that time stood still
  let last = performance.now()
  let destroyed = false
  let layers = []           // the teacher's layers, live: the editor edits these, the stage draws them
  let bands = []            // the ground bands (set.groundBands), live like the layers
  let skyNow = {}           // the sky picture's own values (set.skyLayer), live like the layers
  let hidden = new Set()    // rows the eye took off the canvas, 'layer-<i>' or 'band-<n>' (never saved)
  let seenEdit = null       // editSig of the last server config adopted
  let libData = null        // the library on stage: { bundle, base, assets }
  const figures = new Map()  // a boned figure's edited sheet -> that figure put together (blob:), or 'loading'
  /** The Selection panel shows a boned figure whole: an edited one has to be put together from its sheet. */
  const loadFigure = (l) => {
    const a = assets.get(l.asset)
    const puppet = a && l.src ? puppetOf(a, l, libData.base) : null
    if (!puppet || figures.has(l.src)) return
    figures.set(l.src, 'loading')
    figureFromSheet(puppet, l.src)
      .then(({ url }) => { figures.set(l.src, url); window.dispatchEvent(new CustomEvent('stage25d-synced')) })
      .catch(() => figures.delete(l.src))
  }
  const figureUrl = (l) => { const f = figures.get(l.src); return f && f !== 'loading' ? f : null }
  // library:sync's small copy for a shelf tile (an animation's tile plays its sheet); a tile falls back to url without it
  const thumbOf = (a) => (isAnimation(a) ? null : a.cutout ? libData.base + a.file : libData.base + 'thumbs/' + a.file)
  let alpha = null
  let backdrop = null        // the backdrop row that is the selection: 'sky' or 'band-<n>' (it has no box on the canvas)
  let lookNow = {}          // the scene's look values as edited (config.stage25d.look + the sliders)
  let world = null          // a splat world (config.stage25d.world), building itself up over look.worldReveal seconds
  let worldKey = null       // the world block it was loaded from: a new one swaps it
  let pointer = null
  let stills = 0            // pictures being taken right now (the grid stays hidden until the last is done)
  let camNow = null         // the scene's camera move as edited (config.stage25d.camera)
  let camMore = []          // and the shots after it (camera_more): one per pair of camera keys
  let camMotion = null      // the camera's own motion (camera_motion): { kind, amount, speed }
  let peeking = false       // the picture editor's Show scene is on: the scene as the class sees it, no faded layers
  let framing = false       // the Camera row is selected: the canvas's pointer moves the camera at the playhead
  // a cut-out just saved joins the library on stage at once: the Assets tab shows it, a drop adds it
  const onCutouts = () => {
    if (!libData) return
    libData = withCutouts(libData)
    assets = new Map(libData.assets.map((a) => [a.id, a]))
    window.dispatchEvent(new CustomEvent('stage25d-synced'))
  }
  window.addEventListener('stage25d-cutouts', onCutouts)

  const startLoop = () => {
    stage.engine.runRenderLoop(() => {
      const now = performance.now()
      const step = Math.min(0.1, (now - last) / 1000)
      motionClock += step
      last = now
      stage.tick(now)
      if (pointer) {
        stage.fadeLayers(selectionFade(), IN_FRONT_OPACITY)
        // in the editor the camera only moves on its own when it is what you are looking at: playing, or the Camera row
        stage.cameraAlive = stills === 0 && (framing || !!window.__timelineKeying?.playing?.())
      }
      if (scene) {
        // The class is waiting on a question with the narration stopped: a fire keeps burning. In the editor a frame is
        // the playhead's, so a seek shows the same one every time (no clock there).
        const t = nowT()
        if (clock && t === heldAt) framesAhead += step
        heldAt = t
        stage.pose(scene, t, motionClock, undefined, t + framesAhead)
        world?.at(t, lookNum({ ...STAGE_LOOK, ...lookNow }, 'worldReveal'))
      }
      stage.scene.render()
      pointer?.place()
    })
  }

  /** Draw the live layers without a rebuild: only an asset swap rebuilds. */
  const redraw = () => {
    if (!scene || !stage) return
    const off = (l, id) => (hidden.has(id) ? { ...l, opacity: 0, keys: [] } : l)
    scene = { ...scene, set: { ...scene.set, groundBands: bands.map((g, n) => off(g, `band-${n}`)), skyLayer: skyNow, layers: layers.map((l, i) => off(l, `layer-${i}`)) } }
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
      // the back of the backdrop: only its motion changes (no place, size, opacity or keys: they left a hole)
      if (patch.motion === undefined) return null
      skyNow = { ...skyNow, motion: patch.motion }
      saved = { skyLayer: { motion: patch.motion } }
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
    seenEdit = liveSig()   // what the server will hold once saved: an undo then differs from it
    redraw()
    return saved
  }
  const liveSig = () => editSig({ set: { layers, groundBands: bands, skyLayer: skyNow }, camera: camNow, camera_more: camMore, camera_motion: camMotion })
  /** Layers overlapping the selected one from in front show it through, while it is being worked on (not played, not in a thumbnail). */
  const selectionFade = () => {
    const selected = pointer?.selected ?? null
    if (selected === null || stills > 0 || peeking || window.__timelineKeying?.playing?.()) return []
    return inFrontOf(layers.map((_, index) => ({ index, box: hidden.has(`layer-${index}`) ? null : stage.layerBox(index) })), selected)
  }
  const camLength = () => (scene ? sceneDuration(scene) : 8)
  const camKeysNow = () => cameraKeys(camNow, camMore, camLength())
  const camPoseNow = () => cameraPoseAt(camNow, camMore, nowT(), camLength())
  /** The camera's keys changed: live, and saved (the editor's queue keeps the last of a drag). */
  const storeCameraKeys = (keys) => {
    const [first = null, ...rest] = shotsOfKeys(keys)
    camNow = first
    camMore = rest
    if (scene) scene = { ...scene, camera: camNow, camera_more: camMore }
    cfg = cfg && { ...cfg, camera: camNow, camera_more: camMore }   // a rebuild (a layer added) starts from cfg: it keeps this framing
    seenEdit = liveSig()
    if (api.sceneId != null) opts.onCommit?.(0, { camera: camNow, camera_more: camMore }, api.sceneId)
    window.dispatchEvent(new CustomEvent('stage25d-edited'))
  }
  /** Move the camera: with auto-key on, a key at the playhead (the first one past 0 also keeps where it was at 0, so it
   *  moves from there); with it off, the key under the playhead, else the nearest. */
  const frameTo = (pose) => {
    if (!scene) return
    const t = nowT()
    const keys = camKeysNow()
    if (window.__timelineKeying?.autoKey?.() || !keys.length) {
      const seeded = !keys.length && t > 0 ? withCameraKey(keys, 0, camPoseNow()) : keys
      return storeCameraKeys(withCameraKey(seeded, t, pose))
    }
    storeCameraKeys(withCameraKey(keys, nearestCameraKey(keys, t).t, pose))
  }
  /** Framing takes the canvas's pointer and wheel before the layer picking does. */
  const attachFraming = () => {
    let pan = null
    const take = (e) => { e.preventDefault(); e.stopImmediatePropagation() }
    canvas.addEventListener('pointerdown', (e) => {
      if (!framing) return
      take(e)
      canvas.setPointerCapture?.(e.pointerId)
      pan = { x: e.clientX, y: e.clientY, pose: camPoseNow() }
      canvas.style.cursor = 'grabbing'
    }, { capture: true })
    canvas.addEventListener('pointermove', (e) => {
      if (!framing) return
      take(e)
      if (pan) frameTo(panPose(pan.pose, e.clientX - pan.x, e.clientY - pan.y, canvas.getBoundingClientRect().height))
    }, { capture: true })
    const end = (e) => { if (!pan) return; take(e); pan = null; canvas.style.cursor = framing ? 'grab' : '' }
    canvas.addEventListener('pointerup', end, { capture: true })
    canvas.addEventListener('pointercancel', end, { capture: true })
    canvas.addEventListener('wheel', (e) => { if (!framing) return; take(e); frameTo(wheelPose(camPoseNow(), e)) }, { capture: true, passive: false })
    window.addEventListener('scene-object-selected', (e) => { if (e.detail?.id !== 's25_camera') api.frameCamera(false) })
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
  /** The scene's splat world: loaded when its block changes, dropped when it goes; a failed load leaves the set as it is. */
  const syncWorld = async (w) => {
    const key = w?.src ?? null
    if (key === worldKey) { world?.place(w); return }
    worldKey = key
    world?.dispose()
    world = null
    if (!key) return
    try {
      const next = await loadWorld(stage.scene, w)
      if (destroyed || worldKey !== key) next.dispose()
      else world = next
    } catch (e) {
      console.warn('stage25d: the world did not load', w.src, e)
      if (worldKey === key) worldKey = null   // a newer world may be loading already
    }
  }

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
    const hit = stage?.pickBackdrops?.(x, y).find((h) => !hidden.has(h.band !== undefined ? `band-${h.band}` : `layer-${h.index}`) && alpha.opaque(h.asset, h.u, h.v))
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
      const lib = withCutouts(await libraryOf(cfgNow.bundle))
      if (destroyed) return
      if (!stage) {
        stage = new Stage(canvas, lib)
        startLoop()
      }
      lookNow = { ...(cfgNow.look ?? {}) }
      stage.setLook(lookNow)
      const next = stageScene(cfgNow)
      await stage.build(next, lib)
      syncWorld(cfgNow.world)   // not awaited: the set shows now, the world builds in when it has downloaded
      canvas.style.visibility = ''   // the first pictures are ready: until then the host's colour, never the empty stage's paper
      scene = next
      layers = next.set.layers
      bands = (next.set.groundBands ?? []).map((g) => ({ ...g }))
      skyNow = { ...(next.set.skyLayer ?? {}) }
      camNow = next.camera
      camMore = next.camera_more ?? []
      camMotion = next.camera_motion ?? null
      hidden = new Set()
      seenEdit = editSig(cfgNow)
      cfg = cfgNow
      assets = new Map(lib.assets.map(a => [a.id, a]))
      libData = lib
      alpha = alphaFor(lib.base)
      // a first click reads the file the stage draws: an edited copy, a figure's atlas
      alpha.prime(next.set.layers.map((l) => {
        const a = assets.get(l.asset)
        const src = a && (l.src ?? puppetOf(a, l, lib.base)?.atlas)
        return src ? { ...a, src } : a
      }).filter(Boolean))
      if (opts.editable) next.set.layers.forEach(loadFigure)
      if (opts.editable && !pointer) {
        canvas.style.pointerEvents = 'auto'
        attachFraming()
        /** Is there paint under a pick? On an animation: in the frame on show. */
        const paintAt = (a, u, v, i) => !hidden.has(`layer-${i}`) && alpha.opaque(a, u, v, isAnimation(a) ? frameAt(a, layers[i]?.play, nowT()) : undefined)
        window.addEventListener('scene-object-selected', (e) => { if (e.detail?.id !== `s25_${backdrop}`) backdrop = null })
        canvas.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes(DROP_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } })
        canvas.addEventListener('drop', (e) => {
          const id = e.dataTransfer?.getData(DROP_TYPE)
          if (!id) return
          e.preventDefault()
          const r = canvas.getBoundingClientRect()
          api.addLayer(id, { x: e.clientX - r.left, y: e.clientY - r.top })
        })
        // a double-click opens Uitknippen (editor/cutout-dialog.js) for the picture the first click selected
        // On the HOST, not the canvas: after the first click the selection frame lies over the picture, so the second
        // click of a double-click lands on the frame and never reached a canvas listener. The picture is picked again
        // under the pointer, so the double-click never depends on what the first click selected.
        host.addEventListener('dblclick', (e) => {
          const r = canvas.getBoundingClientRect()
          const x = e.clientX - r.left, y = e.clientY - r.top
          if (x < 0 || y < 0 || x > r.width || y > r.height || !stage) return
          const hit = stage.pickLayers(x, y).find((h) => paintAt(h.asset, h.u, h.v, h.index))
          // the selected picture's whole box is it: the frame of an animation on show may be small
          const box = pointer?.selected === null || pointer?.selected === undefined ? null : stage.layerBox(pointer.selected)
          const inside = box && x / r.width >= box.x0 && x / r.width <= box.x1 && y / r.height >= box.y0 && y / r.height <= box.y1
          const id = hit ? `layer-${hit.index}` : inside ? `layer-${pointer.selected}` : (backdropAt(x, y) ? backdrop : null)
          const target = id && api.editTarget(id)
          if (target) window.dispatchEvent(new CustomEvent('image-edit:open', { detail: target }))
        })
        pointer = attachInteraction({
          canvas, host, stage: () => stage, alpha: { opaque: paintAt },
          valueOf: (i, prop) => (isBoneField(prop) ? api.readLayerProp(`layer-${i}`, prop) : prop === 'z' ? zNow(i) : layerAt(layers[i], nowT())[prop]),
          boneLabel: (bone) => window.__timelineKeying?.label?.(`bone:${bone}`) ?? bone,
          onGround, byDistance,
          // the feet slide over the ground as it rises into the far landscape, at their own height above it (a ground
          // strip stays on the floor itself: layout.ts isGroundStrip)
          groundUnder: (x, y, lift, i) => groundUnderRay(stage.pointerRay(x, y), onFloor(i) ? lift : (z) => stage.groundHeightAt(z) + lift),
          footY: (i) => stage.layerFootY(i) - (onFloor(i) ? 0 : stage.groundHeightAt(zNow(i))),
          eye,
          onSettled: (i) => api.settleBand(i),
          // a press on no standing picture selects the backdrop painted there: a ground band, a far strip, the sky
          onEmpty: (x, y) => backdropAt(x, y),
          onChange: (i, prop, v, opts) => api.moveLayer(`layer-${i}`, prop, v, opts),
        })
      }
      if ((pointer?.selected ?? -1) >= layers.length) pointer.select(null)   // its layer is gone (a delete, an undo)
      heights = new Map(lib.assets.map(a => [a.id, a.height_m ?? 1.7]))
      lead = Number(cfgNow.narration_at_s) || 0
      cfgSig = structureSig(cfgNow)
      host.dataset.stage25dReady = '1'
    },
    /** What Uitknippen (editor/cutout-dialog.js) opens for one row ('layer-3', 'band-0', 'sky'): the picture as it is
     *  drawn now, and what it was cut from, so a cut-out keeps its real size in metres (Cutouts::heightM). */
    editTarget (id) {
      const row = id === 'sky' ? (cfg?.set?.sky ? skyNow : null) : bandIndex(id) >= 0 ? bands[bandIndex(id)] : layers[layerIndex(id)]
      const asset = id === 'sky' ? skyAsset() : assets.get(row?.asset)
      if (!row || !asset || !libData) return null
      const puppet = layerIndex(id) >= 0 ? puppetOf(asset, row, libData.base) : null
      const onPage = (url) => new URL(url, location.href).href
      return {
        id: `s25_${id}`,
        title: api.items().find((r) => r.id === id)?.label ?? layerLabel({}, asset, (document.documentElement.lang || 'en').slice(0, 2)),
        original: row.src ? new URL(row.src, location.href).href : puppet ? new URL(puppet.atlas, location.href).href : libData.base + asset.file,
        // an edited copy has its own pixel size: no metres from the library's
        from: row.src ? null : { bundle: libData.bundle, asset: asset.id },
        edited: !!row.src,
        el: host,
        stage: api,
        stageId: id,
        // a sky or a landscape: white in it is paint, nothing to clean away on opening
        // and a boned figure's paper is its sheet's: cleaning would write on it unasked
        plain: !!puppet || id === 'sky' || bandIndex(id) >= 0 || ['sky', 'bg'].includes(asset.layer),
        // a boned figure: the editor shows it whole and saves onto this sheet (`atlas`: the sheet it had at first)
        puppet: puppet ? { ...puppet, atlas: onPage(puppet.atlas), sheet: onPage(row.src ?? puppet.atlas) } : null,
        // an animation on a layer: its sheet and how this layer plays it (the editor's Frames tab)
        frames: layerIndex(id) >= 0 && isAnimation(asset) ? { ...animOf(asset), loop: asset.loop !== false, play: row.play ?? null } : null,
      }
    },
    /** The picture editor's Show scene: the scene as the class sees it, with the editor on top. */
    setPeeking (on) { peeking = !!on },
    /** The picture editor's work on the stage before it is saved; null: the row's own file again. */
    showPicture (id, url) {
      const row = id === 'sky' ? { sky: true } : bandIndex(id) >= 0 ? { band: bandIndex(id) } : layerIndex(id) >= 0 ? { layer: layerIndex(id) } : null
      return row ? stage?.showPicture(row, url) : null
    },
    /** Where the scene stands now, in seconds. */
    get time () { return nowT() },
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
        for (const f of Object.keys(next)) if (isBoneField(f)) delete next[f]
        Object.assign(next, boneFields(from))
        return next
      }
      layers = layers.map((l, i) => take(l, cfgNow.set?.layers?.[i]))
      bands = bands.map((g, i) => take(g, cfgNow.set?.groundBands?.[i]))
      skyNow = take(skyNow, cfgNow.set?.skyLayer)
      camNow = cfgNow.camera ?? null
      camMore = cfgNow.camera_more ?? []
      camMotion = cfgNow.camera_motion ?? null
      scene = scene ? { ...scene, camera: camNow, camera_more: camMore, camera_motion: camMotion } : scene
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
      if (l && isBoneField(prop)) return bonesAt(l, nowT())[prop.slice(5)] ?? 0
      const v = !l ? null : prop === 'z' && layerIndex(id) >= 0 ? zNow(layerIndex(id)) : prop === 'z' ? (layerAt(l, nowT()).z ?? l.z) : layerAt(l, nowT())[prop]
      return Number.isFinite(v) ? v : null
    },
    setHidden (id, off) {
      if (layerIndex(id) < 0 && bandIndex(id) < 0) return
      hidden = new Set(off ? [...hidden, id] : [...hidden].filter((h) => h !== id))
      redraw()
    },
    /** The editor poses the scene at t seconds. */
    update (t) {
      clock = null; manualT = Math.max(0, t)
    },
    /** The player follows a clock (the narration's currentTime). */
    play (getT) { clock = () => lead + getT() },
    /** A drag on the canvas changed a layer's x, scale or angle: through the timeline when it is keyed, else on the layer.
     *  `hold`: show it, save nothing yet (a gesture still going on); `done`: the gesture's last value, saved now. */
    moveLayer (id, prop, value, { hold = false, done = false } = {}) {
      if (window.__timelineKeying?.edit?.(`s25:${id}`, prop, value, { flush: done, hold })) return
      if (hold) api.setLayerProp(id, prop, value)
      else api.commitLayerProp(id, prop, value)
    },
    /** Select a layer by editor id (a timeline row was clicked); the canvas draws its box. A backdrop row (the sky, a
     *  ground band) has no box: it is the selection for the panel and the Assets tab. */
    select (id) {
      if (id === 'camera') {
        backdrop = null
        pointer?.select(null)
        api.frameCamera(true)
        window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: 's25_camera' } }))
        return
      }
      api.frameCamera(false)
      backdrop = isBackdrop(id) ? id : null
      pointer?.select(layerIndex(id) >= 0 ? layerIndex(id) : null, !backdrop)
      if (backdrop) window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: `s25_${backdrop}` } }))
    },
    /** The parts of the scene with no picture yet: 'sky', 'ground'. */
    get empty () {
      const set = cfg?.set
      if (!set) return []
      const bare = String(set.ground ?? '').startsWith('#') && !set.groundSlots?.length && !set.groundBands?.length
      return [...(set.sky ? [] : ['sky']), ...(bare ? ['ground'] : [])]
    },
    get skySelected () { return backdrop === 'sky' },
    /** The selected backdrop row ('sky', 'band-<n>'), or null. */
    get backdrop () { return backdrop },
    get selection () { return pointer?.selected ?? null },
    /** Another scene is opening: nothing stays selected from the one before. */
    clearSelection () { pointer?.select(null); api.frameCamera(false) },
    /** The canvas's pointer moves the camera at the playhead (the Camera row is selected), or picks layers again. */
    frameCamera (on) {
      framing = !!on
      canvas.style.cursor = framing ? 'grab' : ''
      window.dispatchEvent(new CustomEvent('stage25d-edited'))
    },
    /** What the Camera panel and row show: its keys, and the pose at the playhead (the still house camera with no move). */
    cameraInfo: () => ({ moves: !!camNow, keys: camKeysNow(), pose: camPoseNow(), motion: { kind: 'none', amount: 1, speed: 1, ...camMotion } }),
    /** The camera move's start and end poses (one pose for a still camera). */
    cameraEnds () {
      const keys = camKeysNow()
      return keys.length ? { from: keys[0].pose, to: keys.at(-1).pose } : { from: camPoseNow(), to: camPoseNow() }
    },
    /** One end of the move as its panel section shows it: where, how big its frame is, how far it leans. */
    cameraEnd (end) {
      const p = api.cameraEnds()[end === 'to' ? 'to' : 'from']
      return { x: p.x, y: p.y, size: frameSize(p), roll: p.roll ?? 0 }
    },
    /** Change one end of the move from its section ({ x, y, size, roll }). A still camera gets its first key; an End
     *  on a still camera makes a move to it over the scene. Live, and saved. */
    setCameraEnd (end, patch) {
      if (!scene) return
      const keys = camKeysNow()
      const { from, to } = api.cameraEnds()
      const { size, ...rest } = patch
      const base = clampPose({ ...(end === 'to' ? to : from), ...rest })
      const pose = size === undefined ? base : withFrameSize(base, size)
      if (end !== 'to') return storeCameraKeys(withCameraKey(keys, keys[0]?.t ?? 0, pose))
      const last = keys.length > 1 ? keys.at(-1).t : camLength()
      storeCameraKeys(withCameraKey(keys.length ? keys : [{ t: 0, pose: from }], last, pose))
    },
    /** The camera panel's preview: the set from a wider camera that sees the start and end frames, as a small JPEG
     *  `{ src, view, aspect }`. Drawn off screen from a second camera, so the canvas never shows it. */
    async cameraPreview (width = 480) {
      if (!stage || !scene || !canvas.width) return null
      const aspect = canvas.width / canvas.height
      const { from, to } = api.cameraEnds()
      const view = cameraOverview([from, to], aspect)
      const { CreateScreenshotUsingRenderTargetAsync } = await import('@babylonjs/core/Misc/screenshotTools')
      await stage.scene.whenReadyAsync()
      const cam = stage.camera.clone('s25-camera-preview')
      cam.position.set(view.x, view.y, view.z)
      cam.fov = (view.fov * Math.PI) / 180
      cam.rotation.z = 0
      stills++
      stage.gridHidden = true   // the editor's grid is not part of the scene
      try {
        const src = await CreateScreenshotUsingRenderTargetAsync(stage.engine, cam, { width, height: Math.round(width / aspect) }, 'image/jpeg', 1, false, undefined, true, false, false, 0.72)
        return { src, view, aspect }
      } catch {
        return null   // no preview beats a broken one: the frames still show on the plain panel
      } finally {
        cam.dispose()
        stage.gridHidden = --stills > 0
      }
    },
    /** Where the start and end frames sit in a preview (frameIn: fractions of it); no preview: in the one it would draw. */
    cameraFrames (preview = null) {
      const { from, to } = api.cameraEnds()
      const aspect = preview?.aspect ?? (canvas.width && canvas.height ? canvas.width / canvas.height : 16 / 9)
      const view = preview?.view ?? cameraOverview([from, to], aspect)
      return { from: frameIn(view, from, aspect), to: frameIn(view, to, aspect) }
    },
    /** The camera's own motion: live, and saved. */
    setCameraMotion (patch) {
      camMotion = { kind: 'none', amount: 1, speed: 1, ...camMotion, ...patch }
      if (scene) scene = { ...scene, camera_motion: camMotion }
      cfg = cfg && { ...cfg, camera_motion: camMotion }
      seenEdit = liveSig()
      if (api.sceneId != null) opts.onCommit?.(0, { cameraMotion: camMotion }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-edited'))
    },
    /** One value of the camera typed in its row: the same edit as a drag. */
    setCameraValue (property, value) { frameTo({ ...camPoseNow(), [property]: value }) },
    /** The diamond on a camera row: a key under the playhead goes, else one comes with the pose on screen. */
    toggleCameraKey () {
      const t = nowT()
      const keys = camKeysNow()
      const rest = withoutCameraKey(keys, t)
      storeCameraKeys(rest.length < keys.length ? rest : withCameraKey(keys, t, camPoseNow()))
    },
    /** A camera key dragged along the timeline: its pose stays, its time changes. Returns where it landed. */
    moveCameraKey (from, to) {
      const { keys, t } = movedCameraKey(camKeysNow(), from, to, camLength())
      storeCameraKeys(keys)
      return t
    },
    /** Another pose on the camera key at t (Paste values). */
    setCameraKeyPose (t, pose) { storeCameraKeys(withCameraKey(camKeysNow(), t, pose)) },
    removeCameraKey (t) { storeCameraKeys(withoutCameraKey(camKeysNow(), t)) },
    /** Back to the still house camera: no move. */
    resetCamera () { storeCameraKeys([]) },
    /** Is the stage at the scene's first frame with nothing hidden? Only then is its picture a thumbnail of the scene. */
    atStart () { return manualT === 0 && clock === null && hidden.size === 0 && !framing },
    /** What the inspector shows for a layer: its name, picture, depth and motion. */
    layerInfo (id) {
      const motionOf = (l, a) => {
        const own = typeof l.motion === 'string' ? { kind: l.motion } : (l.motion ?? {})
        return { kind: own.kind ?? defaultMotion(a), amount: own.amount ?? 1, speed: own.speed ?? 1 }
      }
      // fields: the values its panel offers. The sky moves up and down; a ground band stands at a distance, always
      // on the floor; a far strip moves across, up and away; a picture on the ground moves along it.
      if (id === 'sky') {
        const sky = skyAsset()
        return sky ? { id, asset: sky.id, depth: 'sky', figure: null, backdrop: true, role: 'sky', fields: [], label: layerLabel({}, sky, (document.documentElement.lang || 'en').slice(0, 2)), file: skyNow.src ?? `${libData.base}${sky.file}`, motion: motionOf(skyNow, sky) } : null
      }
      if (bandIndex(id) >= 0) {
        const band = bands[bandIndex(id)]
        const a = assets.get(band.asset)
        return { id, asset: band.asset, depth: 'bg', figure: null, backdrop: true, role: 'band', fields: ['z', 'scale', 'opacity'], label: api.items().find((row) => row.id === id)?.label ?? '', file: band.src ?? (a ? `${libData.base}${a.file}` : null), motion: motionOf(band, a) }
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
        // the edited copy, when there is one; a figure of parts is shown whole, never its atlas
        file: asset?.file && puppetOf(asset, l) ? figureUrl(l) ?? `${libData.base}${asset.file}` : l.src ?? (asset ? `${libData.base}${asset.file}` : null),
        motion: motionOf(l, asset),
        anim: animOf(asset),
        puppet: !!puppetOf(asset ?? {}, l),
        play: { speed: l.play?.speed ?? 1, offset: l.play?.offset ?? 0 },
        ink: { outline: l.outline ?? 0, etch: l.etch ?? 0 },
      }
    },
    /** A picture's ink: its outline (px) and etched shadow (0..1). Live, and saved on the layer. */
    setLayerInk (id, patch) { if (layerIndex(id) >= 0) commit(id, patch) },
    /** An animation's playback on one layer: speed (its fps scale) and where it starts (seconds). Live, and saved. */
    setLayerPlay (id, play) {
      const now = valuesOf(id)
      if (!now) return
      commit(id, { play: { ...(now.play ?? {}), ...play } })
    },
    /** Motion of one layer: kind, amount, speed. Live, and saved on the layer. */
    setLayerMotion (id, motion) {
      // from what the row shows: a row with no motion of its own has its picture's, and the server takes no motion without a kind
      const shown = api.layerInfo(id)?.motion
      if (shown) commit(id, { motion: { ...shown, ...motion } })
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
    /** The library on stage, for the asset browser: [{ id, layer, file, url, thumb, label }]. */
    library () {
      if (!libData) return null
      const lang = (document.documentElement.lang || 'en').slice(0, 2)
      // a sprite sheet (the ground's clumps) is cut into its cells, never placed whole
      return { bundle: libData.bundle, assets: libData.assets.filter((a) => a.kind !== 'sheet' && !a.removed).map((a) => ({ id: a.id, cutout: !!a.cutout, layer: a.layer, shelf: shelfOf(a), anim: animOf(a), band: isBandPicture(a), tags: a.tags ?? [], url: libData.base + a.file, thumb: thumbOf(a), label: layerLabel({}, a, lang) })) }
    },
    /** The Assets tab's tiles for these library rows (library().assets, filtered): one tile per series. */
    tiles: (rows) => libraryTiles(rows),
    /**
     * The series of a layer's picture, for its panel: its other pictures (poses, facings) and the other characters it
     * can become. null when the layer is no figure of a series.
     */
    seriesOfLayer (id) {
      const a = assets.get(layers[layerIndex(id)]?.asset)
      const series = seriesOf(a)
      if (!series || !libData) return null
      const lang = (document.documentElement.lang || 'en').slice(0, 2)
      const l = layers[layerIndex(id)]
      const own = puppetOf(a, l) ? figureUrl(l) : l.src ?? null   // a pose the teacher edited shows as edited; a boned figure's src is its parts sheet, so it shows put together
      const row = (m) => ({ id: m.id, url: libData.base + m.file, thumb: own && m.id === a.id ? own : thumbOf(m), ...poseOf(m) })
      return {
        series,
        asset: a.id,
        members: membersOf(libData.assets, a).map(row),
        characters: charactersOf(libData.assets).map((c) => ({ series: c.series, url: libData.base + c.asset.file, thumb: thumbOf(c.asset), label: layerLabel({}, c.asset, lang) })),
      }
    },
    /** Another character on a layer, in the same pose and facing when it has them (one swap, one undo step). */
    async switchCharacter (id, series) {
      const a = assets.get(layers[layerIndex(id)]?.asset)
      const to = a && libData ? sameStanceIn(libData.assets, a, series) : null
      if (to) await api.swapAsset(id, to.id)
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
        if (!a || !isBandPicture(a) || band.asset === assetId) return   // a band takes only a wide strip of ground (layout.ts isBandPicture)
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
      // an edited copy belongs to the picture it was made from: kept, it drew over every pose picked after it
      layers = layers.map((l, n) => {
        if (n !== i) return l
        const { src, edit_state: editState, original_src: originalSrc, ...rest } = l
        return { ...rest, asset: assetId }
      })
      await api.show({ ...cfg, set: liveSet() })
      opts.onCommit?.(i, { asset: assetId }, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
    },
    /** A new layer from a library picture, standing on the ground where it was dropped (snapped to the grid), else
     *  mid-view at its own band's distance. Saved at the end of the layers. */
    async addLayer (assetId, at = null) {
      const a = assets.get(assetId)
      if (!a) return
      // a character without a drop point stands near enough to read (fg), a step beside the ones added before it
      const depth = ['mid', 'fg', 'near', 'bg', 'sky'].includes(a.layer) ? a.layer : a.layer === 'figure' ? 'fg' : 'mid'
      const beside = at ? 0 : layers.filter((l) => l.asset === assetId).length
      let layer = { asset: assetId, depth, x: 0.5 + 0.08 * (beside % 5), scale: 1 }
      if (!(a.tileable_x || a.layer === 'bg' || a.layer === 'sky')) {
        const hit = at && stage ? groundUnderRay(stage.pointerRay(at.x, at.y), floorOnly({}, a) ? 0 : (z) => stage.groundHeightAt(z)) : null
        const spot = layerOf(settle(hit ?? groundOf(layer.x, DEPTH_Z[depth])))
        layer = { ...layer, ...spot, depth: bandOf(spot.z) }
      }
      // a character added from the shelf stands where the one in view stands, so the two are the same height
      if (!at && a.layer === 'figure' && stage) {
        const figures = layers.flatMap((l, index) => (assets.get(l.asset)?.layer === 'figure' && !hidden.has(`layer-${index}`) ? [{ index, box: stage.layerBox(index) }] : []))
        const seen = figureInView(figures, pointer?.selected ?? null)
        if (seen !== null) {
          const now = layerAt(layers[seen], nowT())
          layer = { asset: assetId, depth: layers[seen].depth, x: now.x, ...(Number.isFinite(now.y) ? { y: now.y } : {}), z: zNow(seen), scale: now.scale ?? 1 }
        }
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
    /** The floor's ground pictures near to far (rows: the scene's own, else its one ground) and the bundle's grounds to
     *  pick from (options), at most `max` rows. */
    groundSlots () {
      if (!libData || !cfg) return null
      const lang = (document.documentElement.lang || 'en').slice(0, 2)
      const rows = groundSlots(cfg.set ?? { layers: [] }, libData).map((sl) => ({ asset: sl.asset.id, from_m: sl.from }))
      const options = libData.assets.filter((a) => a.layer === 'ground').map((a) => ({ id: a.id, label: layerLabel({}, a, lang), thumb: thumbOf(a) }))
      return { rows, options, max: GROUND_SLOTS_MAX }
    },
    /** New ground pictures for the floor: rebuilt on stage, saved (onGroundSlots). The nearest always starts at 0 m. */
    async setGroundSlots (rows) {
      if (!cfg || !Array.isArray(rows)) return
      const slots = rows.slice(0, GROUND_SLOTS_MAX).map((r, i) => ({ asset: String(r.asset), from_m: i === 0 ? 0 : Math.max(0, Math.min(2000, Number(r.from_m) || 0)) }))
      const keep = hidden
      const { ground, ...set } = liveSet()   // a bare floor's colour would wash over the picture
      await api.show({ ...cfg, look: lookNow, set: { ...set, ...(String(ground ?? '').startsWith('#') ? {} : { ground }), groundSlots: slots } })   // the sliders' live values too
      hidden = keep
      redraw()
      if (api.sceneId != null) opts.onGroundSlots?.(slots, api.sceneId)
      window.dispatchEvent(new CustomEvent('stage25d-synced'))
    },
    /** The world's placement, for the World section: null when the scene has none. */
    worldInfo () {
      return cfg?.world?.src ? { ...WORLD_PLACE_DEFAULTS, ...cfg.world } : null
    },
    /** Move the world: live on the stage, saved on the scene (onWorld). */
    setWorld (patch) {
      if (!cfg?.world?.src) return
      cfg = { ...cfg, world: { ...cfg.world, ...patch } }
      world?.place(cfg.world)
      for (const [key, value] of Object.entries(patch)) opts.onWorld?.(key, value, api.sceneId)
    },
    /** The scene look sliders: [{ key, value, min, max, step }]. */
    lookControls () {
      const can = stage?.strewable ?? { grass: true, bushes: true }
      // only what can show in this scene: no grass on a deck, nothing in a sky that is not there. The values stay, for a ground swapped back
      const offered = { grass: can.grass, grassSway: can.grass || can.bushes, horizonBushes: can.bushes, birds: !!cfg?.set?.sky, cloudDrift: !!cfg?.set?.sky, worldReveal: !!cfg?.world?.src }
      return LOOK_KEYS.filter((key) => offered[key] !== false).map((key) => {
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
    figureBox (char, whole = false) {
      const layer = layers.find(l => l.figure === char)
      if (!layer?.asset) return null
      if (whole) {   // the whole picture as drawn now: a mouth found on the picture lands on it in any pose
        const b = stage?.layerBox(layers.indexOf(layer))
        const c = canvas.getBoundingClientRect()
        return b ? new DOMRect(c.left + b.x0 * c.width, c.top + b.y0 * c.height, (b.x1 - b.x0) * c.width, (b.y1 - b.y0) * c.height) : null
      }
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
      // a figure of parts says so: two Pieters on one stage are told apart by which one has bones
      const named = (l, i) => {
        const name = layerLabel(l, assets.get(l.asset), lang) || `layer ${i + 1}`
        return puppetOf(assets.get(l.asset) ?? {}, l) ? `${name} (${BONES_NAME[lang] ?? BONES_NAME.en})` : name
      }
      const labels = numbered([
        ...layers.map(named),
        ...bands.map((g) => layerLabel({}, assets.get(g.asset) ?? { id: g.asset }, lang)),
      ])
      return [
        ...layers.map((l, i) => ({ id: `layer-${i}`, label: labels[i], icon: assetIcon(assets.get(l.asset)), depth: l.depth, z: l.z ?? DEPTH_Z[l.depth], keys: l.keys ?? [] })),
        ...bands.map((g, n) => ({ id: `band-${n}`, label: labels[layers.length + n], icon: 'photo', depth: 'bg', z: g.z, keys: g.keys ?? [], backdrop: true })),
        ...(cfg?.set?.sky ? [{ id: 'sky', label: SKY_NAME[lang] ?? 'Sky', icon: 'cloud', depth: 'sky', keys: skyNow.keys ?? [], backdrop: true }] : []),
        { id: 'camera', label: CAMERA_NAME[lang] ?? 'Camera', icon: 'camera', depth: null, keys: [] },
      ]
    },
    destroy () {
      destroyed = true
      window.removeEventListener('stage25d-cutouts', onCutouts)
      delete host.dataset.stage25dReady
      world?.dispose()
      try { stage?.engine.stopRenderLoop(); stage?.scene.dispose(); stage?.engine.dispose() } catch (_) { /* context already lost */ }
      pointer?.destroy()
      canvas.remove()
    },
  }
  return api
}
