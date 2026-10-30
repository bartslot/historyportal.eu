// Clay frames: a shot's data rendered as untextured grey 3D (the standard mannequin, blocked-out set pieces, the
// shot's camera). ONE small engine of its own for every frame (the stage's engine holds the scene being built), so a
// frame never touches the lesson's scene. Frames render one at a time, small, and are cached by their data: a frame
// re-renders only when its own shot changed. The same engine is the director's view (`direct`): the teacher moves the
// camera and the figures in it, and that is saved to the shot.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { halfExtents, kitPiece } from '../blockout/kit'
import { solve, type Placed, type Spec } from '../blockout/solve'
import { frame, presetAz, type Shot as Camera, type Subject } from '../blockout/camera'
import { FIGURE_URLS, buildShape, poseFigure } from '../engine/clay-kit'
import type { ShotData } from './shots'

declare const BABYLON: any

export const FRAME_W = 640
export const FRAME_H = 400               // 16:10, the Figma frame
const THUMB_W = 336                      // twice the frame's width in the scene graph: sharp on a retina screen
const JPEG_QUALITY = 0.82
const PARK_Y = -1000                     // instanced source meshes wait out of sight
const CLAY = [0.78, 0.76, 0.72]
const FRAME = [0x2e / 255, 0x42 / 255, 0x5a / 255]   // the Figma frame's slate (2086:223): clay reads on the dark UI
const SLATE = [0.36, 0.40, 0.45]         // silhouette frames: a mid slate, black people, a darker set (memory 10-11)
const SET_INK = 0.45
const RIM_WIDTH = 0.012
const ORBIT_DEG_PER_PX = 0.4
const LENS_MIN = 18
const LENS_MAX = 135
const DEFAULT_LENS = 35

export type Palette = 'clay' | 'silhouette'
export type Rims = Record<string, string>

type World = {
  engine: any; scene: any; cam: any; container: any; mats: Record<string, any>; ground: any
  sources: Map<string, any>; built: any[]; roots: Map<string, any>; placed: Record<string, Placed>
}
let world: Promise<World> | null = null

async function makeWorld(): Promise<World> {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W
  canvas.height = FRAME_H
  canvas.className = 'block rounded-sm'
  Object.assign(canvas.style, { width: `${FRAME_W}px`, height: `${FRAME_H}px`, touchAction: 'none' })
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true })
  const scene = new BABYLON.Scene(engine)
  scene.skipPointerMovePicking = true
  const cam = new BABYLON.FreeCamera('clay cam', new BABYLON.Vector3(0, 1.6, -6), scene)
  cam.minZ = 0.05
  const hemi = new BABYLON.HemisphericLight('clay sky', new BABYLON.Vector3(0.3, 1, -0.4), scene)
  hemi.intensity = 0.9
  const mat = (name: string, rgb: number[], lit: boolean) => {
    const m = new BABYLON.StandardMaterial(name, scene)
    m.specularColor = BABYLON.Color3.Black()
    if (lit) { m.diffuseColor = BABYLON.Color3.FromArray(rgb.map((v) => v * 0.45)); m.emissiveColor = BABYLON.Color3.FromArray(rgb.map((v) => v * 0.55)) }
    else { m.disableLighting = true; m.emissiveColor = BABYLON.Color3.FromArray(rgb) }
    return m
  }
  const mats = {
    clay: mat('clay', CLAY, true),
    ink: mat('ink', [0, 0, 0], false),
    setInk: mat('set ink', SLATE.map((v) => v * SET_INK), false),
    floorClay: mat('floor clay', FRAME.map((v) => v * 0.78), false),
    floorSlate: mat('floor slate', SLATE.map((v) => v * 0.8), false),
  }
  const ground = BABYLON.MeshBuilder.CreateGround('clay floor', { width: 400, height: 400 }, scene)
  ground.isPickable = false
  let container = null
  for (const url of FIGURE_URLS) {
    try { container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', url, scene); break } catch (e) {
      if (url === FIGURE_URLS[FIGURE_URLS.length - 1]) throw e
    }
  }
  return { engine, scene, cam, container, mats, ground, sources: new Map(), built: [], roots: new Map(), placed: {} }
}
const getWorld = () => (world ??= makeWorld().catch((e) => { world = null; throw e }))

/** A subject's box from where it stands and its kit size (no meshes needed: the camera maths is pure). */
export function boxOf(p: Placed): Subject {
  const [hx, hz] = halfExtents(kitPiece(p.kit), p.yaw, p.height)
  return { id: p.id, yaw: p.yaw, box: { min: [p.x - hx, p.y, p.z - hz], max: [p.x + hx, p.y + p.height, p.z + hz] } }
}

/** The camera for a shot among placed pieces; a shot whose subjects are gone frames everyone in it. */
export function cameraFor(cam: Camera, placed: Record<string, Placed>, aspect = FRAME_W / FRAME_H) {
  const subjects = cam.subjects.filter((id) => placed[id]).map((id) => boxOf(placed[id]))
  if (subjects.length) return frame(cam, subjects, aspect)
  const all = Object.values(placed).filter((p) => p.kit === 'figure').map(boxOf)
  return frame({ ...cam, shot: 'wide' }, all.length ? all : Object.values(placed).filter((p) => p.kit !== 'marker').map(boxOf), aspect)
}

function source(w: World, kit: string) {
  if (w.sources.has(kit)) return w.sources.get(kit)
  const parts = buildShape(w.scene, kitPiece(kit))
  const m = parts.length > 1 ? BABYLON.Mesh.MergeMeshes(parts, true, true) : parts[0] ?? null
  if (m) { m.bakeCurrentTransformIntoVertices(); m.isPickable = false; m.position.y = PARK_Y }
  w.sources.set(kit, m)
  return m
}

function clear(w: World) {
  w.built.forEach((n) => n.dispose(false, false))   // materials are shared: keep them
  w.built = []
  w.roots.clear()
}

function figure(w: World, p: Placed, pose: string | undefined, palette: Palette, rim: string | undefined) {
  const inst = w.container.instantiateModelsToScene((n: string) => `${p.id} ${n}`, false)
  const root = new BABYLON.TransformNode(p.id, w.scene)
  inst.rootNodes.forEach((r: any) => { r.parent = root })
  const idle = inst.animationGroups.find((g: any) => /idle/i.test(g.name)) ?? inst.animationGroups[0]
  inst.animationGroups.forEach((g: any) => g.stop())
  if (idle) { idle.start(false, 1, idle.from, idle.from); idle.goToFrame(idle.from); idle.pause() }
  const { min, max } = root.getHierarchyBoundingVectors(true)
  root.scaling.setAll(p.height / ((max.y - min.y) || 1))
  root.position.set(p.x, p.y, p.z)
  root.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, (p.yaw * Math.PI) / 180)
  root.computeWorldMatrix(true)
  poseFigure(w.scene, root, p.yaw, pose ?? 'stand', w.mats.clay, p.id)
  root.getChildMeshes().forEach((m: any) => {
    m.material = palette === 'silhouette' ? w.mats.ink : w.mats.clay
    m.renderOutline = !!rim
    if (rim) { m.outlineColor = BABYLON.Color3.FromHexString(rim); m.outlineWidth = RIM_WIDTH }
  })
  return root
}

function build(w: World, data: ShotData, palette: Palette, rims: Rims) {
  clear(w)
  const { placed } = solve(data.objects)
  w.placed = placed
  w.scene.clearColor = BABYLON.Color4.FromArray([...(palette === 'silhouette' ? SLATE : FRAME), 1])
  w.ground.material = palette === 'silhouette' ? w.mats.floorSlate : w.mats.floorClay
  for (const p of Object.values(placed)) {
    const spec = data.objects.find((o) => o.id === p.id)
    let root: any = null
    if (p.kit === 'figure') root = figure(w, p, spec?.pose, palette, rims[p.id])
    else if (p.kit !== 'marker') {
      const src = source(w, p.kit)
      if (!src) continue
      src.material = palette === 'silhouette' ? w.mats.setInk : w.mats.clay
      root = src.createInstance(p.id)
      root.position.set(p.x, p.y, p.z)
      root.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, (p.yaw * Math.PI) / 180)
    }
    if (!root) continue
    root.metadata = { clayId: p.id }
    w.built.push(root)
    w.roots.set(p.id, root)
  }
  aimCamera(w, data.camera)
}

function aimCamera(w: World, cam: Camera) {
  const c = cameraFor(cam, w.placed)
  w.cam.position = BABYLON.Vector3.FromArray(c.position)
  w.cam.setTarget(BABYLON.Vector3.FromArray(c.target))
  w.cam.fov = c.fovY
}

// ---------- frames: one at a time, cached by their data ----------
const cache = new Map<string, string>()
let queue: Promise<unknown> = Promise.resolve()
let released: Promise<void> = Promise.resolve()   // the director holds the engine; frames wait until it lets go

const keyOf = (data: ShotData, palette: Palette, rims: Rims) => JSON.stringify([data.camera, data.objects, palette, rims])

/** The frame of a shot as a small JPEG data URL. */
export function renderShot(data: ShotData, palette: Palette, rims: Rims): Promise<string> {
  const key = keyOf(data, palette, rims)
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const job = queue.then(() => released).then(async () => {
    const again = cache.get(key)
    if (again) return again
    const w = await getWorld()
    build(w, data, palette, rims)
    await w.scene.whenReadyAsync()
    w.scene.render()
    const out = document.createElement('canvas')
    out.width = THUMB_W
    out.height = Math.round((THUMB_W * FRAME_H) / FRAME_W)
    out.getContext('2d')!.drawImage(w.engine.getRenderingCanvas(), 0, 0, out.width, out.height)
    const url = out.toDataURL('image/jpeg', JPEG_QUALITY)
    cache.set(key, url)
    return url
  })
  queue = job.catch(() => undefined)
  return job
}

// ---------- directing: the same engine, live, in the director's panel ----------
export type Director = { canvas: HTMLCanvasElement; update: (d: ShotData) => void; close: () => void }

/** Show the shot live in `host`. Drag a figure or set piece to move it, drag the empty frame to walk the camera
 *  round, the wheel to change the lens. Every finished gesture hands the new data to `onChange`. */
export async function direct(host: HTMLElement, start: ShotData, palette: Palette, rims: Rims, onChange: (d: ShotData) => void): Promise<Director> {
  let release!: () => void
  const before = released                          // the previous director's hold (read NOW: ours replaces it)
  const turn = queue.then(() => before)
  released = new Promise<void>((r) => { release = r })
  await turn
  const w = await getWorld()
  let data = start
  build(w, data, palette, rims)
  const canvas: HTMLCanvasElement = w.engine.getRenderingCanvas()
  host.appendChild(canvas)
  w.engine.runRenderLoop(() => w.scene.render())

  const at = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (FRAME_W / r.width), (e.clientY - r.top) * (FRAME_H / r.height)] }
  const idOfMesh = (m: any) => { for (let n = m; n; n = n.parent) if (n.metadata?.clayId) return n.metadata.clayId as string; return null }
  const onFloor = (x: number, y: number) => {
    const ray = w.scene.createPickingRay(x, y, BABYLON.Matrix.Identity(), w.cam)
    if (Math.abs(ray.direction.y) < 1e-4) return null
    const t = -ray.origin.y / ray.direction.y
    return t > 0 ? [ray.origin.x + ray.direction.x * t, ray.origin.z + ray.direction.z * t] : null
  }
  let drag: { id: string | null; x0: number; az0: number; moved: boolean } | null = null

  const down = (e: PointerEvent) => {
    const [x, y] = at(e)
    const hit = w.scene.pick(x, y, (m: any) => !!idOfMesh(m))
    const id = hit?.hit ? idOfMesh(hit.pickedMesh) : null
    canvas.setPointerCapture(e.pointerId)
    drag = { id: id && w.placed[id]?.kit !== 'marker' ? id : null, x0: e.clientX, az0: data.camera.az ?? presetAz(data.camera.shot), moved: false }
  }
  const move = (e: PointerEvent) => {
    if (!drag) return
    drag.moved = true
    if (drag.id) {
      const [x, y] = at(e)
      const p = onFloor(x, y)
      const root = w.roots.get(drag.id)
      if (p && root) { root.position.x = p[0]; root.position.z = p[1] }
    } else if (data.camera.shot !== 'over-shoulder') {
      aimCamera(w, { ...data.camera, az: Math.round(drag.az0 + (e.clientX - drag.x0) * ORBIT_DEG_PER_PX) })
    }
  }
  const up = (e: PointerEvent) => {
    const d = drag
    drag = null
    if (!d?.moved) return
    let next: ShotData
    if (d.id) {
      const root = w.roots.get(d.id)
      const r2 = (v: number) => Math.round(v * 100) / 100
      next = { ...data, objects: data.objects.map((o): Spec => {
        if (o.id !== d.id) return o
        const { place: _p, ...rest } = o
        return { ...rest, at: [r2(root.position.x), r2(root.position.z)] }
      }) }
      if (!solve(next.objects).placed[d.id]) next = data      // it would stand in someone: back where it was
    } else {
      if (data.camera.shot === 'over-shoulder') return
      next = { ...data, camera: { ...data.camera, az: Math.round(d.az0 + (e.clientX - d.x0) * ORBIT_DEG_PER_PX) } }
    }
    data = next
    build(w, data, palette, rims)
    onChange(data)
  }
  const wheel = (e: WheelEvent) => {
    e.preventDefault()
    const lens = Math.round(Math.min(LENS_MAX, Math.max(LENS_MIN, (data.camera.lens_mm ?? DEFAULT_LENS) * (e.deltaY < 0 ? 1.1 : 1 / 1.1))))
    if (lens === data.camera.lens_mm) return
    data = { ...data, camera: { ...data.camera, lens_mm: lens } }
    aimCamera(w, data.camera)
    onChange(data)
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('wheel', wheel, { passive: false })

  return {
    canvas,
    update(d) { data = d; build(w, data, palette, rims) },
    close() {
      w.engine.stopRenderLoop()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('wheel', wheel)
      canvas.remove()
      release()
    },
  }
}
