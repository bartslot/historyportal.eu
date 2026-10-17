// The studio shell: the stage in the middle, every panel around it from ONE registry (src/panels).
// Docked panels take their room from the stage as they slide in; overlays sit above it.
import { useEffect } from 'react'
import { stepOf, useLesson } from './lesson/store'
import { isTypingTarget } from '@hp/ui/keyboard.js'
import { panels } from './panels/store'
import { CrewPanel } from './crew/CrewPanel'
import { Dock } from './shell/Dock'
import { Inspector } from './shell/Inspector'
import { HelpPanel } from './shell/HelpPanel'
import { Notes } from './shell/Notes'
import { ReferenceOverlay, ReferencePanel } from './shell/Reference'
import { ObjectsPanel } from './shell/ObjectsPanel'
import { ScriptView, StageCaption } from './shell/ScriptView'
import { TopBar } from './shell/TopBar'
import { SceneGraph } from './storyboard/SceneGraph'
import { DirectorPanel } from './storyboard/DirectorPanel'
import { StartOverlay } from './start/StartOverlay'
import { useStart } from './start/store'

function Stage() {
  return (
    <main id="stage" className="relative min-h-0 min-w-0" style={{ gridArea: 'stage' }}>
      <canvas id="c" className="block h-full w-full outline-none" style={{ touchAction: 'none' }} />
      <div id="sel" className="pointer-events-none absolute left-3 top-3 rounded px-2 py-1 text-xs text-panel-value" />
      <ReferenceOverlay />
      <StageCaption />
      <ScriptView />
      <Notes />
      <HelpPanel />
      <DirectorPanel />
    </main>
  )
}

/** Entering a step arranges its panels (one per side at most; the canvas keeps the rest). Renders nothing:
 *  only this component listens to the lesson, so typing in the script does not re-render the studio. */
function StepLayout() {
  const step = stepOf(useLesson().lesson)
  useEffect(() => { panels.layoutFor(step) }, [step])
  return null
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

  const covered = useStart().mode !== 'studio'
  return (
    <>
    <div inert={covered} className="studio grid h-dvh bg-base-200 text-panel-value"
         style={{
           gridTemplateColumns: 'auto auto minmax(0, 1fr) auto auto auto',
           gridTemplateRows: '3rem minmax(0, 1fr) auto',
           gridTemplateAreas: '"top top top top top top" "scenegraph objects stage reference inspector crew" "dock dock dock dock dock dock"',
         }}>
      <StepLayout />
      <TopBar />
      <SceneGraph />
      <ObjectsPanel />
      <Stage />
      <ReferencePanel />
      <Inspector />
      <CrewPanel />
      <Dock />
    </div>
    <StartOverlay />
    </>
  )
}
