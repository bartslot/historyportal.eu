// The crew panel: the client talks to the set assistant, who brings in the crew. Every face opens that
// person's card (portrait, backstory, "Ask ..."), so the client can see the whole team and talk to anyone.
import { useEffect, useRef, useState } from 'react'
import { Panel } from '../panels/Panel'
import { SettingsSection } from '../ui/kit'
import * as L from '../lesson/store'
import type { CrewLine } from '../lesson/store'
import { noteCardOpened, useLiveContext } from './context'
import { ASSISTANTS, ASSISTANT_TASKS, MEMBERS, chooseAssistant, interrupt, pickChoice, send, speaker, stopAll, stopMember, talkTo, undo, undoFor, useCrew, type AssistantId } from './store'
import type { Live } from './stream'

const X_MARK = 'M6 18 18 6M6 6l12 12'
const UNDO = 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'
const SIZE = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-24 w-24 text-2xl' } as const

/** A portrait from public/portraits/<id>.webp; the initial while it is missing. */
function Face({ id, as, size = 'sm', working }: { id: string; as?: string; size?: keyof typeof SIZE; working?: boolean }) {
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
      {working && <span className="status status-info absolute -right-0.5 -top-0.5" data-tooltip="Working" aria-label="Working" />}
    </span>
  )
}

// Three rounded dots in a row (.crew-dot in studio.css); reduced motion pulses them instead.
function Dots() {
  return (
    <span className="mt-1 inline-flex items-center gap-1" role="status" aria-label="Working">
      {[0, 1, 2].map((i) => <span key={i} className="crew-dot h-1.5 w-1.5 rounded-full bg-base-content" />)}
    </span>
  )
}

const cutTail = (t: string, n = 4000) => (t.length > n ? '…' + t.slice(-n) : t)

/** What a member was asked, thought and wrote so far; `live` follows the stream, `saved` is what a line kept. */
function Thoughts({ live, thoughts, draft, open }: { live?: Live; thoughts?: string; draft?: string; open?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const text = live?.thinking ?? thoughts
  const reply = live?.draft ?? draft
  useEffect(() => { if (open) box.current?.scrollTo({ top: box.current.scrollHeight }) }, [open, text, reply, live?.review, live?.jev])
  const label = 'text-3xs font-semibold uppercase tracking-wide text-panel-label'
  return (
    <div ref={box} className="mt-1 max-h-40 space-y-1 overflow-auto rounded border border-panel-hairline p-2 text-xs text-panel-label">
      {live?.asked && <p><span className={label}>Asked </span>{live.asked}</p>}
      {text && <p className="whitespace-pre-wrap"><span className={label}>Thinking </span>{cutTail(text)}</p>}
      {reply && <p className="whitespace-pre-wrap"><span className={label}>Reply </span>{cutTail(reply)}</p>}
      {live?.jev && <p><span className={label}>JEV </span>{live.jev.score.toFixed(2)}, {live.jev.choice}</p>}
      {live && !live.jev && live.draft && <p>JEV checking</p>}
      {live?.review ? <p className="whitespace-pre-wrap"><span className={label}>Marten </span>{live.review}</p> : live?.jev ? <p>Marten reviewing</p> : null}
      {!text && !reply && !live?.jev && <p>Nothing to show yet.</p>}
    </div>
  )
}

/** A member who is working: their "on it" bubble, dots, Stop / Talk to, and the live thought process. */
function WorkingBubble({ who, live, open, onToggle, onTalk }: { who: string; live: Live; open: boolean; onToggle: () => void; onTalk: () => void }) {
  const { name, role } = speaker(who)
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Thought process of ${name}`} data-tooltip="Thought process"><Face id={who} working /></button>
      <div className="min-w-0 flex-1">
        <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{name} · {role}</p>
        <button type="button" onClick={onToggle} className="block text-left text-xs text-panel-value">{live.ack || 'Working'}</button>
        <Dots />
        <div className="mt-1 flex gap-1">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => void stopMember(who)}>Stop</button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onTalk}>Talk to {name}</button>
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
  const { name, role } = speaker(id)
  const story = isAssistant ? ASSISTANTS[assistant].backstory : m?.backstory
  const tasks = isAssistant ? ASSISTANT_TASKS : m?.tasks ?? []
  return (
    <div className="relative mx-3 mb-3 flex max-h-[40vh] shrink-0 flex-col items-center gap-2 overflow-y-auto [&>*]:shrink-0 rounded-lg border border-panel-hairline bg-base-100 p-4 text-center">
      <button type="button" aria-label="Close card" data-tooltip="Close" onClick={onClose}
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
          <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">Tasks</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-panel-value">{tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {m && (
        <div className="sticky bottom-0 -mb-4 w-full shrink-0 bg-base-100 pb-4 pt-2">
          <button type="button" className="btn btn-sm" onClick={() => { talkTo(m.id); onClose(); onAsk() }}>Ask {name}</button>
        </div>
      )}
    </div>
  )
}

/** The options of a question, like Claude's picker: arrows move, Enter or 1-4 picks. */
function ChoiceList({ index, choices, onElse }: { index: number; choices: NonNullable<CrewLine['choices']>; onElse: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const buttons = () => [...(box.current?.querySelectorAll<HTMLButtonElement>('button[data-option]') ?? [])]
  useEffect(() => {
    const a = document.activeElement
    if (!a || a === document.body || (a instanceof HTMLTextAreaElement && !a.value)) buttons()[0]?.focus()
  }, [])
  const onKey = (e: React.KeyboardEvent) => {
    const all = buttons()
    const at = all.indexOf(document.activeElement as HTMLButtonElement)
    const n = Number(e.key)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation()
      all[(at + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus()
    } else if (n >= 1 && n <= choices.options.length) {
      e.preventDefault(); e.stopPropagation()
      void pickChoice(index, choices.options[n - 1].label)
    }
  }
  return (
    <div ref={box} role="group" aria-label={choices.question} onKeyDown={onKey} className="mt-2 flex flex-col gap-1.5">
      <p className="text-xs text-panel-value">{choices.question}</p>
      {choices.options.map((o, i) => (
        <button key={o.label} type="button" data-option onClick={() => void pickChoice(index, o.label)}
                className="btn btn-sm h-auto w-full justify-start py-2 text-left">
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="flex items-center gap-2 text-xs font-semibold text-panel-value">
              <span className="text-panel-label">{i + 1}</span>{o.label}
              {o.recommended && <span className="badge badge-xs">Recommended</span>}
            </span>
            {o.why && <span className="whitespace-normal text-xs font-normal text-panel-label">{o.why}</span>}
          </span>
        </button>
      ))}
      <button type="button" className="btn btn-ghost btn-sm justify-start" onClick={onElse}>Something else</button>
    </div>
  )
}

const jevTone = (s: number) => (s >= 0.8 ? 'badge-success' : s >= 0.5 ? 'badge-warning' : 'badge-error')

function Line({ index, active, onElse, choices, answered, who, as, text, changes, jev, review, thoughts, draft, stopped, error, status, interrupted }: { index: number; active?: boolean; onElse?: () => void; choices?: CrewLine['choices']; answered?: string; who: string; as?: string; text: string; changes?: string[]; jev?: CrewLine['jev']; review?: CrewLine['review']; thoughts?: string; draft?: string; stopped?: boolean; error?: string; status?: 'working'; interrupted?: boolean; turn?: string | number }) {
  useCrew()
  L.useLesson() // the Undo shows only while this line's scene is open
  const canUndo = !!undoFor(index)
  if (status === 'working') return null // shown live, as a working bubble
  if (who === 'client') {
    return <p className="ml-8 self-end whitespace-pre-wrap rounded-lg bg-base-100 px-3 py-2 text-xs text-panel-value">{text}</p>
  }
  const { name, role } = speaker(who, as)
  return (
    <div className="flex gap-2">
      <Face id={who} as={as} />
      <div className="min-w-0 flex-1">
        <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{name} · {role}</p>
        {text && <p className="whitespace-pre-wrap text-xs text-panel-value">{text}</p>}
        {stopped && <p className="text-xs text-panel-label">Stopped</p>}
        {interrupted && <p className="text-xs text-panel-label">Interrupted (page reloaded)</p>}
        {error && <p role="alert" className="text-xs text-error">{error}</p>}
        {jev && (
          <span className={`badge badge-xs mt-1 ${jevTone(jev.score)}`} data-tooltip="JEV: chance every historical claim holds">JEV {jev.score.toFixed(2)}</span>
        )}
        {review && (
          <div className="mt-1 flex gap-2 border-l border-panel-hairline pl-2">
            <Face id="director" />
            <div className="min-w-0 flex-1">
              <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">Marten · Director</p>
              <p className="whitespace-pre-wrap text-xs text-panel-value">{review.text}</p>
            </div>
          </div>
        )}
        {choices && (answered
          ? <p className="mt-1 text-xs text-panel-label">You chose: {answered}</p>
          : active ? <ChoiceList index={index} choices={choices} onElse={onElse ?? (() => {})} />
            : <p className="mt-1 text-xs text-panel-label">{choices.question} (not answered)</p>)}
        {changes && (
          <div className="mt-1 flex items-start gap-2">
            <ul className="flex-1 text-2xs text-panel-label">{changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
            {canUndo && (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => undo(index)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={UNDO} /></svg>
                Undo
              </button>
            )}
          </div>
        )}
        {(thoughts || draft) && (
          <details className="mt-1">
            <summary className="cursor-pointer text-2xs text-panel-label">Thought process</summary>
            <Thoughts thoughts={thoughts} draft={draft} />
          </details>
        )}
      </div>
    </div>
  )
}

export function CrewPanel() {
  const crew = useCrew()
  const lines = L.useLesson().lesson.crew ?? []
  const [card, setCard] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const working = Object.entries(crew.live).filter(([, l]) => l.status === 'working')
  const key = (who: string) => `${crew.live[who]?.turn ?? ''}:${who}` // open state belongs to one bubble: a new turn starts closed
  const toggle = (who: string) => setOpen((o) => ({ ...o, [key(who)]: !o[key(who)] }))
  const log = useRef<HTMLDivElement>(null)
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
  const to = crew.to ? speaker(crew.to).name : null
  const submit = () => { const t = draft; setDraft(''); void send(t).then((ok) => { if (!ok) setDraft((d) => d || t) }) }

  return (
    <Panel id="crew" className="flex h-full flex-col">
      <div className="flex items-center gap-3 py-3 pl-4 pr-10">
        <button type="button" onClick={() => setCard('assistant')} aria-label={`About ${speaker('assistant').name}`}><Face id="assistant" size="md" /></button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-panel-value">{speaker('assistant').name}</p>
          <p className="text-xs text-panel-label">Set assistant</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5 px-4 pb-3" role="list" aria-label="The crew">
        {MEMBERS.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => (crew.live[m.id]?.status === 'working' ? toggle(m.id) : setCard(m.id))}
                    data-tooltip={crew.live[m.id]?.status === 'working' ? `${m.name}, working: thought process` : `${m.name}, ${m.role}`}
                    aria-label={`${m.name}, ${m.role}`} aria-pressed={card === m.id}>
              <Face id={m.id} working={crew.live[m.id]?.status === 'working'} />
            </button>
          </li>
        ))}
      </ul>
      {card && <Card id={card} onClose={() => setCard(null)} onAsk={() => box.current?.focus()} />}

      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto border-t border-panel-hairline px-4 py-3" aria-live="polite">
        <Line index={-1} who="assistant" text={live.greeting} />
        {lines.map((l, i) => <Line key={i} index={i} active={!lines.slice(i + 1).some((x) => x.who === 'client')} onElse={() => box.current?.focus()} {...l} />)}
        {working.map(([who, l]) => (
          <WorkingBubble key={who} who={who} live={l} open={!!open[key(who)]} onToggle={() => toggle(who)}
                         onTalk={() => { void interrupt(who); box.current?.focus() }} />
        ))}
        {crew.busy && !working.length && <p className="text-xs text-panel-label">{to ?? speaker('assistant').name} is on it…</p>}
        {crew.error && <p role="alert" className="text-xs text-error">{crew.error}</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-panel-hairline px-4 py-3">
        <p className="flex min-w-0 items-baseline gap-2" data-tooltip={live.tip}>
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">Sees</span>
          <span className="truncate text-xs text-panel-value">{live.sees}</span>
        </p>
        {to && (
          <span className="badge badge-sm gap-1 self-start">
            To {to}
            <button type="button" aria-label="Back to the set assistant" onClick={() => talkTo(null)} className="grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={X_MARK} /></svg>
            </button>
          </span>
        )}
        <textarea ref={box} rows={3} value={draft} placeholder={to ? `Ask ${to}` : 'Tell the crew what you want'} aria-label="Message to the crew"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation() // typing must not trigger editor shortcuts
                    if (e.key === 'Escape') setCard(null)
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  }}
                  className="textarea textarea-sm w-full border-panel-hairline bg-base-100 text-panel-value" />
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary btn-sm flex-1" disabled={(crew.busy && !crew.partial) || !draft.trim()} onClick={submit}>Send</button>
          {working.length > 0 && <button type="button" className="btn btn-sm" onClick={() => void stopAll()}>Stop all</button>}
        </div>
      </div>

      <SettingsSection title="Settings" open={false} name="crew-settings">
        <div className="flex items-center justify-between gap-3">
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">Set assistant</span>
          <div className="join">
            {(Object.keys(ASSISTANTS) as AssistantId[]).map((id) => (
              <button key={id} type="button" aria-pressed={crew.assistant === id} onClick={() => chooseAssistant(id)}
                      className={`btn join-item btn-xs ${crew.assistant === id ? 'btn-active' : 'btn-ghost'}`}>{ASSISTANTS[id].name}</button>
            ))}
          </div>
        </div>
      </SettingsSection>
    </Panel>
  )
}
