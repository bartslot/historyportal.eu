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
export const ASSISTANTS = CREW.assistants

const ASSISTANT_KEY = 'studio.crew.assistant'
const HISTORY = 16
const SCRIPT_CHARS = 3000

function savedAssistant(): AssistantId {
  try { const v = localStorage.getItem(ASSISTANT_KEY); return v && v in ASSISTANTS ? (v as AssistantId) : 'sofie' } catch { return 'sofie' }
}

type State = { assistant: AssistantId; to: string | null; busy: boolean; error: string | null; undo: Record<number, () => void> }
let state: State = { assistant: savedAssistant(), to: null, busy: false, error: null, undo: {} }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useCrew = () => useSyncExternalStore(subscribe, () => state)

/** Name and role of whoever wrote a line. */
export function speaker(who: string): { name: string; role: string } {
  if (who === 'client') return { name: 'You', role: 'Client' }
  if (who === 'assistant') return { name: ASSISTANTS[state.assistant].name, role: 'Set assistant' }
  const m = MEMBERS.find((x) => x.id === who)
  return m ? { name: m.name, role: m.role } : { name: who, role: '' }
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
const fmt = (c: Change, labels: Map<string, string>) => `${labels.get(c.id) ?? c.id}: ${typeof c.value === 'number' ? +c.value.toFixed(2) : String(c.value)}`

async function applyAnswer(msg: any): Promise<{ changes: string[]; undo: (() => void) | null }> {
  const labels = new Map(readSettings().map((s) => [s.id, s.label]))
  const changes: string[] = []
  const undos: (() => void)[] = []
  if (Array.isArray(msg.settings) && msg.settings.length) {
    const { applied, before } = applySettings(msg.settings)
    changes.push(...applied.map((c) => fmt(c, labels)))
    if (applied.length) undos.push(() => { applySettings(before) })
  }
  if (Array.isArray(msg.commands) && msg.commands.length) {
    const { done, undo } = await animator().apply(msg.commands)
    changes.push(...done)
    undos.push(undo)
  }
  if (typeof msg.title === 'string' && msg.title) {
    const was = L.getLesson().lesson.title
    L.setTitle(msg.title)
    changes.push(`Lesson title: ${msg.title}`)
    undos.push(() => L.setTitle(was))
  }
  // undo in reverse order: the last change made is the first taken back
  return { changes, undo: undos.length ? () => undos.reverse().forEach((u) => u()) : null }
}

export function undo(index: number) {
  const fn = state.undo[index]
  if (!fn) return
  fn()
  const { [index]: _gone, ...rest } = state.undo
  set({ undo: rest })
  const lines = L.getLesson().lesson.crew ?? []
  L.setCrew(lines.map((l, i) => (i === index ? { ...l, changes: [...(l.changes ?? []), 'Undone'] } : l)))
}

export async function send(text: string) {
  const message = text.trim()
  if (!message || state.busy) return
  const { lesson } = L.getLesson()
  const before = lesson.crew ?? []
  const lines = [...before, { who: 'client', text: message }]
  L.setCrew(lines)
  set({ busy: true, error: null })
  try {
    const res = await fetch('/crew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, to: state.to, assistant: state.assistant,
        history: [{ who: 'assistant', text: greeting() }, ...before].slice(-HISTORY)
          .map((l) => ({ who: `${speaker(l.who).name} (${speaker(l.who).role})`, text: l.text })),
        scene: animator().snapshot(),
        settings: readSettings(),
        lesson: { title: lesson.title, scenes: Object.keys(lesson.scenes).length, script: scriptText(lesson.script) },
      }),
    })
    if (!(res.headers.get('content-type') || '').includes('json')) throw new Error('the crew server is not running (start "python3 server.py" in engine-mvp)')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    let out = L.getLesson().lesson.crew ?? lines
    const undos: Record<number, () => void> = {}
    for (const msg of data.messages ?? []) {
      const { changes, undo: u } = await applyAnswer(msg)
      if (msg.dropped) changes.push(`${msg.dropped} unknown stage command(s) ignored`)
      if (!msg.text && !changes.length) continue
      out = [...out, { who: String(msg.who), text: String(msg.text ?? ''), ...(changes.length ? { changes } : {}) }]
      if (u) undos[out.length - 1] = u
    }
    L.setCrew(out)
    set({ undo: { ...state.undo, ...undos } })
  } catch (err) {
    set({ error: 'The crew could not answer: ' + (err instanceof Error ? err.message : String(err)) })
  } finally {
    set({ busy: false })
  }
}
