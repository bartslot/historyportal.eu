// What the start screen asks for: the teacher's own prompt, plus four chips. The chips travel to the crew
// as plain words after the prompt, so every member reads the same brief (the client's raw words, never a summary).
import { ICON } from '../ui/icons'

export const KINDS = [
  { id: 'story', label: 'Story driven', icon: ICON.book },
  { id: 'interactive', label: 'Interactive', icon: ICON.cursorRays },
  { id: 'gamified', label: 'Gamified lesson', icon: ICON.trophy },
  { id: 'game', label: 'Game', icon: ICON.puzzle },
] as const
export type KindId = (typeof KINDS)[number]['id']

export const LEVELS = ['Groep 6', 'Groep 7', 'Groep 8', 'Klas 1', 'Klas 2'] as const
export const LENGTHS = ['15 min', '30 min', '45 min'] as const
export const LANGUAGES = ['Nederlands', 'English', 'Deutsch', 'Français', 'Italiano'] as const

export type Brief = { kind: KindId; level: string; length: string; language: string }
export const DEFAULT_BRIEF: Brief = { kind: 'story', level: 'Groep 7', length: '30 min', language: 'Nederlands' }

export const kindOf = (id: string) => KINDS.find((k) => k.id === id) ?? KINDS[0]

export function briefMessage(prompt: string, b: Brief): string {
  return `${prompt.trim()}\n\nLesson type: ${kindOf(b.kind).label}. Class: ${b.level}. Length: ${b.length}. Language: ${b.language}.`
}

/** A template starts the prompt without wiping the teacher's words: an earlier starter is swapped, the rest stays. Pure. */
export function withStarter(draft: string, title: string, starters: readonly string[]): string {
  const known = starters.find((s) => draft.startsWith(`${s}: `))
  const rest = (known ? draft.slice(known.length + 2) : draft).trimStart()
  return `${title}: ${rest}`
}

type Node = { text?: string; content?: Node[] }
const hasText = (n: Node | null | undefined): boolean => !!n && (!!n.text?.trim() || (n.content ?? []).some(hasText))

/** Nothing made yet: no crew talk, no words in the script, one scene never built. Such a lesson opens on the start screen. */
export function isEmptyLesson(l: { crew?: unknown[]; script: unknown; scenes?: Record<string, { doc: unknown }> }): boolean {
  const scenes = Object.values(l.scenes ?? {})
  return !l.crew?.length && !hasText(l.script as Node | null) && scenes.length <= 1 && scenes.every((s) => s.doc == null)
}
