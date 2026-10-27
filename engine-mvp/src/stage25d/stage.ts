// The 2.5D stage: painted layers on depth planes in front of a fixed house camera, the storybook look over the
// whole frame, and a lesson's scenes played one after another with their camera and layer keyframes.
//   const player = await playLesson(lessonOrUrl, libraryUrl?, canvas?)
//   player.play() / pause() / seek(sceneIndex, t) / doc (undoable teacher edits) / groundPoint(x, depth)
import '../globals'                    // the engine modules read Babylon from window.BABYLON
import '../engine/look-shaders.js'
import {
  Color3, Color4, Engine, HemisphericLight, DirectionalLight, MeshBuilder, Scene as BScene, StandardMaterial,
  UniversalCamera, Vector3, type Mesh,
} from '@babylonjs/core'
import { createLookChain, PRESETS } from '../engine/look-chain.js'
import { libraryUrlFor, loadLibrary, resolveAsset } from './library'
import { ADAPT_STALL_MS, ADAPT_WINDOW_MS, cameraAt, nextTier, shotAt, TIER0, type Tier, DEPTH_Z, HOUSE_PITCH_DEG, layerAt, motionOf, placeLayer, renderScale, sceneDuration, viewWidthAt } from './layout'
import { loadPremultiplied, makeLayer, type LayerHandle } from './layer'
import { LessonDoc } from './edits'
import type { Asset, Depth, Lesson, Library, Scene, SceneLayer } from './types'

/** The stage's own look: History Lines pencil lines on 3D edges, a light paper grain over everything. */
export const STAGE_LOOK: Record<string, number | string> = { ...PRESETS['History Lines pencil'], paper: 0.35, granulation: 0.2 }
const PAPER = new Color4(0.937, 0.914, 0.863, 1)
const GROUND = '#a3a27a'

interface Built { layer: SceneLayer; index: number; builtScale: number; handle: LayerHandle; asset: Asset; order: number }  // index -1 = the sky

export class Stage {
  readonly engine: Engine
  readonly scene: BScene
  readonly camera: UniversalCamera
  private ground: Mesh
  private built: Built[] = []
  private buildToken = 0
  private look: Record<string, number | string> = { ...STAGE_LOOK }
  /** per scene: needs no asset matched, and assets whose file did not load (feeds needed_assets) */
  private missed = new Map<string, { need: unknown; reason: string }[]>()
  get misses() { return [...this.missed].flatMap(([scene, list]) => list.map((m) => ({ scene, ...m }))) }

  constructor(readonly canvas: HTMLCanvasElement, private lib: Library & { base: string }) {
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
    this.ground = MeshBuilder.CreateGround('ground', { width: 2400, height: 2400 }, this.scene)
    const gm = new StandardMaterial('ground', this.scene)
    gm.disableLighting = true
    gm.emissiveColor = Color3.FromHexString(GROUND)
    this.ground.material = gm
    this.ground.metadata = { noGBuffer: true }
    this.ground.isPickable = false
    createLookChain(this.scene, this.camera, {
      num: (k: string) => Number(this.look[k] ?? 0),
      inkColor: () => String(this.look.inkColor ?? 'pencil'),
      texture: () => null,
    })
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
      const p = placeLayer(asset, layer, order)
      const handle = makeLayer(asset, tex, p.w, p.h, p.uRepeat, this.scene)
      handle.mesh.position.set(p.x, p.y, p.z)
      handle.mesh.alphaIndex = p.alphaIndex
      handle.mesh.isVisible = false
      next.push({ layer, index, builtScale: layer.scale ?? 1, handle, asset, order })
    }))
    if (token !== this.buildToken) {   // a newer build won: this one never shows
      next.forEach((b) => { b.handle.mesh.dispose(); b.handle.material.dispose() })
      return
    }
    this.built.forEach((b) => { b.handle.mesh.dispose(); b.handle.material.dispose() })
    this.built = next
    ;(this.ground.material as StandardMaterial).emissiveColor = Color3.FromHexString(s.set.ground ?? GROUND)
    this.missed.set(s.id, misses)   // replaced per scene: a rebuild never doubles them
    if (misses.length) {
      console.warn(`stage25d: ${s.id}: missing`, misses)
    }
  }

  /** Point the built layers at an edited scene's values (x, scale, motion, keys) without rebuilding. */
  rebind(s: Scene) {
    this.built.forEach((b) => { if (b.index >= 0) b.layer = s.set.layers[b.index] })
  }

  /** Pose everything for t seconds into scene s. */
  pose(s: Scene, t: number, clock: number) {
    const shot = shotAt(s, t)                       // a directed scene plays camera, then each of camera_more
    const c = cameraAt(shot.cam, shot.t, sceneDuration(s))
    this.camera.position.set(c.x, c.y, c.z)
    this.camera.fov = c.fov
    for (const b of this.built) {
      const k = layerAt(b.layer, t)
      const p = placeLayer(b.asset, { ...b.layer, x: k.x, scale: 1 }, b.order)
      b.handle.mesh.position.x = p.x
      b.handle.mesh.scaling.setAll(k.scale / b.builtScale)   // grows from the ground point
      b.handle.setOpacity(k.opacity)
      b.handle.setMotion(motionOf(b.asset, b.layer))
      b.handle.material.setFloat('time', clock)
    }
  }
}

export interface Player {
  stage: Stage
  doc: LessonDoc
  scene: () => { index: number; t: number; playing: boolean }
  play(): void
  pause(): void
  seek(index: number, t?: number): Promise<void>
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

  let index = 0, t = 0, playing = true, last = performance.now(), clock = 0
  let builtScene: Scene | null = null
  let entering = 0                       // a scene change in flight: the old scene holds its last frame meanwhile
  const current = () => doc.lesson.scenes[index]
  async function enter(i: number, at = 0) {
    const target = Math.max(0, Math.min(doc.lesson.scenes.length - 1, i))
    const ticket = ++entering
    const s = doc.lesson.scenes[target]
    await stage.build(s, await sceneLibrary(s))
    if (ticket !== entering) return      // a later seek won
    index = target; t = at; builtScene = s
    entering = 0
  }
  // an edit: a changed set (layers added/removed, asset swapped) rebuilds; everything else is read live
  doc.subscribe(() => {
    const s = current()
    stage.setLook(doc.lesson.look)
    if (!builtScene || s.bundle !== builtScene.bundle || s.set.layers.length !== builtScene.set.layers.length || s.set.sky !== builtScene.set.sky
      || s.set.layers.some((l, i) => l.asset !== builtScene!.set.layers[i].asset || l.need !== builtScene!.set.layers[i].need || l.depth !== builtScene!.set.layers[i].depth)) {
      void enter(index, t)
      return
    }
    stage.rebind(s)
    builtScene = s
  })
  await enter(0)

  const frames: number[] = []
  stage.engine.runRenderLoop(() => {
    const now = performance.now()
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    frames.push(now); while (frames.length && now - frames[0] > 1000) frames.shift()
    stage.tick(now)
    clock += dt                                  // motion keeps breathing while paused
    if (playing && !entering) {
      t += dt
      if (t >= sceneDuration(current())) {
        if (index < doc.lesson.scenes.length - 1) void enter(index + 1)
        else { t = sceneDuration(current()); playing = false }
      }
    }
    stage.pose(current(), t, clock)
    stage.scene.render()
  })
  return {
    stage, doc,
    scene: () => ({ index, t, playing }),
    play: () => { if (index === doc.lesson.scenes.length - 1 && t >= sceneDuration(current())) void enter(0); playing = true },
    pause: () => { playing = false },
    seek: (i, at = 0) => enter(i, at),
    fps: () => frames.length,
  }
}
