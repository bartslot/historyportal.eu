// Typed-out crew text. The stepping is pure (testable); useTypewriter wraps it in a timer.
import { useCallback, useEffect, useRef, useState } from 'react'

export const CHARS_PER_SEC = 45
export const MAX_LAG_SEC = 2 // never further behind the real text than this
export const SENTENCE_PAUSE_MS = 250
export const TICK_MS = 33
const CHUNK_LOOKAHEAD = 6 // a chunk may run this far on to end at a space or punctuation

export type Sim = { shown: number; frac: number; pause: number }
export const START: Sim = { shown: 0, frac: 0, pause: 0 }

const isBreak = (c: string) => /[\s.,;:!?)\]]/.test(c)
const isStop = (t: string, i: number) => /[.?!]/.test(t[i]) && (i + 1 >= t.length || /\s/.test(t[i + 1]))

/** Where `shown` should be when the text changes: kept if the text still starts the same, else the common prefix. */
export function reconcile(sim: Sim, prev: string, next: string): Sim {
  const keep = Math.min(sim.shown, prev.length)
  let i = 0
  while (i < keep && prev[i] === next[i]) i++
  return i === sim.shown ? sim : { shown: i, frac: 0, pause: 0 }
}

/** Advance by `dtMs`: ~45 chars/s, faster when more than 2 s behind, in word-ish chunks, a beat after . ? ! */
export function step(sim: Sim, target: string, dtMs: number): Sim {
  const backlog = target.length - sim.shown
  if (backlog <= 0) return sim
  if (sim.pause > 0) return { ...sim, pause: Math.max(0, sim.pause - dtMs) }
  const rate = Math.max(CHARS_PER_SEC, backlog / MAX_LAG_SEC)
  const frac = sim.frac + (rate * dtMs) / 1000
  const n = Math.floor(frac)
  if (n < 1) return { ...sim, frac } // frac goes negative after a chunk ran on: the debt is paid by waiting
  let end = Math.min(target.length, sim.shown + n)
  const limit = Math.min(target.length, end + CHUNK_LOOKAHEAD)
  while (end < limit && !isBreak(target[end - 1])) end++
  let pause = 0
  for (let i = sim.shown; i < end; i++) {
    if (isStop(target, i)) { end = i + 1; pause = backlog > rate * 2 ? 0 : SENTENCE_PAUSE_MS; break }
  }
  return { shown: end, frac: frac - (end - sim.shown), pause }
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const FINISH_EVENT = 'crew-finish-typing'
/** Complete everything that is typing right now (Esc in the message box). */
export const finishAllTyping = () => window.dispatchEvent(new Event(FINISH_EVENT))

/** `target` revealed as if typed. animate=false (stored or already shown lines) shows it at once. */
export function useTypewriter(target: string, animate: boolean): { shown: string; typing: boolean; finish: () => void } {
  const on = animate && !reducedMotion()
  const sim = useRef<Sim>(on ? START : { ...START, shown: target.length })
  const prev = useRef(target)
  const [, bump] = useState(0)
  if (prev.current !== target) { sim.current = reconcile(sim.current, prev.current, target); prev.current = target }
  if (!on) sim.current = { ...sim.current, shown: target.length }
  const typing = on && sim.current.shown < target.length
  const finish = useCallback(() => { sim.current = { ...START, shown: prev.current.length }; bump((n) => n + 1) }, [])
  useEffect(() => {
    window.addEventListener(FINISH_EVENT, finish)
    return () => window.removeEventListener(FINISH_EVENT, finish)
  }, [finish])
  useEffect(() => {
    if (!typing) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      sim.current = step(sim.current, prev.current, now - last)
      last = now
      bump((n) => n + 1)
      if (sim.current.shown >= prev.current.length) clearInterval(id)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [typing, target])
  return { shown: target.slice(0, sim.current.shown), typing, finish }
}
