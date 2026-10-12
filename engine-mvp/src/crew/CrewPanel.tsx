// The crew panel: the client talks to the set assistant, who brings in the crew. Every face opens that
// person's card (portrait, backstory, "Ask ..."), so the client can see the whole team and talk to anyone.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Panel } from '../panels/Panel'
import * as L from '../lesson/store'
import type { CrewLine } from '../lesson/store'
import { noteCardOpened, useLiveContext } from './context'
import { ASSISTANTS, ASSISTANT_TASKS, MEMBERS, chooseAssistant, interrupt, isFreshRevised, pickChoice, send, speaker, stopAll, stopMember, talkTo, undo, undoFor, useCrew, type AssistantId } from './store'
import type { Live } from './stream'
import type { Sketch } from './stream'
import { SelectionMenu } from './SelectionMenu'
import { TypedView } from './Typed'
import { firstSentence, latestTurnStart } from './turns'
import { finishAllTyping, useTypewriter } from './typewriter'
import { __ } from '../i18n'

/** The roles on screen, by member id (crew.json and the crew keep the English ones). */
const ROLE: Record<string, string> = {
  client: __('Client'), assistant: __('Set assistant'), learning: __('Learning designer'), historian: __('Historian'), writer: __('Writer'),
  comedian: __('Comedian'), actors: __('Actors'), set: __('Set designer'), director: __('Director'),
}
const roleOf = (who: string) => ROLE[who] ?? speaker(who).role

const X_MARK = 'M6 18 18 6M6 6l12 12'
const UNDO = 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'
const SIZE = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-24 w-24 text-2xl' } as const

/** A portrait from public/portraits/<id>.webp; the initial while it is missing. */
export function Face({ id, as, size = 'sm', working }: { id: string; as?: string; size?: keyof typeof SIZE; working?: boolean }) {
  const { assistant } = useCrew()
  const file = id === 'assistant' ? (as && as in ASSISTANTS ? as : assistant) : id
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [file])
  const { name } = speaker(id, as)
  return (
    <span className="relative inline-flex shrink-0">
      <span className={`grid place-items-center overflow-hidden rounded-full border border-panel-hairline bg-base-100 font-semibold text-panel-label ${SIZE[size]}`}>
        {failed ? name.slice(0, 1) : <img src={`/portraits/${file}.webp`} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />}
      </span>
      {working && <span className="status status-info absolute -right-0.5 -top-0.5" data-tooltip={__('Working')} aria-label={__('Working')} />}
    </span>
  )
}

// Three rounded dots in a row (.crew-dot in studio.css); reduced motion pulses them instead.
function Dots() {
  return (
    <span className="mt-1 inline-flex items-center gap-1" role="status" aria-label={__('Working')}>
      {[0, 1, 2].map((i) => <span key={i} className="crew-dot h-1.5 w-1.5 rounded-full bg-base-content" />)}
    </span>
  )
}

const cutTail = (t: string, n = 4000) => (t.length > n ? '…' + t.slice(-n) : t)

/** Text that types itself in while it arrives (animate), a click completes it. */
function Typed({ text, animate = true }: { text: string; animate?: boolean }) {
  const t = useTypewriter(text, animate)
  return <span onClick={t.typing ? t.finish : undefined}><TypedView full={text} shown={t.shown} typing={t.typing} /></span>
}

/** What a member was asked, thought and wrote so far; `live` follows the stream, `saved` is what a line kept. */
function Thoughts({ live, thoughts, draft, open }: { live?: Live; thoughts?: string; draft?: string; open?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const text = live?.thinking ?? thoughts
  const reply = live?.draft ?? draft
  useEffect(() => { if (open) box.current?.scrollTo({ top: box.current.scrollHeight }) }, [open, text, reply, live?.review, live?.jev])
  const label = 'text-3xs font-semibold uppercase tracking-wide text-panel-label'
  return (
    <div ref={box} className="mt-1 max-h-40 space-y-1 overflow-auto rounded border border-panel-hairline p-2 text-xs text-panel-label">
      {live?.asked && <p><span className={label}>{__('Asked')} </span>{live.asked}</p>}
      {text && <p className="whitespace-pre-wrap"><span className={label}>{__('Thinking')} </span>{cutTail(text)}</p>}
      {reply && <p className="whitespace-pre-wrap"><span className={label}>{__('Reply')} </span><Typed text={cutTail(reply)} animate={!!live} /></p>}
      {live?.jev && <p><span className={label}>JEV </span>{live.jev.score.toFixed(2)}, {live.jev.choice}</p>}
      {live && !live.jev && live.draft && <p>{__('JEV checking')}</p>}
      {live?.review ? <p className="whitespace-pre-wrap"><span className={label}>Marten </span>{live.review}</p> : live?.jev ? <p>{__('Marten reviewing')}</p> : null}
      {!text && !reply && !live?.jev && <p>{__('Nothing to show yet.')}</p>}
    </div>
  )
}

/** A member who is working: their "on it" bubble, dots, Stop / Talk to, and the live thought process. */
function WorkingBubble({ who, live, open, onToggle, onTalk }: { who: string; live: Live; open: boolean; onToggle: () => void; onTalk: () => void }) {
  const { name } = speaker(who)
  const role = roleOf(who)
  const step = L.stepOf(L.useLesson().lesson)
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={__('Thought process of :name', { name })} data-tooltip={__('Thought process')}><Face id={who} working /></button>
      <div className="min-w-0 flex-1">
        <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{name} · {role}</p>
        <button type="button" onClick={onToggle} className="block text-left text-xs text-panel-value">{live.ack ? <Typed text={live.ack} /> : __('Working')}</button>
        <Dots />
        {who === 'set' && step === 'script' && <SketchSkeleton />}
        <div className="mt-1 flex gap-1">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => void stopMember(who)}>{__('Stop')}</button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onTalk}>{__('Talk to :name', { name })}</button>
        </div>
        {open && <Thoughts live={live} open />}
      </div>
    </div>
  )
}

function Card({ id, onClose, onAsk }: { id: string; onClose: () => void; onAsk: () => void }) {
  const { assistant } = useCrew()
  const isAssistant = id === 'assistant'
  const m = MEMBERS.find((x) => x.id === id)
  const { name } = speaker(id)
  const role = roleOf(id)
  const story = isAssistant ? ASSISTANTS[assistant].backstory : m?.backstory
  const tasks = isAssistant ? ASSISTANT_TASKS : m?.tasks ?? []
  return (
    <div className="relative mx-3 mb-3 flex max-h-[40vh] shrink-0 flex-col items-center gap-2 overflow-y-auto [&>*]:shrink-0 rounded-md border border-panel-hairline bg-base-100 p-4 text-center">
      <button type="button" aria-label={__('Close card')} data-tooltip={__('Close')} onClick={onClose}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded text-panel-label hover:bg-white/5 hover:text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={X_MARK} /></svg>
      </button>
      <Face id={id} size="lg" />
      <div>
        <p className="text-sm font-semibold text-panel-value">{name}</p>
        <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{role}</p>
      </div>
      <p className="text-xs text-panel-value">{story}</p>
      {tasks.length > 0 && (
        <div className="w-full text-left">
          <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Tasks')}</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-panel-value">{tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {isAssistant && (
        <div className="flex w-full items-center justify-between gap-3 text-left">
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Your set assistant')}</span>
          <div className="join">
            {(Object.keys(ASSISTANTS) as AssistantId[]).map((k) => (
              <button key={k} type="button" aria-pressed={assistant === k} onClick={() => chooseAssistant(k)}
                      className={`btn join-item btn-xs ${assistant === k ? 'btn-active' : 'btn-ghost'}`}>{ASSISTANTS[k].name}</button>
            ))}
          </div>
        </div>
      )}
      {m && (
        <div className="sticky bottom-0 -mb-4 w-full shrink-0 bg-base-100 pb-4 pt-2">
          <button type="button" className="btn btn-sm" onClick={() => { talkTo(m.id); onClose(); onAsk() }}>{__('Ask :name', { name })}</button>
        </div>
      )}
    </div>
  )
}

const CHECK = 'm4.5 12.75 6 6 9-13.5'
const PENCIL = 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10'
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
)
const ROW = 'flex w-full gap-3 border-t border-t-panel-hairline border-l-2 px-3 py-2.5 text-left outline-none'

/** The options of a question, like Claude's picker: one card of rows; arrows move, Enter or 1-4 picks. */
function ChoiceList({ index, choices }: { index: number; choices: NonNullable<CrewLine['choices']> }) {
  const box = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  const [own, setOwn] = useState<string | null>(null) // the "Something else" row is a text input while this is a string
  const buttons = () => [...(box.current?.querySelectorAll<HTMLButtonElement>('button[data-option]') ?? [])]
  useEffect(() => {
    const a = document.activeElement
    if (!a || a === document.body || (a instanceof HTMLTextAreaElement && !a.value)) buttons()[0]?.focus()
  }, [])
  const onKey = (e: React.KeyboardEvent) => {
    if (own !== null) return
    const all = buttons()
    const cur = all.indexOf(document.activeElement as HTMLButtonElement)
    const n = Number(e.key)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation()
      all[(cur + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus()
    } else if (n >= 1 && n <= choices.options.length) {
      e.preventDefault(); e.stopPropagation()
      void pickChoice(index, choices.options[n - 1].label)
    }
  }
  const row = (i: number) => `${ROW} ${at === i ? 'border-l-primary bg-base-200' : 'border-l-transparent hover:bg-base-200'}`
  const elseAt = choices.options.length
  return (
    <div ref={box} role="group" aria-label={choices.question} onKeyDown={onKey} className="crew-in mt-2 overflow-hidden rounded-md border border-panel-hairline">
      <p className="px-3 py-2 text-xs font-semibold text-panel-value">{choices.question}</p>
      {choices.options.map((o, i) => (
        <button key={o.label} type="button" data-option onClick={() => void pickChoice(index, o.label)}
                onFocus={() => setAt(i)} onMouseEnter={() => setAt(i)} className={`${row(i)} items-start`}>
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-panel-hairline text-2xs text-panel-label">{i + 1}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-panel-value">
              {o.label}
              {o.recommended && <span className="rounded border border-primary/40 px-1.5 py-px text-3xs font-semibold uppercase tracking-wide text-primary">{__('Recommended')}</span>}
            </span>
            {o.why && <span className="whitespace-normal text-xs text-panel-label">{o.why}</span>}
          </span>
        </button>
      ))}
      {own === null ? (
        <button type="button" data-option onClick={() => setOwn('')} onFocus={() => setAt(elseAt)} onMouseEnter={() => setAt(elseAt)} className={`${row(elseAt)} items-center text-xs text-panel-label`}>
          <Icon d={PENCIL} />{__('Something else')}
        </button>
      ) : (
        <div className={`${ROW} items-center border-l-primary bg-base-200`}>
          <Icon d={PENCIL} />
          <input autoFocus value={own} placeholder={__('Type your own answer')} aria-label={__('Type your own answer')}
                 onChange={(e) => setOwn(e.target.value)}
                 onKeyDown={(e) => {
                   e.stopPropagation() // typing must not trigger editor shortcuts
                   if (e.key === 'Escape') { e.preventDefault(); setOwn(null) }
                   if (e.key === 'Enter' && own.trim()) { e.preventDefault(); void pickChoice(index, own.trim()) }
                 }}
                 className="min-w-0 flex-1 bg-transparent text-xs text-panel-value outline-none placeholder:text-panel-label" />
        </div>
      )}
    </div>
  )
}

const SKETCH_BOX = 'aspect-video w-full max-w-[220px] rounded border border-panel-hairline'
const LABEL = 'text-3xs font-semibold uppercase tracking-wide text-panel-label'

/** The blockout thumbnail under a line: click to see it larger. */
function SketchThumb({ sketch, onOpen }: { sketch: Sketch; onOpen: () => void }) {
  return (
    <div className="mt-1 max-w-[220px]">
      <button type="button" onClick={onOpen} aria-label={__('Enlarge the blockout')} data-tooltip={__('Enlarge')} className="block w-full">
        <img src={sketch.url} alt={sketch.caption || __('Blockout of the scene')} loading="lazy" className={`${SKETCH_BOX} object-cover`} />
      </button>
      {sketch.caption && <p className="line-clamp-1 text-3xs text-panel-label">{sketch.caption}</p>}
    </div>
  )
}

/** The blockout is being built (Jules works in the Script step). */
function SketchSkeleton() {
  return (
    <div className="mt-1 max-w-[220px]" role="status">
      <div className={`${SKETCH_BOX} skeleton`} />
      <p className="text-3xs text-panel-label">{__('Building the blockout…')}</p>
    </div>
  )
}

/** The blockout larger, inside the panel: X, Esc and the backdrop close it. */
function SketchOverlay({ sketch, onClose }: { sketch: Sketch; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return (
    createPortal(<div className="fixed inset-0 z-50 grid place-items-center bg-base-100/80 p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={__('Blockout')} className="relative max-w-[80vw] rounded-md border border-panel-hairline bg-base-100 p-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label={__('Close')} data-tooltip={__('Close')} onClick={onClose}
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded bg-base-100 text-panel-label hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={X_MARK} /></svg>
        </button>
        <img src={sketch.url} alt={sketch.caption || __('Blockout of the scene')} className="max-h-[75vh] w-auto max-w-full rounded" />
        {sketch.caption && <p className="mt-1 max-w-prose text-xs text-panel-value">{sketch.caption}</p>}
      </div>
    </div>, document.body)
  )
}

const jevTone = (s: number) => (s >= 0.8 ? 'badge-success' : s >= 0.5 ? 'badge-warning' : 'badge-error')
const TOGGLE = 'text-2xs text-panel-label underline-offset-2 hover:text-panel-value hover:underline'

/** A small text toggle that shows or hides a detail; closed by default. */
function Toggle({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-expanded={open} className={`${TOGGLE} ${open ? 'text-panel-value underline' : ''}`}>{label}</button>
}

/** The answer, clamped to four lines with More / Less when it runs longer (the typing keeps working). */
function ClampedText({ typed, text }: { typed: ReturnType<typeof useTypewriter>; text: string }) {
  const el = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [long, setLong] = useState(false)
  useLayoutEffect(() => {
    const p = el.current
    if (p && !expanded) setLong(p.scrollHeight > p.clientHeight + 1)
  }, [typed.shown, expanded])
  return (
    <>
      <p ref={el} className={`whitespace-pre-wrap text-xs text-panel-value ${expanded ? '' : 'line-clamp-4'}`} onClick={typed.typing ? typed.finish : undefined}>
        <TypedView full={text} shown={typed.shown} typing={typed.typing} />
      </p>
      {(long || expanded) && <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className={TOGGLE}>{expanded ? __('Less') : __('More')}</button>}
    </>
  )
}

type LineProps = CrewLine & { index: number; fresh?: boolean; onSketch?: (s: Sketch) => void; sketching?: boolean; active?: boolean; latest?: boolean }

function Line({ index, fresh, active, latest = true, onSketch, sketching, revised, before, sketch, choices, answered, who, as, text, changes, jev, review, thoughts, draft, stopped, error, status, interrupted }: LineProps) {
  useCrew()
  const typed = useTypewriter(text, !!fresh && who !== 'client')
  L.useLesson() // the Undo shows only while this line's scene is open
  const canUndo = !!undoFor(index)
  const [detail, setDetail] = useState<Record<string, boolean>>({})
  const [openOld, setOpenOld] = useState(false) // an earlier turn's line, expanded in place
  const flip = (k: string) => setDetail((d) => ({ ...d, [k]: !d[k] }))
  if (status === 'working') return null // shown live, as a working bubble
  const collapsed = !latest && !openOld
  if (who === 'client') {
    if (index === -1) return null
    return collapsed
      ? <button type="button" onClick={() => setOpenOld(true)} aria-expanded={false} aria-label={__('Your message: :text', { text: firstSentence(text) })} className="ml-8 min-w-0 max-w-full self-end truncate rounded-md bg-base-100 px-3 py-1 text-left text-xs text-panel-label">{text}</button>
      : <button type="button" disabled={latest} onClick={() => setOpenOld(false)} aria-expanded={!latest} className="ml-8 max-w-full self-end whitespace-pre-wrap rounded-md bg-base-100 px-3 py-2 text-left text-xs text-panel-value">{text}</button>
  }
  const { name } = speaker(who, as)
  const role = roleOf(who)
  if (index === -1) { // the greeting: one line
    return (
      <div className="flex gap-2">
        <Face id={who} as={as} />
        <p className="min-w-0 flex-1 self-center truncate text-xs text-panel-value">{text}</p>
      </div>
    )
  }
  if (collapsed) {
    const gist = firstSentence(text)
    return (
      <button type="button" onClick={() => setOpenOld(true)} aria-expanded={false} aria-label={__(':name: :gist. Show the full message', { name, gist })} className="flex w-full items-center gap-2 text-left">
        <Face id={who} as={as} />
        <span className="min-w-0 flex-1 truncate text-xs text-panel-label"><span className="font-semibold">{name}</span> {gist}</span>
      </button>
    )
  }
  const hasThoughts = !!(thoughts || draft)
  const header = `${name} · ${role}`
  return (
    <div className="flex gap-2">
      <Face id={who} as={as} />
      <div className="min-w-0 flex-1">
        {latest
          ? <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{header}</p>
          : <button type="button" onClick={() => setOpenOld(false)} aria-expanded data-tooltip={__('Collapse')} className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{header}</button>}
        {text && <ClampedText typed={typed} text={text} />}
        {revised && <p className={LABEL}>{__("Revised after Marten's note")}</p>}
        {detail.before && before && <p className="mt-1 whitespace-pre-wrap text-xs text-panel-label">{before}</p>}
        {sketch ? <SketchThumb sketch={sketch} onOpen={() => onSketch?.(sketch)} /> : sketching && <SketchSkeleton />}
        {stopped && <p className="text-xs text-panel-label">{__('Stopped')}</p>}
        {interrupted && <p className="text-xs text-panel-label">{__('Interrupted (page reloaded)')}</p>}
        {error && <p role="alert" className="text-xs text-error">{error}</p>}
        {choices && !typed.typing && (answered
          ? <p className="mt-1 flex items-center gap-1.5 text-xs text-panel-label"><Icon d={CHECK} />{__('You chose: :answer', { answer: answered })}</p>
          : active ? <ChoiceList index={index} choices={choices} />
            : <p className="mt-1 text-xs text-panel-label">{__(':question (not answered)', { question: choices.question })}</p>)}
        {(review || (revised && before) || changes || hasThoughts || jev) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {review && <Toggle label={__("Marten's note")} open={!!detail.review} onClick={() => flip('review')} />}
            {revised && before && <Toggle label={__('Before the correction')} open={!!detail.before} onClick={() => flip('before')} />}
            {changes && <Toggle label={__('Changes (:count)', { count: changes.length })} open={!!detail.changes} onClick={() => flip('changes')} />}
            {hasThoughts && <Toggle label={__('Thought process')} open={!!detail.thoughts} onClick={() => flip('thoughts')} />}
            {jev && <span className={`badge badge-xs ${jevTone(jev.score)}`} data-tooltip={__('JEV: chance every historical claim holds')}>JEV {jev.score.toFixed(2)}</span>}
            {changes && canUndo && (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => undo(index)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={UNDO} /></svg>
                {__('Undo')}
              </button>
            )}
          </div>
        )}
        {detail.review && review && (
          <div className="mt-1 flex gap-2 border-l border-panel-hairline pl-2">
            <Face id="director" />
            <div className="min-w-0 flex-1">
              <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">Marten · {ROLE.director}</p>
              <p className="whitespace-pre-wrap text-xs text-panel-value">{review.text}</p>
            </div>
          </div>
        )}
        {detail.changes && changes && <ul className="mt-1 text-2xs text-panel-label">{changes.map((c, i) => <li key={i}>{c}</li>)}</ul>}
        {detail.thoughts && hasThoughts && <Thoughts thoughts={thoughts} draft={draft} />}
      </div>
    </div>
  )
}

export function CrewPanel() {
  const crew = useCrew()
  const lines = L.useLesson().lesson.crew ?? []
  const [card, setCard] = useState<string | null>(null)
  const [zoom, setZoom] = useState<Sketch | null>(null)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const working = Object.entries(crew.live).filter(([, l]) => l.status === 'working')
  const key = (who: string) => `${crew.live[who]?.turn ?? ''}:${who}` // open state belongs to one bubble: a new turn starts closed
  const toggle = (who: string) => setOpen((o) => ({ ...o, [key(who)]: !o[key(who)] }))
  const log = useRef<HTMLDivElement>(null)
  const lessonId = L.useLesson().lesson.id
  const base = useRef({ id: lessonId, n: lines.length }) // lines present when the panel opened are never typed
  if (base.current.id !== lessonId) base.current = { id: lessonId, n: lines.length }
  else if (lines.length < base.current.n) base.current.n = lines.length
  const stick = useRef(true) // follow the typed text unless the reader scrolled up
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) setCard(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card])
  const live = useLiveContext(crew.assistant)
  useEffect(() => { if (card) noteCardOpened(speaker(card).name) }, [card])
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [lines.length, crew.busy, working.length])
  useEffect(() => {
    const el = log.current
    if (!el) return
    const onScroll = () => { stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48 }
    const mo = new MutationObserver(() => { if (stick.current) el.scrollTo({ top: el.scrollHeight }) })
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    el.addEventListener('scroll', onScroll)
    return () => { mo.disconnect(); el.removeEventListener('scroll', onScroll) }
  }, [])
  const turnStart = latestTurnStart(lines)
  const to = crew.to ? speaker(crew.to).name : null
  const submit = () => { const t = draft; setDraft(''); void send(t).then((ok) => { if (!ok) setDraft((d) => d || t) }) }

  return (
    <Panel id="crew" className="relative flex h-full flex-col [&_.btn]:rounded-md">
      <div className="flex items-center gap-2 py-2 pl-4 pr-10">
        <button type="button" onClick={() => setCard('assistant')} aria-label={__('About :name', { name: speaker('assistant').name })}><Face id="assistant" /></button>
        <p className="min-w-0 truncate text-sm font-semibold text-panel-value">
          {speaker('assistant').name} <span className="text-xs font-normal text-panel-label">{ROLE.assistant}</span>
        </p>
      </div>
      <ul className="flex flex-wrap gap-1.5 px-4 pb-2" role="list" aria-label={__('The crew')}>
        {MEMBERS.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => (crew.live[m.id]?.status === 'working' ? toggle(m.id) : setCard(m.id))}
                    data-tooltip={crew.live[m.id]?.status === 'working' ? __(':name, working: thought process', { name: m.name }) : `${m.name}, ${roleOf(m.id)}`}
                    aria-label={`${m.name}, ${roleOf(m.id)}`} aria-pressed={card === m.id}>
              <Face id={m.id} working={crew.live[m.id]?.status === 'working'} />
            </button>
          </li>
        ))}
      </ul>
      {card && <Card id={card} onClose={() => setCard(null)} onAsk={() => box.current?.focus()} />}

      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto border-t border-panel-hairline px-4 py-3" aria-live="polite">
        <Line index={-1} who="assistant" text={live.greeting} />
        {lines.map((l, i) => <Line key={`${i}${l.revised ? 'r' : ''}`} index={i} latest={i >= turnStart} fresh={i >= base.current.n || isFreshRevised(l)} onSketch={setZoom} active={!lines.slice(i + 1).some((x) => x.who === 'client')} {...l} />)}
        <SelectionMenu />
        {working.map(([who, l]) => (
          <WorkingBubble key={who} who={who} live={l} open={!!open[key(who)]} onToggle={() => toggle(who)}
                         onTalk={() => { void interrupt(who); box.current?.focus() }} />
        ))}
        {crew.busy && !working.length && <p className="text-xs text-panel-label">{__(':name is on it…', { name: to ?? speaker('assistant').name })}</p>}
        {crew.error && <p role="alert" className="text-xs text-error">{crew.error}</p>}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-panel-hairline px-3 py-2">
        <p className="flex min-w-0 items-baseline gap-2" data-tooltip={live.tip}>
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Sees')}</span>
          <span className="truncate text-xs text-panel-value">{live.sees}</span>
        </p>
        {to && (
          <span className="badge badge-sm gap-1 self-start">
            {__('To :name', { name: to })}
            <button type="button" aria-label={__('Back to the set assistant')} onClick={() => talkTo(null)} className="grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={X_MARK} /></svg>
            </button>
          </span>
        )}
        <div className="flex items-end gap-1 rounded-md border border-panel-hairline bg-base-100 p-1 focus-within:border-panel-label">
        <textarea ref={box} rows={2} value={draft} placeholder={to ? __('Ask :name', { name: to }) : __('Tell the crew what you want')} aria-label={__('Message to the crew')}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation() // typing must not trigger editor shortcuts
                    if (e.key === 'Escape') { setCard(null); finishAllTyping() }
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  }}
                  className="min-h-0 flex-1 resize-none bg-transparent px-2 py-1 text-xs text-panel-value outline-none placeholder:text-panel-label" />
          {working.length > 0 && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => void stopAll()} data-tooltip={__('Stop all')}>{__('Stop all')}</button>
          )}
          <button type="button" className="btn btn-primary btn-xs btn-square" aria-label={__('Send')} data-tooltip={__('Send')}
                  disabled={(crew.busy && !crew.partial) || !draft.trim()} onClick={submit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
          </button>
        </div>
      </div>

      {zoom && <SketchOverlay sketch={zoom} onClose={() => setZoom(null)} />}
    </Panel>
  )
}
