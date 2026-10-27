// Teacher edits on a lesson: every motion and timing value is one path into lesson.json, set immutably, and every
// change is one undoable step in the shared blockout History (house rule: the teacher can change and undo everything).
import { History, valueOp } from '../blockout/history'
import type { Lesson } from './types'

export type Path = (string | number)[]
export const MERGE_MS = 600 // edits to one value closer together than this are one drag

export function getIn(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj)
}

/** A copy of obj with the value at path replaced; missing objects on the way are created. */
export function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (!path.length) return value as T
  const [k, ...rest] = path
  // a missing or non-object value on the way (motion: 'sway') becomes a fresh object, never a spread string
  const cur = (obj !== null && typeof obj === 'object' ? obj : typeof k === 'number' ? [] : {}) as Record<string | number, unknown>
  const next = setIn(cur[k], rest, value)
  if (Array.isArray(cur)) { const copy = [...cur]; copy[k as number] = next; return copy as T }
  return { ...cur, [k]: next } as T
}

/** The lesson being edited: one value, changed only through set(), each change undoable. */
export class LessonDoc {
  readonly history = new History()
  private listeners = new Set<() => void>()
  constructor(private value: Lesson) {}

  get lesson(): Lesson { return this.value }

  private last: { key: string; at: number; before: Lesson } | null = null

  /** One change = one undo step; repeats on the same value within MERGE_MS (a slider drag) fold into one step. */
  set(path: Path, v: unknown, label = path.join('.')) {
    if (getIn(this.value, path) === v) return
    const key = path.join('.')
    const now = Date.now()
    const merge = this.last && this.last.key === key && now - this.last.at < MERGE_MS && this.history.last()?.label === label
    const before = merge ? this.last!.before : this.value
    if (merge) this.history.undo()
    const after = setIn(this.value, path, v)
    this.replace(after)
    this.history.push(valueOp(label, 'teacher', before, after, (l) => this.replace(l)))
    this.last = { key, at: now, before }
  }

  undo() { this.last = null; this.history.undo() }
  redo() { this.last = null; this.history.redo() }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private replace(l: Lesson) { this.value = l; this.listeners.forEach((fn) => fn()) }
}
