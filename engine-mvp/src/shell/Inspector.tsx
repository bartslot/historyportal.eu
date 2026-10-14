// The right panel: the selected object, or the Scene when nothing is selected. A teacher sees a few
// rows; everything else waits in a closed Advanced band. Elements with an id belong to the engine.
import { useEngine, actions, type Picked } from '../bridge'
import { POSES } from '../blockout/kit'
import { PRESETS } from '../blockout/camera'
import { ADVANCED, type Control } from '../scene-controls'
import { GroupLabel, KeyframeDiamond, SelectRow, SettingsSection, SliderRow, ToggleRow } from '../ui/kit'
import { Panel } from '../panels/Panel'

const ADV_LABEL_W = '6.5rem'
const KIND_LABEL: Record<Picked['kind'], string> = { model: '3D model', picture: 'Picture', door: 'Door', cloud: 'Cloud' }
const deg = (v: number) => `${Math.round(v)}°`
const label = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ')
const POSE_OPTIONS: [string, string][] = POSES.map((p) => [p, label(p)])
const SHOT_OPTIONS: [string, string][] = PRESETS.map((p) => [p, label(p)])

function PanelHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="py-3 pl-4 pr-10">
      <p className="truncate text-base font-semibold text-panel-value">{title}</p>
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
                     keyframe={<KeyframeDiamond on={picked.keyed} onClick={actions.keyTurn} />} />
        </SettingsSection>
      )}
      {picked.blockout?.figure && (
        <SettingsSection title="Pose" name="object-pose">
          <SelectRow label="Pose" options={POSE_OPTIONS} value={picked.blockout.pose ?? 'stand'} onChange={actions.setPose} />
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
                   hint="time of day: 0-0.25 night, 0.25-0.5 dusk, 0.5-0.75 dawn, 0.75-1 day"
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

// the clay blockout's camera preset: the teacher picks another shot on the same subjects (one undo op)
function BlockoutShot({ shot }: { shot: string }) {
  return (
    <SettingsSection title="Blockout" name="scene-blockout">
      <SelectRow label="Shot" options={SHOT_OPTIONS} value={shot} onChange={actions.setShot} />
    </SettingsSection>
  )
}

export function Inspector() {
  const { selected, shot } = useEngine()
  return (
    <Panel id="inspector">
      {selected && <ObjectPanel picked={selected} />}
      {!selected && shot && <BlockoutShot shot={shot} />}
      {/* data-settings: every control in here is open to the crew too (src/crew/settings.ts) */}
      <div hidden={!!selected} data-settings><ScenePanel /></div>
    </Panel>
  )
}
