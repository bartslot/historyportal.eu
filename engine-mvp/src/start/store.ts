// Which screen covers the studio: the start screen (an empty lesson), the build view (the crew making the
// first draft), or none (the studio itself). The studio stays mounted underneath the whole time: the crew
// reads the engine and the script while it works.
import { useSyncExternalStore } from 'react'
import * as L from '../lesson/store'
import * as Crew from '../crew/store'
import { panels } from '../panels/store'
import { __, locale, localeName } from '../i18n'
import { DEFAULT_BRIEF, briefMessage, isEmptyLesson, type Brief } from './brief'

export type Mode = 'loading' | 'start' | 'build' | 'studio'
type State = { mode: Mode; prompt: string; brief: Brief; error: string | null }

// the lesson's language starts as the teacher's own UI language
let state: State = { mode: 'loading', prompt: '', brief: { ...DEFAULT_BRIEF, language: localeName(locale()) }, error: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useStart = () => useSyncExternalStore(subscribe, () => state)

export const setPrompt = (prompt: string) => set({ prompt })
export const setBrief = (brief: Brief) => set({ brief })
export const openStudio = () => set({ mode: 'studio' })
const modeNow = (): Mode => state.mode // read after an await: the screen may have changed

/** After the saved lesson loaded: an empty one opens on the start screen, anything else in the studio. */
export const decide = () => set({ mode: isEmptyLesson(L.getLesson().lesson) ? 'start' : 'studio' })

const BUSY = __('The crew is still working on this lesson. Wait for them, or press Stop.')

/** A new lesson, only when nothing is running: the old lesson's crew must not write into the new one. */
export async function newLesson() {
  if (Crew.isBusy()) { (window as unknown as { __mvp?: { flash: (m: string) => void } }).__mvp?.flash(BUSY); return }
  if (!(await L.newLesson())) return
  Crew.resetForNewLesson()
  set({ mode: 'start', prompt: '', error: null })
}

/** Send the brief to the crew and watch them build. Nothing came back: back to the start, draft kept. */
export async function begin() {
  const { prompt, brief } = state
  if (!prompt.trim() || state.mode === 'build') return
  if (Crew.isBusy()) { set({ error: BUSY }); return }
  panels.close('kind-menu')
  panels.close('class-menu')
  set({ mode: 'build', error: null })
  const ok = await Crew.send(briefMessage(prompt, brief))
  // the teacher may have gone on to the studio meanwhile: only the build view goes back
  if (!ok && modeNow() === 'build') set({ mode: 'start' })
}

/** The crew stopped or lost the connection: ask again with the same brief. */
export async function retry() {
  if (Crew.isBusy()) return
  await Crew.send(briefMessage(state.prompt, state.brief))
}
