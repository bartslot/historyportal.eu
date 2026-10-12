// The crew making the first draft, live: who is working, and the script as it lands. Everything shown is
// the real crew stream (crew/store) and the real lesson (lesson/store); nothing here is staged.
import { useEffect, useRef, useState } from 'react'
import { Face } from '../crew/CrewPanel'
import * as Crew from '../crew/store'
import * as L from '../lesson/store'
import { Icon, ICON } from '../ui/icons'
import { openStudio, retry, useStart } from './store'

const LINE_STAGGER_MS = 40
const UNTITLED = 'Untitled lesson'

type Line = { id: string; speaker: string | null; text: string }
type Node = { type?: string; text?: string; attrs?: { id?: string; speaker?: string | null; title?: string }; content?: Node[] }
const textOf = (n: Node): string => n.text ?? (n.content ?? []).map(textOf).join('')

/** The script's spoken lines, in order. Pure. */
export function scriptLines(doc: Node | null): Line[] {
  return (doc?.content ?? [])
    .filter((n) => n.type === 'paragraph' && textOf(n).trim())
    .map((n, i) => ({ id: n.attrs?.id ?? String(i), speaker: n.attrs?.speaker ?? null, text: textOf(n) }))
}

/** Everyone who joined since the client's last message, the set assistant first. */
function members(crew: L.CrewLine[], live: Record<string, unknown>): string[] {
  const from = crew.map((l) => l.who).lastIndexOf('client')
  const who = ['assistant', ...crew.slice(from + 1).map((l) => l.who), ...Object.keys(live)]
  return [...new Set(who.filter((w) => w !== 'client'))]
}

function CrewRow() {
  const { lesson } = L.useLesson()
  const { live, busy } = Crew.useCrew()
  return (
    <ul className="flex flex-wrap justify-center gap-6">
      {members(lesson.crew ?? [], live).map((who) => {
        const working = live[who]?.status === 'working' || (who === 'assistant' && busy && !Object.keys(live).length)
        return (
          <li key={who} className="flex w-24 animate-[crew-in_420ms_var(--ease-enter)_backwards] flex-col items-center gap-2">
            <span className={`transition-opacity duration-300 ease-enter ${working ? '' : 'opacity-60'}`}><Face id={who} size="lg" working={working} /></span>
            <span className="text-xs text-base-content/60">{Crew.speaker(who).name}</span>
          </li>
        )
      })}
    </ul>
  )
}

const joinNames = (n: string[]) => (n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`)

/** One line on what is happening now, from the real crew state: who is working, or who is waiting for you. Pure. */
export function statusLine(busy: boolean, working: string[], asker: string | null, assistant: string): string {
  if (busy) {
    const names = working.length ? working : [assistant]
    return `${joinNames(names)} ${names.length > 1 ? 'are' : 'is'} working`
  }
  return asker ? `${asker} has a question for you` : ''
}

function Status({ asker }: { asker: string | null }) {
  const { busy, live } = Crew.useCrew()
  const working = Object.entries(live).filter(([, l]) => l.status === 'working').map(([who]) => Crew.speaker(who).name)
  const text = statusLine(busy, working, asker, Crew.speaker('assistant').name)
  return <p aria-live="polite" className="min-h-6 text-center text-base-content/60">{text}</p>
}

function Script({ lines }: { lines: Line[] }) {
  if (!lines.length) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        {['80%', '65%', '72%'].map((w) => <span key={w} className="block h-3 rounded-full bg-base-300" style={{ width: w }} />)}
      </div>
    )
  }
  return (
    <ol className="flex flex-col gap-2.5">
      {lines.map((l, i) => (
        <li key={l.id} className="animate-[crew-in_420ms_var(--ease-enter)_backwards] leading-relaxed" style={{ animationDelay: `${i * LINE_STAGGER_MS}ms` }}>
          {l.speaker && <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">{l.speaker}</span>}
          {l.text}
        </li>
      ))}
    </ol>
  )
}

/** The crew's last line when it came after the client's last message: they stopped to ask. */
function openQuestion(crew: L.CrewLine[]): number {
  const at = crew.map((l) => l.who !== 'client' && !!l.text).lastIndexOf(true)
  return at >= 0 && at > crew.map((l) => l.who).lastIndexOf('client') ? at : -1
}

function Footer({ hasScript }: { hasScript: boolean }) {
  const { busy, error } = Crew.useCrew()
  const crew = L.useLesson().lesson.crew ?? []
  if (busy) return <button type="button" className="btn btn-ghost btn-sm rounded-full" onClick={Crew.stopAll}>Stop</button>
  if (hasScript) return <button type="button" className="btn btn-primary rounded-full px-6" onClick={openStudio}>Open the script</button>
  const at = openQuestion(crew)
  if (at >= 0 && !error) return <Question line={crew[at]} index={at} />
  // an error, Stop, or a lost connection: say so (if there is something to say) and offer the way on
  return (
    <div className="flex flex-col items-center gap-4">
      {error && <p role="alert" className="max-w-prose text-center text-error">{error}</p>}
      <div className="flex gap-2">
      <button type="button" className="btn btn-ghost rounded-full" onClick={() => void retry()}>Try again</button>
      <button type="button" className="btn btn-primary rounded-full px-6" onClick={openStudio}>Open the studio</button>
      </div>
    </div>
  )
}

/** The crew stopped to ask: the question, its options, and a box to answer in, right here. */
function Question({ line, index }: { line: L.CrewLine; index: number }) {
  const [reply, setReply] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [index])
  const answer = async (text: string) => { setReply(''); if (!(await Crew.send(text))) setReply(text) }
  return (
    <div ref={box} className="flex w-full animate-[crew-in_420ms_var(--ease-enter)_backwards] flex-col gap-4">
      <div className="flex items-start gap-3">
        <Face id={line.who} as={line.as} size="md" />
        <p className="pt-2 leading-relaxed">{line.text}</p>
      </div>
      {line.choices && !line.answered && (
        <div className="flex flex-wrap gap-2 pl-13">
          {line.choices.options.map((o) => (
            <button key={o.label} type="button" className="btn btn-sm rounded-full border-base-300 bg-base-100 font-normal" onClick={() => void Crew.pickChoice(index, o.label)}>{o.label}</button>
          ))}
        </div>
      )}
      <form className="flex items-center gap-2 rounded-full border border-base-300 bg-base-100 py-1.5 pl-5 pr-1.5"
            onSubmit={(e) => { e.preventDefault(); if (reply.trim()) void answer(reply) }}>
        <input value={reply} onChange={(e) => setReply(e.target.value)} autoFocus aria-label="Your answer" placeholder="Your answer"
               className="min-w-0 flex-1 bg-transparent focus:outline-none" />
        <button type="submit" disabled={!reply.trim()} aria-label="Send" className="btn btn-primary btn-circle btn-sm disabled:opacity-25">
          <Icon d={ICON.arrowUp} className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

export function BuildView() {
  const { lesson } = L.useLesson()
  const { prompt } = useStart()
  const lines = scriptLines(lesson.script)
  const titled = lesson.title && lesson.title !== UNTITLED
  const q = openQuestion(lesson.crew ?? [])
  const asker = q >= 0 && !lines.length ? Crew.speaker(lesson.crew![q].who, lesson.crew![q].as).name : null
  return (
    <main className="mx-auto flex min-h-full max-w-[720px] flex-col gap-12 px-4 pb-16 pt-16">
      <button type="button" onClick={openStudio} aria-label="Open the studio" data-tooltip="Open the studio"
              className="btn btn-ghost btn-circle fixed left-4 top-4"><Icon d={ICON.arrowLeft} className="h-5 w-5" /></button>
      <h1 className={`text-center font-history text-3xl sm:text-4xl ${titled ? 'text-base-content' : 'text-base-content/40'}`}>{titled ? lesson.title : prompt}</h1>
      <div className="flex flex-col items-center gap-4"><CrewRow /><Status asker={asker} /></div>
      <section className="rounded-3xl border border-base-300 bg-base-100 p-6 sm:p-8"><Script lines={lines} /></section>
      <div className="flex justify-center"><Footer hasScript={lines.length > 0} /></div>
    </main>
  )
}
