// The crew chat: the client (the teacher) writes, the set assistant answers and brings in crew members
// (server.py /crew). A crew answer may change settings, the stage and the title; it is applied through
// the same controls as a hand edit, listed under the answer, and undone with one button.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from 'react'
import * as L from '../lesson/store'
import type { CrewLine } from '../lesson/store'
import CREW from './crew.json'
import { applySettings, readSettings, type Change } from './settings'
import { valueOp } from '../blockout/history'
import { parseEvent, reduceLive, savedThoughts, splitLines, type CrewEvent, type LiveMap } from './stream'

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
export type UndoEntry = { lesson: string; scene: string; op?: unknown; run: () => Promise<void> }
/** partial: the draft of a member the client interrupted; the next send hands it back to them. */
type State = { assistant: AssistantId; to: string | null; busy: boolean; error: string | null; undo: Record<number, UndoEntry>; live: LiveMap; partial: { who: string; text: string } | null }
let state: State = { assistant: savedAssistant(), to: null, busy: false, error: null, undo: {}, live: {}, partial: null }
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
export const talkTo = (to: string | null) => set({ to, partial: state.partial?.who === to ? state.partial : null })

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

// Undo (Gate 3): an answer is ONE step in the studio's per-op history: its blockout ops (place / pose / frame /
// mode), its settings, the title and, for the studio's own commands (add / move / walk...), the scene without the
// blockout. Undoing it never reloads a whole-scene snapshot, so a teacher's edit made BEFORE the answer stays.
// The answer can be undone while it is still the latest step (a teacher's later edit is undone first, Cmd+Z).
const BLOCKOUT_CMDS = new Set(['place', 'pose', 'frame', 'mode', 'undo'])
const history = () => (window as any).__mvp.blockout.history
const settingValues = (): Change[] => readSettings().map((s) => ({ id: s.id, value: s.value }))

async function applyAnswer(msg: any): Promise<{ changes: string[]; undo: UndoEntry; failed: string | null }> {
  const labels = new Map(readSettings().map((s) => [s.id, s.label]))
  const { lesson, current } = L.getLesson()
  const h = history()
  const changes: string[] = []
  let failed: string | null = null
  h.begin('Crew answer', 'ai')
  try {
    if (Array.isArray(msg.settings) && msg.settings.length) {
      const before = settingValues()
      changes.push(...applySettings(msg.settings).map((c) => fmt(c, labels)))
      h.push(valueOp('settings', 'ai', before, settingValues(), (v: Change[]) => { applySettings(v) }))
    }
    if (Array.isArray(msg.commands) && msg.commands.length) {
      const studio = msg.commands.some((c: any) => !BLOCKOUT_CMDS.has(c?.cmd))
      const before = studio ? sceneIO().serialize() : null
      changes.push(...await animator().run(msg.commands))
      if (studio) h.push(valueOp('studio commands', 'ai', before, sceneIO().serialize(), (d: any) => { void sceneIO().load(d, { keepBlockout: true }) }))
    }
    if (typeof msg.title === 'string' && msg.title) {
      const before = lesson.title
      L.setTitle(msg.title)
      h.push(valueOp('lesson title', 'ai', before, msg.title, (t: string) => L.setTitle(t)))
      changes.push(`Lesson title: ${msg.title}`)
    }
  } catch (err) {
    failed = err instanceof Error ? err.message : String(err)
  }
  const op = h.end()
  const undo: UndoEntry = { lesson: lesson.id, scene: current, op, run: async () => { if (op && h.last() === op) h.undo() } }
  return { changes, undo, failed }
}

/** The newest line in this lesson and scene that can still be undone, or -1. Pure, so it can be tested. */
export function latestUndoable(entries: Record<number, UndoEntry>, lesson: string, scene: string): number {
  return Math.max(-1, ...Object.entries(entries).filter(([, u]) => u.lesson === lesson && u.scene === scene).map(([i]) => Number(i)))
}

/** The Undo on a line: a stack, so only the most recent undoable line of the open lesson and scene has one
 *  (each undo reloads the scene as it was before that answer, which would wipe every later change). */
export function undoFor(index: number): UndoEntry | null {
  const { lesson, current } = L.getLesson()
  if (latestUndoable(state.undo, lesson.id, current) !== index) return null
  const u = state.undo[index]
  return u.op && history().last() === u.op ? u : null      // still the latest step: nothing done after it
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

const withoutLive = (who: string): LiveMap => { const { [who]: _gone, ...rest } = state.live; return rest }
const appendLine = (line: CrewLine) => { const out = [...(L.getLesson().lesson.crew ?? []), line]; L.setCrew(out); return out.length - 1 }

/** One final answer: apply it (unless the scene moved on), list the changes, keep the transcript. */
async function commitMessage(msg: any, moved: boolean, extra: Partial<CrewLine>): Promise<boolean> {
  const wants = !!(msg.settings?.length || msg.commands?.length || msg.title)
  const r = wants && !moved ? await applyAnswer(msg) : null
  const changes = r?.changes ?? []
  if (wants && moved) changes.push('Not applied: the scene changed while the crew was answering')
  if (r?.failed) changes.push('Stopped halfway: ' + r.failed)
  if (msg.dropped) changes.push(`${msg.dropped} unknown stage command(s) ignored`)
  if (!msg.text && !changes.length) return false
  const jev = cleanJev(msg.jev)
  const review = cleanReview(msg.review)
  const i = appendLine({ who: String(msg.who), ...(msg.who === 'assistant' ? { as: state.assistant } : {}), text: String(msg.text ?? ''), ...(changes.length ? { changes } : {}), ...(jev ? { jev } : {}), ...(review ? { review } : {}), ...extra })
  if (r && (r.changes.length || r.failed)) set({ undo: { ...state.undo, [i]: r.undo } })
  return true
}

const stopCall = (body: object) => fetch('/crew/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
export const stopMember = (who: string) => { const l = state.live[who]; return l?.status === 'working' ? stopCall({ turn: l.turn, who }) : Promise.resolve(null) }
export function stopAll() {
  const turns = new Set(Object.values(state.live).filter((l) => l.status === 'working').map((l) => l.turn))
  return Promise.all([...turns].map((turn) => stopCall({ turn })))
}
/** Talk to a working member personally: stop them, address the next message to them, hand back their draft. */
export async function interrupt(who: string) {
  const l = state.live[who]
  if (l?.status !== 'working') return
  const draft = l.draft
  await stopMember(who)
  set({ to: who, partial: { who, text: draft } })
}

let streams = 0

/** Resolves false when the message could not be sent (the client's line is taken back so the draft can return). */
export async function send(text: string): Promise<boolean> {
  const message = text.trim()
  if (!message) return true
  if ((state.busy && !state.partial) || L.getLesson().busy) return false
  const { lesson, current } = L.getLesson()
  const before = lesson.crew ?? []
  const mine = { who: 'client', text: message }
  const partial = state.partial
  let answered = false
  let myTurn: CrewEvent['turn'] | null = null
  L.setCrew([...before, mine])
  streams++
  set({ busy: true, error: null, partial: null })
  const handle = async (ev: CrewEvent) => {
    // the client switched scene or lesson while the crew was thinking: show the answers, change nothing
    const moved = () => L.getLesson().current !== current || L.getLesson().lesson.id !== lesson.id
    const mineNow = (who: string) => state.live[who]?.turn === ev.turn ? state.live[who] : undefined
    if (ev.type === 'turn') myTurn = ev.turn
    else if (ev.type === 'assistant') { if (ev.text.trim()) { answered = true; appendLine({ who: 'assistant', as: ev.as && ev.as in ASSISTANTS ? ev.as : state.assistant, text: ev.text }) } }
    else if (ev.type === 'message') {
      const l = mineNow(ev.who)
      if (await commitMessage(ev.msg, moved(), l ? savedThoughts(l) : {})) answered = true
      if (l) set({ live: withoutLive(ev.who) })
    } else if (ev.type === 'stopped' || (ev.type === 'error' && ev.who)) {
      const who = ev.who as string
      const l = mineNow(who)
      if (!l) return
      answered = true
      appendLine({ who, text: '', ...(ev.type === 'stopped' ? { stopped: true } : { error: ev.error }), ...savedThoughts(l) })
      set({ live: withoutLive(who) })
    } else if (ev.type === 'error') set({ error: 'The crew could not answer: ' + ev.error })
    else if (ev.type !== 'done') {
      if (ev.type === 'routed') answered = true
      set({ live: reduceLive(state.live, ev, message) })
    }
  }
  try {
    const res = await fetch('/crew/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, to: state.to, assistant: state.assistant,
        ...(partial ? { partial } : {}),
        history: [{ who: 'assistant', text: greeting() }, ...before].slice(-HISTORY)
          .map((l) => ({ who: `${speaker(l.who, l.as).name} (${speaker(l.who, l.as).role})`, text: l.text })),
        scene: animator().snapshot(),
        settings: readSettings(),
        lesson: { title: lesson.title, scenes: Object.keys(lesson.scenes).length, script: scriptText(lesson.script) },
      }),
    })
    if (!res.ok || !res.body) {
      const json = (res.headers.get('content-type') || '').includes('json')
      const data = json ? await res.json().catch(() => null) : null
      throw new Error(data?.error || (json ? `HTTP ${res.status}` : 'the crew server is not running (start "python3 server.py" in engine-mvp)'))
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let carry = ''
    for (;;) {
      const { done, value } = await reader.read()
      const { lines, rest } = splitLines(carry, done ? dec.decode() + '\n' : dec.decode(value, { stream: true }))
      carry = rest
      for (const line of lines) { const ev = parseEvent(line); if (ev) await handle(ev) }
      if (done) break
    }
  } catch (err) {
    set({ error: 'The crew could not answer: ' + (err instanceof Error ? err.message : String(err)) })
    if (!answered) { // nothing came back: take the client's line away again, the caller restores the draft
      L.setCrew((L.getLesson().lesson.crew ?? []).filter((l) => l !== mine))
      return false
    }
  } finally {
    // a member still working when the stream is over lost their connection
    for (const [who, l] of Object.entries(state.live)) {
      if (l.status !== 'working' || l.turn !== myTurn) continue
      appendLine({ who, text: '', error: 'Lost connection', ...savedThoughts(l) })
      set({ live: withoutLive(who) })
    }
    streams--
    set({ busy: streams > 0 })
  }
  return true
}
