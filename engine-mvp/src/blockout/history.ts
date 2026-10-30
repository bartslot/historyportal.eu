// Per-op history (clay-blockout Gates 1 and 3): every change, by the AI or by the teacher's hand, is one op that knows
// how to undo and redo itself. Gate 3: an AI answer is a GROUP of ops, undone as one step (undo) or op by op
// (undoOne), so undoing an AI change never throws away a teacher's edit made before it, and the crew panel no longer
// reloads a whole-scene snapshot.
export type Author = 'ai' | 'teacher'
export type Op = { label: string; by: Author; ids: string[]; undo: () => void; redo: () => void; children?: Op[] }
export type Listed = { label: string; by: Author; ids: string[]; children?: { label: string; by: Author; ids: string[] }[] }

function groupOp(label: string, by: Author, children: Op[]): Op {
  return {
    label, by, children,
    ids: [...new Set(children.flatMap((c) => c.ids))],
    undo: () => [...children].reverse().forEach((c) => c.undo()),
    redo: () => children.forEach((c) => c.redo()),
  }
}

export class History {
  private done: Op[] = []
  private undone: Op[] = []
  private open: { label: string; by: Author; children: Op[]; depth: number } | null = null
  private listeners = new Set<() => void>()
  constructor(private readonly limit = 200) {}

  /** Start a group (an AI answer): ops pushed until end() become one step. Nested begin()s join the open group. */
  begin(label: string, by: Author) {
    if (this.open) { this.open.depth++; return }
    this.open = { label, by, children: [], depth: 1 }
  }

  /** Close the group; an empty group leaves no step, a group of one is that op. Returns the step, if any. */
  end(): Op | null {
    if (!this.open) return null
    if (--this.open.depth > 0) return null
    const { label, by, children } = this.open
    this.open = null
    if (!children.length) return null
    const op = children.length === 1 ? children[0] : groupOp(label, by, children)
    this.commit(op)
    return op
  }

  /** Record an op that has already been applied. A new op clears the redo side, as in every editor. */
  push(op: Op) {
    if (this.open) { this.open.children.push(op); return }
    this.commit(op)
  }

  private commit(op: Op) {
    this.done.push(op)
    if (this.done.length > this.limit) this.done.shift()
    this.undone = []
    this.emit()
  }

  /** Undo the last step: a whole AI answer, or one hand edit. */
  undo(): Op | null {
    const op = this.done.pop()
    if (!op) return null
    op.undo()
    this.undone.push(op)
    this.emit()
    return op
  }

  /** Undo only the last op inside the last step (an AI answer op by op); the rest of its group stays. */
  undoOne(): Op | null {
    const last = this.done[this.done.length - 1]
    if (!last?.children || last.children.length < 2) return this.undo()
    const child = last.children[last.children.length - 1]
    const rest = last.children.slice(0, -1)
    this.done[this.done.length - 1] = rest.length === 1 ? rest[0] : groupOp(last.label, last.by, rest)
    child.undo()
    this.undone.push(child)
    this.emit()
    return child
  }

  redo(): Op | null {
    const op = this.undone.pop()
    if (!op) return null
    op.redo()
    this.done.push(op)
    this.emit()
    return op
  }

  list(): Listed[] {
    return this.done.map(({ label, by, ids, children }) => ({
      label, by, ids, ...(children ? { children: children.map(({ label: l, by: b, ids: i }) => ({ label: l, by: b, ids: i })) } : {}),
    }))
  }

  /** The step on top, so the crew panel can offer Undo only on the answer that is still the latest. */
  last(): Op | null { return this.done[this.done.length - 1] ?? null }
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

/** An op over one value outside the pieces (a camera, a setting, the title): set(before) / set(after). */
export function valueOp<V>(label: string, by: Author, before: V, after: V, set: (v: V) => void, ids: string[] = []): Op {
  return { label, by, ids, undo: () => set(before), redo: () => set(after) }
}
