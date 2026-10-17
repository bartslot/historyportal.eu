// Crew "choices" (docs/crew-stream.md): a question with 2-4 options the client picks from. The server is
// untrusted, so everything is validated here. Pure, no DOM.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Choices } from '../lesson/store'

export const MAX_QUESTION = 200
export const MAX_LABEL = 60
export const MAX_WHY = 200
export type Scope = 'lesson' | 'scene'

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Well-shaped choices or undefined. Recommended goes first and only one option keeps the flag. */
export function cleanChoices(v: any): Choices | undefined {
  const question = text(v?.question, MAX_QUESTION)
  if (!question || !Array.isArray(v.options)) return undefined
  const options = v.options
    .map((o: any) => ({ label: text(o?.label, MAX_LABEL), why: text(o?.why, MAX_WHY), recommended: o?.recommended === true }))
    .filter((o: { label: string }) => o.label)
  if (options.length < 2 || options.length > 4) return undefined
  const star = options.findIndex((o: { recommended: boolean }) => o.recommended)
  const ordered = options.map((o: any, i: number) => ({ label: o.label, why: o.why, ...(i === star ? { recommended: true } : {}) }))
  if (star > 0) ordered.unshift(ordered.splice(star, 1)[0])
  return { question, options: ordered, ...(v.scope === true ? { scope: true } : {}) }
}

/** What a picked scope label means: "Whole lesson", "Hele les", "Ganze Lektion"... else this scene. */
export const scopeOf = (label: string): Scope => (/whole|hele|ganze|all|alle/i.test(label) ? 'lesson' : 'scene')
