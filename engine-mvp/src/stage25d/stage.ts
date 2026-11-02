// The 2.5D stage: painted layers on depth planes in front of a fixed house camera, the storybook look over the
// whole frame, and a lesson's scenes played one after another with their camera and layer keyframes.
//   const player = await playLesson(lessonOrUrl, libraryUrl?, canvas?)
//   player.pause() / resume() / seek(sceneIndex, t) / seekToScene(id) / clock() / onInteraction(fn) / subscribe(fn)
//   player.doc (undoable teacher edits) / stage.groundPoint(x, depth)
import '../globals-core'                  // the engine modules read Babylon from window.BABYLON
import '../engine/look-shaders.js'
import {
  Color4, Constants, Engine, HemisphericLight, DirectionalLight, Matrix, MeshBuilder, Scene as BScene, UniversalCamera, Vector3,
  type LinesMesh, type RawTexture,
} from '@babylonjs/core'
import { createLookChain, PRESETS } from '../engine/look-chain.js'
import { makeBirds, makeSmoke, smokes } from './life'
import { aliveOf, houseProjection, inkScale, lineOf, lookNum, paperOf, type Line, type Paper, pxPerMetre, pxUV, STAGE_SHEET } from './look'
import { makeSheet } from './sheet'
import { libraryUrlFor, loadLibrary, resolveAsset } from './library'
import { ADAPT_STALL_MS, ADAPT_WINDOW_MS, autoHorizon, bandBottom, bandHeight, bandSlot, bandWidth, DECAL_LIFT_M, DECAL_SLOT, groundHeight, isGroundStrip, LAND_TARGET, landHeight, liesFlat, stripBottom, breathe, cameraAt, nextTier, shotAt, stainIndex, TIER0, type Tier, DEPTH_Z, fovRad, HOUSE, HOUSE_PITCH_DEG, layerAt, motionOf, placeLayer, renderScale, sceneDuration, viewWidthAt } from './layout'
import { bandColours, edgeColours, inkLevels, landTops, loadPremultiplied, makeLayer, skylines, type LayerHandle } from './layer'
import { bandAt, defaultNear, featherOf, GROUND_TILE_M, hexRgb, PAPER as PAPER_HEX, resolveGround, STAIN_DEFAULT, stainSize } from './ground'
import { makeGround, makeStain, type GroundLook } from './ground-gl'
import { LessonDoc } from './edits'
import { Timeline, type InteractionHandler, type Mode } from './timeline'
import type { Asset, Depth, Lesson, Library, Scene, SceneLayer } from './types'

/** The stage's own look: History Lines pencil lines on 3D edges, a light paper grain over everything. */
export const STAGE_LOOK: Record<string, number | string> = { ...PRESETS['History Lines pencil'], paper: 0.35, granulation: 0.2, ...STAGE_SHEET }
const PAPER = new Color4(0.937, 0.914, 0.863, 1)
type Stain = ReturnType<typeof makeStain>
interface Band { handle: LayerHandle; z: number; w: number; h: number; skyline: number; index: number; asset: Asset }   // index: in set.groundBands
interface Built { layer: SceneLayer; index: number; builtScale: number; handle: LayerHandle; asset: Asset; order: number; stain?: Stain; cast?: Stain; stainDepth?: (z: number) => number; ink?: number; flat: boolean; skyline?: number }  // index -1 = the sky
/** How far the paper wash floor is tinted toward the far landscape's own ground colour */
const GROUND_WASH = 0.7
const mix3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number]

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
  private smoke: ReturnType<typeof makeSmoke>[] = []
  private birds: ReturnType<typeof makeBirds>
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
    new HemisphericLight('sky', new Vector3(0, 1, 0), this.scene).intensity = 0.7
    new DirectionalLight('sun', this.sunDir, this.scene).intensity = 1.2
    this.sceneLib = lib
    this.ground = makeGround(this.scene)
    this.ground.set(this.groundLook(null, null, lib))
    this.birds = makeBirds(this.scene, BIRD_Z_M, viewWidthAt(BIRD_Z_M), BIRD_SLOT)
    createLookChain(this.scene, this.camera, {
      num: (k: string) => Number(this.look[k] ?? 0),
      inkColor: () => String(this.look.inkColor ?? 'pencil'),
      texture: () => null,
    })
    makeSheet(this.camera, (k) => Number(this.look[k] ?? 0))   // after the chain: the one paper sheet under it all
    this.fit()
    window.addEventListener('resize', () => this.fit())
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

  /** Build a scene's set hidden, then swap it in whole: the old set stays on screen until every texture is ready. */
  async build(s: Scene, lib: Library & { base: string } = this.lib): Promise<void> {
    const token = ++this.buildToken
    const next: Built[] = []
    const wanted: { layer: SceneLayer; order: number; index: number }[] = []
    if (s.set.sky) wanted.push({ layer: { asset: s.set.sky, depth: 'sky' }, order: 0, index: -1 })
    const perDepth: Record<string, number> = { sky: 1 }
    s.set.layers.forEach((layer, index) => { const d = layer.depth; perDepth[d] = perDepth[d] ?? 0; wanted.push({ layer, order: perDepth[d]++, index }) })
    const misses: { need: unknown; reason: string }[] = []
    await Promise.all(wanted.map(async ({ layer, order, index }) => {
      const asset = resolveAsset(lib, layer, layer.depth)
      if (!asset) { misses.push({ need: layer.need ?? layer.asset, reason: 'no match' }); return }
      let tex
      try { tex = await loadPremultiplied(lib.base + asset.file, this.scene) } catch { misses.push({ need: layer.need ?? layer.asset, reason: `file did not load: ${asset.file}` }); return }
      if (token !== this.buildToken) return
      const p = placeLayer(asset, layer, order)   // y is set in pose(): the auto horizon needs the strip loaded first
      const handle = makeLayer(asset, tex, p.w, p.h, p.uRepeat, this.scene)
      handle.mesh.position.set(p.x, p.y, p.z)
      const flat = liesFlat(layer, asset)
      handle.mesh.alphaIndex = flat ? DECAL_SLOT : p.alphaIndex
      if (flat) handle.mesh.rotation.x = Math.PI / 2   // its top edge points away from the camera, along the floor
      handle.mesh.isVisible = false
      // a contact stain on the ground under standing things (not under far strips or floating sky props)
      let stain: Stain | undefined, cast: Stain | undefined, stainDepth: ((z: number) => number) | undefined
      if (STANDING.includes(layer.depth) && !asset.tileable_x && !flat && !isGroundStrip(asset)) {
        const sz = stainSize(asset, p.w, p.h, p.z)
        stainDepth = (z) => stainSize(asset, p.w, p.h, z).d / sz.d   // the stain's depth at another distance, as a share of this one
        stain = makeStain(handle.mesh, sz.w, sz.d, this.scene)
        stain.mesh.alphaIndex = stainIndex(p.alphaIndex)
        // and its shadow, cast along the one sun (S3's makeStain cast: puppets and props share the light)
        cast = makeStain(handle.mesh, sz.w, sz.d, this.scene, { dir: [this.sunDir.x, this.sunDir.z], length: p.h * castLength(this.sunDir) })
        cast.mesh.alphaIndex = stainIndex(p.alphaIndex)
      }
      next.push({ layer, index, builtScale: layer.scale ?? 1, handle, asset, order, stain, cast, stainDepth, ink: inkLevels.get(lib.base + asset.file), flat, skyline: skylines.get(lib.base + asset.file) })
    }))
    // the floor: the scene's ground art (or the bundle paper), fading into where the far landscape ends
    const choice = resolveGround(s.set, lib)
    let groundTex = null
    // the near band (set.near): a wide strip painted from eye height, laid on the floor out to look.nearFar
    let nearTex: RawTexture | null = null
    const nearId = defaultNear(s.set.near, lib)
    const nearAsset = nearId ? resolveAsset(lib, { asset: nearId }) : null
    if (s.set.near && !nearAsset) misses.push({ need: s.set.near, reason: 'no near band' })
    if (nearAsset) { try { nearTex = await loadPremultiplied(lib.base + nearAsset.file, this.scene) } catch { misses.push({ need: s.set.near, reason: `file did not load: ${nearAsset.file}` }) } }
    if (choice.kind === 'asset') {
      try { groundTex = await loadPremultiplied(lib.base + choice.asset.file, this.scene) } catch { misses.push({ need: s.set.ground ?? 'ground', reason: `file did not load: ${choice.asset.file}` }) }
    } else if (choice.reason) misses.push({ need: s.set.ground, reason: choice.reason })
    // the first strip in the scene's own order (loads finish in any order), not a prop placed far off
    const far = next.filter((b) => b.asset.layer === 'bg').sort((a, b) => a.index - b.index)[0]
    const strip = far ? { top: landTops.get(lib.base + far.asset.file) ?? 0, h: placeLayer(far.asset, far.layer, far.order).h, order: far.order } : null
    // under a strip the floor fades into the strip's own ground colour; with no strip, into the sky's colour where it
    // meets the floor (eye height on the sky plane), so the sky never ends on a hard line against a paper band
    const sky = next.find((b) => b.index === -1)
    const skyP = sky && placeLayer(sky.asset, sky.layer, sky.order)
    const skyHaze = sky && skyP ? bandAt(bandColours.get(lib.base + sky.asset.file) ?? [], (HOUSE.y - skyP.y) / skyP.h) : null
    // with ground bands the floor fades into paper, never into the sky: the bands carry the horizon
    const tint = far ? edgeColours.get(lib.base + far.asset.file) ?? null : s.set.groundBands?.length ? null : skyHaze
    const bandsNext = await this.loadBands(s, lib)
    const dispose = (list: Built[]) => list.forEach((b) => { b.stain?.mesh.material?.dispose(); b.cast?.mesh.material?.dispose(); b.handle.mesh.dispose(); b.handle.material.dispose() })
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
    // the colour a standing thing's foot sinks into: the floor art's own average, else the floor's wash
    const tileBands = choice.kind === 'asset' ? (bandColours.get(lib.base + choice.asset.file) ?? []).filter((c): c is [number, number, number] => !!c) : []
    // with ground bands the floor is only the paper behind them: no tile can show between the painted strips
    const look = this.groundLook(choice.kind === 'asset' ? { tex: groundTex, asset: choice.asset } : null, tint, lib, choice.kind === 'paper' ? choice.colour : undefined)
    this.horizonTint = look.tint
    this.strip = strip
    // smoke from every fire in the scene, rebuilt with it
    this.smoke.forEach((m) => m.dispose())
    this.smoke = next.filter((b) => smokes(b.asset) && STANDING.includes(b.layer.depth) && !b.flat).map((b) => {
      const p = placeLayer(b.asset, b.layer, b.order)
      return makeSmoke(this.scene, new Vector3(b.handle.mesh.position.x, p.h * 0.6, p.z), Math.min(Math.max(p.h * 0.8, 0.5), 3), p.alphaIndex)
    })
    this.footTint = tileBands.length ? mean3(tileBands) : look.base
    this.nearTex = nearTex
    this.nearAsset = nearAsset
    this.hazeTint = skyHaze ?? look.tint
    this.ground.set(look)
    this.missed.set(s.id, misses)   // replaced per scene: a rebuild never doubles them
    if (misses.length) {
      console.warn(`stage25d: ${s.id}: missing`, misses)
    }
  }

  /** The floor's look: art tiled in world metres (or a paper wash), fading toward the far landscape into the colour
   *  that landscape's own ground is painted in. The wash is mostly that colour already: perspective squeezes the far
   *  half of the floor into a thin line, so a pale floor fading to a dark horizon reads as a band. */
  private groundLook(art: { tex: GroundLook['tex']; asset: Asset } | null, tint: [number, number, number] | null, lib: Library, wash?: string): GroundLook {
    const paper = hexRgb(wash ?? lib.paper ?? PAPER_HEX)
    const horizon = tint ?? paper
    return {
      tex: art?.tex ?? null, tile: art?.asset.height_m || GROUND_TILE_M,
      base: mix3(paper, horizon, GROUND_WASH), tint: horizon,
      fadeNear: DEPTH_Z.fg, fadeFar: DEPTH_Z.bg * 0.75, grain: art?.tex ? 0.5 : 1,   // flat tint before the strip: no step at its edge
    }
  }

  /** Point the built layers at an edited scene's values (x, scale, motion, keys) without rebuilding. */
  rebind(s: Scene) {
    this.built.forEach((b) => { if (b.index >= 0) b.layer = s.set.layers[b.index] })
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
      out.push({ index: b.index, asset: b.asset, u: uv.x, v: uv.y })
    }
    return out
  }

  /** The backdrops under a point (CSS px), nearest first: ground bands (`band`: its index in set.groundBands) and far
   *  strips (`index` in set.layers), with where on the picture the point lands. The editor checks the picture's alpha. */
  pickBackdrops(x: number, y: number): { band?: number; index?: number; asset: Asset; u: number; v: number }[] {
    const bandOf = (m: unknown) => this.bands.find((b) => b.handle.mesh === m)
    const stripOf = (m: unknown) => this.built.find((b) => b.handle.mesh === m && b.index >= 0 && b.asset.layer === 'bg')
    const hits = [...(this.scene.multiPick(x, y, (m) => !!bandOf(m) || !!stripOf(m)) ?? [])].sort((a, b) => a.distance - b.distance)
    return hits.flatMap((hit) => {
      const uv = hit.getTextureCoordinates()
      if (!uv) return []
      const band = bandOf(hit.pickedMesh)
      if (band) return [{ band: band.index, asset: band.asset, u: uv.x, v: uv.y }]
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
    for (const [index, g] of (s.set.groundBands ?? []).entries()) {
      const asset = resolveAsset(lib, { asset: g.asset }, 'ground_band')
      if (!asset) { console.warn(`stage25d: ${s.id}: no ground band ${g.asset}`); continue }
      const tex = await loadPremultiplied(lib.base + asset.file, this.scene).catch(() => null)
      if (!tex) { console.warn(`stage25d: ${s.id}: ground band ${asset.file} did not load`); continue }
      // the picture keeps its own proportions: its width is three views, its height follows its aspect
      const w = bandWidth(g.z), h = (w * asset.h) / asset.w
      const handle = makeLayer(asset, tex, w, h, 1, this.scene)
      handle.material.depthFunction = Constants.ALWAYS   // a band is drawn over the floor: the floor never cuts its body
      handle.mesh.position.set(0, 0, g.z)
      handle.mesh.alphaIndex = bandSlot(g.z)
      out.push({ handle, z: g.z, w, h, skyline: skylines.get(lib.base + asset.file) ?? 0.5, index, asset })
    }
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
  pose(s: Scene, t: number, clock: number, hold?: { t: number; breath_m?: number; breath_s?: number }) {
    const shot = shotAt(s, t)                       // a directed scene plays camera, then each of camera_more
    const end = cameraAt(shot.cam, shot.t, sceneDuration(s))
    const c = hold ? breathe(end, hold.t, hold) : end   // a held frame breathes around where the shot ended
    this.camera.position.set(c.x, c.y, c.z)
    this.camera.fov = c.fov
    const pitch = lookNum(this.look, 'housePitch')                 // degrees down (a teacher slider)
    this.camera.rotation.x = (pitch * Math.PI) / 180
    this.ground.follow(this.camera.position)
    const L = (k: string) => lookNum(this.look, k)
    this.ground.live({ detail: L('groundDetail'), vary: L('groundVary'), mixTile: L('groundMix'), tileScale: L('groundScale') })
    this.ground.near(this.nearTex ? { tex: this.nearTex, ...houseProjection(pitch, this.engine.getAspectRatio(this.camera), L('nearFar')), span: NEAR_SPAN, tileable: !!this.nearAsset?.tileable_x } : null)
    const renderH = this.engine.getRenderHeight()
    const paper = paperOf(this.look)
    const bandK = lookNum(this.look, 'bandHeight')
    const horizon = this.horizonOf(s)
    const land = landHeight(horizon, this.strip)   // where pictures on the far ground stand: the strip's land line
    this.land = land
    this.poseGrid(land)
    this.bands.forEach((b) => {
      b.handle.mesh.position.y = bandBottom(b.z, bandK, b.h, b.skyline)   // its skyline on the crest, k x z up
      const ppm = pxPerMetre(renderH, b.z - HOUSE.z, fovRad(HOUSE.fov))
      b.handle.setOpacity(1)
      b.handle.setBottomFade(Math.min(1, lookNum(this.look, 'bandFade') / b.h))   // the lowest metres only, not a share of the tall picture
      b.handle.setPaper(paper, pxUV(b.w, b.h, 1, ppm, renderH))
      b.handle.setLine(lineOf(this.look, 'bg'), 1, pxUV(b.w, b.h, 1, ppm, renderH), this.hazeTint)
    })
    this.smoke.forEach((m) => m.update(clock, lookNum(this.look, 'smoke')))
    this.birds.update(clock, lookNum(this.look, 'birds'))
    for (const b of this.built) {
      const k = layerAt(b.layer, t)
      const p = placeLayer(b.asset, { ...b.layer, x: k.x, y: k.y, z: k.z, scale: 1, rotation: k.rotation }, b.order, horizon, land)
      b.handle.mesh.position.x = p.x
      // a ground strip stands like a ground band: its skyline on the crest, never its bottom above the floor
      b.handle.mesh.position.y = b.flat ? DECAL_LIFT_M : isGroundStrip(b.asset) ? stripBottom(p.z, bandK, p.h * k.scale, b.skyline ?? 0) + p.y : p.y
      if (b.handle.mesh.position.z !== p.z) {
        // a picture moved along the ground (layer.z) changes distance: its draw slot follows; its stain rides along
        b.handle.mesh.position.z = p.z
        if (!b.flat) b.handle.mesh.alphaIndex = p.alphaIndex
        if (b.stain) b.stain.mesh.alphaIndex = stainIndex(p.alphaIndex)
        if (b.stain && b.stainDepth) b.stain.mesh.scaling.y = b.stainDepth(p.z)   // a stain is as deep as it looks from here
        if (b.cast) b.cast.mesh.alphaIndex = stainIndex(p.alphaIndex)
      }
      b.handle.mesh.rotation.z = (-p.rotation * Math.PI) / 180   // clockwise on screen
      b.handle.mesh.scaling.setAll(k.scale / b.builtScale)   // grows from the ground point
      b.handle.setOpacity(k.opacity)
      b.handle.setFeather(featherOf(b.asset, b.layer), this.horizonTint)
      if (b.asset.layer === 'sky') b.handle.setGroundLine((c.y - p.y) / (p.h * k.scale))
      const ppm = pxPerMetre(renderH, p.z - c.z, this.camera.fov)
      const line = lineOf(this.look, b.layer.depth)
      // the paper's grain at the scale it has from the house camera, fixed to the picture (moves and zooms with it)
      b.handle.setPaper(paper, pxUV(p.w * k.scale, p.h * k.scale, p.uRepeat, pxPerMetre(1080, p.z - HOUSE.z, fovRad(HOUSE.fov)), 1080))
      b.handle.setLine(line, b.ink === undefined ? 1 : inkScale(b.ink, line.ink, line.norm), pxUV(p.w * k.scale, p.h * k.scale, p.uRepeat, ppm, renderH), this.hazeTint)
      b.stain?.setOpacity((b.layer.shadow ?? STAIN_DEFAULT) * k.opacity)
      b.cast?.setOpacity(lookNum(this.look, 'castShadow') * ((b.layer.shadow ?? STAIN_DEFAULT) / STAIN_DEFAULT) * k.opacity)
      const kind = b.asset.layer === 'sky' ? 'sky' : b.asset.layer === 'bg' ? 'strip' : b.asset.layer === 'figure' ? 'figure' : STANDING.includes(b.layer.depth) && !b.flat ? 'standing' : 'other'
      b.handle.setAlive(aliveOf(this.look, kind, this.sunDir.x, this.footTint))
      b.handle.setMotion(motionOf(b.asset, b.layer))
      b.handle.material.setFloat('time', clock)
    }
  }
}

/** The near band spans this much of the frame's width; past its sides it repeats (tileable art) or mirrors (one
 *  painting), so no camera move ever runs out of it or smears its last column (checker floor HIGH). */
const NEAR_SPAN = 1.3

/** The editor's ground grid: a faint hairline that fades out toward the far end of the ground, so it has no hard edge. */
const GRID_ALPHA = 0.35
const GRID_SLOT_AHEAD = 0.001
const GRID_FADE_START_M = 40
const GRID_FADE_END_M = 120

/** A cast shadow's length per metre of height: the sun's run over its fall. */
/** Birds cross the far sky just beyond the far landscape, drawn with the sky (before the floor and the strips). */
const BIRD_Z_M = 110
const BIRD_SLOT = 900
const castLength = (d: Vector3) => Math.min(1.5, Math.hypot(d.x, d.z) / Math.max(-d.y, 0.2))
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
    if (!builtScene || s.bundle !== builtScene.bundle || s.set.ground !== builtScene.set.ground || s.set.layers.length !== builtScene.set.layers.length || s.set.sky !== builtScene.set.sky || s.set.near !== builtScene.set.near
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
