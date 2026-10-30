// What the script and the scene graph share: the line the cursor is in (its frame is the selected frame), the shot
// being directed, and the frames' palette. Lines and frames link through this, never through each other.
import { useSyncExternalStore } from 'react'
import type { Palette } from './clay'

const PALETTE_KEY = 'studio.storyboard.palette'
const savedPalette = (): Palette => { try { return localStorage.getItem(PALETTE_KEY) === 'silhouette' ? 'silhouette' : 'clay' } catch { return 'clay' } }

type State = { line: string | null; directing: string | null; palette: Palette }
let state: State = { line: null, directing: null, palette: savedPalette() }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const storyboard = {
  get: () => state,
  /** the cursor moved to this line (the script) */
  setLine: (line: string | null) => { if (line !== state.line) set({ line }) },
  /** a frame was picked: the script puts its cursor on the frame's first line */
  pickLine: (line: string) => { set({ line }); window.dispatchEvent(new CustomEvent('script:focus-line', { detail: line })) },
  direct: (shot: string | null) => set({ directing: shot }),
  setPalette: (palette: Palette) => { set({ palette }); try { localStorage.setItem(PALETTE_KEY, palette) } catch { /* private window */ } },
}
export const useStoryboard = () => useSyncExternalStore(subscribe, storyboard.get)
