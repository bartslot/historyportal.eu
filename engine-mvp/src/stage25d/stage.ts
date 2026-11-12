// The 2.5D stage: painted layers on depth planes in front of a fixed house camera, the storybook look over the
// whole frame, and a lesson's scenes played one after another with their camera and layer keyframes.
//   const player = await playLesson(lessonOrUrl, libraryUrl?, canvas?)
//   player.pause() / resume() / seek(sceneIndex, t) / seekToScene(id) / clock() / onInteraction(fn) / subscribe(fn)
//   player.doc (undoable teacher edits) / stage.groundPoint(x, depth)
import '../globals-core'                  // the engine modules read Babylon from window.BABYLON
import '../engine/look-shaders.js'
// Babylon by its module paths (the barrel was 8.4 MB). These add the scene methods the stage calls:
import '@babylonjs/core/Culling/ray'                                 // scene.pick / multiPick / createPickingRay
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'   // ShadowGenerator on a scene
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Constants } from '@babylonjs/core/Engines/constants'
import { Engine } from '@babylonjs/core/Engines/engine'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene as BScene } from '@babylonjs/core/scene'
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh'
import type { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { createLookChain, PRESETS } from '../engine/look-chain.js'
import { aliveOf, houseProjection, inkScale, lineOf, lookNum, paperOf, type Line, type Paper, pxPerMetre, pxUV, STAGE_SHEET } from './look'
import { makeSheet } from './sheet'
import { libraryUrlFor, loadLibrary, resolveAsset } from './library'
import { STAIN_SLOT_GAP, skyCover, distanceOf, ADAPT_STALL_MS, ADAPT_WINDOW_MS, autoHorizon, bandBottom, cameraWobble, bandPose, bandHeight, cameraFront, bandSlot, bandWidth, BAND_REPEAT, tileU, DECAL_LIFT_M, DECAL_SLOT, groundHeight, isGroundStrip, LAND_TARGET, landHeight, liesFlat, stripBottom, breathe, cameraAt, nextTier, shotAt, stainIndex, TIER0, type Tier, DEPTH_Z, fovRad, HOUSE, HOUSE_PITCH_DEG, layerAt, motionOf, placeLayer, renderScale, sceneDuration, viewWidthAt, bonesAt } from './layout'
import { uvsUnder } from './pick'
import { cellOf, editedAsset, frameAt, isAnimation } from './sprite'
import { blinker, blinkOf, seedOf } from './blink'
import { bandColours, edgeColours, inkLevels, landTops, loadPremultiplied, makeLayer, pictureTexture, restDrawing, skylines, type LayerHandle } from './layer'
import { alphaOf, bindMappedPicture, bindPicture, bindPuppet, puppetOf, type BentPicture, type BentPuppet } from './bones'
import { bandAt, defaultNear, featherOf, GROUND_TILE_M, groundSlots, type GroundSlot, hexRgb, slotAt, PAPER as PAPER_HEX, resolveGround, STAIN_DEFAULT, stainSize } from './ground'
import { makeGround, makeStain, nearWrapU, type FloorSlot, type GroundLook } from './ground-gl'
import { spritesOf } from './scatter'
import { makeStrewn, type Strewn } from './scatter-gl'
import { strewPlan } from './strew'
import { LessonDoc } from './edits'
import { daylightOf, elevationOf, isDynamic, type Light, type RGB } from './daylight'
import { BUILT_IN_CLOUD_BASE, BUILT_IN_CLOUDS, cloudArt, cloudPlan, type CloudSpot } from './clouds'
import { makeSky } from './sky-gl'
import { isSoil, NO_RECOLOUR, soilRecolour } from './soil'
import { Timeline, type InteractionHandler, type Mode } from './timeline'
import type { Asset, Depth, GroundBand, Lesson, Library, Scene, SceneLayer } from './types'

/** The stage's own look: History Lines pencil lines on 3D edges, a light paper grain over everything. */
export const STAGE_LOOK: Record<string, number | string> = { ...PRESETS['History Lines pencil'], paper: 0.35, granulation: 0.2, ...STAGE_SHEET }
const PAPER = new Color4(0.937, 0.914, 0.863, 1)
type Stain = ReturnType<typeof makeStain>
/** Where a terrain's horizon strip stands (metres) and how much of its painted height it keeps: full width, low,
 *  standing on the floor (a band's Size would shrink it both ways and lift it off the floor) */
const HORIZON_BAND = { z: 900 }
const HORIZON_SQUASH = 0.12
interface Band { handle: LayerHandle; z: number; w: number; h: number; skyline: number; index: number; asset: Asset; band: GroundBand; colour: RGB | null }   // index: in set.groundBands; z: where it stands now
interface Built { layer: SceneLayer; index: number; builtScale: number; builtZ: number; handle: LayerHandle; uvFit?: readonly [number, number]; asset: Asset; order: number; stain?: Stain; stainDepth?: (z: number) => number; ink?: number; flat: boolean; skyline?: number; bent?: BentPicture | null; blink?: (time: number) => number; ghost?: string }  // index -1 = the sky
/** How far the paper wash floor is tinted toward the far landscape's own ground colour */
const GROUND_WASH = 0.7
const mix3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number]
const mul3 = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v * b[i]) as RGB
const WHITE: RGB = [1, 1, 1]
/** The box a scene's own sky takes: a tiled sky's (placeLayer covers the view, a camera move never finds its edge). */
const OWN_SKY: Asset = { id: 'sky:own', layer: 'sky', tags: [], file: '', w: 16, h: 9, anchor: [0.5, 1], height_m: 0, tileable_x: true }
/** The sun's disc, as a share of the house frame's height; the moon's a little smaller. */
const SUN_R = 0.032
/** How far the sun glows around its disc at each time (the moon only a little). */
const SUN_GLOW = { dawn: 0.9, day: 0.6, dusk: 1, night: 0.2 }
/** One cloud on stage: its picture and where it floats. */
interface Cloud { handle: LayerHandle; spot: CloudSpot; layer: SceneLayer }

export class Stage {
  readonly engine: Engine
  readonly scene: BScene
  readonly camera: UniversalCamera
  private ground: ReturnType<typeof makeGround>
  private built: Built[] = []
  /** the colour the floor fades into at the horizon; far strips paint their lower edge into it */
  private horizonTint: [number, number, number] = hexRgb(PAPER_HEX)
  /** the scene's first far strip: where its land starts, its placed height, its slot (set.horizon 'auto') */
  private strip: { top: number; h: number; order: number } | null = null
  private nearTex: RawTexture | null = null
  private bands: Band[] = []
  private shownPictures = new Map<LayerHandle, RawTexture>()   // the editor's unsaved pictures on stage (showPicture)
  private pictureToken = 0
  /** grass clumps and horizon bushes (look Gras / Horizon), and what they are strewn from */
  private strewn: Strewn[] = []
  private strewSrc: { sceneId: string; slots: GroundSlot[]; colours: [number, number, number][]; bandTags: string[] | null; front: number; sprites: ReturnType<typeof spritesOf>; tex: Map<string, RawTexture> } | null = null
  private strewKey = ''
  private hasSky = true
  /** the scene's own sky (set.daylight), and its clouds; off for a scene with a painted sky picture */
  private ownSky: ReturnType<typeof makeSky>
  private dynamicSky = false
  private clouds: Cloud[] = []
  private cloudSrc: { sceneId: string; art: Asset[]; tex: Map<string, RawTexture> } | null = null
  private cloudKey = ''
  /** where the built-in clouds are served from (the app's public folder) */
  cloudBase = BUILT_IN_CLOUD_BASE
  /** the time of day the scene is lit by (daylight.ts), and what it was made from: relit when that changes */
  light: Light = daylightOf(undefined)
  private soilKey: string | null = null
  private lightKey: unknown = null
  private soilKey: string | null = null
  private skyAsset: Asset | null = null
  /** what the floor's look is made from, kept so a new time of day relights it without a rebuild */
  private groundIn: { slots: (FloorSlot & { asset: Asset })[]; far: RGB | null | undefined; banded: boolean; wash?: string; lib: Library; measuredHaze: RGB | null; tileFoot: RGB | null } | null = null
  private hemi: HemisphericLight
  private sunLamp: DirectionalLight
  private footTint: [number, number, number] = hexRgb(PAPER_HEX)
  private nearAsset: Asset | null = null
  /** the sky's own colour where it meets the floor: far layers' lines and washes go toward it (look.ts haze) */
  private hazeTint: [number, number, number] = hexRgb(PAPER_HEX)
  /** the library the scene on screen was built from (its own bundle, else the lesson's) */
  sceneLib: Library & { base: string }
  private buildToken = 0
  private look: Record<string, number | string> = { ...STAGE_LOOK }
  /** per scene: needs no asset matched, and assets whose file did not load (feeds needed_assets) */
  private missed = new Map<string, { need: unknown; reason: string }[]>()
  get misses() { return [...this.missed].flatMap(([scene, list]) => list.map((m) => ({ scene, ...m }))) }

  constructor(readonly canvas: HTMLCanvasElement, readonly lib: Library & { base: string }) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true) // device pixels: crisp
    this.scene = new BScene(this.engine)
    this.scene.clearColor = PAPER
    this.camera = new UniversalCamera('house', new Vector3(0, 1.6, 0), this.scene)
    this.camera.rotation.set((HOUSE_PITCH_DEG * Math.PI) / 180, 0, 0)
    this.camera.minZ = 0.1
    this.camera.maxZ = 2000
    // light for 3D figures (S3); the painted layers are unlit
    this.hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), this.scene)
    this.hemi.intensity = 0.7
    this.sunLamp = new DirectionalLight('sun', this.sunDir, this.scene)
    this.sunLamp.intensity = 1.2
    this.sceneLib = lib
    this.ownSky = makeSky(this.scene)
    this.ownSky.mesh.setEnabled(false)
    this.ground = makeGround(this.scene)
    this.ground.set(this.groundLook([], null, lib))
    createLookChain(this.scene, this.camera, {
      num: (k: string) => Number(this.look[k] ?? 0),
      inkColor: () => String(this.look.inkColor ?? 'pencil'),
      texture: () => null,
    })
    makeSheet(this.camera, (k) => Number(this.look[k] ?? 0))   // after the chain: the one paper sheet under it all
    this.fit()
    // a new size empties the canvas until the next frame and the page shows through it: draw in the same tick
    window.addEventListener('resize', () => {
      if (this.scene.isDisposed) return
      this.fit()
      this.scene.render()
    })
  }

  /** Longest render side in device px (1080p by default; Retina at full ratio costs 4x the fill). */
  renderCap = 1920
  /** The adaptive tier (rules: ADAPT / nextTier in layout.ts): notches stepped down, lock after flip-flops. */
  tier: Tier = TIER0
  get notches() { return this.tier.notches }
  /** Probes force a size: counts as a change, so the 20 s / one-per-minute rules apply to it too. */
  set notches(n: number) { this.tier = { ...this.tier, notches: n, fast: 0, lastChange: performance.now() } }
  adaptive = true
  private window = { start: 0, frames: 0, last: 0 }

  /** Sharp up to the device's pixels, under the cap, minus the adaptive notches. The painted look hides the rest. */
  fit() {
    this.engine.setHardwareScalingLevel(1 / this.scaleAt(this.tier.notches))
    this.engine.resize()
  }

  private scaleAt(notches: number) {
    const longest = Math.max(this.canvas.clientWidth, this.canvas.clientHeight, 1)
    return renderScale(longest, window.devicePixelRatio || 1, this.renderCap, notches)
  }

  /** A teacher's Sharpness choice starts the tier afresh (unlocked). */
  setRenderCap(cap: number) { this.renderCap = cap; this.tier = TIER0; this.window.start = 0; this.fit() }

  /** Count a frame; each finished 2 s window goes through nextTier. A window with a stall (texture upload, hidden
   *  tab) says nothing about speed and is dropped. */
  tick(now: number) {
    const w = this.window
    const stalled = document.hidden || (w.last && now - w.last > ADAPT_STALL_MS)
    w.last = now
    if (!w.start || stalled) { Object.assign(w, { start: now, frames: 0 }); return }
    w.frames++
    if (now - w.start < ADAPT_WINDOW_MS) return
    const fps = (w.frames * 1000) / (now - w.start)
    Object.assign(w, { start: now, frames: 0 })
    if (!this.adaptive) return
    const before = this.tier.notches
    this.tier = nextTier(this.tier, fps, now, this.scaleAt(before + 1) < this.scaleAt(before))
    if (this.tier.notches !== before) this.fit()
  }

  setLook(look: Record<string, number | string> | undefined) { this.look = { ...STAGE_LOOK, ...(look ?? {}) } }

  /** World point of a ground spot: x 0..1 across the house view at that depth (for figures). */
  groundPoint(x: number, depth: Depth): Vector3 {
    const z = DEPTH_Z[depth]
    return new Vector3((x - 0.5) * viewWidthAt(z), 0, z)
  }

  /** Load and decode a scene's pictures into the texture cache build() reads (loadPremultiplied), without showing
   *  anything: the player calls it for the NEXT scene while this one plays, so a change of set does not stall. */
  async preload(s: Scene, lib: Library & { base: string } = this.lib): Promise<void> {
    const urls = new Set<string>()
    const layers = [...(s.set.sky ? [skyLayerOf(s)] : []), ...s.set.layers]
    for (const layer of layers) {
      const asset = resolveAsset(lib, layer, layer.depth)
      if (asset) urls.add(layer.src ?? puppetOf(asset, layer, lib.base)?.atlas ?? urlOf(lib, asset, layer))
      const blink = asset ? blinkOf(asset, layer, lib.base) : null
      if (blink) urls.add(blink.url)
    }
    for (const sl of groundSlots(s.set, lib)) urls.add(lib.base + sl.asset.file)
    for (const g of s.set.groundBands ?? []) {
      const found = resolveAsset(lib, { asset: g.asset }, 'ground_band')
      if (found) urls.add(urlOf(lib, found, g))
    }
    const nearId = defaultNear(s.set.near, lib)
    const near = nearId ? resolveAsset(lib, { asset: nearId }) : null
    if (near) urls.add(lib.base + near.file)
    // one at a time: the decode runs on the main thread, under the scene that is playing now
    for (const url of urls) await loadPremultiplied(url, this.scene).catch(() => null)
  }

  /** Build a scene's set hidden, then swap it in whole: the old set stays on screen until every texture is ready. */
  async build(s: Scene, lib: Library & { base: string } = this.lib): Promise<void> {
    const token = ++this.buildToken
    const next: Built[] = []
    const wanted: { layer: SceneLayer; order: number; index: number }[] = []
    // a scene with its own sky (set.daylight) draws it itself (sky-gl.ts): no picture to load
    const dynamic = isDynamic(s.set)
    this.hasSky = dynamic || !!s.set.sky
    if (s.set.sky && !dynamic) wanted.push({ layer: skyLayerOf(s), order: 0, index: -1 })
    const perDepth: Record<string, number> = { sky: 1 }
    s.set.layers.forEach((layer, index) => { const d = layer.depth; perDepth[d] = perDepth[d] ?? 0; wanted.push({ layer, order: perDepth[d]++, index }) })
    const misses: { need: unknown; reason: string }[] = []
    await Promise.all(wanted.map(async ({ layer, order, index }) => {
      let asset = resolveAsset(lib, layer, layer.depth)
      if (!asset) { misses.push({ need: layer.need ?? layer.asset, reason: 'no match' }); return }
      let tex
      const puppet = puppetOf(asset, layer, lib.base)
      try { tex = await loadPremultiplied(layer.src ?? puppet?.atlas ?? urlOf(lib, asset, layer), this.scene) } catch { misses.push({ need: layer.need ?? layer.asset, reason: `file did not load: ${layer.src ?? asset.file}` }); return }
      if (token !== this.buildToken) return
      asset = editedAsset(asset, layer, tex.getSize(), puppet)
      const bent = puppet ? bindPuppet(puppet)
        : layer.rig?.length && layer.rigMap ? await bindMappedPicture(urlOf(lib, asset, layer), layer.rigMap, layer.rig)
          : layer.rig?.length ? bindPicture(await alphaOf(urlOf(lib, asset, layer)), layer.rig) : null
      if (token !== this.buildToken) return
      const p = placeLayer(asset, layer, order, 0, 0, skyCover(s, distanceOf(layer)))   // y is set in pose(): the auto horizon needs the strip loaded first
      // a figure of parts reads its ink off the drawing put back together, so a cut between parts draws no line
      const rest = puppet ? await restDrawing(layer.src ? { ...puppet, atlas: layer.src } : puppet, this.scene).catch(() => undefined) : undefined
      if (token !== this.buildToken) return
      // a close-up blinks: its closed-eye picture (a missing one only costs the blink)
      const blinkSrc = blinkOf(asset, layer, lib.base)
      const blinkTex = blinkSrc ? await loadPremultiplied(blinkSrc.url, this.scene).catch(() => null) : null
      if (token !== this.buildToken) return
      // what stands on the floor throws its own shadow (layer.ts makeCast): not far strips, ground strips, decals or sky props
      const casts = STANDING.includes(layer.depth) && !asset.tileable_x && !liesFlat(layer, asset) && !isGroundStrip(asset) && asset.layer !== 'bg'
      const handle = makeLayer(asset, tex, p.w, p.h, p.uRepeat, this.scene, rest, blinkTex ? { tex: blinkTex, eyes: blinkSrc!.eyes } : undefined, { cast: casts })
      const atlas = tex.getSize()
      const uvFit: readonly [number, number] = puppet ? [puppet.width / atlas.width, puppet.height / atlas.height] : [1, 1]
      handle.setUvFit(uvFit)
      handle.mesh.position.set(p.x, p.y, p.z)
      const flat = liesFlat(layer, asset)
      handle.mesh.alphaIndex = flat ? DECAL_SLOT : p.alphaIndex
      if (flat) handle.mesh.rotation.x = Math.PI / 2   // its top edge points away from the camera, along the floor
      handle.mesh.isVisible = false
      // a contact stain on the ground under standing things (not under far strips or floating sky props): the dark
      // under the soles (Bart 11-04). The shadow along the sun is the picture's own (setCast in pose).
      let stain: Stain | undefined, stainDepth: ((z: number) => number) | undefined
      if (STANDING.includes(layer.depth) && !asset.tileable_x && !flat && !isGroundStrip(asset)) {
        const sz = stainSize(asset, p.w, p.h, p.z)
        stainDepth = (z) => stainSize(asset, p.w, p.h, z).d / sz.d   // the stain's depth at another distance, as a share of this one
        stain = makeStain(handle.mesh, sz.w, sz.d, this.scene)
        stain.mesh.alphaIndex = stainIndex(p.alphaIndex)
      }
      next.push({ layer, index, builtScale: layer.scale ?? 1, builtZ: p.z, handle, uvFit, asset, order, stain, stainDepth, ink: inkLevels.get(urlOf(lib, asset, layer)), flat, skyline: skylines.get(urlOf(lib, asset, layer)), bent, ghost: puppet || bent || p.uRepeat !== 1 ? undefined : (layer.src ?? urlOf(lib, asset, layer)), blink: blinkTex ? blinker(seedOf(`${asset.id}:${index}`), this.calm) : undefined })
    }))
    // the floor: the scene's ground art (or the bundle paper), fading into where the far landscape ends
    const choice = resolveGround(s.set, lib)
    // the floor's ground pictures near to far (set.groundSlots, else the scene's one ground)
    const slotsNext = (await Promise.all(groundSlots(s.set, lib).map(async (sl) => {
      const tex = await loadPremultiplied(lib.base + sl.asset.file, this.scene).catch(() => { misses.push({ need: sl.asset.id, reason: `file did not load: ${sl.asset.file}` }); return null })
      const bands = (bandColours.get(lib.base + sl.asset.file) ?? []).filter((x): x is [number, number, number] => !!x)
      // a flipped slot carries a negative tile size: the floor shader mirrors it top to bottom (ground-gl slotTile)
      const persp = !!sl.asset.perspective
      return tex ? { tex, persp, tile: persp ? (sl.repeat ?? 1) : (sl.asset.height_m || GROUND_TILE_M) / (sl.repeat ?? 1) * (sl.flip ? -1 : 1), from: sl.from, asset: sl.asset, colour: bands.length ? mean3(bands) : hexRgb(lib.paper ?? PAPER_HEX) } : null
    }))).filter((sl): sl is NonNullable<typeof sl> => !!sl)
    // the near band (set.near): a wide strip painted from eye height, laid on the floor out to look.nearFar
    let nearTex: RawTexture | null = null
    const nearId = defaultNear(s.set.near, lib)
    const nearAsset = nearId ? resolveAsset(lib, { asset: nearId }) : null
    if (s.set.near && !nearAsset) misses.push({ need: s.set.near, reason: 'no near band' })
    if (nearAsset) { try { nearTex = await loadPremultiplied(lib.base + nearAsset.file, this.scene) } catch { misses.push({ need: s.set.near, reason: `file did not load: ${nearAsset.file}` }) } }
    if (choice.kind === 'paper' && choice.reason) misses.push({ need: s.set.ground, reason: choice.reason })
    // the first strip in the scene's own order (loads finish in any order), not a prop placed far off
    const far = next.filter((b) => b.asset.layer === 'bg').sort((a, b) => a.index - b.index)[0]
    const strip = far ? { top: landTops.get(urlOf(lib, far.asset, far.layer)) ?? 0, h: placeLayer(far.asset, far.layer, far.order).h, order: far.order } : null
    // under a strip the floor fades into the strip's own ground colour; with no strip, into the sky's colour where it
    // meets the floor (eye height on the sky plane), so the sky never ends on a hard line against a paper band
    const sky = next.find((b) => b.index === -1)
    const skyP = sky && placeLayer(sky.asset, sky.layer, sky.order, 0, 0, skyCover(s))
    const skyHaze = sky && skyP ? bandAt(bandColours.get(urlOf(lib, sky.asset, sky.layer)) ?? [], (HOUSE.y - skyP.y) / skyP.h) : null
    // with ground bands the floor fades into paper, never into the sky: the bands carry the horizon
    const bandsNext = await this.loadBands(s, lib)
    // the sprites the ground can be strewn with, loaded now so a Gras slider move never waits on a file
    const bandTags = s.set.groundBands?.length ? [...new Set(s.set.groundBands.flatMap((g) => resolveAsset(lib, { asset: g.asset }, 'ground_band')?.tags ?? []))] : null
    const sprites = spritesOf(lib), front = cameraFront(s)
    const slotsOf = slotsNext.map((sl) => ({ asset: sl.asset, from: sl.from }))
    const wantFiles = [...new Set(strewPlan({ sceneId: s.id, slots: slotsOf, bandTags, sprites, grass: 1, bushes: 1, front }).flatMap((p) => p.picks.map((pk) => pk.file)))]
    const strewTex = new Map<string, RawTexture>()
    await Promise.all(wantFiles.map(async (f) => { const t = await loadPremultiplied(lib.base + f, this.scene).catch(() => null); if (t) strewTex.set(f, t) }))
    // the clouds an own sky can show, loaded now so a change of cloud or Amount never waits on a file
    const art = dynamic ? cloudArt(lib) : []
    const cloudTex = new Map<string, RawTexture>()
    await Promise.all(art.map(async (a) => {
      const url = (BUILT_IN_CLOUDS.includes(a) ? this.cloudBase : lib.base) + a.file
      const t = await loadPremultiplied(url, this.scene).catch(() => { misses.push({ need: a.id, reason: `file did not load: ${url}` }); return null })
      if (t) cloudTex.set(a.id, t)
    }))
    const dispose = (list: Built[]) => list.forEach((b) => { b.stain?.mesh.material?.dispose(); b.handle.mesh.dispose(); b.handle.material.dispose() })
    if (token !== this.buildToken) {   // a newer build won: this one never shows
      dispose(next)
      bandsNext.forEach((b) => { b.handle.mesh.dispose(); b.handle.material.dispose() })
      return
    }
    dispose(this.built)
    this.bands.forEach((b) => { b.handle.mesh.dispose(); b.handle.material.dispose() })
    this.bands = bandsNext
    this.built = next
    this.sceneLib = lib
    this.shownPictures.forEach((t) => t.dispose())   // the editor's unsaved pictures went with the old set
    this.shownPictures.clear()
    // the colour a standing thing's foot sinks into: the floor art's own average, else the floor's wash
    const tileBands = slotsNext[0] ? (bandColours.get(lib.base + slotsNext[0].asset.file) ?? []).filter((c): c is [number, number, number] => !!c) : []
    this.strip = strip
    this.nearTex = nearTex
    this.nearAsset = nearAsset
    // the floor's look, lit by the scene's time of day (relight): with ground bands the floor is only the paper behind
    // them, no tile can show between the painted strips
    this.groundIn = { slots: slotsNext, far: far ? edgeColours.get(urlOf(lib, far.asset, far.layer)) ?? null : undefined, banded: !!s.set.groundBands?.length, wash: choice.kind === 'paper' ? choice.colour : undefined, lib, measuredHaze: skyHaze, tileFoot: tileBands.length ? mean3(tileBands) : null }
    this.skyAsset = s.set.sky ? resolveAsset(lib, { asset: s.set.sky }, 'sky') : null
    this.dynamicSky = dynamic
    this.ownSky.mesh.setEnabled(dynamic)
    this.cloudSrc = dynamic ? { sceneId: s.id, art, tex: cloudTex } : null
    this.cloudKey = '\0'   // never a real key: makeClouds below always runs (a painted sky: the last scene's clouds go)
    this.lightKey = null
    this.relight(s)
    this.soilKey = null
    this.resoil(s)
    this.makeClouds()
    this.strewSrc = { sceneId: s.id, slots: slotsOf, colours: slotsNext.map((sl) => sl.colour), bandTags, front, sprites, tex: strewTex }
    this.strewKey = ''   // strewn on the next pose, with the look's Gras and Horizon
    this.missed.set(s.id, misses)   // replaced per scene: a rebuild never doubles them
    if (misses.length) {
      console.warn(`stage25d: ${s.id}: missing`, misses)
    }
  }

  /** The floor's look: art tiled in world metres (or a paper wash), fading toward the far landscape into the colour
   *  that landscape's own ground is painted in. The wash is mostly that colour already: perspective squeezes the far
   *  half of the floor into a thin line, so a pale floor fading to a dark horizon reads as a band. */
  private groundLook(slots: FloorSlot[], tint: [number, number, number] | null, lib: Library, wash?: string, ambient: RGB = WHITE, tintIsSky = false): GroundLook {
    const paper = hexRgb(wash ?? lib.paper ?? PAPER_HEX)
    const horizon = tint ?? paper
    // the floor shader lights its own colours (base); the horizon it fades into is lit here when it is ground (a far
    // strip's edge, the paper), never when it is the sky's own colour
    return {
      slots,
      base: mix3(paper, horizon, GROUND_WASH), tint: tint && tintIsSky ? horizon : mul3(horizon, ambient),
      fadeNear: DEPTH_Z.fg, fadeFar: DEPTH_Z.bg * 0.75, grain: slots.length ? 0.5 : 1,   // flat tint before the strip: no step at its edge
    }
  }

  /** Light the scene by its time of day (daylight.ts): the 3D figures' lamps, the sun's direction, the floor's horizon
   *  and the air's colour. Only when set.daylight or the sky picture changed (the editor's edits arrive as a new object). */
  private relight(s: Scene) {
    // by value: under a splat world the editor hands a fresh copy of the same daylight on every redraw
    const key = JSON.stringify([s.set.daylight ?? null, s.set.sky ?? null])
    if (key === this.lightKey) return
    this.lightKey = key
    const l = (this.light = daylightOf(s.set, this.skyAsset))
    const amb = l.preset.ambient
    this.sunDir.set(l.dir[0], l.dir[1], l.dir[2])   // in place: the sun lamp holds this vector
    this.hemi.diffuse = Color3.FromArray(amb)
    this.sunLamp.diffuse = Color3.FromArray(l.preset.sun)
    this.sunLamp.intensity = 1.2 * Math.min(1, l.shadowK + 0.3)
    const g = this.groundIn
    if (!g) return
    // the air: the own sky's horizon colour, else the painted sky's where it meets the floor
    const skyHaze = l.dynamic ? l.sky.horizon : g.measuredHaze
    const tint = g.far !== undefined ? g.far : g.banded ? null : skyHaze
    const look = this.groundLook(g.slots, tint, g.lib, g.wash, amb, g.far === undefined && !g.banded && !!skyHaze)
    this.horizonTint = look.tint
    this.footTint = g.tileFoot ?? look.base
    this.hazeTint = skyHaze ?? look.tint
    this.ground.set(look)
    this.ground.light(amb)
    this.strewKey = ''   // the grass fades into the air's colour, set when it is strewn
  }

  /** One soil colour per world (set.soil, Bart 11-12): the floor's earth and every earth strip take it, each keeping its
   *  own light and dark. With no soil set the strips take the nearest terrain's colour, so they still match the floor;
   *  water, built floors and snow keep their paint (soil.ts). Only when set.soil changed. */
  private resoil(s: Scene) {
    const key = s.set.soil ?? ''
    if (key === this.soilKey) return
    this.soilKey = key
    const soil = s.set.soil ? hexRgb(s.set.soil) : null
    const g = this.groundIn
    const first = g?.slots[0]
    const target = soil ?? (first && isSoil(first.asset) ? first.colour : null)
    if (g) {
      this.groundIn = { ...g, slots: g.slots.map((sl) => ({ ...sl, recolour: soil && isSoil(sl.asset) ? soilRecolour(sl.colour, soil) : NO_RECOLOUR })) }
      this.lightKey = null
      this.relight(s)
    }
    for (const b of this.bands) b.handle.setRecolour(target && b.colour && isSoil(b.asset) ? soilRecolour(b.colour, target) : NO_RECOLOUR)
  }

  /** The own sky's clouds (clouds.ts): made again when the scene, the chosen cut-outs or the Amount changed. */
  private makeClouds() {
    const src = this.cloudSrc
    const chosen = this.light.clouds.assets
    const key = src ? `${src.sceneId}:${chosen?.join(',') ?? '*'}:${this.light.clouds.amount}` : ''
    if (key === this.cloudKey) return
    this.cloudKey = key
    this.clouds.forEach((c) => { c.handle.mesh.dispose(); c.handle.material.dispose() })
    this.clouds = []
    if (!src) return
    for (const spot of cloudPlan({ sceneId: src.sceneId, art: src.art.filter((a) => src.tex.has(a.id)), chosen, amount: this.light.clouds.amount })) {
      const tex = src.tex.get(spot.asset.id)!
      const layer: SceneLayer = { asset: spot.asset.id, depth: 'sky', x: spot.x, scale: spot.scale }
      const p = placeLayer(spot.asset, layer, 0)
      const handle = makeLayer(spot.asset, tex, p.w, p.h, 1, this.scene)
      handle.mesh.alphaIndex = CLOUD_SLOT + spot.slot * CLOUD_SLOT_STEP   // after the sky, before any cloud placed by hand
      this.clouds.push({ handle, spot, layer })
    }
  }

  /** Pose the own sky and its clouds for the camera now. */
  private poseSky(s: Scene, c: { y: number }, clock: number, renderH: number, paper: Paper) {
    if (!this.dynamicSky) return
    const l = this.light
    const z = DEPTH_Z.sky, zRel = z - HOUSE.z
    const spanY = zRel * Math.tan(fovRad(HOUSE.fov) / 2)   // eye line to the house frame's top, at the sky
    const p = placeLayer(OWN_SKY, { depth: 'sky' }, 0, 0, 0, skyCover(s))
    this.ownSky.place(p, c.y, spanY, pxPerMetre(1080, zRel, fovRad(HOUSE.fov)))
    const disc = mix3(WHITE, l.preset.sun.map((v) => v / Math.max(...l.preset.sun)), 0.6)
    this.ownSky.set({
      top: l.sky.top, mid: l.sky.mid, horizon: l.sky.horizon, fill: l.sky.horizon,
      sun: { at: [(l.sun.x - 0.5) * viewWidthAt(zRel), c.y + zRel * Math.tan(elevationOf(l.sun.height))], r: SUN_R * 2 * spanY * (l.time === 'night' ? 0.8 : 1), colour: disc, glow: SUN_GLOW[l.time], moon: l.time === 'night' },
      stars: l.preset.stars, wash: lookNum(this.look, 'groundWash') * 2,
    }, paper)
    this.makeClouds()
    const base = z * Math.tan(fovRad(HOUSE.fov) / 2) * 0.45   // where placeLayer floats a sky prop's foot
    const drift = lookNum(this.look, 'cloudDrift') / STAGE_SHEET.cloudDrift
    for (const cl of this.clouds) {
      const lp = placeLayer(cl.spot.asset, { ...cl.layer, y: c.y + cl.spot.lift * spanY - base }, 0)
      cl.handle.mesh.position.set(lp.x, lp.y, lp.z)
      cl.handle.setOpacity(1)
      cl.handle.setPaper(paper, pxUV(lp.w, lp.h, 1, pxPerMetre(1080, zRel, fovRad(HOUSE.fov)), 1080))
      cl.handle.setLine(lineOf(this.look, 'sky'), 1, pxUV(lp.w, lp.h, 1, pxPerMetre(renderH, zRel, this.camera.fov), renderH), this.hazeTint)
      cl.handle.setAlive({ edgeSoft: lookNum(this.look, 'edgeSoft'), footM: 0, grounding: 0, grass: 0, light: 0, sunSide: 0, drift: 0, footTint: WHITE })
      cl.handle.setLight(WHITE, l.preset.sun, l.preset.shade)
      cl.handle.setTone(l.preset.cloud.tone, l.preset.cloud)
      cl.handle.setMotion({ kind: 'drift', amount: drift, speed: 1 })
      cl.handle.material.setFloat('time', clock)
    }
  }

  /** (Re)strew the ground when the scene or the look's Gras / Horizon changed: pure plan (strew.ts), one mesh set per
   *  picture file (scatter-gl.ts). */
  /** What can grow on this scene's ground: its tags decide (scatter.ts), so a deck or a stone floor has neither. */
  get strewable(): { grass: boolean; bushes: boolean } {
    const src = this.strewSrc
    if (!src) return { grass: false, bushes: false }
    return { grass: strewPlan({ ...src, grass: 1, bushes: 0 }).length > 0, bushes: strewPlan({ ...src, grass: 0, bushes: 1 }).length > 0 }
  }

  private strew(grass: number, bushes: number) {
    const src = this.strewSrc
    const key = src ? `${src.sceneId}:${grass}:${bushes}:${src.slots.length}` : ''
    if (key === this.strewKey) return
    this.strewKey = key
    this.strewn.forEach((m) => m.dispose())
    this.strewn = []
    if (!src) return
    const foot = (z: number) => src.colours[slotAt(src.slots, z)] ?? this.footTint
    for (const plan of strewPlan({ ...src, grass, bushes })) {
      for (const file of new Set(plan.picks.map((p) => p.file))) {
        const tex = src.tex.get(file)
        const clumps = plan.clumps.filter((c) => plan.picks[c.pick].file === file)
        if (tex && clumps.length) this.strewn.push(makeStrewn(this.scene, tex, plan.picks, clumps, foot, this.hazeTint, file))
      }
    }
  }

  /** Point the built layers at an edited scene's values (x, scale, motion, keys) without rebuilding. */
  /**
   * The picture editor's work on a built row before it is saved (same size as the row's file); null: the row's own file
   * again. Only the material's texture changes: no rebuild, the texture goes when the next one comes.
   */
  async showPicture(row: { layer?: number; band?: number; sky?: boolean }, url: string | null): Promise<void> {
    const band = row.band !== undefined ? this.bands.find((b) => b.index === row.band) : null
    const built = row.band === undefined ? this.built.find((b) => b.index === (row.sky ? -1 : row.layer)) : null
    const handle = band?.handle ?? built?.handle
    if (!handle) return
    const token = ++this.pictureToken
    const base = this.sceneLib?.base ?? this.lib.base
    const own = band ? band.band.src ?? base + band.asset.file : built!.layer.src ?? puppetOf(built!.asset, built!.layer, base)?.atlas ?? urlOf({ base }, built!.asset, built!.layer)
    const tex = url ? await pictureTexture(url, this.scene) : await loadPremultiplied(own, this.scene)
    if (token !== this.pictureToken) { if (url) tex.dispose(); return }
    handle.material.setTexture('tex', tex)
    this.shownPictures.get(handle)?.dispose()
    if (url) this.shownPictures.set(handle, tex); else this.shownPictures.delete(handle)
  }

  rebind(s: Scene) {
    this.built.forEach((b) => { b.layer = b.index >= 0 ? s.set.layers[b.index] : skyLayerOf(s) })
    this.bands.forEach((b) => { b.band = s.set.groundBands?.[b.index] ?? b.band })
  }

  /** Standing pictures under a point (CSS px from the canvas's top-left), nearest first: the layer's index in
   *  set.layers, its asset and where on the picture (u, v: 0..1, v up) the point lands. Sky, far strips and the
   *  floor are not pickable. The editor still has to look at the picture's alpha: a plane's empty corners hit too. */
  pickLayers(x: number, y: number): { index: number; asset: Asset; u: number; v: number }[] {
    const owns = (m: unknown) => this.built.some((b) => b.handle.mesh === m)
    const out: { index: number; asset: Asset; u: number; v: number }[] = []
    const hits = [...(this.scene.multiPick(x, y, owns) ?? [])].sort((a, b) => a.distance - b.distance)   // nearest first
    for (const hit of hits) {
      const b = this.built.find((n) => n.handle.mesh === hit.pickedMesh)
      const uv = hit.getTextureCoordinates()
      if (!b || !uv || b.index < 0 || b.asset.tileable_x || ['sky', 'bg', 'ground'].includes(b.asset.layer)) continue
      if (isGroundStrip(b.asset) && (hit.pickedPoint?.y ?? 0) < 0) continue   // a strip's body under the floor is hidden by it
      // a figure of parts is one mesh and a pick gives its nearest triangle, often a part's empty corner over paint: read every part there
      const mesh = b.handle.mesh
      const at = puppetOf(b.asset, b.layer) && hit.pickedPoint ? Vector3.TransformCoordinates(hit.pickedPoint, Matrix.Invert(mesh.getWorldMatrix())) : null
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind), uvs = mesh.getVerticesData(VertexBuffer.UVKind), indices = mesh.getIndices()
      const parts = at && positions && uvs && indices ? uvsUnder(positions, uvs, indices, at.x, at.y) : []
      for (const [u, v] of parts.length ? parts : [[uv.x, uv.y]]) out.push({ index: b.index, asset: b.asset, u, v })
    }
    return out
  }

  /** The backdrops under a point (CSS px), nearest first: ground bands (`band`: its index in set.groundBands) and far
   *  strips (`index` in set.layers), with where on the picture the point lands. The editor checks the picture's alpha. */
  pickBackdrops(x: number, y: number): { band?: number; index?: number; asset: Asset; u: number; v: number }[] {
    const bandOf = (m: unknown) => this.bands.find((b) => b.handle.mesh === m && b.index >= 0)   // a terrain's horizon is not a row
    const stripOf = (m: unknown) => this.built.find((b) => b.handle.mesh === m && b.index >= 0 && b.asset.layer === 'bg')
    const hits = [...(this.scene.multiPick(x, y, (m) => !!bandOf(m) || !!stripOf(m)) ?? [])].sort((a, b) => a.distance - b.distance)
    return hits.flatMap((hit) => {
      const uv = hit.getTextureCoordinates()
      if (!uv) return []
      const band = bandOf(hit.pickedMesh)
      if (band) return [{ band: band.index, asset: band.asset, u: tileU(uv.x, BAND_REPEAT, !band.asset.tileable_x), v: uv.y }]
      const strip = stripOf(hit.pickedMesh)!
      return [{ index: strip.index, asset: strip.asset, u: uv.x, v: uv.y }]
    })
  }

  /** A layer's box on screen as shares of the canvas (0..1 from its top-left) and the z of its plane; null while it is not built. */
  layerBox(index: number): { x0: number; y0: number; x1: number; y1: number; z: number } | null {
    const b = this.built.find((n) => n.index === index)
    if (!b) return null
    const view = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
    const kx = 1 / this.engine.getRenderWidth(), ky = 1 / this.engine.getRenderHeight()
    const pts = b.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map((v) => Vector3.Project(v, Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), view))
    const xs = pts.map((p) => p.x * kx), ys = pts.map((p) => p.y * ky)
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), z: b.handle.mesh.position.z }
  }

  /** The selected picture whole, also where it runs past the frame (Bart 11-12: "you cannot see the selected layer
   *  completely"): its file and its top-left, top-right and bottom-left corners on screen, as shares of the canvas.
   *  Null for a figure of parts or a tiled strip: one picture file does not draw those. */
  layerGhost(index: number): { url: string; tl: [number, number]; tr: [number, number]; bl: [number, number] } | null {
    const b = this.built.find((n) => n.index === index)
    if (!b?.ghost) return null
    const view = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
    const kx = 1 / this.engine.getRenderWidth(), ky = 1 / this.engine.getRenderHeight()
    const { minimum: lo, maximum: hi } = b.handle.mesh.getBoundingInfo().boundingBox
    const world = b.handle.mesh.getWorldMatrix()
    const on = (x: number, y: number): [number, number] => {
      const p = Vector3.Project(Vector3.TransformCoordinates(new Vector3(x, y, 0), world), Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), view)
      return [p.x * kx, p.y * ky]
    }
    return { url: b.ghost, tl: on(lo.x, hi.y), tr: on(hi.x, hi.y), bl: on(lo.x, lo.y) }
  }

  /** A figure's joints on screen as shares of the canvas, in the pose drawn now; null for a layer that is no figure of parts.
   *  `mirrored`: the drawing shows mirrored, so a clockwise drag on screen turns its bones the other way. */
  jointsOnScreen(index: number): { mirrored: boolean; joints: { name: string; at: [number, number]; tip: [number, number] }[] } | null {
    const b = this.built.find((n) => n.index === index)
    const bent = b?.bent
    if (!b || !bent || !('joints' in bent)) return null
    const view = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
    const kx = 1 / this.engine.getRenderWidth(), ky = 1 / this.engine.getRenderHeight()
    const on = ([x, y]: [number, number]): [number, number] => {
      const p = Vector3.Project(b.handle.worldOf(bent, x, y), Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), view)
      return [p.x * kx, p.y * ky]
    }
    const o = on([0, 0]), right = on([bent.width, 0]), down = on([0, bent.height])
    const mirrored = (right[0] - o[0]) * (down[1] - o[1]) - (right[1] - o[1]) * (down[0] - o[0]) < 0
    return { mirrored, joints: (bent as BentPuppet).joints().map((j) => ({ name: j.name, at: on(j.at), tip: on(j.tip) })) }
  }

  /** A turn held to the figure's own limits (a knee, an elbow); unchanged on a layer that is no figure of parts. */
  boneLimit(index: number, name: string, deg: number): number {
    const bent = this.built.find((n) => n.index === index)?.bent
    return bent && 'limit' in bent ? (bent as BentPuppet).limit(name, deg) : deg
  }

  /** The camera's own motion is on; the editor stills it while working. Someone who asked for less motion never gets it. */
  cameraAlive = true
  private readonly calm = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  /** The lesson is paused: close-ups stop blinking (the wrapper sets it; layer motion keeps breathing). */
  paused = false
  /** blink time: runs with the motion clock, but not while paused (blink.ts) */
  private blinkTime = 0
  private lastClock: number | null = null

  private faded = new Set<number>()
  private fadedTo = 1

  /** The editor lets a selected layer show through what stands in front of it: these layers drawn at this share. Never saved. */
  fadeLayers(indices: number[], to: number) {
    this.faded = new Set(indices)
    this.fadedTo = to
  }

  /** How high the ground stands at distance z in the scene on screen (groundHeight): pictures and the grid stand on it. */
  groundHeightAt(z: number): number { return groundHeight(z, this.land) }
  private land = 0

  /** How high a built layer's anchor (its feet) stands above the floor now, in metres: 0 on the floor, more for a
   *  picture on the ground rising into the far landscape (groundHeightAt) or by its own y. A ground strip stands on
   *  the floor itself: its visible bottom is the floor line, whatever of it is below. */
  layerFootY(index: number): number {
    const b = this.built.find((n) => n.index === index)
    if (!b) return 0
    return isGroundStrip(b.asset) ? (b.layer.y ?? 0) : b.handle.mesh.position.y
  }

  /** The pointer's ray in world space (origin and direction), for finding the floor cell under it. */
  pointerRay(x: number, y: number): { origin: [number, number, number]; dir: [number, number, number] } {
    const ray = this.scene.createPickingRay(x, y, Matrix.Identity(), this.camera)
    return { origin: [ray.origin.x, ray.origin.y, ray.origin.z], dir: [ray.direction.x, ray.direction.y, ray.direction.z] }
  }

  /** The editor's ground grid: pieces of hairline on the ground (x, z in metres), each with the distance of its far
   *  edge. Each piece is drawn in the pictures' own order (bandSlot): under everything standing at or in front of it,
   *  over the floor, the ground bands and pictures behind it. It lies on the ground the pictures stand on
   *  (groundHeight), so a picture's feet stay on its lines. Null takes it away. */
  setGrid(pieces: { z: number; lines: [number, number][][] }[] | null, rgb: [number, number, number] = [1, 1, 1]) {
    this.gridMeshes.forEach((m) => m.dispose())
    this.gridMeshes = []
    this.grid = pieces ? { pieces, rgb, land: null } : null
  }

  /** Hide the grid for a moment (a thumbnail of the scene is taken without it). */
  set gridHidden(on: boolean) {
    this.gridOff = on
    this.gridMeshes.forEach((m) => m.setEnabled(!on))
  }
  private gridOff = false

  private grid: { pieces: { z: number; lines: [number, number][][] }[]; rgb: [number, number, number]; land: number | null } | null = null
  private gridMeshes: LinesMesh[] = []

  /** (Re)draw the grid's pieces on the ground for this land height (landHeight): only when it changed. */
  private poseGrid(land: number) {
    const g = this.grid
    if (!g || g.land === land) return
    this.gridMeshes.forEach((m) => m.dispose())
    const fade = (z: number) => GRID_ALPHA * Math.min(1, Math.max(0, (GRID_FADE_END_M - z) / (GRID_FADE_END_M - GRID_FADE_START_M)))
    this.gridMeshes = g.pieces.map((piece, i) => {
      const lines = piece.lines.map((line) => line.map(([x, z]) => new Vector3(x, groundHeight(z, land), z)))
      const colors = piece.lines.map((line) => line.map(([, z]) => new Color4(g.rgb[0], g.rgb[1], g.rgb[2], fade(z))))
      const mesh = MeshBuilder.CreateLineSystem(`grid-${i}`, { lines, colors, useVertexAlpha: true }, this.scene)
      mesh.isPickable = false
      mesh.setEnabled(!this.gridOff)
      mesh.alphaIndex = bandSlot(piece.z) + GRID_SLOT_AHEAD   // a row at a band's own distance shows over the band
      mesh.material!.depthFunction = Constants.ALWAYS   // on the floor: the floor's own depth never cuts it
      mesh.material!.disableDepthWrite = true          // and it never cuts the feet of what stands on it
      return mesh
    })
    g.land = land
  }

  /** World x where the pointer's ray crosses the vertical plane at `z`: how far a drag moved a picture of that depth. */
  worldXAt(x: number, y: number, z: number): number {
    const ray = this.scene.createPickingRay(x, y, Matrix.Identity(), this.camera)
    return ray.origin.x + ((z - ray.origin.z) / ray.direction.z) * ray.direction.x
  }

  /** Where the light comes from (S3: puppets cast their contact shadow along it). */
  // from the upper left and a little behind the camera, as in a picture book: lit left sides, shadows falling right and
  // toward the viewer, where they show (a light into the picture hid every shadow behind its prop)
  readonly sunDir = new Vector3(0.55, -1, -0.3).normalize()

  /** A depth's line values with the haze colour, following the teacher's look sliders (S3: puppets draw their line
   *  with LINE_BY_DEPTH_GLSL from these). Read it every frame or on each pose. */
  depthLine(depth: Depth): Line & { tint: [number, number, number] } { return { ...lineOf(this.look, depth), tint: this.hazeTint } }

  /** The paper every picture is painted on (PAPER_GLSL), from the look sliders. */
  paper(): Paper { return paperOf(this.look) }

  /** The scene's ground bands: painted strips at their metres, three views wide, drawn by distance (height: pose). */
  private async loadBands(s: Scene, lib: Library & { base: string }): Promise<Band[]> {
    const out: Band[] = []
    const build = async (found: Asset, g: GroundBand, index: number) => {
      const tex = await loadPremultiplied(urlOf(lib, found, g), this.scene).catch(() => null)
      if (!tex) { console.warn(`stage25d: ${s.id}: ground band ${g.src ?? found.file} did not load`); return }
      const asset = editedAsset(found, g, tex.getSize())
      // the picture keeps its own proportions: its width is three views, its height follows its aspect
      // repeated sideways (BAND_REPEAT), mirrored where the picture does not tile: w stays one copy's width
      const w = bandWidth(g.z), h = (w * asset.h) / asset.w
      const handle = makeLayer(asset, tex, w * BAND_REPEAT, h, BAND_REPEAT, this.scene)
      tex.wrapU = nearWrapU(!!asset.tileable_x)
      handle.material.depthFunction = Constants.ALWAYS   // a band is drawn over the floor: the floor never cuts its body
      handle.mesh.position.set(0, 0, g.z)
      handle.mesh.alphaIndex = bandSlot(g.z)
      handle.mesh.isPickable = index >= 0
      const rows = (bandColours.get(urlOf(lib, found, g)) ?? []).filter((c): c is RGB => !!c)
      out.push({ handle, z: g.z, w, h, skyline: skylines.get(urlOf(lib, asset, g)) ?? 0.5, index, asset, band: g, colour: rows.length ? mean3(rows) : null })
    }
    for (const [index, g] of (s.set.groundBands ?? []).entries()) {
      const found = resolveAsset(lib, { asset: g.asset }, 'ground_band')
      if (!found) { console.warn(`stage25d: ${s.id}: no ground band ${g.asset}`); continue }
      await build(found, g, index)
    }
    // the nearest terrain's own far edge (asset.horizon): a low hazy strip standing far out on the floor over the line
    // where the terrain meets the sky, so the ground never ends on a hard edge (Bart 11-11). It belongs to the terrain:
    // no row, never picked (index -1)
    const edge = groundSlots(s.set, lib)[0]?.asset.horizon
    const edgeAsset = edge ? lib.assets.find((a) => a.id === edge) : undefined
    if (edgeAsset) await build(edgeAsset, { asset: edgeAsset.id, ...HORIZON_BAND }, -1)
    return out
  }

  /** Metres the far landscape stands higher: the scene's own number, else 'auto' (also when unset): the first strip's
   *  land line at set.land_target of the frame (layout.ts autoHorizon). For the scene on screen. */
  horizonOf(s: Scene): number {
    const h = s.set.horizon
    if (typeof h === 'number') return h
    return this.strip ? autoHorizon(this.strip.top, this.strip.h, this.strip.order, s.set.land_target ?? LAND_TARGET, lookNum(this.look, 'housePitch')) : 0
  }

  /** Pose everything for t seconds into scene s. */
  pose(s: Scene, t: number, clock: number, hold?: { t: number; breath_m?: number; breath_s?: number }, frameT = t) {
    const shot = shotAt(s, t)                       // a directed scene plays camera, then each of camera_more
    const end = cameraAt(shot.cam, shot.t, sceneDuration(s))
    const c = hold ? breathe(end, hold.t, hold) : end   // a held frame breathes around where the shot ended
    const wobble = this.cameraAlive && !this.calm ? cameraWobble(s.camera_motion, clock) : { x: 0, y: 0, roll: 0 }
    this.camera.position.set(c.x + wobble.x, c.y + wobble.y, c.z)
    this.camera.fov = c.fov
    const pitch = lookNum(this.look, 'housePitch')                 // degrees down (a teacher slider)
    this.camera.rotation.x = (pitch * Math.PI) / 180
    this.camera.rotation.z = (((c.roll ?? 0) + wobble.roll) * Math.PI) / 180
    this.ground.follow(this.camera.position)
    const L = (k: string) => lookNum(this.look, k)
    this.ground.live({ detail: L('groundDetail'), vary: L('groundVary'), mixTile: L('groundMix'), tileScale: L('groundScale'), wash: L('groundWash'), grainSize: L('groundGrain') })
    // a perspective terrain lies from the scene's opening camera: from there it fills the frame exactly as painted
    const opening = shotAt(s, 0)
    this.ground.house(houseProjection(pitch, this.engine.getAspectRatio(this.camera), HORIZON_FAR_M, cameraAt(opening.cam, 0, sceneDuration(s))))
    this.ground.near(this.nearTex ? { tex: this.nearTex, ...houseProjection(pitch, this.engine.getAspectRatio(this.camera), L('nearFar')), span: NEAR_SPAN, tileable: !!this.nearAsset?.tileable_x } : null)
    const renderH = this.engine.getRenderHeight()
    const paper = paperOf(this.look)
    this.relight(s)
    this.resoil(s)
    const lit = this.light.preset
    const run = Math.hypot(this.sunDir.x, this.sunDir.z) || 1
    const sunGround = [this.sunDir.x / run, this.sunDir.z / run] as const   // the light's direction along the ground
    this.poseSky(s, c, clock, renderH, paper)
    const bandK = lookNum(this.look, 'bandHeight')
    const horizon = this.horizonOf(s)
    const land = landHeight(horizon, this.strip)   // where pictures on the far ground stand: the strip's land line
    this.land = land
    this.poseGrid(land)
    const front = cameraFront(s)   // a band stands in front of the farthest-forward camera of the scene
    this.bands.forEach((b) => {
      // the teacher's values (Distance, Size, X, Opacity, keys): layout.ts bandPose
      const p = bandPose(b.band, t, bandK, b.w, b.h, b.skyline, front)   // its skyline on the crest, k x z up, never off the floor
      b.z = p.z
      const edge = b.index < 0   // the terrain's horizon: low, on the floor
      b.handle.mesh.scaling.set(p.sx, edge ? p.sy * HORIZON_SQUASH : p.sy, 1)
      b.handle.mesh.position.set(p.x, edge ? 0 : p.y, p.z)
      b.handle.mesh.alphaIndex = p.alphaIndex
      const ppm = pxPerMetre(renderH, p.z - HOUSE.z, fovRad(HOUSE.fov))
      b.handle.setOpacity(p.opacity)
      b.handle.setBottomFade(Math.min(1, lookNum(this.look, 'bandFade') / p.h))   // the lowest metres only, not a share of the tall picture
      b.handle.setPaper(paper, pxUV(p.w, p.h, 1, ppm, renderH))
      b.handle.setLine(lineOf(this.look, 'bg'), 1, pxUV(p.w, p.h, 1, ppm, renderH), this.hazeTint)
      b.handle.setMotion(motionOf(b.asset, { ...b.band, depth: 'bg' }))
      b.handle.setLight(lit.ambient, lit.sun, lit.shade)
      b.handle.material.setFloat('time', clock)
    })
    this.strew(lookNum(this.look, 'grass'), lookNum(this.look, 'horizonBushes'))
    this.strewn.forEach((m) => m.update(clock, lookNum(this.look, 'grassSway'), land, this.camera.position, 1, lit.ambient))
    const dt = this.lastClock === null ? 0 : Math.min(0.1, Math.max(0, clock - this.lastClock))
    this.lastClock = clock
    if (!this.paused) this.blinkTime += dt
    for (const b of this.built) {
      if (b.blink) b.handle.setBlink(b.blink(this.blinkTime))
      const k = layerAt(b.layer, t)
      const p = placeLayer(b.asset, { ...b.layer, x: k.x, y: k.y, z: k.z, scale: 1, rotation: k.rotation }, b.order, horizon, land, skyCover(s, k.z ?? distanceOf(b.layer)))
      b.handle.mesh.position.x = p.x
      // a far strip moved to another distance looks the same from the house camera (it grows with the distance, about
      // the eye): what changes is what stands in front of it. Its own Y and Size still move and size it.
      const far = b.asset.layer === 'bg' && !b.asset.tileable_x ? (p.z - HOUSE.z) / Math.max(0.1, b.builtZ - HOUSE.z) : 1
      // a ground strip stands like a ground band: its skyline on the crest, never its bottom above the floor
      b.handle.mesh.position.y = b.flat ? DECAL_LIFT_M : isGroundStrip(b.asset) ? stripBottom(p.z, bandK, p.h * k.scale, b.skyline ?? 0) + p.y : HOUSE.y + (p.y - HOUSE.y) * far
      if (b.handle.mesh.position.z !== p.z) {
        // a picture moved along the ground (layer.z) changes distance: its draw slot follows; its stain rides along
        b.handle.mesh.position.z = p.z
        if (!b.flat) b.handle.mesh.alphaIndex = p.alphaIndex
        if (b.stain) b.stain.mesh.alphaIndex = stainIndex(p.alphaIndex)
        if (b.stain && b.stainDepth) b.stain.mesh.scaling.y = b.stainDepth(p.z)   // a stain is as deep as it looks from here
      }
      b.handle.mesh.rotation.z = (-p.rotation * Math.PI) / 180   // clockwise on screen
      b.handle.mesh.scaling.setAll((k.scale / b.builtScale) * far)   // grows from the ground point
      const opacity = k.opacity * (this.faded.has(b.index) ? this.fadedTo : 1)
      b.handle.setOpacity(opacity)
      b.handle.setFeather(featherOf(b.asset, b.layer), this.horizonTint)
      if (b.asset.layer === 'sky') b.handle.setGroundLine((c.y - p.y) / (p.h * k.scale))
      const ppm = pxPerMetre(renderH, p.z - c.z, this.camera.fov)
      const line = lineOf(this.look, b.layer.depth)
      // the paper's grain at the scale it has from the house camera, fixed to the picture (moves and zooms with it)
      b.handle.setPaper(paper, fitted(pxUV(p.w * k.scale, p.h * k.scale, p.uRepeat, pxPerMetre(1080, p.z - HOUSE.z, fovRad(HOUSE.fov)), 1080), b.uvFit))
      b.handle.setLine(line, b.ink === undefined ? 1 : inkScale(b.ink, line.ink, line.norm), fitted(pxUV(p.w * k.scale, p.h * k.scale, p.uRepeat, ppm, renderH), b.uvFit), this.hazeTint)
      b.handle.setInk(b.layer.outline ?? 0, b.layer.etch ?? 0)
      if (b.bent) b.handle.setBent(b.bent, bonesAt(b.layer, t))
      b.stain?.setEtch(b.layer.etch ?? 0)
      b.stain?.setOpacity((b.layer.shadow ?? STAIN_DEFAULT) * opacity)
      b.stain?.setTint(lit.shadow)
      // its shadow away from the sun, on the ground under it (a lifted picture's falls further off; layer.shadow 0 = none)
      // drawn in the slot of its nearest point: over the ground strips it falls across, before what stands there
      const castNear = p.z + sunGround[1] * p.h * k.scale * this.light.reach
      b.handle.setCast({
        dir: sunGround, reach: this.light.reach, groundY: groundHeight(p.z, land), tint: lit.shadow,
        slot: Math.max(stainIndex(b.handle.mesh.alphaIndex), bandSlot(Math.max(castNear, 1)) - 2 * STAIN_SLOT_GAP),
        opacity: lookNum(this.look, 'castShadow') * ((b.layer.shadow ?? STAIN_DEFAULT) / STAIN_DEFAULT) * opacity * this.light.shadowK, time: clock, etch: b.layer.etch ?? 0,
      })
      const kind = b.asset.layer === 'sky' ? 'sky' : b.asset.layer === 'bg' ? 'strip' : b.asset.layer === 'figure' ? 'figure' : STANDING.includes(b.layer.depth) && !b.flat ? 'standing' : 'other'
      // the light runs across the picture's u: on an atlas that is not across the figure, so a puppet takes none yet
      b.handle.setAlive({ ...aliveOf(this.look, kind, this.sunDir.x, mul3(this.footTint, lit.ambient)), ...(puppetOf(b.asset, b.layer) ? { light: 0 } : {}) })
      // the time of day: a painted sky keeps its own colours, a cloud takes the time's cloud colours instead
      const cloud = b.asset.layer === 'cloud' || (b.layer.depth === 'sky' && b.asset.tags.includes('cloud'))
      b.handle.setLight(kind === 'sky' || cloud ? WHITE : lit.ambient, lit.sun, lit.shade)
      b.handle.setTone(cloud ? lit.cloud.tone : 0, lit.cloud)
      b.handle.setMotion(motionOf(b.asset, b.layer))
      b.handle.material.setFloat('time', clock)
      if (isAnimation(b.asset)) b.handle.setCell(cellOf(b.asset, frameAt(b.asset, b.layer.play, frameT)))   // the scene's time: a seek shows the same frame
    }
  }
}

/** A picture's file: the teacher's edited copy (layer.src, written by the app's image editor) or the library's own. */
const urlOf = (lib: { base: string }, asset: Asset, layer?: { src?: string }) => layer?.src ?? lib.base + asset.file

/** A picture's uv per px, as uv of its atlas when it has one: the same grain, line and hatching on a part as on the drawing. */
const fitted = (uvPerPx: readonly [number, number], fit: readonly [number, number] = [1, 1]) => [uvPerPx[0] * fit[0], uvPerPx[1] * fit[1]] as const

/** The sky picture as a layer: set.sky, taking only its motion and the teacher's edited copy (src, the image editor)
 *  from set.skyLayer. Place, size, opacity and keys saved before 2026-11-03 are ignored: a moved or faded sky left a
 *  hole behind the scene. */
const skyLayerOf = (s: Scene): SceneLayer => ({
  ...(s.set.skyLayer?.motion ? { motion: s.set.skyLayer.motion } : {}),
  ...(s.set.skyLayer?.src ? { src: s.set.skyLayer.src } : {}),
  asset: s.set.sky, depth: 'sky',
})

/** The near band spans this much of the frame's width; past its sides it repeats (tileable art) or mirrors (one
 *  painting), so no camera move ever runs out of it or smears its last column (checker floor HIGH). */
const NEAR_SPAN = 1.3

/** The editor's ground grid: a faint hairline that fades out toward the far end of the ground, so it has no hard edge. */
const GRID_ALPHA = 0.35
const GRID_SLOT_AHEAD = 0.001
/** A perspective terrain's top row: the floor this far out, as good as the horizon. */
const HORIZON_FAR_M = 1900
const GRID_FADE_START_M = 40
const GRID_FADE_END_M = 120

/** A cast shadow's length per metre of height: the sun's run over its fall. */
/** The own sky's clouds draw after the sky (slot 1) and before the first cloud placed by hand (slot 3). */
const CLOUD_SLOT = 1.1
const CLOUD_SLOT_STEP = 0.1
const mean3 = (cs: [number, number, number][]): [number, number, number] => [0, 1, 2].map((i) => cs.reduce((s, c) => s + c[i], 0) / cs.length) as [number, number, number]

/** Depths where things stand on the floor (and get a contact stain). */
export const STANDING: Depth[] = ['mid', 'fg', 'near']

export interface Player {
  stage: Stage
  doc: LessonDoc
  timeline: Timeline
  scene: () => { index: number; t: number; playing: boolean; mode: Mode }
  /** a class moment: fired once when a scene with `interaction` reaches its end; call resume() to move on */
  onInteraction(fn: InteractionHandler): () => void
  /** mode, scene or position jumps (pause, resume, hold, seek, next scene) */
  subscribe(fn: () => void): () => void
  /** lesson position in seconds; stands still while paused or holding (S5's sound follows this) */
  clock(): number
  duration(): number
  pause(): void
  resume(): void
  /** same as resume() (the dev panel's Play) */
  play(): void
  seek(index: number, t?: number): Promise<void>
  seekToScene(id: string): Promise<void>
  /** a guaranteed hold t s into scene i (onInteraction fires; resume plays on from t); returns a remover */
  holdAt(sceneIndex: number, t: number): () => void
  /** pose the current scene at t without a rebuild (keeps pause / hold): the power meter */
  setTime(t: number): void
  /** the scene on screen changed */
  onScene(fn: (index: number) => void): () => void
  fps(): number
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
  return (await r.json()) as T
}

/** Load a lesson (object or URL) and its library, build scene 1 and start playing. */
export async function playLesson(lessonOrUrl: Lesson | string, libraryUrl?: string, canvas?: HTMLCanvasElement): Promise<Player> {
  const lesson = typeof lessonOrUrl === 'string' ? await fetchJson<Lesson>(lessonOrUrl) : lessonOrUrl
  if (!Array.isArray(lesson.scenes) || !lesson.scenes.length) throw new Error(`lesson ${lesson.id}: no scenes`)
  const libraries = new Map<string, Promise<Library & { base: string }>>()
  const libraryOf = (url: string) => { if (!libraries.has(url)) libraries.set(url, loadLibrary(url)); return libraries.get(url)! }
  const lessonUrl = libraryUrlFor({}, lesson, libraryUrl)
  const lib = await libraryOf(lessonUrl)
  /** a scene's own bundle (scene.bundle); one that does not load falls back to the lesson's, with a warning */
  async function sceneLibrary(s: Scene) {
    const url = libraryUrlFor(s, doc.lesson, libraryUrl)
    try { return await libraryOf(url) } catch (err) {
      libraries.delete(url)
      console.warn(`stage25d: ${s.id}: library ${url} did not load, using the lesson's`, err)
      return lib
    }
  }
  const el = canvas ?? document.body.appendChild(document.createElement('canvas'))
  const stage = new Stage(el, lib)
  const doc = new LessonDoc(lesson)
  stage.setLook(lesson.look)

  let builtScene: Scene | null = null
  const tl = new Timeline(() => doc.lesson.scenes, async (i) => {
    const s = doc.lesson.scenes[i]
    await stage.build(s, await sceneLibrary(s))
    builtScene = s
  })
  // an edit: a changed set (layers added/removed, asset swapped) rebuilds in place; everything else is read live
  doc.subscribe(() => {
    const s = tl.scene
    stage.setLook(doc.lesson.look)
    if (!builtScene || s.bundle !== builtScene.bundle || s.set.ground !== builtScene.set.ground || s.set.layers.length !== builtScene.set.layers.length || s.set.sky !== builtScene.set.sky || isDynamic(s.set) !== isDynamic(builtScene.set) || s.set.near !== builtScene.set.near
      || s.set.layers.some((l, i) => l.asset !== builtScene!.set.layers[i].asset || l.need !== builtScene!.set.layers[i].need || l.depth !== builtScene!.set.layers[i].depth)) {
      void tl.rebuild()
      return
    }
    stage.rebind(s)
    builtScene = s
  })
  await tl.enter(0)

  let last = performance.now(), motionClock = 0
  const frames: number[] = []
  stage.engine.runRenderLoop(() => {
    const now = performance.now()
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    frames.push(now); while (frames.length && now - frames[0] > 1000) frames.shift()
    stage.tick(now)
    motionClock += dt                            // layer motion keeps breathing while paused or holding
    stage.paused = tl.mode === 'paused'          // ...but a close-up stops blinking
    tl.tick(dt)
    const hold = tl.mode === 'holding' ? { t: tl.holdT, ...doc.lesson.hold } : undefined
    stage.pose(tl.scene, tl.t, motionClock, hold)
    stage.scene.render()
  })
  return {
    stage, doc, timeline: tl,
    scene: () => ({ index: tl.index, t: tl.t, playing: tl.mode === 'playing', mode: tl.mode }),
    onInteraction: (fn) => tl.onInteraction(fn),
    subscribe: (fn) => tl.subscribe(fn),
    clock: () => tl.clock(),
    duration: () => tl.duration(),
    pause: () => tl.pause(),
    resume: () => tl.resume(),
    play: () => tl.resume(),
    seek: (i, at = 0) => tl.enter(i, at),
    seekToScene: (id) => tl.seekToScene(id),
    holdAt: (i, t) => tl.holdAt(i, t),
    setTime: (t) => tl.setTime(t),
    onScene: (fn) => tl.onScene(fn),
    fps: () => frames.length,
  }
}
