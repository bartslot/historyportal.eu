// ONE list of panels and ONE place their state lives. Every panel, dock, menu and modal in the studio
// is registered here; open/close, size and the Esc order all go through it, so no panel invents its own.
import { useSyncExternalStore } from 'react'
import type { Step } from '../lesson/store'

export type Place = 'left' | 'right' | 'bottom' | 'floating' | 'menu'
export type PanelDef = {
  id: string; title: string; place: Place
  /** false: no X (the bottom dock, Bart 2026-09-29). It still toggles from View. */
  closable: boolean
  open: boolean
  /** px along the axis it slides on; docked panels only */
  size?: number; min?: number; max?: number
  /** listed under View */
  inView: boolean
  /** the steps it belongs to (none listed: every step) */
  steps?: Step[]
}

export const PANELS: PanelDef[] = [
  { id: 'objects', title: 'Objects', place: 'left', closable: true, open: true, size: 220, min: 56, max: 360, inView: true, steps: ['visual', 'animate'] },
  { id: 'inspector', title: 'Settings', place: 'right', closable: true, open: true, size: 310, min: 280, max: 520, inView: true, steps: ['visual', 'animate'] },
  { id: 'crew', title: 'Crew', place: 'right', closable: true, open: true, size: 340, min: 300, max: 560, inView: true },
  { id: 'dock', title: 'Assets & timeline', place: 'bottom', closable: false, open: true, size: 352, inView: true },
  { id: 'help', title: 'Help', place: 'floating', closable: true, open: false, inView: false },
  { id: 'notes', title: 'Notes', place: 'floating', closable: true, open: false, inView: true },
  { id: 'lesson-menu', title: 'Lesson', place: 'menu', closable: true, open: false, inView: false },
  { id: 'view-menu', title: 'View', place: 'menu', closable: true, open: false, inView: false },
  { id: 'add-menu', title: 'Add', place: 'menu', closable: true, open: false, inView: false },
  { id: 'publish-menu', title: 'Publish', place: 'menu', closable: true, open: false, inView: false },
]
const def = (id: string) => PANELS.find((p) => p.id === id)!
export const inStep = (id: string, step: Step) => !def(id).steps || def(id).steps!.includes(step)
const docked = (id: string) => ['left', 'right', 'bottom'].includes(def(id).place)

/** What each step opens: one panel per side at most, the canvas keeps the rest. */
const STEP_LAYOUT: Record<Step, { open: string[]; dockTab: DockTab }> = {
  script: { open: ['crew', 'dock'], dockTab: 'timeline' },
  visual: { open: ['objects', 'inspector', 'dock'], dockTab: 'assets' },
  animate: { open: ['inspector', 'dock'], dockTab: 'timeline' },
}

const KEY = 'studio.panels'
type Saved = { open: Record<string, boolean>; size: Record<string, number>; dockTab: DockTab }
export type DockTab = 'assets' | 'timeline'

function load(): Saved {
  const fresh: Saved = {
    open: Object.fromEntries(PANELS.map((p) => [p.id, p.open])),
    size: Object.fromEntries(PANELS.filter((p) => p.size).map((p) => [p.id, p.size!])),
    dockTab: 'timeline',
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!saved) return fresh
    const docked = (id: string) => ['left', 'right', 'bottom'].includes(def(id)?.place)
    // only docked panels come back open: a menu or modal left open is not a state to restore
    const open = Object.fromEntries(Object.entries({ ...fresh.open, ...saved.open }).map(([id, v]) => [id, docked(id) || id === 'notes' ? !!v : false]))
    return { open, size: { ...fresh.size, ...saved.size }, dockTab: saved.dockTab ?? fresh.dockTab }
  } catch { return fresh }
}

let state: Saved & { order: string[] } = { ...load(), order: [] }
const listeners = new Set<() => void>()
function set(patch: Partial<typeof state>) {
  state = { ...state, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify({ open: state.open, size: state.size, dockTab: state.dockTab })) } catch { /* private window */ }
  listeners.forEach((l) => l())
}

export const panels = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
  isOpen: (id: string) => !!state.open[id],
  open(id: string) {
    // one menu at a time, and one docked panel per side: opening one closes its neighbours
    const place = def(id).place
    const same = place === 'menu' || place === 'left' || place === 'right'
      ? Object.fromEntries(PANELS.filter((p) => p.place === place).map((p) => [p.id, false])) : {}
    set({ open: { ...state.open, ...same, [id]: true }, order: [...state.order.filter((o) => o !== id), id] })
  },
  /** Arrange the panels for a step (on entering it). */
  layoutFor(step: Step) {
    const want = STEP_LAYOUT[step]
    const open = Object.fromEntries(PANELS.map((p) => [p.id, docked(p.id) ? want.open.includes(p.id) : state.open[p.id] && inStep(p.id, step)]))
    set({ open, dockTab: want.dockTab })
  },
  close(id: string) { set({ open: { ...state.open, [id]: false }, order: state.order.filter((o) => o !== id) }) },
  toggle(id: string) { return state.open[id] ? panels.close(id) : panels.open(id) },
  sizeOf: (id: string) => state.size[id] ?? def(id).size ?? 0,
  resize(id: string, px: number) {
    const d = def(id)
    set({ size: { ...state.size, [id]: Math.round(Math.min(d.max ?? Infinity, Math.max(d.min ?? 0, px))) } })
  },
  resetSize(id: string) { set({ size: { ...state.size, [id]: def(id).size! } }) },
  showDockTab(tab: DockTab) { set({ dockTab: tab, open: { ...state.open, dock: true } }) },
  /** Esc: the most recently opened OVERLAY (menu, floating). Docked panels close with X or View. */
  closeTopOverlay() {
    const top = [...state.order].reverse().find((id) => state.open[id] && ['menu', 'floating'].includes(def(id).place))
    if (!top) return false
    panels.close(top)
    return true
  },
  def,
}

export const usePanels = () => useSyncExternalStore(panels.subscribe, panels.get)
