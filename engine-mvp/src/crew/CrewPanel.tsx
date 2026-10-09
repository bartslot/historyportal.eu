// The crew panel: the client talks to the set assistant, who brings in the crew. Every face opens that
// person's card (portrait, backstory, "Ask ..."), so the client can see the whole team and talk to anyone.
import { useEffect, useRef, useState } from 'react'
import { Panel } from '../panels/Panel'
import { SettingsSection } from '../ui/kit'
import * as L from '../lesson/store'
import { ASSISTANTS, MEMBERS, chooseAssistant, greeting, send, speaker, talkTo, undo, undoFor, useCrew, type AssistantId } from './store'

const X_MARK = 'M6 18 18 6M6 6l12 12'
const UNDO = 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'
const SIZE = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-24 w-24 text-2xl' } as const

/** A portrait from public/portraits/<id>.webp; the initial while it is missing. */
function Face({ id, size = 'sm' }: { id: string; size?: keyof typeof SIZE }) {
  const { assistant } = useCrew()
  const file = id === 'assistant' ? assistant : id
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [file])
  const { name } = speaker(id)
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-panel-hairline bg-base-100 font-semibold text-panel-label ${SIZE[size]}`}>
      {failed ? name.slice(0, 1) : <img src={`/portraits/${file}.webp`} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />}
    </span>
  )
}

function Card({ id, onClose }: { id: string; onClose: () => void }) {
  const { assistant } = useCrew()
  const isAssistant = id === 'assistant'
  const m = MEMBERS.find((x) => x.id === id)
  const { name, role } = speaker(id)
  const story = isAssistant ? ASSISTANTS[assistant].backstory : m?.backstory
  return (
    <div className="relative mx-3 mb-3 flex flex-col items-center gap-2 rounded-lg border border-panel-hairline bg-base-100 p-4 text-center">
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
      {m && (
        <button type="button" className="btn btn-sm" onClick={() => { talkTo(m.id); onClose() }}>
          Ask {name}
        </button>
      )}
    </div>
  )
}

function Line({ index, who, text, changes }: { index: number; who: string; text: string; changes?: string[] }) {
  useCrew()
  L.useLesson() // the Undo shows only while this line's scene is open
  const canUndo = !!undoFor(index)
  if (who === 'client') {
    return <p className="ml-8 self-end whitespace-pre-wrap rounded-lg bg-base-100 px-3 py-2 text-xs text-panel-value">{text}</p>
  }
  const { name, role } = speaker(who)
  return (
    <div className="flex gap-2">
      <Face id={who} />
      <div className="min-w-0 flex-1">
        <p className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{name} · {role}</p>
        {text && <p className="whitespace-pre-wrap text-xs text-panel-value">{text}</p>}
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
      </div>
    </div>
  )
}

export function CrewPanel() {
  const crew = useCrew()
  const lines = L.useLesson().lesson.crew ?? []
  const [card, setCard] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [lines.length, crew.busy])
  const to = crew.to ? speaker(crew.to).name : null
  const submit = () => { const t = draft; setDraft(''); void send(t) }

  return (
    <Panel id="crew" className="flex h-full flex-col">
      <div className="flex items-center gap-3 py-3 pl-4 pr-10">
        <button type="button" onClick={() => setCard('assistant')} aria-label={`About ${speaker('assistant').name}`}><Face id="assistant" size="md" /></button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-panel-value">{speaker('assistant').name}</p>
          <p className="text-xs text-panel-label">Set assistant</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3" role="list" aria-label="The crew">
        {MEMBERS.map((m) => (
          <button key={m.id} type="button" role="listitem" onClick={() => setCard(m.id)} data-tooltip={`${m.name}, ${m.role}`}
                  aria-label={`${m.name}, ${m.role}`} aria-pressed={card === m.id}>
            <Face id={m.id} />
          </button>
        ))}
      </div>
      {card && <Card id={card} onClose={() => setCard(null)} />}

      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto border-t border-panel-hairline px-4 py-3" aria-live="polite">
        <Line index={-1} who="assistant" text={greeting()} />
        {lines.map((l, i) => <Line key={i} index={i} {...l} />)}
        {crew.busy && <p className="text-xs text-panel-label">{to ?? speaker('assistant').name} is on it…</p>}
        {crew.error && <p role="alert" className="text-xs text-error">{crew.error}</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-panel-hairline px-4 py-3">
        {to && (
          <span className="badge badge-sm gap-1 self-start">
            To {to}
            <button type="button" aria-label="Back to the set assistant" onClick={() => talkTo(null)} className="grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={X_MARK} /></svg>
            </button>
          </span>
        )}
        <textarea rows={3} value={draft} placeholder={to ? `Ask ${to}` : 'Tell the crew what you want'} aria-label="Message to the crew"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation() // typing must not trigger editor shortcuts
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  }}
                  className="textarea textarea-sm w-full border-panel-hairline bg-base-100 text-panel-value" />
        <button type="button" className="btn btn-primary btn-sm" disabled={crew.busy || !draft.trim()} onClick={submit}>Send</button>
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
