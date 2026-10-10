// The crew stream (docs/crew-stream.md): pure helpers. Lines are split out of arbitrary chunks, every event is
// validated (the server is untrusted), and a reducer folds events into one live state per working member.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const LIVE_CAP = 8000 // what a working member keeps while streaming
export const SAVED_CAP = 4000 // what is saved with the final line

export type Turn = string | number
export type CrewEvent =
  | { type: 'turn'; turn: Turn }
  | { type: 'assistant'; turn: Turn; as?: string; text: string }
  | { type: 'routed'; turn: Turn; who: string; ack: string }
  | { type: 'start'; turn: Turn; who: string }
  | { type: 'thinking' | 'text' | 'review'; turn: Turn; who: string; text: string }
  | { type: 'jev'; turn: Turn; who: string; score: number; choice: string }
  | { type: 'message'; turn: Turn; who: string; msg: any }
  | { type: 'stopped'; turn: Turn; who: string }
  | { type: 'error'; turn: Turn; who?: string; error: string }
  | { type: 'done'; turn: Turn }

export type LiveStatus = 'working' | 'done' | 'stopped' | 'error'
export type Live = {
  turn: Turn; status: LiveStatus; ack: string; asked: string; thinking: string; draft: string
  jev?: { score: number; choice: string }; review?: string; startedAt: number; error?: string
}
export type LiveMap = Record<string, Live>

/** Append a chunk; returns the complete lines and the partial last line to carry over. */
export function splitLines(carry: string, chunk: string): { lines: string[]; rest: string } {
  const parts = (carry + chunk).split('\n')
  const rest = parts.pop() ?? ''
  return { lines: parts.map((l) => l.trim()).filter(Boolean), rest }
}

const str = (v: unknown): v is string => typeof v === 'string'

/** One NDJSON line to a well-shaped event, or null (bad JSON, unknown type, wrong field types). */
export function parseEvent(line: string): CrewEvent | null {
  let e: any
  try { e = JSON.parse(line) } catch { return null }
  if (!e || typeof e !== 'object' || !str(e.type)) return null
  const turn: Turn = str(e.turn) || typeof e.turn === 'number' ? e.turn : ''
  switch (e.type) {
    case 'turn': case 'done': return { type: e.type, turn }
    case 'assistant': return str(e.text) ? { type: 'assistant', turn, ...(str(e.as) ? { as: e.as } : {}), text: e.text } : null
    case 'routed': return str(e.who) && str(e.ack) ? { type: 'routed', turn, who: e.who, ack: e.ack } : null
    case 'start': case 'stopped': return str(e.who) ? { type: e.type, turn, who: e.who } : null
    case 'thinking': case 'text': case 'review': return str(e.who) && str(e.text) ? { type: e.type, turn, who: e.who, text: e.text } : null
    case 'jev': return str(e.who) && typeof e.score === 'number' && Number.isFinite(e.score) && e.score >= 0 && e.score <= 1 && str(e.choice)
      ? { type: 'jev', turn, who: e.who, score: e.score, choice: e.choice } : null
    case 'message': return str(e.who) ? { type: 'message', turn, who: e.who, msg: e } : null
    case 'error': return str(e.error) ? { type: 'error', turn, ...(str(e.who) ? { who: e.who } : {}), error: e.error } : null
    default: return null
  }
}

const cap = (s: string, n = LIVE_CAP) => s.slice(0, n)

/** Fold one event into the live map (new object, input untouched). `asked` is what the client just said. */
export function reduceLive(live: LiveMap, ev: CrewEvent, asked = '', now = Date.now()): LiveMap {
  if (ev.type === 'routed') {
    return { ...live, [ev.who]: { turn: ev.turn, status: 'working', ack: ev.ack, asked, thinking: '', draft: '', startedAt: now } }
  }
  if (!('who' in ev) || !ev.who) return live
  const cur = live[ev.who]
  if (ev.type === 'start') return cur ? live : { ...live, [ev.who]: { turn: ev.turn, status: 'working', ack: '', asked, thinking: '', draft: '', startedAt: now } }
  if (!cur || cur.turn !== ev.turn) return live // an older turn's leftovers never touch a newer bubble
  const put = (p: Partial<Live>): LiveMap => ({ ...live, [ev.who as string]: { ...cur, ...p } })
  switch (ev.type) {
    case 'thinking': return put({ thinking: cap(cur.thinking + ev.text) })
    case 'text': return put({ draft: cap(cur.draft + ev.text) })
    case 'jev': return put({ jev: { score: ev.score, choice: ev.choice } })
    case 'review': return put({ review: cap(ev.text) })
    case 'message': return put({ status: 'done' })
    case 'stopped': return put({ status: 'stopped' })
    case 'error': return put({ status: 'error', error: ev.error })
    default: return live
  }
}

/** The transcript kept with a finished line: thinking, draft, capped small. */
export const savedThoughts = (l: Live) => ({
  ...(l.thinking ? { thoughts: l.thinking.slice(0, SAVED_CAP) } : {}),
  ...(l.draft ? { draft: l.draft.slice(0, SAVED_CAP) } : {}),
})

export const PARTIAL_TAIL = 1500

/** What an interrupted member hands back: the reply draft, or (when none yet) the tail of their thinking, marked. */
export function buildPartial(who: string, l: Pick<Live, 'draft' | 'thinking'>): { who: string; text: string } {
  if (l.draft) return { who, text: l.draft }
  return { who, text: l.thinking ? '(still thinking) ' + l.thinking.slice(-PARTIAL_TAIL) : '' }
}

/** A chat line as far as these helpers care (the full CrewLine lives in lesson/store). */
type Keyed = { who: string; turn?: Turn; status?: 'working'; interrupted?: boolean }

/** Put `line` where the same member's in-flight line of this turn is (index stays), else append. */
export function upsertLine<T extends Keyed>(lines: T[], turn: Turn | null, line: T): { lines: T[]; index: number } {
  const at = turn === null ? -1 : lines.map((l) => l.status === 'working' && l.who === line.who && l.turn === turn).lastIndexOf(true)
  if (at < 0) return { lines: [...lines, line], index: lines.length }
  return { lines: lines.map((l, i) => (i === at ? line : l)), index: at }
}

/** On load nothing is in flight any more: lines still "working" were cut off by a page reload. */
export function sweepInterrupted<T extends Keyed>(lines: T[]): T[] {
  if (!lines.some((l) => l.status === 'working')) return lines
  return lines.map((l) => {
    if (l.status !== 'working') return l
    const { status: _s, ...rest } = l
    return { ...rest, interrupted: true } as T
  })
}
