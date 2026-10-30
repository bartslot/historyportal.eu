// The script as data: one TipTap document for the whole lesson. Each scene is a `sceneHeading`
// (an atom carrying the scene id) followed by its lines; a line is a paragraph with a stable `id`,
// an optional `speaker` and, once read aloud, a measured `dur`. Text marked `subtitle` is what the
// class reads on screen. Pure: nothing here touches the editor, the engine or the clock.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Narration pace when nothing has been measured yet: an unhurried classroom voice. */
export const WORDS_PER_SECOND = 2.4
export const MIN_LINE_SECONDS = 0.8
/** Breath between lines. */
export const LINE_GAP_SECONDS = 0.4

export type Line = { id: string; text: string; subtitle: string; speaker: string | null; dur: number | null }
export type PlacedLine = Line & { start: number; end: number }

const textOf = (node: any): string => (node.text ?? '') + (node.content ?? []).map(textOf).join('')
const subtitleOf = (node: any): string =>
  node.type === 'text' ? ((node.marks ?? []).some((m: any) => m.type === 'subtitle') ? node.text : ' ') : (node.content ?? []).map(subtitleOf).join('')

/** The lines of one scene, in order. Empty paragraphs are not lines. */
export function linesOf(doc: any, sceneId: string): Line[] {
  const out: Line[] = []
  let inScene = false
  for (const node of doc?.content ?? []) {
    if (node.type === 'sceneHeading') { inScene = node.attrs?.sceneId === sceneId; continue }
    if (!inScene || node.type !== 'paragraph') continue
    const text = textOf(node).trim()
    if (!text) continue
    out.push({
      id: node.attrs?.id ?? '', text, subtitle: subtitleOf(node).replace(/\s+/g, ' ').trim(),
      speaker: node.attrs?.speaker ?? null, dur: Number.isFinite(node.attrs?.dur) ? node.attrs.dur : null,
    })
  }
  return out
}

export const estimateSeconds = (text: string) =>
  Math.max(MIN_LINE_SECONDS, text.split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND)

/** Lines one after another from 0, each as long as measured (or estimated), with a breath between. */
export function layout(lines: Line[]): PlacedLine[] {
  let t = 0
  return lines.map((l) => {
    const start = t
    const end = start + (l.dur ?? estimateSeconds(l.text))
    t = end + LINE_GAP_SECONDS
    return { ...l, start, end }
  })
}

export const lineAt = (placed: PlacedLine[], time: number) => placed.find((l) => time >= l.start && time < l.end) ?? null

const heading = (s: { id: string; title: string }) => ({ type: 'sceneHeading', attrs: { sceneId: s.id, title: s.title } })
const emptyLine = () => ({ type: 'paragraph' })

/**
 * Keep the document's sections in step with the scene tree: one heading per scene, in the tree's
 * order and with its title; a scene's lines move with it; a new scene gets an empty line; a deleted
 * scene's section goes. Lines before the first heading stay at the top.
 */
export function reconcile(doc: any, scenes: { id: string; title: string }[]): any {
  const head: any[] = []
  const sections = new Map<string, any[]>()
  let current: any[] = head
  for (const node of doc?.content ?? []) {
    if (node.type === 'sceneHeading') { current = []; sections.set(node.attrs?.sceneId, current); continue }
    current.push(node)
  }
  const content = [...head]
  for (const s of scenes) content.push(heading(s), ...(sections.get(s.id)?.length ? sections.get(s.id)! : [emptyLine()]))
  return { type: 'doc', content }
}

/** True when the document already matches the tree (same scenes, order and titles): no rewrite needed. */
export function inStep(doc: any, scenes: { id: string; title: string }[]) {
  const heads = (doc?.content ?? []).filter((n: any) => n.type === 'sceneHeading')
  return heads.length === scenes.length && heads.every((h: any, i: number) => h.attrs?.sceneId === scenes[i].id && h.attrs?.title === scenes[i].title)
}
