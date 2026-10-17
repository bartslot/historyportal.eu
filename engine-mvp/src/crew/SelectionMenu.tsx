// Select text on the script page and a small menu appears over it: Rewrite (four ways), Check history,
// Ask the crew. Mounted once from the crew panel; it also shows the proposed rewrites (before / after)
// with Replace and Keep, where the chat is. The script editor is not touched: it is read through the DOM.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import * as L from '../lesson/store'
import { panels } from '../panels/store'
import { acceptRewrite, dismissRewrite, send, setAskSelection, useCrew } from './store'
import { __ } from '../i18n'
import { REWRITE_HOWS, buildSelection, selectionMessage, voiceHow, type Picked, type SelectionAction } from './scriptEdit'

const EDITOR = `section[aria-label="${__('Script')}"] .ProseMirror`
const BOX = __('Message to the crew')
const MENU_LABEL = __('Selected text')
/** The rewrite ways on screen; the crew is sent the English one. */
const HOW_LABEL: Record<string, string> = { Shorter: __('Shorter'), 'Simpler for my class': __('Simpler for my class'), 'More lively': __('More lively') }
const GAP = 8
const MENU = 'fixed z-50 flex flex-col rounded-md border border-panel-hairline bg-base-100 p-1 text-xs text-panel-value'
const ITEM = 'cursor-pointer rounded px-2 py-1 text-left hover:bg-base-200 disabled:cursor-default disabled:opacity-40'

type Found = { picked: Picked; speaker: string | null; rect: { top: number; bottom: number; left: number; width: number } }

/** What the selection covers in the script editor: its lines, their scene, the speaker, where it is. Null when empty or elsewhere. */
export function readSelection(): Found | null {
  const sel = window.getSelection()
  const editor = document.querySelector(EDITOR)
  if (!sel || !editor || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return null
  const text = sel.toString().replace(/\s+/g, ' ').trim()
  const lines = [...editor.querySelectorAll<HTMLElement>('[data-line-id]')].filter((p) => range.intersectsNode(p))
  if (!text || !lines.length) return null
  let head: Element | null = lines[0]
  while (head && !(head.matches('h2[data-scene-id]'))) head = head.previousElementSibling
  const sceneId = head?.getAttribute('data-scene-id')
  if (!sceneId) return null
  const r = range.getBoundingClientRect()
  return {
    picked: { text, lineIds: lines.map((p) => p.getAttribute('data-line-id') ?? '').filter(Boolean), sceneId },
    speaker: lines[0].getAttribute('data-speaker'), rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
  }
}

/** Put text into the crew's message box (a React textarea: set the value the way a keystroke would). */
function fillMessageBox(text: string) {
  const box = document.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${BOX}"]`)
  if (!box) return
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(box, text)
  box.dispatchEvent(new Event('input', { bubbles: true }))
  box.focus()
}

function Menu({ found, onDone }: { found: Found; onDone: () => void }) {
  const { busy } = useCrew()
  const [rewrite, setRewrite] = useState(false)
  const { picked, speaker, rect } = found
  const below = rect.top < 120
  const style = { left: Math.max(8, Math.min(window.innerWidth - 220, rect.left + rect.width / 2 - 90)), ...(below ? { top: rect.bottom + GAP } : { top: rect.top - GAP, transform: 'translateY(-100%)' }) }

  const run = (action: SelectionAction, how?: string) => {
    const selection = buildSelection(action, picked, L.getLesson().lesson.script, how)
    onDone()
    panels.open('crew')
    void send(selectionMessage(action, picked.text, how && (HOW_LABEL[how] ?? (speaker ? __("In :name's voice", { name: speaker }) : how))), false, selection)
  }
  const ask = () => {
    setAskSelection(buildSelection('ask', picked, L.getLesson().lesson.script))
    onDone()
    panels.open('crew')
    window.setTimeout(() => fillMessageBox(selectionMessage('ask', picked.text, undefined) + ' '), 0)
  }
  return (
    <div role="menu" aria-label={MENU_LABEL} className={MENU} style={style} onMouseDown={(e) => e.preventDefault() /* keep the selection */}>
      <div className="flex gap-0.5">
        <button type="button" role="menuitem" aria-expanded={rewrite} disabled={busy} className={ITEM} onClick={() => setRewrite((v) => !v)}>{__('Rewrite')}</button>
        <button type="button" role="menuitem" disabled={busy} className={ITEM} onClick={() => run('check')}>{__('Check history')}</button>
        <button type="button" role="menuitem" className={ITEM} onClick={ask}>{__('Ask the crew')}</button>
      </div>
      {rewrite && (
        <div className="mt-1 flex flex-col border-t border-panel-hairline pt-1">
          {[...REWRITE_HOWS, ...(speaker ? [voiceHow(speaker)] : [])].map((how) => (
            <button key={how} type="button" role="menuitem" disabled={busy} className={ITEM} onClick={() => run('rewrite', how)}>{HOW_LABEL[how] ?? __("In :name's voice", { name: speaker ?? '' })}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** The proposed rewrites of this lesson: old text struck through, new text, Replace or Keep. */
function RewriteCards() {
  const { rewrites } = useCrew()
  const lessonId = L.useLesson().lesson.id
  return (
    <>
      {rewrites.filter((r) => r.lesson === lessonId).map((r) => (
        <div key={r.id} className="crew-in ml-8 rounded-md border border-panel-hairline bg-base-100 p-2 text-xs">
          <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Rewrite')}</p>
          <p className="whitespace-pre-wrap text-panel-label line-through">{r.before}</p>
          <div className="mt-1 space-y-0.5 text-panel-value">
            {r.lines.map((l, i) => <p key={i} className="whitespace-pre-wrap">{l.speaker ? <span className="text-panel-label">{l.speaker}: </span> : null}{l.text}</p>)}
          </div>
          <div className="mt-2 flex gap-1">
            <button type="button" className="btn btn-primary btn-xs" onClick={() => acceptRewrite(r.id)}>{__('Replace')}</button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => dismissRewrite(r.id)}>{__('Keep')}</button>
          </div>
        </div>
      ))}
    </>
  )
}

export function SelectionMenu() {
  const [found, setFound] = useState<Found | null>(null)
  useEffect(() => {
    let dragging = false
    const update = () => { if (!dragging) setFound(readSelection()) }
    const down = (e: MouseEvent) => { if (!(e.target as Element | null)?.closest?.(`[role="menu"][aria-label="${MENU_LABEL}"]`)) { dragging = true; setFound(null) } }
    const up = () => { dragging = false; window.setTimeout(update, 0) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setFound(null) }
    const scroll = () => setFound((f) => (f ? readSelection() : f))
    document.addEventListener('selectionchange', update)
    document.addEventListener('mousedown', down, true)
    document.addEventListener('mouseup', up, true)
    document.addEventListener('keydown', key, true)
    document.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('mousedown', down, true)
      document.removeEventListener('mouseup', up, true)
      document.removeEventListener('keydown', key, true)
      document.removeEventListener('scroll', scroll, true)
    }
  }, [])
  return (
    <>
      <RewriteCards />
      {found && createPortal(<Menu found={found} onDone={() => setFound(null)} />, document.body)}
    </>
  )
}
