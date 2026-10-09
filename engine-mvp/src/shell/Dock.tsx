// The bottom dock: Assets and Timeline as tabs (the wizard's panel-tabs, DaisyUI tabs). No X (Bart,
// 2026-09-29); it opens and closes from View like every other panel. Both tabs stay mounted.
import { Panel } from '../panels/Panel'
import { panels, usePanels, type DockTab } from '../panels/store'
import { Timeline } from '../timeline/Timeline'

const TABS: [DockTab, string][] = [['assets', 'Assets'], ['timeline', 'Timeline']]

export function Dock() {
  const { dockTab } = usePanels()
  return (
    <Panel id="dock">
      <div className="flex w-full shrink-0 items-center gap-1 border-b border-panel-hairline px-4 py-1.5">
        <div className="tabs tabs-box tabs-panel" role="tablist">
          {TABS.map(([tab, label]) => (
            <input key={tab} type="radio" name="dock-tab" className="tab" aria-label={label} role="tab"
                   checked={dockTab === tab} onChange={() => panels.showDockTab(tab)} />
          ))}
        </div>
      </div>
      <div id="drawer" className="min-h-0 flex-1 overflow-auto px-4 pb-2 pt-2" hidden={dockTab !== 'assets'}>
        <div className="head"><div className="tabs" /></div>
        <div className="tiles" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col" hidden={dockTab !== 'timeline'}><Timeline /></div>
    </Panel>
  )
}
