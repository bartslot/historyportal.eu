// Every studio setting, read straight from the controls the client uses by hand (anything inside
// [data-settings] with an id), so a new slider is open to the crew the moment it is on screen. A crew
// change goes through the same control and the same input/change events as a hand edit.

export type Setting =
  | { id: string; label: string; type: 'range'; min: number; max: number; step: number; value: number }
  | { id: string; label: string; type: 'toggle'; value: boolean }
  | { id: string; label: string; type: 'select'; options: [string, string][]; value: string }
export type Change = { id: string; value: number | boolean | string }

/** Keep only changes to offered settings, each value made valid for its control. Pure. */
export function planChanges(offered: Setting[], proposed: unknown): Change[] {
  if (!Array.isArray(proposed)) return []
  const byId = new Map(offered.map((s) => [s.id, s]))
  const out: Change[] = []
  for (const p of proposed) {
    const s = byId.get((p as Change)?.id)
    if (!s) continue
    const v = (p as Change).value
    if (s.type === 'range') {
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      out.push({ id: s.id, value: Math.min(s.max, Math.max(s.min, n)) })
    } else if (s.type === 'toggle') {
      out.push({ id: s.id, value: v === true || v === 'true' || v === 1 })
    } else if (s.options.some(([o]) => o === String(v))) {
      out.push({ id: s.id, value: String(v) })
    }
  }
  return out
}

const controls = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-settings] input[id], [data-settings] select[id]')]
    .filter((el) => !(el instanceof HTMLInputElement) || el.type === 'range' || el.type === 'checkbox')

const labelOf = (el: HTMLInputElement | HTMLSelectElement) =>
  (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.id).trim()

export function readSettings(root: ParentNode = document): Setting[] {
  return controls(root).map((el): Setting => {
    if (el instanceof HTMLSelectElement) {
      return { id: el.id, label: labelOf(el), type: 'select', value: el.value, options: [...el.options].map((o) => [o.value, o.text] as [string, string]) }
    }
    if (el.type === 'checkbox') return { id: el.id, label: labelOf(el), type: 'toggle', value: el.checked }
    return { id: el.id, label: labelOf(el), type: 'range', min: Number(el.min), max: Number(el.max), step: Number(el.step) || 1, value: Number(el.value) }
  })
}

/** Apply through the real controls; returns what each one was before, for Undo. */
export function applySettings(changes: Change[], root: ParentNode = document): { applied: Change[]; before: Change[] } {
  const applied: Change[] = []
  const before: Change[] = []
  for (const c of planChanges(readSettings(root), changes)) {
    const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-settings] #${CSS.escape(c.id)}`)
    if (!el) continue
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      before.push({ id: c.id, value: el.checked })
      el.checked = c.value as boolean
    } else {
      before.push({ id: c.id, value: el instanceof HTMLSelectElement ? el.value : Number(el.value) })
      el.value = String(c.value)
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    applied.push(c)
  }
  return { applied, before }
}
