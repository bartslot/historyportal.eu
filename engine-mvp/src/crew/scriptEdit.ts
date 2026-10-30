// The crew writes onto the script page: pure edits of the script document (the TipTap JSON in
// lesson.script). A scene's lines are replaced under its heading; a rewrite replaces the selected lines.
// Nothing is mutated: every function returns a new document.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { newLineId } from '../script/extensions'
import { linesOf } from '../script/narration'
import { __ } from '../i18n'

export type NewLine = { speaker: string | null; text: string }

const paragraph = ({ speaker, text }: NewLine) => ({
  type: 'paragraph', attrs: { id: newLineId(), speaker: speaker || null, dur: null }, content: [{ type: 'text', text }],
})
const isHeading = (n: any) => n?.type === 'sceneHeading'

/** The scene's lines replaced by `lines` (fresh ids); the heading stays, or is created at the end
 *  (with `title`) when the scene has none yet. */
export function replaceSceneLines(doc: any, sceneId: string, lines: NewLine[], title = ''): any {
  const content: any[] = doc?.content ?? []
  const at = content.findIndex((n) => isHeading(n) && n.attrs?.sceneId === sceneId)
  const fresh = lines.map(paragraph)
  if (at < 0) return { ...doc, type: 'doc', content: [...content, { type: 'sceneHeading', attrs: { sceneId, title } }, ...fresh] }
  let end = at + 1
  while (end < content.length && !isHeading(content[end])) end++
  return { ...doc, type: 'doc', content: [...content.slice(0, at + 1), ...fresh, ...content.slice(end)] }
}

/** The lines with these ids replaced by `lines` (fresh ids) at the first one's place. Unknown ids are
 *  ignored; when none is found the same document comes back. */
export function replaceLines(doc: any, lineIds: string[], lines: NewLine[]): any {
  const content: any[] = doc?.content ?? []
  const ids = new Set(lineIds)
  const mine = (n: any) => n?.type === 'paragraph' && ids.has(n.attrs?.id)
  const first = content.findIndex(mine)
  if (first < 0) return doc
  const next = content.flatMap((n, i) => (i === first ? lines.map(paragraph) : mine(n) ? [] : [n]))
  return { ...doc, content: next }
}

/** The text of the lines with these ids, in document order. */
export function textOfLines(doc: any, lineIds: string[]): string {
  const ids = new Set(lineIds)
  const flat = (n: any): string => (n.text ?? '') + (n.content ?? []).map(flat).join('')
  return (doc?.content ?? []).filter((n: any) => n.type === 'paragraph' && ids.has(n.attrs?.id)).map(flat).join(' ').trim()
}

// ---- selection requests (docs/crew-stream.md "Selection actions"); the caps match server.clean_selection ----
export type SelectionAction = 'rewrite' | 'check' | 'ask'
export type Picked = { text: string; lineIds: string[]; sceneId: string }
export type Selection = Picked & { action: SelectionAction; how?: string; scene: { id: string; speaker: string | null; text: string }[] }
const CAP = { how: 60, text: 2000, lineIds: 20, scene: 40 }

export function buildSelection(action: SelectionAction, picked: Picked, doc: any, how?: string): Selection {
  return {
    action, ...(how ? { how: how.slice(0, CAP.how) } : {}),
    text: picked.text.slice(0, CAP.text), lineIds: picked.lineIds.slice(0, CAP.lineIds), sceneId: picked.sceneId,
    scene: linesOf(doc, picked.sceneId).slice(0, CAP.scene).map((l) => ({ id: l.id, speaker: l.speaker, text: l.text })),
  }
}

const quote = (t: string, n = 120) => `"${t.length > n ? t.slice(0, n).trimEnd() + '...' : t}"`
/** What the chat shows as the client's line for a selection action. */
export function selectionMessage(action: SelectionAction, text: string, how?: string): string {
  if (action === 'rewrite') return how ? __('Rewrite (:how): :text', { how, text: quote(text) }) : __('Rewrite :text', { text: quote(text) })
  if (action === 'check') return __('Check the history of :text', { text: quote(text) })
  return quote(text)
}

export const REWRITE_HOWS = ['Shorter', 'Simpler for my class', 'More lively']
export const voiceHow = (speaker: string) => `In ${speaker}'s voice`
