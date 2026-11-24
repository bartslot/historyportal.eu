/**
 * preset-lay.js: a table of motion presets turned into ordinary keys on an object's timeline rows. Shared by the
 * text presets (text-presets.js) and the Map block's (map-presets.js): a preset is a shortcut that writes keys, not a
 * mode, and once picked every key is the teacher's to move, change or delete on the timeline.
 *
 * Bart, 2026-11-24: "when you select one of the presets, it will overwrite the previous presets of that animation,
 * the animation settings will go to timeline where you can tweak it further." So an entrance picked where the last
 * entrance was takes its place, and an exit replaces the exit.
 *
 * A table: `{ id: { exit?, span: (ctx) => s, keys: (rest, span, ctx) => ({ property: [[dt, value, easing?], ...] }) } }`.
 * `ctx` is whatever the table's spans need (a text's words; nothing for a map).
 */
import { sortedKeys, TIME_EPSILON } from './keyframes.js'

const round3 = (v) => Math.round(v * 1000) / 1000 + 0
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function presetLibrary (table, properties, resting) {
  const ENTRANCE = Object.keys(table).filter((id) => !table[id].exit)
  const EXIT = Object.keys(table).filter((id) => table[id].exit)
  const span = (id, ctx) => round3(table[id]?.span(ctx) ?? 0)

  /** Preset `id`'s keys from `start`, as `{ property: [{ time, value, easing? }] }`. */
  const keys = (id, { start = 0, ctx, rest = {} } = {}) => {
    const preset = table[id]
    if (!preset) return {}
    const s = span(id, ctx)
    return Object.fromEntries(Object.entries(preset.keys(rest, s, ctx)).map(([property, list]) => [
      property,
      list.map(([dt, value, easing]) => ({ time: round3(start + dt), value: round3(value), ...(easing ? { easing } : {}) })),
    ]))
  }

  /**
   * The tracks with preset `id` laid in at `start` (pulled earlier so it ends by `duration`, the scene's end). An
   * entrance clears the preset rows' keys from `start` for as long as the longest entrance runs, so picking one
   * after another at the same playhead swaps them; an exit clears only its own stretch. Every key outside that
   * stretch, and every other row, stays as the teacher left it. Null for an unknown preset.
   *
   * @returns {{ tracks: object[], from: number, to: number, properties: string[] }|null}
   */
  const apply = (tracks, target, id, { start = 0, duration = Infinity, ctx, rest = () => null } = {}) => {
    const preset = table[id]
    if (!preset) return null
    const s = span(id, ctx)
    const from = round3(clamp(start, 0, Math.max(0, duration - s)))
    const clears = preset.exit ? s : Math.max(...ENTRANCE.map((e) => span(e, ctx)))
    const inStretch = (k) => k.time >= from - TIME_EPSILON && k.time <= from + clears + TIME_EPSILON
    const r = resting(rest)
    const added = keys(id, { start: from, ctx, rest: r })
    const ours = (t) => t.target === target && properties.includes(t.property)

    let next = (tracks ?? []).map((t) => (ours(t) ? { ...t, keyframes: sortedKeys(t).filter((k) => !inStretch(k)) } : t))
    for (const [property, list] of Object.entries(added)) {
      const own = next.find((t) => t.target === target && t.property === property)
      next = own
        ? next.map((t) => (t === own ? { ...own, base: own.base ?? r[property], keyframes: [...own.keyframes, ...list].sort((a, b) => a.time - b.time) } : t))
        : [...next, { target, property, base: r[property], keyframes: list }]
    }
    return { tracks: next.filter((t) => !ours(t) || t.keyframes.length), from, to: round3(from + s), properties: Object.keys(added) }
  }

  return { ENTRANCE, EXIT, span, keys, apply }
}
