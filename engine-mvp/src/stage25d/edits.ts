// Teacher edits on a lesson: every motion and timing value is one path into lesson.json, set immutably, and every
// change is one undoable step in the shared blockout History (house rule: the teacher can change and undo everything).
import { History, valueOp } from '../blockout/history'
import type { Lesson } from './types'

export type Path = (string | number)[]

export function getIn(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj)
}

/** A copy of obj with the value at path replaced; missing objects on the way are created. */
export function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (!path.length) return value as T
  const [k, ...rest] = path
  const cur = (obj ?? (typeof k === 'number' ? [] : {})) as Record<string | number, unknown>
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

  set(path: Path, v: unknown, label = path.join('.')) {
    const before = this.value
    const after = setIn(before, path, v)
    if (getIn(before, path) === v) return
    this.replace(after)
    this.history.push(valueOp(label, 'teacher', before, after, (l) => this.replace(l)))
  }

  undo() { this.history.undo() }
  redo() { this.history.redo() }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private replace(l: Lesson) { this.value = l; this.listeners.forEach((fn) => fn()) }
}
