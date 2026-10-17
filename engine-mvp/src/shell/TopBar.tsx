// The top bar: the scene's name, and three menus that are all the same Panel (place 'menu'):
// Add (opens the asset drawer at a folder), View (every panel, from the one registry), Publish.
import { useRef, type ReactNode } from 'react'
import { Panel } from '../panels/Panel'
import { PANELS, inStep, panels, usePanels } from '../panels/store'
import * as L from '../lesson/store'
import { newLesson } from '../start/store'
import { __, LOCALES, locale, setLocale } from '../i18n'

const CHECK = 'm4.5 12.75 6 6 9-13.5'
// the editor's own header icons (resources/views/livewire/wizard/step3-scene-configurator.blade.php), Heroicons 1.5
const HELP = 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z'
const COG = ['M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z']
const PUBLISH = 'M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z'

/** A header icon button exactly as the editor draws it: h-10 w-10 rounded-xl, outline stroke, flat (no fill, no shadow). */
function HeaderIcon({ label, paths, onClick, pressed, accent = false, anchor, disabled }: {
  label: string; paths: string[]; onClick: () => void; pressed?: boolean; accent?: boolean; anchor?: React.RefObject<HTMLButtonElement | null>; disabled?: string | null
}) {
  return (
    <button ref={anchor} type="button" aria-label={label} data-tooltip={disabled ?? label} aria-pressed={pressed} aria-disabled={!!disabled}
            onClick={() => (disabled ? (window as any).__mvp?.flash(disabled) : onClick())}
            className={`grid h-10 w-10 cursor-pointer place-items-center rounded-xl transition-colors hover:bg-white/5 ${accent ? 'text-primary' : 'text-panel-label hover:text-primary'} ${pressed ? 'bg-white/10' : ''} ${disabled ? 'opacity-50' : ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6" aria-hidden="true">
        {paths.map((d) => <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />)}
      </svg>
    </button>
  )
}

function MenuButton({ id, label, primary = false, anchor }: { id: string; label: string; primary?: boolean; anchor: React.RefObject<HTMLButtonElement | null> }) {
  const open = usePanels().open[id]
  return (
    <button ref={anchor} type="button" aria-haspopup="menu" aria-expanded={!!open} onClick={() => panels.toggle(id)}
            className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-ghost text-panel-value'}`}>{label}</button>
  )
}

function Item({ children, onClick, checked }: { children: ReactNode; onClick: () => void; checked?: boolean }) {
  return (
    <li>
      <button type="button" role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={checked} onClick={onClick}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-panel-value hover:bg-white/5">
        <span className="grid h-4 w-4 shrink-0 place-items-center" aria-hidden="true">
          {checked && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d={CHECK} /></svg>}
        </span>
        {children}
      </button>
    </li>
  )
}

const STEP_LABEL: Record<L.Step, string> = { script: __('Script'), visual: __('Visual'), animate: __('Animate') }
/** The asset folders keep their English names (the engine's ids); this is what the teacher reads. */
const FOLDER: Record<string, string> = {
  Characters: __('Characters'), Nature: __('Nature'), Buildings: __('Buildings'), 'Doors & gates': __('Doors & gates'), Props: __('Props'),
  'Line art': __('Line art'), 'History line': __('History line'), Shapes: __('Shapes'), Arrows: __('Arrows'),
}
/** The lesson's stored default title stays English (compared elsewhere); shown in the teacher's language. */
const UNTITLED = 'Untitled lesson'

/** 1 Script, 2 Visual, 3 Animate: strictly in order; a locked step says why when pressed. */
function Stepper({ step }: { step: L.Step }) {
  return (
    <nav aria-label={__('Steps')} className="flex items-center gap-1">
      {L.STEPS.map((s, i) => {
        const locked = L.lockedReason(s)
        const on = s === step
        return (
          <button key={s} type="button" aria-current={on ? 'step' : undefined} aria-disabled={!!locked} data-tooltip={locked ?? undefined}
                  onClick={() => { if (locked) (window as any).__mvp?.flash(locked); else L.goToStep(s) }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${on ? 'bg-white/10 text-panel-value' : locked ? 'cursor-default text-panel-label/60' : 'text-panel-label hover:text-white'}`}>
            <span className={`grid h-4 w-4 place-items-center rounded-full border text-3xs ${on ? 'border-panel-value' : 'border-panel-label/60'}`}>{i + 1}</span>
            {STEP_LABEL[s]}
          </button>
        )
      })}
    </nav>
  )
}

export function TopBar() {
  const st = usePanels()
  const { lesson, saved } = L.useLesson()
  const step = L.stepOf(lesson)
  const lessonBtn = useRef<HTMLButtonElement>(null)
  const fileIn = useRef<HTMLInputElement>(null)
  const addBtn = useRef<HTMLButtonElement>(null)
  const viewBtn = useRef<HTMLButtonElement>(null)
  const publishBtn = useRef<HTMLButtonElement>(null)
  const folders: string[] = (window as any).__mvp?.assetFolders ?? []
  const addFrom = (folder: string) => {
    panels.showDockTab('assets')
    ;(window as any).__mvp?.showAssetFolder(folder)
    panels.close('add-menu')
  }
  return (
    <header className="flex items-center gap-2 border-b border-panel-hairline pl-4 pr-2" style={{ gridArea: 'top' }}>
      <span className="text-sm font-semibold text-panel-value">History Portal</span>
      <input aria-label={__('Lesson title')} value={lesson.title === UNTITLED ? __('Untitled lesson') : lesson.title} onChange={(e) => L.setTitle(e.target.value)}
             className="w-48 rounded bg-transparent px-1 text-xs text-panel-value hover:bg-panel-hairline focus:bg-panel-hairline focus:outline-none" />
      <span className="mr-2 text-3xs uppercase tracking-wide text-panel-label" aria-live="polite">{saved === 'saving' ? __('Saving…') : saved === 'saved' ? __('Saved') : __('Not saved')}</span>
      <MenuButton id="lesson-menu" label={__('Lesson')} anchor={lessonBtn} />
      {step === 'visual' && <MenuButton id="add-menu" label={__('Add')} anchor={addBtn} />}
      <MenuButton id="view-menu" label={__('View')} anchor={viewBtn} />
      <span className="ml-auto" />
      <Stepper step={step} />
      <span className="ml-auto" />
      {step === 'script' && <button type="button" className="btn btn-primary btn-sm mr-2" onClick={L.approveScript}>{__('Approve script')}</button>}
      {step === 'visual' && <button type="button" className="btn btn-primary btn-sm mr-2" onClick={L.finishVisual}>{__('Next: Animate')}</button>}
      <HeaderIcon label={__('Help')} paths={[HELP]} pressed={!!st.open.help} onClick={() => panels.toggle('help')} />
      <div className="mx-1 my-2.5 w-px self-stretch bg-panel-hairline" />
      {inStep('inspector', step) && <HeaderIcon label={__('Settings')} paths={COG} pressed={!!st.open.inspector} onClick={() => panels.toggle('inspector')} />}
      <HeaderIcon label={__('Publish')} paths={[PUBLISH]} accent anchor={publishBtn} pressed={!!st.open['publish-menu']}
                  disabled={step === 'animate' ? null : L.lockedReason('animate') ?? __('Publish from the Animate step')}
                  onClick={() => panels.toggle('publish-menu')} />

      <Panel id="lesson-menu" anchor={lessonBtn}>
        <ul>
          <Item onClick={() => { panels.close('lesson-menu'); if (confirm(__('Start a new lesson? This one is kept in this browser.'))) void newLesson() }}>{__('New lesson')}</Item>
          <Item onClick={() => { panels.close('lesson-menu'); void L.exportLesson() }}>{__('Export lesson file')}</Item>
          <Item onClick={() => { panels.close('lesson-menu'); fileIn.current?.click() }}>{__('Open lesson file')}</Item>
          <li role="presentation" className="px-2 pb-1 pt-2 text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Language')}</li>
          {LOCALES.map((l) => <Item key={l.code} checked={l.code === locale()} onClick={() => { panels.close('lesson-menu'); if (l.code !== locale()) setLocale(l.code) }}>{l.name}</Item>)}
        </ul>
      </Panel>
      <input ref={fileIn} type="file" accept=".json,application/json" hidden aria-label={__('Open lesson file')}
             onChange={(e) => {
               const f = e.target.files?.[0]
               e.target.value = ''
               if (f) L.importLesson(f).catch((err) => (window as any).__mvp.flash(err instanceof Error ? err.message : String(err)))
             }} />
      <Panel id="add-menu" anchor={addBtn}>
        <ul>{folders.map((f) => <Item key={f} onClick={() => addFrom(f)}>{FOLDER[f] ?? f}</Item>)}</ul>
      </Panel>
      <Panel id="view-menu" anchor={viewBtn}>
        <ul>{PANELS.filter((p) => p.inView && inStep(p.id, step)).map((p) => <Item key={p.id} checked={!!st.open[p.id]} onClick={() => { panels.close('view-menu'); panels.toggle(p.id) }}>{p.title}</Item>)}</ul>
      </Panel>
      <Panel id="publish-menu" anchor={publishBtn} className="flex flex-col gap-2 p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Video size')}</span>
          <select id="publishRes" defaultValue="1080" className="rounded-lg border border-panel-hairline bg-base-100 px-2 py-1 text-xs text-panel-value">
            <option value="720">720p</option><option value="1080">1080p</option>
          </select>
        </label>
        <button id="publish" type="button" className="btn btn-primary btn-sm">{__('Publish video')}</button>
        <span id="publishStatus" className="text-xs text-panel-label" />
      </Panel>
    </header>
  )
}
