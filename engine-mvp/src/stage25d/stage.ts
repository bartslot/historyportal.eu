// The 2.5D stage: painted layers on depth planes in front of a fixed house camera, the storybook look over the
// whole frame, and a lesson's scenes played one after another with their camera and layer keyframes.
//   const player = await playLesson(lessonOrUrl, libraryUrl?, canvas?)
//   player.pause() / resume() / seek(sceneIndex, t) / seekToScene(id) / clock() / onInteraction(fn) / subscribe(fn)
//   player.doc (undoable teacher edits) / stage.groundPoint(x, depth)
import '../globals'                    // the engine modules read Babylon from window.BABYLON
import '../engine/look-shaders.js'
import {
  Color4, Engine, HemisphericLight, DirectionalLight, Scene as BScene, UniversalCamera, Vector3,
} from '@babylonjs/core'
import { createLookChain, PRESETS } from '../engine/look-chain.js'
import { lineOf, pxPerMetre, pxUV, STAGE_SHEET } from './look'
import { makeSheet } from './sheet'
import { libraryUrlFor, loadLibrary, resolveAsset } from './library'
import { ADAPT_STALL_MS, ADAPT_WINDOW_MS, breathe, cameraAt, nextTier, shotAt, stainIndex, TIER0, type Tier, DEPTH_Z, HOUSE, HOUSE_PITCH_DEG, layerAt, motionOf, placeLayer, renderScale, sceneDuration, viewWidthAt } from './layout'
import { bandColours, edgeColours, loadPremultiplied, makeLayer, type LayerHandle } from './layer'
import { bandAt, featherOf, GROUND_TILE_M, hexRgb, PAPER as PAPER_HEX, resolveGround, STAIN_DEFAULT, stainSize } from './ground'
import { makeGround, makeStain, type GroundLook } from './ground-gl'
import { LessonDoc } from './edits'
import { Timeline, type InteractionHandler, type Mode } from './timeline'
import type { Asset, Depth, Lesson, Library, Scene, SceneLayer } from './types'

/** The stage's own look: History Lines pencil lines on 3D edges, a light paper grain over everything. */
export const STAGE_LOOK: Record<string, number | string> = { ...PRESETS['History Lines pencil'], paper: 0.35, granulation: 0.2, ...STAGE_SHEET }
const PAPER = new Color4(0.937, 0.914, 0.863, 1)
type Stain = ReturnType<typeof makeStain>
interface Built { layer: SceneLayer; index: number; builtScale: number; handle: LayerHandle; asset: Asset; order: number; stain?: Stain }  // index -1 = the sky
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
    new DirectionalLight('sun', new Vector3(-0.4, -1, 0.6), this.scene).intensity = 1.2
    this.sceneLib = lib
    this.ground = makeGround(this.scene)
    this.ground.set(this.groundLook(null, null, lib))
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
      const p = placeLayer(asset, layer, order, s.set.horizon ?? 0)
      const handle = makeLayer(asset, tex, p.w, p.h, p.uRepeat, this.scene)
      handle.mesh.position.set(p.x, p.y, p.z)
      handle.mesh.alphaIndex = p.alphaIndex
      handle.mesh.isVisible = false
      // a contact stain on the ground under standing things (not under far strips or floating sky props)
      let stain: Stain | undefined
      if ((layer.depth === 'mid' || layer.depth === 'fg') && !asset.tileable_x) {
        const sz = stainSize(asset, p.w, p.h, p.z)
        stain = makeStain(handle.mesh, sz.w, sz.d, this.scene)
        stain.mesh.alphaIndex = stainIndex(p.alphaIndex)
      }
      next.push({ layer, index, builtScale: layer.scale ?? 1, handle, asset, order, stain })
    }))
    // the floor: the scene's ground art (or the bundle paper), fading into where the far landscape ends
    const choice = resolveGround(s.set, lib)
    let groundTex = null
    if (choice.kind === 'asset') {
      try { groundTex = await loadPremultiplied(lib.base + choice.asset.file, this.scene) } catch { misses.push({ need: s.set.ground ?? 'ground', reason: `file did not load: ${choice.asset.file}` }) }
    } else if (choice.reason) misses.push({ need: s.set.ground, reason: choice.reason })
    const far = next.find((b) => b.asset.layer === 'bg')   // a strip, not a prop placed far off
    // under a strip the floor fades into the strip's own ground colour; with no strip, into the sky's colour where it
    // meets the floor (eye height on the sky plane), so the sky never ends on a hard line against a paper band
    const sky = next.find((b) => b.index === -1)
    const skyP = sky && placeLayer(sky.asset, sky.layer, sky.order)
    const skyHaze = sky && skyP ? bandAt(bandColours.get(lib.base + sky.asset.file) ?? [], (HOUSE.y - skyP.y) / skyP.h) : null
    const tint = far ? edgeColours.get(lib.base + far.asset.file) ?? null : skyHaze
    const dispose = (list: Built[]) => list.forEach((b) => { b.stain?.mesh.material?.dispose(); b.handle.mesh.dispose(); b.handle.material.dispose() })
    if (token !== this.buildToken) {   // a newer build won: this one never shows
      dispose(next)
      return
    }
    dispose(this.built)
    this.built = next
    this.sceneLib = lib
    const look = this.groundLook(choice.kind === 'asset' ? { tex: groundTex, asset: choice.asset } : null, tint, lib, choice.kind === 'paper' ? choice.colour : undefined)
    this.horizonTint = look.tint
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

  /** Pose everything for t seconds into scene s. */
  pose(s: Scene, t: number, clock: number, hold?: { t: number; breath_m?: number; breath_s?: number }) {
    const shot = shotAt(s, t)                       // a directed scene plays camera, then each of camera_more
    const end = cameraAt(shot.cam, shot.t, sceneDuration(s))
    const c = hold ? breathe(end, hold.t, hold) : end   // a held frame breathes around where the shot ended
    this.camera.position.set(c.x, c.y, c.z)
    this.camera.fov = c.fov
    this.ground.follow(this.camera.position)
    this.ground.setDetail(Number(this.look.groundDetail ?? STAGE_SHEET.groundDetail))
    const renderH = this.engine.getRenderHeight()
    for (const b of this.built) {
      const k = layerAt(b.layer, t)
      const p = placeLayer(b.asset, { ...b.layer, x: k.x, scale: 1 }, b.order, s.set.horizon ?? 0)
      b.handle.mesh.position.x = p.x
      b.handle.mesh.position.y = p.y
      b.handle.mesh.scaling.setAll(k.scale / b.builtScale)   // grows from the ground point
      b.handle.setOpacity(k.opacity)
      b.handle.setFeather(featherOf(b.asset, b.layer), this.horizonTint)
      if (b.asset.layer === 'sky') b.handle.setGroundLine((c.y - p.y) / (p.h * k.scale))
      const ppm = pxPerMetre(renderH, p.z - c.z, this.camera.fov)
      b.handle.setLine(lineOf(this.look, b.layer.depth), pxUV(p.w * k.scale, p.h * k.scale, p.uRepeat, ppm, renderH), this.hazeTint)
      b.stain?.setOpacity((b.layer.shadow ?? STAIN_DEFAULT) * k.opacity)
      b.handle.setMotion(motionOf(b.asset, b.layer))
      b.handle.material.setFloat('time', clock)
    }
  }
}

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
    if (!builtScene || s.bundle !== builtScene.bundle || s.set.ground !== builtScene.set.ground || s.set.layers.length !== builtScene.set.layers.length || s.set.sky !== builtScene.set.sky
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
