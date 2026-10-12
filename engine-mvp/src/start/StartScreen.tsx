// The start of every lesson: one question, one box, two chips. The teacher writes the prompt; the chips
// say what kind of lesson and for which class. Templates only start the prompt. Light, like the build view.
import { useRef } from 'react'
import { Panel } from '../panels/Panel'
import { panels } from '../panels/store'
import { useCrew } from '../crew/store'
import { Icon, ICON } from '../ui/icons'
import { KINDS, LANGUAGES, LENGTHS, LEVELS, kindOf, withStarter, type Brief, type KindId } from './brief'
import { begin, openStudio, setBrief, setPrompt, useStart } from './store'
import { HowItWorks } from './HowItWorks'

const TEMPLATES: Record<KindId, { title: string; img: string }[]> = {
  story: [
    { title: 'A voyage', img: 'vloot-rennefeld' },
    { title: 'A life', img: 'tasman-portret-cuyp' },
    { title: 'A first meeting', img: 'golden-bay-encounter' },
  ],
  interactive: [
    { title: 'Explore a map', img: 'kaart-tasman-1644' },
    { title: 'Explore a drawing', img: 'moordenaarsbaai-gilsemans' },
    { title: 'Explore a ship', img: 'duyfken-replica' },
  ],
  gamified: [
    { title: 'Quiz battle', img: 'voc-schepen' },
    { title: 'Put it in order', img: 'kaart-tasman-reizen' },
    { title: 'True or false', img: 'voc-schip-dodo' },
  ],
  game: [
    { title: 'Lead the voyage', img: 'vloot-rennefeld' },
    { title: 'Survive the storm', img: 'tasman-gravure-1886' },
    { title: 'Find the south land', img: 'kaart-tasman-reizen' },
  ],
}

const STARTERS = Object.values(TEMPLATES).flat().map((t) => t.title)
const PROMPT_ID = 'lesson-prompt'

const CHIP = 'btn btn-sm h-10 rounded-full border-base-300 bg-base-100 px-4 text-sm font-normal hover:bg-base-200'

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} onClick={onClick}
            className={`h-8 rounded-full px-3 text-sm ${on ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}>{children}</button>
  )
}

function KindChip({ brief }: { brief: Brief }) {
  const anchor = useRef<HTMLButtonElement>(null)
  const kind = kindOf(brief.kind)
  return (
    <>
      <button ref={anchor} type="button" aria-haspopup="menu" onClick={() => panels.toggle('kind-menu')} className={CHIP}>
        <Icon d={kind.icon} className="h-[18px] w-[18px]" />{kind.label}<Icon d={ICON.chevronDown} className="h-4 w-4 opacity-50" />
      </button>
      <Panel id="kind-menu" anchor={anchor} align="start" className="!bg-base-100 p-1.5">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="menuitemradio" aria-checked={k.id === brief.kind}
                  onClick={() => { setBrief({ ...brief, kind: k.id }); panels.close('kind-menu') }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-base-200 ${k.id === brief.kind ? 'bg-base-200' : ''}`}>
            <Icon d={k.icon} className="h-5 w-5 opacity-60" />{k.label}
          </button>
        ))}
      </Panel>
    </>
  )
}

function ClassChip({ brief }: { brief: Brief }) {
  const anchor = useRef<HTMLButtonElement>(null)
  const group = (title: string, key: 'level' | 'length' | 'language', options: readonly string[]) => (
    <div className="px-2 py-2">
      <div className="mb-1.5 text-xs text-panel-label">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => <Option key={o} on={brief[key] === o} onClick={() => setBrief({ ...brief, [key]: o })}>{o}</Option>)}
      </div>
    </div>
  )
  return (
    <>
      <button ref={anchor} type="button" aria-haspopup="menu" onClick={() => panels.toggle('class-menu')} className={CHIP}>
        <Icon d={ICON.users} className="h-[18px] w-[18px]" />{brief.level} · {brief.length} · {brief.language}
        <Icon d={ICON.chevronDown} className="h-4 w-4 opacity-50" />
      </button>
      <Panel id="class-menu" anchor={anchor} align="start" className="!bg-base-100 w-80 p-1.5">
        {group('Class', 'level', LEVELS)}
        {group('Length', 'length', LENGTHS)}
        {group('Language', 'language', LANGUAGES)}
      </Panel>
    </>
  )
}

function PromptBox() {
  const { prompt, brief, error: startError } = useStart()
  const crewError = useCrew().error
  const error = startError ?? crewError
  const box = useRef<HTMLTextAreaElement>(null)
  const empty = !prompt.trim()
  return (
    <form className="rounded-[28px] border border-base-300 bg-base-100 p-4" onSubmit={(e) => { e.preventDefault(); void begin() }}>
      <textarea ref={box} id={PROMPT_ID} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} autoFocus aria-label="Your lesson"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void begin() } }}
                placeholder="Abel Tasman sails from Batavia in 1642 and finds land nobody in Europe has seen"
                className="w-full resize-none bg-transparent px-2 pt-1 text-[17px] leading-relaxed placeholder:text-base-content/40 focus:outline-none" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <KindChip brief={brief} />
        <ClassChip brief={brief} />
        <button type="submit" disabled={empty} aria-label="Make the lesson" data-tooltip="Make the lesson"
                className="btn btn-primary btn-circle ml-auto h-11 w-11 disabled:opacity-25">
          <Icon d={ICON.arrowUp} className="h-5 w-5" />
        </button>
      </div>
      {error && <p role="alert" className="mt-2 px-2 text-sm text-error">{error}</p>}
    </form>
  )
}

function Templates() {
  const { brief, prompt } = useStart()
  const start = (title: string) => {
    const next = withStarter(prompt, title, STARTERS)
    setPrompt(next)
    const box = document.getElementById(PROMPT_ID) as HTMLTextAreaElement | null
    box?.focus()
    requestAnimationFrame(() => box?.setSelectionRange(next.length, next.length))
  }
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TEMPLATES[brief.kind].map((t) => (
        <button key={t.title} type="button" onClick={() => start(t.title)}
                className="group relative aspect-[16/7] overflow-hidden sm:aspect-[16/10] rounded-2xl bg-base-300 text-left">
          <img src={`/start/${t.img}.webp`} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-enter group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-3 left-4 text-base font-semibold text-white">{t.title}</span>
        </button>
      ))}
    </div>
  )
}

export function StartScreen() {
  return (
    <main className="mx-auto max-w-[880px] px-4 pb-24 pt-20 sm:pt-28">
      <button type="button" onClick={openStudio} className="btn btn-ghost btn-sm absolute right-4 top-4 rounded-full font-normal">Open the studio</button>
      <h1 className="text-center font-history text-4xl text-base-content sm:text-[52px] sm:leading-tight">What lesson should we create?</h1>
      <div className="mt-10 sm:mt-14"><PromptBox /></div>
      <Templates />
      <HowItWorks />
    </main>
  )
}
