// The studio shell. Few things on screen: the stage, a 310px panel for what is selected (or the scene),
// the asset drawer and the timeline. Everything a teacher rarely needs sits under a closed Advanced band.
// Elements with an id belong to the engine: it finds them once at load, so they are always rendered.
import { useEngine, actions, type Picked } from './bridge'
import { ADVANCED, type Control } from './scene-controls'
import { GroupLabel, KeyframeDiamond, PanelRow, SelectRow, SettingsSection, SliderRow, ToggleRow } from './ui/kit'

const ADV_LABEL_W = '6.5rem'
const KIND_LABEL: Record<Picked['kind'], string> = { model: '3D model', picture: 'Picture', door: 'Door', cloud: 'Cloud' }
const deg = (v: number) => `${Math.round(v)}°`

function TopBar() {
  return (
    <header className="flex items-center gap-4 border-b border-panel-hairline px-4" style={{ gridArea: 'top' }}>
      <span className="text-sm font-semibold text-panel-value">History Portal</span>
      <span className="text-xs text-panel-label">Untitled scene</span>
      <span id="publishStatus" className="ml-auto text-xs text-panel-label" />
      <button id="publish" type="button" className="btn btn-primary btn-sm">Publish</button>
    </header>
  )
}

function Stage() {
  return (
    <main id="stage" className="relative min-h-0 min-w-0" style={{ gridArea: 'stage' }}>
      <canvas id="c" className="block h-full w-full outline-none" style={{ touchAction: 'none' }} />
      <div id="sel" className="pointer-events-none absolute left-3 top-3 rounded px-2 py-1 text-xs text-panel-value" />
    </main>
  )
}

function PanelHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-4 pb-3 pt-4">
      <p className="text-base font-semibold text-panel-value">{title}</p>
      {sub && <p className="text-xs text-panel-label">{sub}</p>}
    </div>
  )
}

function ObjectPanel({ picked }: { picked: Picked }) {
  const floor = picked.kind === 'model'
  return (
    <>
      <PanelHead title={picked.name} sub={KIND_LABEL[picked.kind]} />
      {floor && (
        <SettingsSection title="Format" name="object-format">
          <SliderRow label="Turn" min={0} max={359} step={1} value={picked.yaw} onChange={actions.turnTo} format={deg}
                     keyframe={<KeyframeDiamond on={picked.keyed} onClick={actions.key} />} />
        </SettingsSection>
      )}
      {floor && (
        <SettingsSection title="Advanced" open={false} name="object-advanced">
          <SliderRow label="Left / right" labelWidth={ADV_LABEL_W} min={-30} max={30} step={0.5} value={picked.x}
                     onChange={(x) => actions.moveTo(x, picked.z)} unit="m" />
          <SliderRow label="Front / back" labelWidth={ADV_LABEL_W} min={-30} max={30} step={0.5} value={picked.z}
                     onChange={(z) => actions.moveTo(picked.x, z)} unit="m" />
        </SettingsSection>
      )}
    </>
  )
}

function EngineControl({ c }: { c: Control }) {
  if (c.type === 'range') return <SliderRow label={c.label} labelWidth={ADV_LABEL_W} id={c.id} min={c.min} max={c.max} step={c.step} defaultValue={c.default} />
  if (c.type === 'toggle') return <ToggleRow label={c.label} id={c.id} defaultChecked={c.default} />
  return <SelectRow label={c.label} labelWidth={ADV_LABEL_W} id={c.id} defaultValue={c.default} options={c.options} />
}

function ScenePanel() {
  return (
    <>
      <PanelHead title="Scene" />
      <SettingsSection title="Sky" name="scene-sky">
        <div id="skies" className="sky" />
      </SettingsSection>
      <SettingsSection title="Look" name="scene-look">
        <SelectRow label="Style" id="lookPreset" />
        <SliderRow label="Time" id="lookTime" min={0} max={1} step={0.01} defaultValue={0}
                   format={(v) => (v < 0.25 ? 'Night' : v < 0.5 ? 'Dusk' : v < 0.75 ? 'Dawn' : 'Day')} />
        <SliderRow label="Clouds" id="cloudAmount" min={0} max={1} step={0.02} defaultValue={0.3}
                   format={(v) => `${Math.round(v * 100)}`} unit="%" />
      </SettingsSection>
      <SettingsSection title="Advanced" open={false} name="scene-advanced">
        {ADVANCED.map((g) => (
          <div key={g.group}>
            <GroupLabel>{g.group}</GroupLabel>
            {g.controls.map((c) => <EngineControl key={c.id} c={c} />)}
            {g.group === 'Look' && (
              <>
                <div id="texList" className="sky my-1" />
                <label className="btn btn-ghost btn-xs">Upload aquarelle texture<input type="file" id="lookTexUpload" accept="image/*" hidden /></label>
              </>
            )}
            {g.group === 'Clouds' && <button type="button" id="cloudShuffle" className="btn btn-ghost btn-xs">Shuffle clouds</button>}
            {g.group === 'Backdrop' && <button type="button" id="bdShuffle" className="btn btn-ghost btn-xs">Shuffle silhouettes</button>}
            {g.group === 'Town' && (
              <div className="flex gap-2">
                <button type="button" id="cityBuild" className="btn btn-ghost btn-xs">Build town</button>
                <button type="button" id="cityShuffle" className="btn btn-ghost btn-xs">Shuffle</button>
              </div>
            )}
          </div>
        ))}
        <GroupLabel>Sky</GroupLabel>
        <label className="btn btn-ghost btn-xs">Upload panorama (2:1)<input type="file" id="skyUpload" accept="image/*" hidden /></label>
      </SettingsSection>
    </>
  )
}

function Assistant() {
  return (
    <SettingsSection title="Ask" name="ask">
      <div id="ai" className="flex flex-col gap-2">
        <div id="aiLog" className="max-h-56 overflow-auto text-xs" />
        <textarea id="aiPrompt" rows={3} placeholder="What should happen?"
                  className="textarea textarea-sm w-full border-panel-hairline bg-base-100 text-panel-value" />
        <div className="flex gap-2">
          <button type="button" id="aiSend" className="btn btn-sm flex-1">Send</button>
          <button type="button" id="aiUndo" className="btn btn-ghost btn-sm" disabled>Undo</button>
        </div>
      </div>
    </SettingsSection>
  )
}

function SidePanel() {
  const { selected } = useEngine()
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-panel-hairline" style={{ gridArea: 'panel' }}>
      {selected && <ObjectPanel picked={selected} />}
      <div hidden={!!selected}><ScenePanel /></div>
      <Assistant />
    </aside>
  )
}

function Bottom() {
  return (
    <section className="border-t border-panel-hairline px-4 pb-3 pt-2" style={{ gridArea: 'bottom' }}>
      <div id="drawer">
        <div className="head"><button type="button" className="drawer-toggle">Assets</button><div className="tabs" /></div>
        <div className="tiles" />
      </div>
      <div id="controls" className="mt-2 flex items-center gap-3">
        <button type="button" id="play" className="btn btn-sm">Play</button>
        <span id="time" className="w-16 text-xs tabular-nums text-panel-value">0.00 s</span>
        <PanelRow label="Length">
          <input type="number" id="len" defaultValue={10} min={1} max={120}
                 className="input input-xs w-14 border-panel-hairline bg-base-100 text-panel-value" />
          <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">s</span>
        </PanelRow>
      </div>
      <div id="track" className="relative mt-1 h-6">
        <div id="marks" />
        <input type="range" id="scrub" min={0} max={300} defaultValue={0} step={1} className="absolute inset-0 w-full" />
      </div>
    </section>
  )
}

export function App() {
  return (
    <div className="studio grid h-dvh bg-base-200 text-panel-value"
         style={{ gridTemplateColumns: '1fr var(--settings-panel-w, 19.375rem)', gridTemplateRows: '3rem 1fr auto', gridTemplateAreas: '"top top" "stage panel" "bottom panel"' }}>
      <TopBar />
      <Stage />
      <SidePanel />
      <Bottom />
    </div>
  )
}
