// Directing one shot in clay: the shot live and large. Drag a figure or a set piece to move it, drag the frame to walk
// the camera round, the wheel for the lens; the shot, the poses and what the shot still needs sit under it. Every
// change is saved to the shot (lesson.shots), which is what the Visual step and real 3D assets will build on.
import { useEffect, useMemo, useRef } from 'react'
import { Panel } from '../panels/Panel'
import { panels, usePanels } from '../panels/store'
import * as L from '../lesson/store'
import { PRESETS, type Preset } from '../blockout/camera'
import { POSES, type Pose } from '../blockout/kit'
import { SelectRow, SliderRow } from '../ui/kit'
import { __ } from '../i18n'
import { direct, FRAME_W, type Director } from './clay'
import { rimsOf } from './SceneGraph'
import { nodesOfJson, shotData, shotsOf, type ShotData } from './shots'
import { useStoryboard } from './store'

const SHOT_LABEL: Record<Preset, string> = {
  'wide': __('Wide'), 'three-quarter': __('Three-quarter'), 'front': __('Front'), 'profile': __('Profile'), 'medium': __('Medium'),
  'close-up': __('Close-up'), 'over-shoulder': __('Over the shoulder'), 'low': __('Low angle'), 'high': __('High angle'),
}
const POSE_LABEL: Record<Pose, string> = { stand: __('Stand'), point: __('Point'), spyglass: __('Spyglass') }
const NEED_LABEL = { character: __('Character'), prop: __('Prop'), set: __('Set') }

export function DirectorPanel() {
  const { lesson } = L.useLesson()
  const open = !!usePanels().open.director && L.stepOf(lesson) === 'script'
  const { directing, palette } = useStoryboard()
  const nodes = useMemo(() => nodesOfJson(lesson.script), [lesson.script])
  const ref = useMemo(() => shotsOf(nodes).find((s) => s.id === directing) ?? null, [nodes, directing])
  const data = ref ? shotData(ref, nodes, lesson.shots) : null
  const host = useRef<HTMLDivElement>(null)
  const director = useRef<Director | null>(null)
  const save = (d: ShotData) => { if (ref) L.setShot(ref.id, d) }

  // the live view: opened for one shot, closed when the panel closes or another shot is picked
  useEffect(() => {
    if (!open || !ref || !host.current) return
    let gone = false
    const start = shotData(ref, nodes, L.getLesson().lesson.shots)
    void direct(host.current, start, palette, rimsOf(nodes), save).then((d) => { if (gone) d.close(); else director.current = d })
    return () => { gone = true; director.current?.close(); director.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ref?.id, palette])

  // the picked shot went away (its line was deleted): nothing to direct
  useEffect(() => { if (open && directing && !ref) panels.close('director') }, [open, directing, ref])

  const change = (d: ShotData) => { director.current?.update(d); save(d) }
  const figures = data?.objects.filter((o) => o.kit === 'figure') ?? []
  return (
    <Panel id="director" className="p-3 pt-2" style={{ width: FRAME_W + 26, left: 12, right: 'auto', top: 12, bottom: 'auto' }}>
      <p className="mb-2 pr-8 text-2xs font-semibold tracking-wide text-panel-title">
        {ref ? __('Shot :letter', { letter: ref.letter }) : __('Direct')}
      </p>
      <div ref={host} className="cursor-grab overflow-hidden rounded-sm active:cursor-grabbing" />
      {data && (
        <div className="mt-3 grid grid-cols-2 gap-x-6">
          <div>
            <SelectRow label={__('Shot')} value={data.camera.shot} options={PRESETS.map((p) => [p, SHOT_LABEL[p]])}
                       onChange={(v) => change({ ...data, camera: { ...data.camera, shot: v as Preset, az: undefined } })} />
            <SliderRow label={__('Lens')} min={18} max={135} step={1} value={data.camera.lens_mm ?? 35} unit="mm"
                       onChange={(v) => change({ ...data, camera: { ...data.camera, lens_mm: v } })} />
            {figures.map((f) => (
              <SelectRow key={f.id} label={f.id} value={f.pose ?? 'stand'} options={POSES.map((p) => [p, POSE_LABEL[p]])}
                         onChange={(v) => change({ ...data, objects: data.objects.map((o) => (o.id === f.id ? { ...o, pose: v as Pose } : o)) })} />
            ))}
          </div>
          <div>
            <p className="mb-1 text-3xs font-semibold uppercase tracking-wide text-panel-label">{__('Needs')}</p>
            <ul className="text-xs text-panel-value">
              {data.needs.map((n) => (
                <li key={`${n.type}:${n.name}`} className="flex justify-between gap-2 border-b border-panel-hairline py-1">
                  <span>{n.name}</span><span className="text-panel-label">{NEED_LABEL[n.type]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  )
}
