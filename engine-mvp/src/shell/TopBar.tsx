// The top bar: the scene's name, and three menus that are all the same Panel (place 'menu'):
// Add (opens the asset drawer at a folder), View (every panel, from the one registry), Publish.
import { useRef, type ReactNode } from 'react'
import { Panel } from '../panels/Panel'
import { PANELS, inStep, panels, usePanels } from '../panels/store'
import * as L from '../lesson/store'
import { newLesson } from '../start/store'

const CHECK = 'm4.5 12.75 6 6 9-13.5'

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

const STEP_LABEL: Record<L.Step, string> = { script: 'Script', visual: 'Visual', animate: 'Animate' }

/** 1 Script, 2 Visual, 3 Animate: strictly in order; a locked step says why when pressed. */
function Stepper({ step }: { step: L.Step }) {
  return (
    <nav aria-label="Steps" className="flex items-center gap-1">
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
    <header className="flex items-center gap-2 border-b border-panel-hairline px-4" style={{ gridArea: 'top' }}>
      <span className="text-sm font-semibold text-panel-value">History Portal</span>
      <input aria-label="Lesson title" value={lesson.title} onChange={(e) => L.setTitle(e.target.value)}
             className="w-48 rounded bg-transparent px-1 text-xs text-panel-value hover:bg-panel-hairline focus:bg-panel-hairline focus:outline-none" />
      <span className="mr-2 text-3xs uppercase tracking-wide text-panel-label" aria-live="polite">{saved === 'saving' ? 'Saving' : saved === 'saved' ? 'Saved' : 'Not saved'}</span>
      <MenuButton id="lesson-menu" label="Lesson" anchor={lessonBtn} />
      {step === 'visual' && <MenuButton id="add-menu" label="Add" anchor={addBtn} />}
      <MenuButton id="view-menu" label="View" anchor={viewBtn} />
      <span className="ml-auto" />
      <Stepper step={step} />
      <span className="ml-auto" />
      <button type="button" aria-pressed={!!st.open.help} onClick={() => panels.toggle('help')}
              className={`btn btn-sm ${st.open.help ? 'btn-active' : 'btn-ghost'} text-panel-value`}>Help</button>
      {step === 'script' && <button type="button" className="btn btn-primary btn-sm" onClick={L.approveScript}>Approve script</button>}
      {step === 'visual' && <button type="button" className="btn btn-primary btn-sm" onClick={L.finishVisual}>Next: Animate</button>}
      <span hidden={step !== 'animate'}><MenuButton id="publish-menu" label="Publish" primary anchor={publishBtn} /></span>

      <Panel id="lesson-menu" anchor={lessonBtn}>
        <ul>
          <Item onClick={() => { panels.close('lesson-menu'); if (confirm('Start a new lesson? This one is kept in this browser.')) void newLesson() }}>New lesson</Item>
          <Item onClick={() => { panels.close('lesson-menu'); void L.exportLesson() }}>Export lesson file</Item>
          <Item onClick={() => { panels.close('lesson-menu'); fileIn.current?.click() }}>Open lesson file</Item>
        </ul>
      </Panel>
      <input ref={fileIn} type="file" accept=".json,application/json" hidden aria-label="Open lesson file"
             onChange={(e) => {
               const f = e.target.files?.[0]
               e.target.value = ''
               if (f) L.importLesson(f).catch((err) => (window as any).__mvp.flash(err instanceof Error ? err.message : String(err)))
             }} />
      <Panel id="add-menu" anchor={addBtn}>
        <ul>{folders.map((f) => <Item key={f} onClick={() => addFrom(f)}>{f}</Item>)}</ul>
      </Panel>
      <Panel id="view-menu" anchor={viewBtn}>
        <ul>{PANELS.filter((p) => p.inView && inStep(p.id, step)).map((p) => <Item key={p.id} checked={!!st.open[p.id]} onClick={() => { panels.close('view-menu'); panels.toggle(p.id) }}>{p.title}</Item>)}</ul>
      </Panel>
      <Panel id="publish-menu" anchor={publishBtn} className="flex flex-col gap-2 p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">Video size</span>
          <select id="publishRes" defaultValue="1080" className="rounded-lg border border-panel-hairline bg-base-100 px-2 py-1 text-xs text-panel-value">
            <option value="720">720p</option><option value="1080">1080p</option>
          </select>
        </label>
        <button id="publish" type="button" className="btn btn-primary btn-sm">Publish video</button>
        <span id="publishStatus" className="text-xs text-panel-label" />
      </Panel>
    </header>
  )
}
