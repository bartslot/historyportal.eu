// The lesson being edited: its scene tree, each scene's saved state and thumbnail, and the script.
// One scene is live in the engine at a time; switching saves it and loads the next. Saved in this
// browser (IndexedDB) every few seconds and on every switch; Export/Import carry the same JSON.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from 'react'
import { idbGet, idbPut } from './idb'
import * as Tree from './tree'

export const LESSON_VERSION = 1
const KEY = 'current'
const AUTOSAVE_MS = 5000
const THUMB_W = 160
const THUMB_EVERY = 3

export type SceneEntry = { doc: any | null; thumb: string | null }
/** One line of the crew chat, kept with the lesson (src/crew). */
export type CrewLine = { who: string; text: string; changes?: string[]; jev?: { score: number; choice: string }; review?: { who: string; text: string } }
export type Lesson = { version: number; id: string; title: string; tree: Tree.TreeNode[]; scenes: Record<string, SceneEntry>; script: any | null; crew?: CrewLine[] }
type State = { lesson: Lesson; current: string; busy: boolean; saved: 'saved' | 'saving' | 'unsaved'; error: string | null }

function freshLesson(): Lesson {
  const id = Tree.newId('s')
  return { version: LESSON_VERSION, id: Tree.newId('l'), title: 'Untitled lesson', tree: [{ kind: 'scene', id, title: 'Scene 1' }], scenes: { [id]: { doc: null, thumb: null } }, script: null }
}

let state: State = { lesson: freshLesson(), current: '', busy: false, saved: 'saved', error: null }
state.current = Tree.scenesInOrder(state.lesson.tree)[0].id
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
export const getLesson = () => state
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useLesson = () => useSyncExternalStore(subscribe, getLesson)

const io = () => (window as any).__mvp.sceneIO
const stageImage = (w: number) => (window as any).__mvp.stageImage(w)

/** Validate a lesson from storage or a file: fail loudly rather than open half a lesson. */
export function checkLesson(x: any): Lesson {
  if (!x || x.version !== LESSON_VERSION) throw new Error('This file is not a History Portal studio lesson (or from another version)')
  if (!Array.isArray(x.tree) || typeof x.scenes !== 'object' || !Tree.scenesInOrder(x.tree).length) throw new Error('This lesson has no scenes')
  for (const s of Tree.scenesInOrder(x.tree)) if (!x.scenes[s.id]) throw new Error(`Scene "${s.title}" is missing its data`)
  return x as Lesson
}

// ---------- saving ----------
function captureCurrent(withThumb: boolean): Lesson {
  const prev = state.lesson.scenes[state.current] ?? { doc: null, thumb: null }
  const entry: SceneEntry = { doc: io().serialize(), thumb: withThumb ? stageImage(THUMB_W) : prev.thumb }
  return { ...state.lesson, scenes: { ...state.lesson.scenes, [state.current]: entry } }
}

// false once a saved lesson failed to open: never write a fresh lesson over one we could not read
let storageOk = true

async function persist(lesson: Lesson) {
  if (!storageOk) { set({ saved: 'unsaved' }); return }
  set({ saved: 'saving' })
  try { await idbPut(KEY, { lesson, current: state.current }); set({ saved: 'saved', error: null }) }
  catch (err) { set({ saved: 'unsaved', error: 'Could not save in this browser: ' + (err instanceof Error ? err.message : String(err)) }) }
}

export async function saveNow(withThumb = false) {
  if (state.busy) return
  const lesson = captureCurrent(withThumb)
  set({ lesson })
  await persist(lesson)
}

// ---------- scenes ----------
async function loadScene(id: string) {
  const entry = state.lesson.scenes[id]
  if (entry?.doc) {
    const { missing } = await io().load(entry.doc)
    if (missing.length) (window as any).__mvp.flash(`Not in the library any more: ${[...new Set(missing)].join(', ')}`)
  } else io().clear()
}

export async function switchTo(id: string) {
  if (state.busy || id === state.current || !state.lesson.scenes[id]) return
  set({ busy: true })
  try {
    const lesson = captureCurrent(true)
    set({ lesson, current: id })
    await loadScene(id)
    await persist(state.lesson)
  } finally { set({ busy: false }) }
}

export async function addScene(into: string | null = null) {
  const id = Tree.newId('s')
  const n = Tree.scenesInOrder(state.lesson.tree).length + 1
  const node: Tree.SceneNode = { kind: 'scene', id, title: `Scene ${n}` }
  set({ lesson: { ...state.lesson, tree: Tree.insert(state.lesson.tree, node, into), scenes: { ...state.lesson.scenes, [id]: { doc: null, thumb: null } } } })
  await switchTo(id)
  return id
}

export function addGroup() {
  const g: Tree.GroupNode = { kind: 'group', id: Tree.newId('g'), title: 'New group', open: true, children: [] }
  set({ lesson: { ...state.lesson, tree: Tree.insert(state.lesson.tree, g, null) } })
  void persist(state.lesson)
  return g.id
}

/** Delete a scene or a group with everything in it. The last scene stays. */
export async function deleteNode(id: string) {
  const node = Tree.find(state.lesson.tree, id)
  if (!node) return
  const gone = new Set(node.kind === 'scene' ? [id] : Tree.scenesInOrder(node.children).map((s) => s.id))
  const left = Tree.scenesInOrder(state.lesson.tree).filter((s) => !gone.has(s.id))
  if (!left.length) { (window as any).__mvp.flash('A lesson needs at least one scene'); return }
  if (gone.has(state.current)) {
    set({ busy: true })
    try { set({ current: left[0].id }); await loadScene(left[0].id) } finally { set({ busy: false }) }
  }
  const scenes = Object.fromEntries(Object.entries(state.lesson.scenes).filter(([k]) => !gone.has(k)))
  set({ lesson: { ...state.lesson, tree: Tree.remove(state.lesson.tree, id), scenes } })
  await persist(state.lesson)
}

export function editTree(fn: (t: Tree.TreeNode[]) => Tree.TreeNode[]) {
  set({ lesson: { ...state.lesson, tree: fn(state.lesson.tree) } })
  void persist(state.lesson)
}

export function setTitle(title: string) {
  set({ lesson: { ...state.lesson, title }, saved: 'unsaved' })
}

export function setScript(script: any) {
  set({ lesson: { ...state.lesson, script }, saved: 'unsaved' })
}

export function setCrew(crew: CrewLine[]) {
  set({ lesson: { ...state.lesson, crew }, saved: 'unsaved' })
}

// ---------- files ----------
export async function exportLesson() {
  await saveNow(true)
  const blob = new Blob([JSON.stringify(state.lesson)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${state.lesson.title.replace(/[^\w-]+/g, '-') || 'lesson'}.hpstudio.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000) // revoked at once, the download never starts
}

export async function importLesson(file: File) {
  const lesson = checkLesson(JSON.parse(await file.text()))
  set({ busy: true })
  try {
    const first = Tree.scenesInOrder(lesson.tree)[0].id
    set({ lesson, current: first })
    await loadScene(first)
    await persist(lesson)
  } finally { set({ busy: false }) }
}

// ---------- start ----------
export async function initLesson() {
  try {
    const saved = await idbGet<{ lesson: unknown; current: string }>(KEY)
    if (saved) {
      const lesson = checkLesson(saved.lesson)
      const current = lesson.scenes[saved.current] ? saved.current : Tree.scenesInOrder(lesson.tree)[0].id
      set({ lesson, current })
      await loadScene(current)
    }
  } catch (err) {
    storageOk = false
    set({ error: 'The saved lesson could not be opened, so nothing is saved over it: ' + (err instanceof Error ? err.message : String(err)) })
  }
  let ticks = 0
  // the current scene's thumbnail refreshes every few saves (a picture costs more than the data)
  setInterval(() => { if (!state.busy) void saveNow(++ticks % THUMB_EVERY === 0) }, AUTOSAVE_MS)
  window.addEventListener('pagehide', () => { if (!state.busy) void saveNow(true) })
}
