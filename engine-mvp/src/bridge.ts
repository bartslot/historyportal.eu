// React <-> engine. The engine owns the scene; React reads a small snapshot of it and calls the engine's
// own functions to change it. The snapshot is refreshed after renders, a few times a second, and only
// a real change re-renders the panels.
import { useSyncExternalStore } from 'react'
import * as TL from './timeline/model'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Mvp = any
export type Picked = { id: string; name: string; kind: 'model' | 'picture' | 'door' | 'cloud'; yaw: number; x: number; z: number; keyed: boolean
  blockout: { figure: boolean; pose: string | null } | null }   // a clay blockout piece (its edits are undo ops)
/** What the object list shows: where each thing is, what it hangs on, whether it moves. */
export type SceneObject = {
  target: string; name: string; kind: Picked['kind']; character: boolean
  parent: string | null; x: number; z: number; animated: boolean; hidden: boolean
}
export type Snapshot = { ready: boolean; selected: Picked | null; playing: boolean; objects: SceneObject[]; shot: string | null }

const REFRESH_EVERY = 6 // frames
let snap: Snapshot = { ready: false, selected: null, playing: false, objects: [], shot: null }
const listeners = new Set<() => void>()
const mvp = (): Mvp => (window as any).__mvp

function kindOf(a: any): Picked['kind'] {
  if (a.metadata.opening) return 'door'
  if (a.metadata.cloud) return 'cloud'
  if (a.metadata.decal) return 'picture'
  return 'model'
}

function read(): Snapshot {
  const m = mvp()
  const a = m.getSelected()
  const selected = a && !a.isDisposed() ? {
    id: a.metadata.id, name: a.name, kind: kindOf(a),
    yaw: Math.round(((a.rotationQuaternion.toEulerAngles().y * 180 / Math.PI) + 360) % 360),
    x: +a.position.x.toFixed(2), z: +a.position.z.toFixed(2),
    keyed: TL.hasKeyHere(TL.targetOf(a), 'turn'),
    blockout: m.blockout && m.blockout.isPiece(a) ? { figure: a.metadata.kit === 'figure', pose: a.metadata.pose ?? null } : null,
  } : null
  const animated = new Set(TL.getState().tracks.filter((t) => t.keyframes.length >= 2).map((t) => t.target))
  const live = m.actors.filter((x: any) => !x.isDisposed() && !x.metadata.cloud)
  const objects: SceneObject[] = live.map((x: any) => {
    const p = x.getAbsolutePosition()
    const host = x.parent && live.includes(x.parent) ? TL.targetOf(x.parent) : null
    return {
      target: TL.targetOf(x), name: x.name, kind: kindOf(x), character: !!x.metadata.clips?.length,
      parent: host, x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10,
      animated: animated.has(TL.targetOf(x)), hidden: !x.isEnabled(),
    }
  })
  return { ready: true, selected, playing: m.isPlaying(), objects, shot: m.blockout ? m.blockout.currentShot()?.shot ?? null : null }
}

export function engineReady() {
  const m = mvp()
  let n = 0
  const refresh = () => {
    const next = read()
    if (JSON.stringify(next) === JSON.stringify(snap)) return
    snap = next
    listeners.forEach((l) => l())
  }
  m.scene.onAfterRenderObservable.add(() => { if (++n % REFRESH_EVERY === 0) refresh() })
  TL.subscribe(refresh) // an edit through the timeline shows at once, not a few frames later
  refresh()
}

export function useEngine(): Snapshot {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => snap)
}

// ---------- actions: thin calls into the engine's own functions ----------
// The panel edits through the timeline, so a value typed here keys itself exactly like one typed in
// the timeline's own rows: auto-key on an animated property, a plain change otherwise.
const target = () => { const a = mvp().getSelected(); return a ? TL.targetOf(a) : null }
// a clay blockout piece: a hand edit is one undo op that pins what the teacher set (blockout.js onHandEdit)
function handEdit(change: (a: any) => void, kind: 'move' | 'turn'): boolean {
  const m = mvp()
  const a = m.getSelected()
  if (!a || !m.blockout || !m.blockout.isPiece(a)) return false
  const from = { position: a.position.clone(), rotation: a.rotationQuaternion.clone() }
  change(a)
  if (a.metadata.footprint) m.snapToFootprint(a)
  if (!m.fits(a)) { m.flash(m.whyNot(a)); a.position.copyFrom(from.position); a.rotationQuaternion = from.rotation; return true }
  m.onHandEdit(a, from, kind)
  return true
}
export const actions = {
  turnTo(deg: number) {
    if (handEdit((a) => { a.rotationQuaternion = (window as any).BABYLON.Quaternion.RotationAxis((window as any).BABYLON.Axis.Y, (deg * Math.PI) / 180) }, 'turn')) return
    const t = target(); if (t) TL.setValue(t, 'turn', deg)
  },
  moveTo(x: number, z: number) {
    if (handEdit((a) => { a.position.x = x; a.position.z = z }, 'move')) return
    const t = target(); if (!t) return
    TL.setValue(t, 'x', mvp().snap(x)); TL.setValue(t, 'z', mvp().snap(z))
  },
  /** The teacher's pose for the selected blockout figure (one op, pinned: an AI pose keeps it). */
  setPose(name: string) { const a = mvp().getSelected(); if (a) mvp().blockout.setPose(a.metadata.id, name, 'teacher') },
  /** The teacher's camera preset on the blockout's subjects (one op). */
  setShot(preset: string) { const s = mvp().blockout.currentShot(); if (s) mvp().blockout.frameAs({ ...s, shot: preset }, 'teacher') },
  keyTurn() { const t = target(); if (t) TL.toggleKey(t, 'turn') },
}
