// How a lesson gets made, in four steps that play themselves: no body text, the motion explains.
// Every element enters with .reveal (studio.css: opacity + 8px rise + 4px blur on --ease-enter).
// The loop runs only while on screen and the tab is visible; reduced motion starts paused on each
// step's finished picture, and the step buttons still switch.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, ICON } from '../ui/icons'
import { __ } from '../i18n'

const STEPS = [__('Describe'), __('Check the story'), __('Direct'), __('Play in class')] as const
const STEP_MS = 4200
const TYPED = __('Abel Tasman sails south in 1642')
const TYPE_FROM = 300
const MS_PER_CHAR = 45
const MAX_FRAME_MS = 100

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function useLoop() {
  const [step, setStep] = useState(0)
  const [prev, setPrev] = useState(-1) // the scene fading out keeps its last frame, so the stage is never empty
  const stepRef = useRef(0)
  const show = (i: number) => { if (i === stepRef.current) return; setPrev(stepRef.current); stepRef.current = i; setStep(i) }
  const [t, setT] = useState(() => (reduced() ? STEP_MS : 0))
  const [paused, setPaused] = useState(reduced)
  const [visible, setVisible] = useState(true)
  const root = useRef<HTMLElement>(null)
  const tRef = useRef(t)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 })
    if (root.current) io.observe(root.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (paused || !visible) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const next = tRef.current + Math.min(now - last, MAX_FRAME_MS) // back from a hidden tab: no skipped step
      last = now
      if (next < STEP_MS) setT((tRef.current = next))
      else { setT((tRef.current = 0)); show((stepRef.current + 1) % STEPS.length) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, visible])

  const go = (i: number) => { show(i); setT((tRef.current = paused ? STEP_MS : 0)) }
  return { root, step, prev, t, paused, setPaused, go }
}

const Reveal = ({ on, className = '', children }: { on: boolean; className?: string; children?: ReactNode }) =>
  <div className={`reveal ${className}`} data-on={on}>{children}</div>

const Bar = ({ w }: { w: string }) => <span className="block h-2 rounded-full bg-base-300" style={{ width: w }} />

/** The teacher's pointer: rests at `at` (% of the scene), travels in from `from` (px offset) once `on`. */
function Cursor({ at, from, on, pressed = false }: { at: [string, string]; from: [number, number]; on: boolean; pressed?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute z-10 h-6 w-6 transition-transform duration-700 ease-move"
         style={{ left: at[0], top: at[1], transform: `${on ? 'translate(0, 0)' : `translate(${from[0]}px, ${from[1]}px)`} scale(${pressed ? 0.85 : 1})` }}>
      <path d="M5 3l14 7-6 2-2 6z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function Describe({ t }: { t: number }) {
  const typed = TYPED.slice(0, Math.max(0, Math.floor((t - TYPE_FROM) / MS_PER_CHAR)))
  const done = typed.length === TYPED.length
  const pressed = t > 3000 && t < 3160
  return (
    <div className="grid h-full place-items-center">
      <div className="relative w-[78%] rounded-2xl border border-base-300 bg-base-100 p-4">
        <p className="h-12 text-lg">{typed}<span className="ml-px inline-block h-5 w-px translate-y-1 bg-base-content" /></p>
        <div className="flex items-center gap-2">
          <span className="flex h-8 items-center gap-1.5 rounded-full border border-base-300 px-3 text-xs"><Icon d={ICON.book} className="h-4 w-4" />{__('Story driven')}</span>
          <span className={`ml-auto grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-content transition-[opacity,transform] duration-150 ease-enter ${done ? '' : 'opacity-25'} ${pressed ? 'scale-90' : ''}`}>
            <Icon d={ICON.arrowUp} className="h-4 w-4" />
          </span>
        </div>
        <Cursor at={['calc(100% - 30px)', 'calc(100% - 14px)']} from={[-140, 60]} on={t > 2300} pressed={pressed} />
      </div>
    </div>
  )
}

/** The teacher reads the crew's script, changes one line, and every line gets its tick. */
function Check({ t }: { t: number }) {
  const rows = [['sofie', '70%'], ['historian', '55%'], ['writer', '80%'], ['learning', '45%']] as const
  const editing = t > 1500 && t < 2300
  const edited = t > 1900
  return (
    <div className="grid h-full place-items-center">
      <div className="relative flex w-[70%] flex-col gap-3">
        {rows.map(([who, w], i) => (
          <Reveal key={who} on={t > 300 + i * 160}
                  className={`flex items-center gap-3 rounded-xl border bg-base-100 p-3 transition-colors duration-200 ease-enter ${i === 1 && editing ? 'border-primary' : 'border-base-300'}`}>
            <img src={`/portraits/${who}.webp`} alt="" className="h-8 w-8 rounded-full object-cover" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="block h-2 rounded-full bg-base-300 transition-[width] duration-500 ease-move" style={{ width: i === 1 && edited ? '85%' : w }} />
              <Bar w="35%" />
            </span>
            <span className={`grid h-6 w-6 place-items-center rounded-full bg-success text-success-content transition-[opacity,transform] duration-200 ease-enter ${t > 2500 + i * 200 ? '' : 'scale-90 opacity-0'}`}>
              <Icon d={ICON.check} className="h-3.5 w-3.5" width={2} />
            </span>
          </Reveal>
        ))}
        <Cursor at={['55%', '34%']} from={[160, 120]} on={t > 900} pressed={t > 1450 && t < 1600} />
      </div>
    </div>
  )
}

/** The teacher asks for a change, the set assistant answers, the scene changes. */
function Direct({ t }: { t: number }) {
  return (
    <div className="relative h-full">
      <img src="/start/duyfken-replica.webp" alt="" className="h-full w-full object-cover transition-[filter] duration-1000 ease-move"
           style={{ filter: t > 1900 ? 'none' : 'grayscale(1) contrast(1.4) brightness(1.1)' }} />
      <Reveal on={t > 300} className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl bg-primary p-3 text-primary-content">
        <Icon d={ICON.user} className="h-5 w-5" />
        <span className="flex w-24 flex-col gap-1.5"><span className="block h-2 w-full rounded-full bg-primary-content/40" /><span className="block h-2 w-1/2 rounded-full bg-primary-content/40" /></span>
      </Reveal>
      <Reveal on={t > 1100} className="absolute left-4 top-20 flex items-center gap-2 rounded-2xl bg-base-100 p-2 pr-4">
        <img src="/portraits/sofie.webp" alt="" className="h-8 w-8 rounded-full object-cover" />
        <span className="flex w-20 flex-col gap-1.5"><Bar w="100%" /><Bar w="60%" /></span>
      </Reveal>
    </div>
  )
}

/** a slow push-in across the step, eased in and out (driven by the loop's clock, so it never restarts mid-fade) */
const push = (t: number) => { const x = Math.min(1, t / STEP_MS); return 1 + 0.06 * (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) }

/** The lesson on the classroom screen; the pupils answer on their phones. */
function Play({ t }: { t: number }) {
  return (
    <div className="flex h-full flex-col items-center gap-4 p-5 pb-6">
      <div className="relative min-h-0 w-[82%] flex-1 overflow-hidden rounded-lg border-[6px] border-base-content bg-base-content">
        <img src="/start/voc-schepen.webp" alt="" className="h-full w-full object-cover" style={{ transform: `scale(${push(t)})` }} />
      </div>
      <div className="flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Reveal key={i} on={t > 1100 + i * 120} className="flex h-20 w-12 shrink-0 flex-col gap-1.5 rounded-xl border-2 border-base-content bg-base-100 p-1.5">
            <span className="block h-1.5 w-full rounded-full bg-base-content/70" />
            {[0, 1, 2].map((d) => (
              <span key={d} className={`block h-2.5 w-full rounded transition-colors duration-200 ease-enter ${t > 2300 + i * 220 && d === (i + 1) % 3 ? 'bg-success' : 'bg-base-300'}`} />
            ))}
          </Reveal>
        ))}
      </div>
    </div>
  )
}

export function HowItWorks() {
  const { root, step, prev, t, paused, setPaused, go } = useLoop()
  const scene = (i: number, at: number) => [<Describe t={at} />, <Check t={at} />, <Direct t={at} />, <Play t={at} />][i]
  return (
    <section ref={root} aria-label={__('How it works')} className="mt-20">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-base-300 bg-base-200">
        {STEPS.map((_, i) => <Reveal key={i} on={i === step} className="absolute inset-0">{i === step ? scene(i, t) : i === prev && scene(i, STEP_MS)}</Reveal>)}
        <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? __('Play') : __('Pause')} data-tooltip={paused ? __('Play') : __('Pause')}
                className="btn btn-circle btn-sm absolute bottom-3 right-3 border-base-300 bg-base-100">
          <Icon d={paused ? ICON.play : ICON.pause} className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4" >
        {STEPS.map((label, i) => (
          <button key={label} type="button" aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}
                  className={`text-left text-sm transition-colors duration-200 ease-enter ${i === step ? 'text-base-content' : 'text-base-content/45 hover:text-base-content/70'}`}>
            <span className="mb-2 block h-0.5 overflow-hidden rounded-full bg-base-300">
              <span className="block h-full origin-left bg-primary" style={{ transform: `scaleX(${i === step ? t / STEP_MS : i < step ? 1 : 0})` }} />
            </span>
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
