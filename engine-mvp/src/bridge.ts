// React <-> engine. The engine owns the scene; React reads a small snapshot of it and calls the engine's
// own functions to change it. The snapshot is refreshed after renders, a few times a second, and only
// a real change re-renders the panels.
import { useSyncExternalStore } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Mvp = any
export type Picked = { id: string; name: string; kind: 'model' | 'picture' | 'door' | 'cloud'; yaw: number; x: number; z: number; keyed: boolean }
export type Snapshot = { ready: boolean; selected: Picked | null; playing: boolean }

const REFRESH_EVERY = 6 // frames
let snap: Snapshot = { ready: false, selected: null, playing: false }
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
    keyed: a.metadata.keys.some((k: any) => k.frame === m.getFrame()),
  } : null
  return { ready: true, selected, playing: m.isPlaying() }
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
  refresh()
}

export function useEngine(): Snapshot {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => snap)
}

// ---------- actions: thin calls into the engine's own functions ----------
const sel = () => mvp().getSelected()
export const actions = {
  turnTo(deg: number) {
    const a = sel(); if (!a) return
    const B = (window as any).BABYLON
    a.rotationQuaternion = B.Quaternion.RotationAxis(B.Axis.Y, deg * Math.PI / 180)
    mvp().autoKey()
  },
  moveTo(x: number, z: number) {
    const a = sel(); if (!a) return
    a.position.x = mvp().snap(x); a.position.z = mvp().snap(z)
    mvp().autoKey()
  },
  key() { mvp().autoKey() },
}
