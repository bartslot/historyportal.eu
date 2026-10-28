// The interaction card over the held picture: big type for the digibord, flat, one thing to do at a
// time. The teacher runs it: taps what the class answered or chose, ends a talk or a team task, can add
// time or skip. The clock is the planned time (timing.json), shown calmly, never a hard stop.
// Type scales with the frame (container units on #wrap, like the captions), and every action the
// teacher needs (show the answer, done, next, skip) sits in the footer, which never scrolls away.
import { useEffect, useState } from 'react'
import { __ } from '../i18n'
import { cardKind, isCorrect, meterWords, sortedOptions, type Choice, type Interaction, type PowerMeter, type Quiz } from './plan'

export type CardProps = {
  interaction: Interaction
  seconds: number
  onDone: () => void
  /** a power meter's progress, 0..1, each time a right word lands */
  onPush?: (progress: number) => void
  sfx?: (id: string) => void
}

// sizes follow the frame width (cqw of #wrap), from a readable floor up, with no ceiling that would
// shrink them on a 4K board: about 30 / 20 / 17 px at 1280, 45 / 31 / 26 at 1920, 90 / 61 / 52 at 3840
// --k: the card's text density (1 = roomy); a card that simply holds more words steps down a little,
// never below the readable floor (15 px body, 20 px title)
const T_TITLE = 'text-[clamp(20px,calc(2.35cqw*var(--k,1)),160px)]'
const T_TITLE_LONG = 'text-[clamp(18px,calc(1.95cqw*var(--k,1)),140px)]'
const T_BODY = 'text-[clamp(15px,calc(1.6cqw*var(--k,1)),110px)]'
const T_SMALL = 'text-[clamp(13px,1.35cqw,90px)]'
/** Text density from the characters on the card: 1 up to ~220 characters, then a little smaller per
 *  extra line's worth, never below 0.72 (the vault's longest question + explanation stays readable). */
export const density = (chars: number): number => Math.min(1, Math.max(0.72, 1 - Math.max(0, chars - 220) / 600))
/** More than `max` items, or four or more long ones, go into two columns before the card would ever
 *  scroll (PM); so the type never has to drop below its floor to fit. */
const listCols = (n: number, max = 4, chars = 0) => (n > max || (n >= 4 && chars > 140) ? 'grid-cols-2' : 'grid-cols-1')
const BTN = `btn h-auto min-h-[2.4em] py-[0.35em] ${T_BODY}`

const EXTRA_S = 30
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

function Clock({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className={`flex items-center gap-3 ${T_SMALL}`}>
      <span className={left > 0 ? 'opacity-70 tabular-nums' : 'text-warning'} data-testid="clock">{left > 0 ? mmss(left) : __('Time is up')}</span>
      <button className={`btn btn-ghost h-auto min-h-[2em] py-[0.2em] ${T_SMALL}`} onClick={() => setLeft((l) => Math.max(l, 0) + EXTRA_S)}>{__('+30 s')}</button>
    </div>
  )
}

function Answer({ q, sfx, done }: { q: Quiz; sfx?: (id: string) => void; done: (note?: string) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const graded = q.correct !== null && q.correct !== undefined // correct: null = no right answer, nothing marked wrong
  const kept = q.options.filter((_, i) => i === picked || (graded && isCorrect(q, i))).length // what stays after the tap
  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (graded) sfx?.(isCorrect(q, i) ? 'answer-correct' : 'answer-wrong')
    done(q.explain)
  }
  return (
    <>
      {/* after the tap only the right answer and the class's pick stay, so the explanation is in view (checker L4) */}
      <div className={`grid gap-2 ${picked === null ? listCols(q.options.length, 4, q.options.join('').length) : listCols(kept, 2)}`} data-testid="options">
        {q.options.map((o, i) => {
          if (picked !== null && i !== picked && !(graded && isCorrect(q, i))) return null
          const tone = picked === null ? 'btn-outline' : !graded ? 'btn-primary' : isCorrect(q, i) ? 'btn-success' : 'btn-error btn-outline'
          return <button key={i} className={`${BTN} justify-start text-left font-normal ${tone}`} onClick={() => pick(i)}>{o}</button>
        })}
      </div>
    </>
  )
}

/** Sort: the steps as the class sees them; the footer's "show the answer" turns them into the right order. */
function Sort({ q, shown }: { q: Quiz; shown: boolean }) {
  const list = shown ? sortedOptions(q) : q.options
  return (
    <>
      <ol className={`grid gap-1.5 ${listCols(list.length, 3)} ${T_BODY}`} data-testid="options">
        {list.map((o, i) => <li key={o} className="rounded-box bg-base-200 px-3 py-1.5">{shown ? `${i + 1}. ` : ''}{o}</li>)}
      </ol>
    </>
  )
}

/** Talk in pairs, or a team task: a hint and the clock; the footer's "done" ends it (and its follow-up
 *  text goes under the question, like every explanation). */
function Talk({ hint, over }: { hint: string; over: boolean }) {
  return over ? null : <p className={`${T_BODY} opacity-80`}>{hint}</p>
}

function Choose({ c, vote, done }: { c: Choice; vote: boolean; done: (note?: string) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <>
      {vote && picked === null && <p className={`${T_BODY} opacity-80`}>{__('Vote with your hands')}. {__('Tap what the class chose')}.</p>}
      {/* after the tap only the class's choice stays, with what came of it (checker L4) */}
      <div className={`grid gap-2 ${picked === null ? listCols(c.options.length, 4, c.options.map((o) => o.text).join('').length) : 'grid-cols-1'}`} data-testid="options">
        {c.options.map((o, i) => (picked !== null && i !== picked ? null : (
          <button key={i} className={`${BTN} justify-start text-left font-normal ${picked === null ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => { if (picked === null) { setPicked(i); done(`${o.outcome}${c.history ? ` ${c.history}` : ''}`) } }}>{o.text}</button>
        )))}
      </div>
    </>
  )
}

function Meter({ m, onPush, sfx, done }: { m: PowerMeter; onPush?: (p: number) => void; sfx?: (id: string) => void; done: (note?: string) => void }) {
  const words = meterWords(m)
  const [hit, setHit] = useState<Set<string>>(new Set())
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const progress = hit.size / m.right.length
  const tap = (w: { word: string; right: boolean }) => {
    if (hit.has(w.word) || missed.has(w.word)) return
    if (!w.right) { setMissed(new Set(missed).add(w.word)); return }
    const next = new Set(hit).add(w.word)
    setHit(next)
    sfx?.('meter-rise')
    onPush?.(next.size / m.right.length)
    if (next.size === m.right.length) done(m.payoff)
  }
  return (
    <>
      {!m.prompt && <p className={`${T_BODY} opacity-80`}>{__('Call out the words that help')}.</p>}
      <progress className="progress progress-primary h-[0.9em] w-full" value={progress} max={1} />
      <div className="flex flex-wrap gap-2" data-testid="options">
        {/* once the meter is full only the right words stay, like an answer card after the tap */}
        {words.filter((w) => progress < 1 || hit.has(w.word)).map((w) => (
          <button key={w.word} onClick={() => tap(w)}
            className={`${BTN} font-normal ${hit.has(w.word) ? 'btn-success' : missed.has(w.word) ? 'btn-ghost line-through opacity-50' : 'btn-outline'}`}
            title={missed.has(w.word) ? __('Not this one') : undefined}>{w.word}</button>
        ))}
      </div>
    </>
  )
}

export function Card({ interaction: it, seconds, onDone, onPush, sfx }: CardProps) {
  const kind = cardKind(it)
  const [finished, setFinished] = useState(false)
  // what the class learns once it has answered (an explanation, a choice's outcome): it goes under the
  // question, the column with room, never into the clipped answer column (checker L5)
  const [note, setNote] = useState<string | null>(null)
  const finish = (text?: string) => { setFinished(true); if (text) setNote(text) }
  const title = it.type === 'power-meter' ? it.name : it.type === 'quiz' ? it.question : it.prompt
  const body = (() => {
    switch (kind) {
      case 'answer': return <Answer q={it as Quiz} sfx={sfx} done={finish} />
      case 'sort': return <Sort q={it as Quiz} shown={finished} />
      case 'discuss': return <Talk hint={__('Talk it over with your neighbour')} over={finished} />
      case 'team': return <Talk hint={__('Work on it in your group')} over={finished} />
      case 'choose': return <Choose c={it as Choice} vote={false} done={finish} />
      case 'vote': return <Choose c={it as Choice} vote done={finish} />
      case 'meter': return <Meter m={it as PowerMeter} onPush={onPush} sfx={sfx} done={finish} />
    }
  })()
  // the card's own step, in the footer so it never scrolls out of view (checker L2)
  const step = kind === 'sort' ? __('Show the answer') : kind === 'discuss' || kind === 'team' ? __('Done') : null
  const sortNote = kind === 'sort' && finished ? `${__('This is the right order')}. ${(it as Quiz).explain ?? ''}` : null
  const shownNote = note ?? sortNote
  const optionText = it.type === 'power-meter' ? `${it.prompt} ${[...it.right, ...it.wrong].join(' ')}`
    : it.type === 'quiz' ? it.options.join(' ') : it.options.map((o) => o.text).join(' ')
  // counted as shown: before the answer the options; after it the note, plus what stays of the options
  const k = density(title.length + (shownNote ? shownNote.length + (kind === 'meter' ? it.type === 'power-meter' ? it.right.join(' ').length : 0 : 60) : optionText.length))
  const footer = (
    <footer className="flex justify-end gap-3">
      {!finished && <button className={`btn btn-ghost h-auto min-h-[2.4em] ${T_BODY}`} onClick={onDone}>{__('Skip')}</button>}
      {!finished && step && <button className={`btn btn-primary h-auto min-h-[2.4em] ${T_BODY}`} onClick={() => finish(kind === 'sort' ? undefined : it.type === 'quiz' ? it.explain : undefined)}>{step}</button>}
      {finished && <button className={`btn btn-primary h-auto min-h-[2.4em] ${T_BODY}`} onClick={onDone}>{__('Next')}</button>}
    </footer>
  )
  const hasBody = !(shownNote && (kind === 'discuss' || kind === 'team'))
  // the lower 45 % of the frame at most: the held picture (the world the class moves) stays in view above.
  // Asking: question left, answers right. Answered (checker L5): the question across the top, smaller,
  // then what stays of the answers and, in the wider column, what the class learns from it.
  // ONE tree whose grid areas change: the answers never remount, so the class's pick stays marked.
  const grid: React.CSSProperties = !shownNote
    ? { gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.1fr)', gridTemplateRows: 'minmax(0,1fr) auto', gridTemplateAreas: '"head body" "head foot"' }
    : hasBody
      ? { gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.15fr)', gridTemplateRows: 'auto minmax(0,1fr) auto', gridTemplateAreas: '"head head" "body note" "foot foot"' }
      : { gridTemplateColumns: 'minmax(0,1fr)', gridTemplateRows: 'auto minmax(0,1fr) auto', gridTemplateAreas: '"head" "note" "foot"' }
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-[45%] justify-center px-[1.2cqw] pb-[1.2cqw]" data-testid="card" data-kind={kind}>
      <section style={{ '--k': k, ...grid } as React.CSSProperties}
        className="grid h-full w-full max-w-[92cqw] gap-x-[2cqw] gap-y-[1cqw] overflow-hidden rounded-box bg-base-100 p-[1.8cqw] text-base-content">
        <div style={{ gridArea: 'head' }} className={`flex min-h-0 gap-2 overflow-y-auto ${shownNote ? 'flex-row-reverse items-start justify-between' : 'flex-col'}`}>
          <div className="shrink-0"><Clock seconds={seconds} /></div>
          <div className="flex flex-col gap-2">
            <h2 className={`${shownNote ? T_BODY : title.length > 110 ? T_TITLE_LONG : T_TITLE} font-semibold leading-tight`}>{title}</h2>
            {it.type === 'power-meter' && !shownNote && <p className={`${T_BODY} leading-snug`}>{it.prompt}</p>}
          </div>
        </div>
        <div style={{ gridArea: 'body', display: hasBody ? undefined : 'none' }} className="flex min-h-0 flex-col gap-2 overflow-y-auto">{body}</div>
        {shownNote && <p style={{ gridArea: 'note' }} className={`${T_BODY} min-h-0 overflow-y-auto leading-snug`} data-testid="note">{shownNote}</p>}
        <div style={{ gridArea: 'foot' }}>{footer}</div>
      </section>
    </div>
  )
}
