// The studio shell: the stage in the middle, every panel around it from ONE registry (src/panels).
// Docked panels take their room from the stage as they slide in; overlays sit above it.
import { useEffect } from 'react'
import { isTypingTarget } from '@hp/ui/keyboard.js'
import { panels } from './panels/store'
import { CrewPanel } from './crew/CrewPanel'
import { Dock } from './shell/Dock'
import { Inspector } from './shell/Inspector'
import { HelpPanel } from './shell/HelpPanel'
import { Notes } from './shell/Notes'
import { ObjectsPanel } from './shell/ObjectsPanel'
import { ScenesPanel } from './shell/ScenesPanel'
import { ScriptPanel, StageCaption } from './shell/ScriptPanel'
import { TopBar } from './shell/TopBar'

function Stage() {
  return (
    <main id="stage" className="relative min-h-0 min-w-0" style={{ gridArea: 'stage' }}>
      <canvas id="c" className="block h-full w-full outline-none" style={{ touchAction: 'none' }} />
      <div id="sel" className="pointer-events-none absolute left-3 top-3 rounded px-2 py-1 text-xs text-panel-value" />
      <StageCaption />
      <Notes />
      <HelpPanel />
    </main>
  )
}

export function App() {
  // Esc closes the newest overlay first; only when none is open does it reach the stage and timeline
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isTypingTarget(e.target)) return
      if (panels.closeTopOverlay()) e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <div className="studio grid h-dvh bg-base-200 text-panel-value"
         style={{
           gridTemplateColumns: 'auto auto minmax(0, 1fr) auto auto auto',
           gridTemplateRows: '3rem minmax(0, 1fr) auto',
           gridTemplateAreas: '"top top top top top top" "scenes objects stage script inspector crew" "scenes dock dock script inspector crew"',
         }}>
      <TopBar />
      <ScenesPanel />
      <ObjectsPanel />
      <Stage />
      <ScriptPanel />
      <Inspector />
      <CrewPanel />
      <Dock />
    </div>
  )
}
