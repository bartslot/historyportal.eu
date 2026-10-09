// The crew chat: the client (the teacher) writes, the set assistant answers and brings in crew members
// (server.py /crew). A crew answer may change settings, the stage and the title; it is applied through
// the same controls as a hand edit, listed under the answer, and undone with one button.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from 'react'
import * as L from '../lesson/store'
import CREW from './crew.json'
import { applySettings, readSettings, type Change } from './settings'

export type AssistantId = keyof typeof CREW.assistants
export type Member = (typeof CREW.crew)[number]
export const MEMBERS: Member[] = CREW.crew
export const ASSISTANT_TASKS: string[] = CREW.assistant_tasks
export const ASSISTANTS = CREW.assistants

const ASSISTANT_KEY = 'studio.crew.assistant'
const HISTORY = 16
const SCRIPT_CHARS = 3000

function savedAssistant(): AssistantId {
  try { const v = localStorage.getItem(ASSISTANT_KEY); return v && v in ASSISTANTS ? (v as AssistantId) : 'sofie' } catch { return 'sofie' }
}

/** An undo belongs to one lesson and one scene: it only runs there (never over another scene's stage). */
export type UndoEntry = { lesson: string; scene: string; run: () => Promise<void> }
type State = { assistant: AssistantId; to: string | null; busy: boolean; error: string | null; undo: Record<number, UndoEntry> }
let state: State = { assistant: savedAssistant(), to: null, busy: false, error: null, undo: {} }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useCrew = () => useSyncExternalStore(subscribe, () => state)

/** Name and role of whoever wrote a line. */
export function speaker(who: string, as?: string): { name: string; role: string } {
  if (who === 'client') return { name: 'You', role: 'Client' }
  if (who === 'assistant') return { name: ASSISTANTS[as && as in ASSISTANTS ? (as as AssistantId) : state.assistant].name, role: 'Set assistant' }
  const m = MEMBERS.find((x) => x.id === who)
  return m ? { name: m.name, role: m.role } : { name: who, role: '' }
}

/** The server's JEV and review fields are untrusted: keep only well-shaped ones. */
export function cleanJev(v: any): { score: number; choice: string } | undefined {
  return v && typeof v.score === 'number' && Number.isFinite(v.score) && v.score >= 0 && v.score <= 1 && typeof v.choice === 'string'
    ? { score: v.score, choice: v.choice } : undefined
}
export function cleanReview(v: any): { who: string; text: string } | undefined {
  return v && typeof v.who === 'string' && typeof v.text === 'string' && v.text.trim() ? { who: v.who, text: v.text } : undefined
}

export function greeting(): string {
  const a = ASSISTANTS[state.assistant]
  return `Hello, I'm ${a.name}, your set assistant. What kind of lesson or story do you want to make? Tell me the topic, the age of your class, and whether it should be a story or a game.`
}

export function chooseAssistant(id: AssistantId) {
  try { localStorage.setItem(ASSISTANT_KEY, id) } catch { /* private window: this visit only */ }
  set({ assistant: id })
}
export const talkTo = (to: string | null) => set({ to })

// the script as plain text, so the writer and the historian can read what is already there
function scriptText(doc: any): string {
  const out: string[] = []
  const walk = (n: any) => { if (n?.text) out.push(n.text); (n?.content ?? []).forEach(walk) }
  walk(doc)
  return out.join(' ').slice(0, SCRIPT_CHARS)
}

const animator = () => (window as any).__animator
const sceneIO = () => (window as any).__mvp.sceneIO
const fmt = (c: Change, labels: Map<string, string>) => `${labels.get(c.id) ?? c.id}: ${typeof c.value === 'number' ? +c.value.toFixed(2) : String(c.value)}`

// Undo takes the whole scene back (objects, keys, look and sky settings) with the lesson's own scene
// save/load, plus the title: the same data a saved lesson holds, so nothing a crew member did is missed.
// The undo exists before the first change is made, so a failure halfway can still be taken back.
async function applyAnswer(msg: any): Promise<{ changes: string[]; undo: UndoEntry; failed: string | null }> {
  const labels = new Map(readSettings().map((s) => [s.id, s.label]))
  const { lesson, current } = L.getLesson()
  const doc = sceneIO().serialize()
  const title = lesson.title
  const undo: UndoEntry = { lesson: lesson.id, scene: current, run: async () => { await sceneIO().load(doc); L.setTitle(title) } }
  const changes: string[] = []
  try {
    if (Array.isArray(msg.settings) && msg.settings.length) changes.push(...applySettings(msg.settings).map((c) => fmt(c, labels)))
    if (Array.isArray(msg.commands) && msg.commands.length) changes.push(...await animator().run(msg.commands))
    if (typeof msg.title === 'string' && msg.title) {
      L.setTitle(msg.title)
      changes.push(`Lesson title: ${msg.title}`)
    }
    return { changes, undo, failed: null }
  } catch (err) {
    return { changes, undo, failed: err instanceof Error ? err.message : String(err) }
  }
}

/** The newest line in this lesson and scene that can still be undone, or -1. Pure, so it can be tested. */
export function latestUndoable(entries: Record<number, UndoEntry>, lesson: string, scene: string): number {
  return Math.max(-1, ...Object.entries(entries).filter(([, u]) => u.lesson === lesson && u.scene === scene).map(([i]) => Number(i)))
}

/** The Undo on a line: a stack, so only the most recent undoable line of the open lesson and scene has one
 *  (each undo reloads the scene as it was before that answer, which would wipe every later change). */
export function undoFor(index: number): UndoEntry | null {
  const { lesson, current } = L.getLesson()
  return latestUndoable(state.undo, lesson.id, current) === index ? state.undo[index] : null
}

export async function undo(index: number) {
  const u = undoFor(index)
  if (!u || state.busy || L.getLesson().busy) return
  set({ busy: true, error: null })
  try { await u.run() } catch (err) {
    set({ busy: false, error: 'Could not undo: ' + (err instanceof Error ? err.message : String(err)) })
    return
  }
  set({ busy: false })
  const { [index]: _gone, ...rest } = state.undo
  set({ undo: rest })
  const lines = L.getLesson().lesson.crew ?? []
  L.setCrew(lines.map((l, i) => (i === index ? { ...l, changes: [...(l.changes ?? []), 'Undone'] } : l)))
}

/** Resolves false when the message could not be sent (the client's line is taken back so the draft can return). */
export async function send(text: string): Promise<boolean> {
  const message = text.trim()
  if (!message) return true
  if (state.busy || L.getLesson().busy) return false
  const { lesson, current } = L.getLesson()
  const before = lesson.crew ?? []
  const mine = { who: 'client', text: message }
  const lines = [...before, mine]
  let answered = false
  L.setCrew(lines)
  set({ busy: true, error: null })
  try {
    const res = await fetch('/crew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, to: state.to, assistant: state.assistant,
        history: [{ who: 'assistant', text: greeting() }, ...before].slice(-HISTORY)
          .map((l) => ({ who: `${speaker(l.who, l.as).name} (${speaker(l.who, l.as).role})`, text: l.text })),
        scene: animator().snapshot(),
        settings: readSettings(),
        lesson: { title: lesson.title, scenes: Object.keys(lesson.scenes).length, script: scriptText(lesson.script) },
      }),
    })
    if (!(res.headers.get('content-type') || '').includes('json')) throw new Error('the crew server is not running (start "python3 server.py" in engine-mvp)')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    // the client switched scene or lesson while the crew was thinking: show the answers, change nothing
    const moved = L.getLesson().current !== current || L.getLesson().lesson.id !== lesson.id
    for (const msg of Array.isArray(data.messages) ? data.messages : []) {
      if (!msg || typeof msg !== 'object') continue
      const wants = !!(msg.settings?.length || msg.commands?.length || msg.title)
      const r = wants && !moved ? await applyAnswer(msg) : null
      const changes = r?.changes ?? []
      if (wants && moved) changes.push('Not applied: the scene changed while the crew was answering')
      if (r?.failed) changes.push('Stopped halfway: ' + r.failed)
      if (msg.dropped) changes.push(`${msg.dropped} unknown stage command(s) ignored`)
      if (!msg.text && !changes.length) continue
      const jev = cleanJev(msg.jev)
      const review = cleanReview(msg.review)
      const out = [...(L.getLesson().lesson.crew ?? lines), { who: String(msg.who), ...(msg.who === 'assistant' ? { as: state.assistant } : {}), text: String(msg.text ?? ''), ...(changes.length ? { changes } : {}), ...(jev ? { jev } : {}), ...(review ? { review } : {}) }]
      answered = true
      L.setCrew(out) // line by line: an error further on never loses an answer already applied
      if (r && (r.changes.length || r.failed)) set({ undo: { ...state.undo, [out.length - 1]: r.undo } })
    }
  } catch (err) {
    set({ error: 'The crew could not answer: ' + (err instanceof Error ? err.message : String(err)) })
    if (!answered) { // nothing came back: take the client's line away again, the caller restores the draft
      L.setCrew((L.getLesson().lesson.crew ?? []).filter((l) => l !== mine))
      return false
    }
  } finally {
    set({ busy: false })
  }
  return true
}
