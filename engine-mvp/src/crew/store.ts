// The crew chat: the client (the teacher) writes, the set assistant answers and brings in crew members
// (server.py /crew). A crew answer may change settings, the stage and the title; it is applied through
// the same controls as a hand edit, listed under the answer, and undone with one button.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from 'react'
import * as L from '../lesson/store'
import type { CrewLine } from '../lesson/store'
import CREW from './crew.json'
import { __ } from '../i18n'
import { applySettings, lessonPatch, readSettings, type Change } from './settings'
import { valueOp } from '../blockout/history'
import { cleanChoices, scopeOf, type Scope } from './choices'
import { blockoutCaption, captureBlockout } from './blockout'
import { asCrew, buildContext, currentGreeting } from './context'
import { replaceLines, replaceSceneLines, textOfLines, type NewLine, type Selection } from './scriptEdit'
import { scenesInOrder } from '../lesson/tree'
import { attachSketch, buildPartial, parseEvent, reduceLive, reviseLine, savedThoughts, upsertLine, splitLines, type CrewEvent, type LiveMap, type Turn } from './stream'

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

/** A proposed rewrite of selected script lines, waiting for Replace or Keep (this visit only, never saved). */
export type Rewrite = { id: string; lesson: string; scene: string; lineIds: string[]; before: string; lines: NewLine[]; index: number }

/** An undo belongs to one lesson and one scene: it only runs there (never over another scene's stage). */
export type UndoEntry = { lesson: string; scene: string; op?: unknown; run: () => Promise<void>; seq?: number }
let undoSeq = 0
/** partial: the draft of a member the client interrupted; the next send hands it back to them. */
type State = { assistant: AssistantId; to: string | null; busy: boolean; error: string | null; undo: Record<number, UndoEntry>; live: LiveMap; partial: { who: string; text: string } | null; scope: Scope | null; rewrites: Rewrite[] }
let state: State = { assistant: savedAssistant(), to: null, busy: false, error: null, undo: {}, live: {}, partial: null, scope: null, rewrites: [] }
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

export const greeting = (): string => currentGreeting(state.assistant, 'en')

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
// mode), its settings, the title, the script and, for the studio's own commands (add / move / walk...), the scene
// without the blockout. Undoing it never reloads a whole-scene snapshot, so a teacher's edit made BEFORE the answer
// stays. The answer can be undone while it is still the latest step (a teacher's later edit is undone first, Cmd+Z).
const BLOCKOUT_CMDS = new Set(['place', 'pose', 'frame', 'mode', 'undo'])
const history = () => (window as any).__mvp.blockout.history
const settingValues = (): Change[] => readSettings().map((s) => ({ id: s.id, value: s.value }))

export async function applyAnswer(msg: any, scope: Scope | null = null): Promise<{ changes: string[]; undo: UndoEntry; failed: string | null }> {
  const labels = new Map(readSettings().map((s) => [s.id, s.label]))
  const { lesson, current } = L.getLesson()
  const h = history()
  const changes: string[] = []
  let failed: string | null = null
  h.begin('Crew answer', 'ai')
  try {
    if (Array.isArray(msg.settings) && msg.settings.length) {
      const before = settingValues()
      const full = readSettings()
      const applied = applySettings(msg.settings)
      changes.push(...applied.map((c) => fmt(c, labels)))
      h.push(valueOp('settings', 'ai', before, settingValues(), (v: Change[]) => { applySettings(v) }))
      const rest = Object.keys(lesson.scenes).filter((id) => id !== current)
      if (scope === 'lesson' && applied.length && rest.length) {
        const others = L.patchSceneSettings(rest, lessonPatch(full, readSettings(), applied))
        h.push(valueOp('other scenes', 'ai', others, null, (v: any) => { if (v) L.restoreSceneDocs(v) }))
        changes.push(__('Applied to all :count scenes', { count: rest.length + 1 }))
      }
    }
    if (Array.isArray(msg.commands) && msg.commands.length) {
      const studio = msg.commands.some((c: any) => !BLOCKOUT_CMDS.has(c?.cmd))
      const before = studio ? sceneIO().serialize() : null
      changes.push(...await animator().run(msg.commands))
      if (studio) h.push(valueOp('studio commands', 'ai', before, sceneIO().serialize(), (d: any) => { void sceneIO().load(d, { keepBlockout: true }) }))
    }
    const sceneLines = cleanNewLines(msg.scene?.lines)
    if (sceneLines.length) {
      const script = lesson.script
      const name = scenesInOrder(lesson.tree).find((s) => s.id === current)?.title ?? ''
      const next = replaceSceneLines(script ?? { type: 'doc', content: [] }, current, sceneLines, name)
      L.setScript(next)
      h.push(valueOp('script', 'ai', script, next, (d: any) => L.setScript(d)))
      changes.push(__('Script: scene :name written (:count lines)', { name: name || __('text'), count: sceneLines.length }))
    }
    if (typeof msg.title === 'string' && msg.title) {
      const before = lesson.title
      L.setTitle(msg.title)
      h.push(valueOp('lesson title', 'ai', before, msg.title, (t: string) => L.setTitle(t)))
      changes.push(__('Lesson title: :title', { title: msg.title }))
    }
  } catch (err) {
    failed = err instanceof Error ? err.message : String(err)
  }
  const op = h.end()
  const undo: UndoEntry = { lesson: lesson.id, scene: current, op, run: async () => { if (op && h.last() === op) h.undo() } }
  return { changes, undo, failed }
}

/** The server's lines are untrusted: keep only well-shaped ones. */
function cleanNewLines(raw: any): NewLine[] {
  return (Array.isArray(raw) ? raw : []).flatMap((l: any) => (l && typeof l.text === 'string' && l.text.trim() ? [{ speaker: typeof l.speaker === 'string' && l.speaker.trim() ? l.speaker.trim() : null, text: l.text.trim() }] : []))
}

/** The newest line in this lesson and scene that can still be undone, or -1. Pure, so it can be tested. */
export function latestUndoable(entries: Record<number, UndoEntry>, lesson: string, scene: string): number {
  // newest = last applied (seq), not last in the list: a line is updated in place when its member finishes
  const mine = Object.entries(entries).filter(([, u]) => u.lesson === lesson && u.scene === scene)
  return mine.reduce((best, [i, u]) => ((u.seq ?? Number(i)) >= best.seq ? { seq: u.seq ?? Number(i), i: Number(i) } : best), { seq: -1, i: -1 }).i
}

/** The Undo on a line: a stack, so only the most recent undoable line of the open lesson and scene has one
 *  (each undo reloads the scene as it was before that answer, which would wipe every later change). */
export function undoFor(index: number): UndoEntry | null {
  const { lesson, current } = L.getLesson()
  if (latestUndoable(state.undo, lesson.id, current) !== index) return null
  const u = state.undo[index]                              // undefined for the live line (index -1)
  if (!u) return null                                       // the live line (index -1)
  return !u.op || history().last() === u.op ? u : null      // an answer only while it is still the latest step
}

export async function undo(index: number) {
  const u = undoFor(index)
  if (!u || state.busy || L.getLesson().busy) return
  set({ busy: true, error: null })
  try { await u.run() } catch (err) {
    set({ busy: false, error: __('Could not undo: :error', { error: err instanceof Error ? err.message : String(err) }) })
    return
  }
  set({ busy: false })
  const { [index]: _gone, ...rest } = state.undo
  set({ undo: rest })
  const lines = L.getLesson().lesson.crew ?? []
  L.setCrew(lines.map((l, i) => (i === index ? { ...l, changes: [...(l.changes ?? []), __('Undone')] } : l)))
}

const withoutLive = (who: string): LiveMap => { const { [who]: _gone, ...rest } = state.live; return rest }
/** Saved at once, so a reload right after still finds it. */
const putLine = (turn: Turn | null, line: CrewLine) => {
  const r = upsertLine(L.getLesson().lesson.crew ?? [], turn, line)
  L.setCrew(r.lines)
  void L.saveNow()
  return r.index
}
const appendLine = (line: CrewLine) => putLine(null, line)

/** The writer's sketch sentence of each turn: the caption of the designer's blockout thumbnail. */
const sketchOf = new Map<string, string>()
/** Lines whose revised text should type in (this visit only, never saved). */
const freshRevised = new Set<string>()
export const revisedKey = (l: { turn?: Turn; who: string }) => `${l.turn ?? ''}:${l.who}`
export const isFreshRevised = (l: { turn?: Turn; who: string }) => freshRevised.has(revisedKey(l))

/** Capture the stage after a blockout was applied and keep it on that member's line (same lesson and scene only). */
async function addBlockout(turn: Turn, who: string, text: string, lessonId: string, scene: string) {
  const sketch = await captureBlockout(blockoutCaption(sketchOf.get(String(turn)), text))
  const g = L.getLesson()
  if (!sketch || g.lesson.id !== lessonId || g.current !== scene) return
  const lines = attachSketch(g.lesson.crew ?? [], turn, who, sketch)
  if (!lines) return
  L.setCrew(lines)
  void L.saveNow()
}

/** One final answer: apply it (unless the scene moved on), list the changes, keep the transcript.
 *  A revised answer (Marten's note) replaces the member's finished line of this turn in place. */
async function commitMessage(msg: any, moved: boolean, turn: Turn, extra: Partial<CrewLine>, selected?: Selection | null): Promise<boolean> {
  const revised = msg.revised === true
  const wants = !!(msg.settings?.length || msg.commands?.length || msg.title || msg.scene?.lines?.length)
  const rewrite = Array.isArray(msg.lines) && msg.lines.length && !moved ? cleanNewLines(msg.lines) : []
  const { lesson: startLesson, current: startScene } = L.getLesson()
  const r = wants && !moved ? await asCrew(() => applyAnswer(msg, msg.scope === 'lesson' ? 'lesson' : null)) : null
  const changes = r?.changes ?? []
  if (wants && moved) changes.push(__('Not applied: the scene changed while the crew was answering'))
  if (r?.failed) changes.push(__('Stopped halfway: :error', { error: r.failed }))
  if (msg.dropped) changes.push(__(':count unknown stage command(s) ignored', { count: msg.dropped }))
  const choices = cleanChoices(msg.choices)
  if (typeof msg.sketch === 'string' && msg.sketch.trim()) sketchOf.set(String(turn), msg.sketch.trim().slice(0, 300))
  if (!msg.text && !changes.length && !choices && !rewrite.length) { // nothing to show: the "on it" line goes too
    const crew = L.getLesson().lesson.crew ?? []
    L.setCrew(crew.filter((l) => !(l.status === 'working' && l.who === String(msg.who) && l.turn === turn)))
    return false
  }
  const jev = cleanJev(msg.jev)
  const review = cleanReview(msg.review)
  const line: CrewLine = { who: String(msg.who), turn, ...(msg.who === 'assistant' ? { as: state.assistant } : {}), text: String(msg.text ?? ''), ...(changes.length ? { changes } : {}), ...(jev ? { jev } : {}), ...(review ? { review } : {}), ...(choices ? { choices } : {}), ...extra }
  let i: number
  let old: CrewLine | null = null
  if (revised) {
    const rv = reviseLine(L.getLesson().lesson.crew ?? [], turn, line)
    old = rv.old
    // the first answer's changes stay on the line, the revision's are added
    const merged = old?.changes?.length ? { ...rv.lines[rv.index], changes: [...old.changes, ...(line.changes ?? [])] } : rv.lines[rv.index]
    L.setCrew(rv.lines.map((l, k) => (k === rv.index ? merged : l)))
    void L.saveNow()
    i = rv.index
    freshRevised.add(revisedKey(line))
  } else i = putLine(turn, line)
  if (r && (r.changes.length || r.failed)) {
    const prior = old ? state.undo[i] : undefined // revised: one Undo takes back the revision, then the first answer
    const entry: UndoEntry = prior ? { ...r.undo, run: async () => { await r.undo.run(); await prior.run() }, seq: ++undoSeq } : { ...r.undo, seq: ++undoSeq }
    set({ undo: { ...state.undo, [i]: entry } })
  }
  if (rewrite.length && selected) {
    const before = textOfLines(L.getLesson().lesson.script, selected.lineIds)
    set({ rewrites: [...state.rewrites, { id: `${turn}:${msg.who}`, lesson: startLesson.id, scene: startScene, lineIds: selected.lineIds, before, lines: rewrite, index: i }] })
  }
  if (msg.blockout === true && r && !r.failed && !moved && msg.commands?.length) void addBlockout(turn, String(msg.who), line.text, startLesson.id, startScene)
  return true
}

const stopCall = (body: object) => fetch('/crew/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
export const stopMember = (who: string) => { const l = state.live[who]; return l?.status === 'working' ? stopCall({ turn: l.turn, who }) : Promise.resolve(null) }
export const isBusy = () => state.busy
/** A new lesson starts with a clean crew: no undo, rewrites, scope or pending reply from the old one. */
export const resetForNewLesson = () => set({ to: null, error: null, undo: {}, live: {}, partial: null, scope: null, rewrites: [] })

export function stopAll() {
  const turns = new Set(Object.values(state.live).filter((l) => l.status === 'working').map((l) => l.turn))
  return Promise.all([...turns].map((turn) => stopCall({ turn })))
}
/** Talk to a working member personally: stop them, address the next message to them, hand back their draft. */
export async function interrupt(who: string) {
  const l = state.live[who]
  if (l?.status !== 'working') return
  const partial = buildPartial(who, l)
  await stopMember(who)
  set({ to: who, partial })
}

let streams = 0

/** "Ask the crew" about a selection: it goes along with the client's next message. */
let askSelection: Selection | null = null
export const setAskSelection = (s: Selection | null) => { askSelection = s }

/** Replace: the proposed lines go onto the script page for good (one Undo takes them back). */
export function acceptRewrite(id: string) {
  const rw = state.rewrites.find((r) => r.id === id)
  if (!rw) return
  set({ rewrites: state.rewrites.filter((r) => r.id !== id) })
  const { lesson } = L.getLesson()
  const script = lesson.script
  const next = replaceLines(script, rw.lineIds, rw.lines)
  if (lesson.id !== rw.lesson || next === script) { set({ error: __('Those lines changed or are gone, nothing was replaced') }); return }
  L.setScript(next)
  const lines = lesson.crew ?? []
  L.setCrew(lines.map((l, i) => (i === rw.index ? { ...l, changes: [...(l.changes ?? []), __('Script: :count line(s) rewritten', { count: rw.lineIds.length })] } : l)))
  set({ undo: { ...state.undo, [rw.index]: { lesson: rw.lesson, scene: rw.scene, run: async () => { L.setScript(script) }, seq: ++undoSeq } } })
  void L.saveNow()
}
export const dismissRewrite = (id: string) => set({ rewrites: state.rewrites.filter((r) => r.id !== id) })

/** Resolves false when the message could not be sent (the client's line is taken back so the draft can return). */
export async function send(text: string, pick = false, selection: Selection | null = askSelection): Promise<boolean> {
  const message = text.trim()
  if (!message) return true
  if ((state.busy && !state.partial) || L.getLesson().busy) return false
  const { lesson, current } = L.getLesson()
  const before = lesson.crew ?? []
  const mine = { who: 'client', text: message }
  const partial = state.partial
  askSelection = null
  const scope = state.scope // a pick keeps it; a free-typed message ends it after this turn
  let answered = false
  let myTurn: CrewEvent['turn'] | null = null
  L.setCrew([...before, mine])
  void L.saveNow()
  streams++
  set({ busy: true, error: null, partial: null, ...(pick ? {} : { scope: null }) })
  const handle = async (ev: CrewEvent) => {
    // the client switched scene or lesson while the crew was thinking: show the answers, change nothing
    const moved = () => L.getLesson().current !== current || L.getLesson().lesson.id !== lesson.id
    const mineNow = (who: string) => state.live[who]?.turn === ev.turn ? state.live[who] : undefined
    if (ev.type === 'turn') myTurn = ev.turn
    else if (ev.type === 'assistant') { if (ev.text.trim() || ev.choices) { answered = true; appendLine({ who: 'assistant', as: ev.as && ev.as in ASSISTANTS ? ev.as : state.assistant, text: ev.text, ...(ev.choices ? { choices: ev.choices } : {}) }) } }
    else if (ev.type === 'message') {
      const l = mineNow(ev.who)
      if (await commitMessage(ev.msg, moved(), ev.turn, l ? savedThoughts(l) : {}, selection)) answered = true
      if (l) set({ live: withoutLive(ev.who) })
    } else if (ev.type === 'stopped' || (ev.type === 'error' && ev.who)) {
      const who = ev.who as string
      const l = mineNow(who)
      if (!l) return
      answered = true
      putLine(ev.turn, { who, text: '', ...(ev.type === 'stopped' ? { stopped: true } : { error: ev.error }), ...savedThoughts(l) })
      set({ live: withoutLive(who) })
    } else if (ev.type === 'error') set({ error: __('The crew could not answer: :error', { error: ev.error }) })
    else if (ev.type !== 'done') {
      if (ev.type === 'routed') { answered = true; appendLine({ who: ev.who, text: ev.ack, status: 'working', turn: ev.turn }) }
      set({ live: reduceLive(state.live, ev, message) })
    }
  }
  try {
    const res = await fetch('/crew/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, to: state.to, assistant: state.assistant, ...(scope ? { scope } : {}), ...(selection ? { selection } : {}),
        ...(partial ? { partial } : {}),
        history: [{ who: 'assistant', text: greeting() }, ...before].slice(-HISTORY)
          .map((l) => ({ who: `${speaker(l.who, l.as).name} (${speaker(l.who, l.as).role})`, text: l.text })),
        scene: animator().snapshot(),
        settings: readSettings(),
        context: buildContext(),
        lesson: { title: lesson.title, scenes: Object.keys(lesson.scenes).length, script: scriptText(lesson.script) },
      }),
    })
    if (!res.ok || !res.body) {
      const json = (res.headers.get('content-type') || '').includes('json')
      const data = json ? await res.json().catch(() => null) : null
      throw new Error(data?.error || (json ? `HTTP ${res.status}` : __('the crew server is not running (start "python3 server.py" in engine-mvp)')))
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
    set({ error: __('The crew could not answer: :error', { error: err instanceof Error ? err.message : String(err) }) })
    if (!answered) { // nothing came back: take the client's line away again, the caller restores the draft
      L.setCrew((L.getLesson().lesson.crew ?? []).filter((l) => l !== mine))
      return false
    }
  } finally {
    // a member still working when the stream is over lost their connection
    for (const [who, l] of Object.entries(state.live)) {
      if (l.status !== 'working' || l.turn !== myTurn) continue
      putLine(l.turn, { who, text: '', error: __('Lost connection'), ...savedThoughts(l) })
      set({ live: withoutLive(who) })
    }
    streams--
    set({ busy: streams > 0 })
  }
  return true
}

/** The client picked an option: it goes out as their next message to whoever asked, and a scope question
 *  also sets the scope for this and the following turns. */
export async function pickChoice(index: number, label: string): Promise<boolean> {
  const crew = L.getLesson().lesson.crew ?? []
  const line = crew[index]
  if (!line?.choices || line.answered) return false
  const to = line.who === 'assistant' ? null : line.who
  const mark = (answered?: string) => L.setCrew((L.getLesson().lesson.crew ?? []).map((l, i) => (i === index ? { ...l, answered } : l)))
  mark(label)
  set({ to, ...(line.choices.scope ? { scope: scopeOf(label) } : {}) })
  const ok = await send(label, true)
  if (!ok) mark(undefined)
  return ok
}
