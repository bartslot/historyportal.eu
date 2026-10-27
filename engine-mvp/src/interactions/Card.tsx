// The interaction card over the held picture: big type for the digibord, flat, one thing to do at a
// time. The teacher runs it: taps what the class answered or chose, ends a talk or a team task, can add
// time or skip. The clock is the planned time (timing.json), shown calmly, never a hard stop.
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

const EXTRA_S = 30
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

function Clock({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex items-center gap-3 text-xl">
      <span className={left > 0 ? 'opacity-70 tabular-nums' : 'text-warning'} data-testid="clock">{left > 0 ? mmss(left) : __('Time is up')}</span>
      <button className="btn btn-ghost btn-sm text-lg" onClick={() => setLeft((l) => Math.max(l, 0) + EXTRA_S)}>{__('+30 s')}</button>
    </div>
  )
}

function Answer({ q, sfx, done }: { q: Quiz; sfx?: (id: string) => void; done: (d: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    sfx?.(isCorrect(q, i) ? 'answer-correct' : 'answer-wrong')
    done(true)
  }
  return (
    <>
      <div className="grid gap-3">
        {q.options.map((o, i) => {
          const tone = picked === null ? 'btn-outline' : isCorrect(q, i) ? 'btn-success' : i === picked ? 'btn-error btn-outline' : 'btn-ghost opacity-50'
          return <button key={i} className={`btn btn-lg h-auto min-h-16 justify-start py-3 text-left text-2xl font-normal ${tone}`} onClick={() => pick(i)}>{o}</button>
        })}
      </div>
      {picked !== null && q.explain && <p className="text-2xl leading-snug">{q.explain}</p>}
    </>
  )
}

function Sort({ q, done }: { q: Quiz; done: (d: boolean) => void }) {
  const [shown, setShown] = useState(false)
  const list = shown ? sortedOptions(q) : q.options
  return (
    <>
      <ol className="grid gap-2 text-2xl">{list.map((o, i) => <li key={o} className="rounded-box bg-base-200 px-4 py-3">{shown ? `${i + 1}. ` : ''}{o}</li>)}</ol>
      {shown ? <p className="text-2xl leading-snug"><span className="font-semibold">{__('This is the right order')}.</span> {q.explain}</p>
        : <button className="btn btn-primary btn-lg self-start text-xl" onClick={() => { setShown(true); done(true) }}>{__('Show the answer')}</button>}
    </>
  )
}

/** Talk in pairs, or a team task: a hint, the clock, and the teacher ends it. */
function Talk({ hint, after, done }: { hint: string; after?: string; done: (d: boolean) => void }) {
  const [over, setOver] = useState(false)
  return (
    <>
      <p className="text-2xl opacity-80">{hint}</p>
      {over ? (after && <p className="text-2xl leading-snug">{after}</p>)
        : <button className="btn btn-primary btn-lg self-start text-xl" onClick={() => { setOver(true); done(true) }}>{__('Done')}</button>}
    </>
  )
}

function Choose({ c, vote, done }: { c: Choice; vote: boolean; done: (d: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <>
      {vote && picked === null && <p className="text-2xl opacity-80">{__('Vote with your hands')}. {__('Tap what the class chose')}.</p>}
      <div className="grid gap-3">
        {c.options.map((o, i) => (
          <button key={i} className={`btn btn-lg h-auto min-h-16 justify-start py-3 text-left text-2xl font-normal ${picked === null ? 'btn-outline' : i === picked ? 'btn-primary' : 'btn-ghost opacity-50'}`}
            onClick={() => { if (picked === null) { setPicked(i); done(true) } }}>{o.text}</button>
        ))}
      </div>
      {picked !== null && <p className="text-2xl leading-snug">{c.options[picked].outcome}{c.history ? ` ${c.history}` : ''}</p>}
    </>
  )
}

function Meter({ m, onPush, sfx, done }: { m: PowerMeter; onPush?: (p: number) => void; sfx?: (id: string) => void; done: (d: boolean) => void }) {
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
    if (next.size === m.right.length) done(true)
  }
  return (
    <>
      <p className="text-2xl opacity-80">{__('Call out the words that help')}.</p>
      <progress className="progress progress-primary h-6 w-full" value={progress} max={1} />
      <div className="flex flex-wrap gap-3">
        {words.map((w) => (
          <button key={w.word} onClick={() => tap(w)}
            className={`btn btn-lg text-2xl font-normal ${hit.has(w.word) ? 'btn-success' : missed.has(w.word) ? 'btn-ghost line-through opacity-50' : 'btn-outline'}`}
            title={missed.has(w.word) ? __('Not this one') : undefined}>{w.word}</button>
        ))}
      </div>
      {progress >= 1 && <p className="text-2xl leading-snug">{m.payoff}</p>}
    </>
  )
}

export function Card({ interaction: it, seconds, onDone, onPush, sfx }: CardProps) {
  const kind = cardKind(it)
  const [finished, setFinished] = useState(false)
  const title = it.type === 'power-meter' ? it.name : it.type === 'quiz' ? it.question : it.prompt
  const body = (() => {
    switch (kind) {
      case 'answer': return <Answer q={it as Quiz} sfx={sfx} done={setFinished} />
      case 'sort': return <Sort q={it as Quiz} done={setFinished} />
      case 'discuss': return <Talk hint={__('Talk it over with your neighbour')} after={(it as Quiz).explain} done={setFinished} />
      case 'team': return <Talk hint={__('Work on it in your group')} after={it.type === 'quiz' ? it.explain : undefined} done={setFinished} />
      case 'choose': return <Choose c={it as Choice} vote={false} done={setFinished} />
      case 'vote': return <Choose c={it as Choice} vote done={setFinished} />
      case 'meter': return <Meter m={it as PowerMeter} onPush={onPush} sfx={sfx} done={setFinished} />
    }
  })()
  return (
    <div className="absolute inset-x-0 bottom-0 flex max-h-full justify-center overflow-y-auto p-6" data-testid="card" data-kind={kind}>
      <section className="flex w-full max-w-4xl flex-col gap-5 rounded-box bg-base-100 p-8 text-base-content">
        <header className="flex items-start justify-between gap-6">
          <h2 className="text-4xl font-semibold leading-tight">{title}</h2>
          <Clock seconds={seconds} />
        </header>
        {it.type === 'power-meter' && <p className="text-2xl leading-snug">{it.prompt}</p>}
        {body}
        <footer className="flex justify-end gap-3">
          {!finished && <button className="btn btn-ghost btn-lg text-xl" onClick={onDone}>{__('Skip')}</button>}
          {finished && <button className="btn btn-primary btn-lg text-xl" onClick={onDone}>{__('Next')}</button>}
        </footer>
      </section>
    </div>
  )
}
