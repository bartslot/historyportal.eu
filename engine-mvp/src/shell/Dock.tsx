// The bottom dock, full width: the lesson's scenes along the top, then Assets and Timeline as tabs (the
// wizard's panel-tabs, DaisyUI tabs). In the Script step there is nothing to place yet: only the
// timeline (the narration). No X (Bart, 2026-09-29). Both tabs stay mounted.
import { Panel } from '../panels/Panel'
import { panels, usePanels, type DockTab } from '../panels/store'
import { Timeline } from '../timeline/Timeline'
import { SceneStrip } from './SceneStrip'
import { stepOf, useLesson } from '../lesson/store'

const TABS: [DockTab, string][] = [['assets', 'Assets'], ['timeline', 'Timeline']]

export function Dock() {
  const planning = stepOf(useLesson().lesson) === 'script'
  const { dockTab } = usePanels()
  const tab: DockTab = planning ? 'timeline' : dockTab
  return (
    <Panel id="dock">
      <SceneStrip />
      <div className="flex w-full shrink-0 items-center gap-1 border-b border-panel-hairline px-4 py-1.5" hidden={planning}>
        <div className="tabs tabs-box tabs-panel" role="tablist">
          {TABS.map(([t, label]) => (
            <input key={t} type="radio" name="dock-tab" className="tab" aria-label={label} role="tab"
                   checked={tab === t} onChange={() => panels.showDockTab(t)} />
          ))}
        </div>
      </div>
      <div id="drawer" className="min-h-0 flex-1 overflow-auto px-4 pb-2 pt-2" hidden={tab !== 'assets'}>
        <div className="head"><div className="tabs" /></div>
        <div className="tiles" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col" hidden={tab !== 'timeline'}><Timeline /></div>
    </Panel>
  )
}
