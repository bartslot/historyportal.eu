// Per-op history (clay-blockout Gate 1): every change, by the AI or by the teacher's hand, is one op that knows
// how to undo and redo itself. It replaces the crew's one whole-scene snapshot per answer, so undoing an AI change
// never throws away a teacher's edit made before it (and the other way round).
export type Author = 'ai' | 'teacher'
export type Op = { label: string; by: Author; ids: string[]; undo: () => void; redo: () => void }

export class History {
  private done: Op[] = []
  private undone: Op[] = []
  private listeners = new Set<() => void>()
  constructor(private readonly limit = 200) {}

  /** Record an op that has already been applied. A new op clears the redo side, as in every editor. */
  push(op: Op) {
    this.done.push(op)
    if (this.done.length > this.limit) this.done.shift()
    this.undone = []
    this.emit()
  }

  undo(): Op | null {
    const op = this.done.pop()
    if (!op) return null
    op.undo()
    this.undone.push(op)
    this.emit()
    return op
  }

  redo(): Op | null {
    const op = this.undone.pop()
    if (!op) return null
    op.redo()
    this.done.push(op)
    this.emit()
    return op
  }

  list(): { label: string; by: Author; ids: string[] }[] {
    return this.done.map(({ label, by, ids }) => ({ label, by, ids }))
  }

  canUndo() { return this.done.length > 0 }
  canRedo() { return this.undone.length > 0 }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  private emit() { this.listeners.forEach((fn) => fn()) }
}

/** An op from a before/after pair of states of the pieces it touched, applied through `set`. */
export function changeOp<S>(label: string, by: Author, before: Record<string, S>, after: Record<string, S>, set: (id: string, s: S | undefined) => void): Op {
  const ids = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return {
    label, by, ids,
    undo: () => ids.forEach((id) => set(id, before[id])),
    redo: () => ids.forEach((id) => set(id, after[id])),
  }
}
