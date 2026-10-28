// Dev page: stage25d.html?lesson=<url>&library=<url>. The stage fills the frame; a small panel holds every
// motion and timing value of the scene on screen, each change one undo step.
import '../studio.css'
import { __, loadLocale } from '../i18n'
import { StrictMode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { playLesson, STANDING, type Player } from './stage'
import { resolveAsset } from './library'
import { DEPTHS, lineKeys, LOOK_RANGE, STAGE_SHEET } from './look'
import { getIn, type Path } from './edits'
import { BG_FEATHER, groundOptions, nearOptions, STAIN_DEFAULT } from './ground'
import { HOLD_DEFAULTS, LAND_TARGET, RENDER_CAPS, sceneDuration, setShotDuration, setShotPose } from './layout'
import { Panel } from '../panels/Panel'
import { panels } from '../panels/store'
import type { CamPose, CameraMove, Ease, MotionSpec } from './types'

const q = new URLSearchParams(location.search)
const lessonUrl = q.get('lesson') ?? 'lessons/_placeholder.json'
const libraryUrl = q.get('library') ?? undefined

function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-xs">
      <span className="opacity-70">{label}</span>
      <input type="range" className="range range-xs" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="tabular-nums text-right">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </label>
  )
}

/** The lesson's look (lesson.look): one set for every scene, so it lives in its own panel, not the scene's. */
function LookPanel({ player }: { player: Player }) {
  useSyncExternalStore((fn) => player.doc.subscribe(fn), () => player.doc.lesson)   // re-render on every edit
  return (
    <div className="lg:fixed lg:left-3 lg:top-3 lg:bottom-3 lg:w-72 lg:overflow-y-auto">
      <Panel id="stage-look" className="rounded-box border border-base-300 p-3 text-sm" style={{ position: 'static', width: '100%' }}>
        <h3 className="font-semibold">{__('Look')}</h3>
        <div className="mt-1 flex flex-col gap-1" data-testid="look">
          {LOOK_ROWS.map(([k, label]) => <Num key={k} player={player} path={['look', k]} label={label} min={LOOK_RANGE[k][0]} max={LOOK_RANGE[k][1]} step={LOOK_RANGE[k][2]} fallback={STAGE_SHEET[k]} />)}
        </div>
      </Panel>
    </div>
  )
}

function Num({ player, path, label, min, max, step, fallback }: { player: Player; path: Path; label: string; min: number; max: number; step: number; fallback: number }) {
  const raw = getIn(player.doc.lesson, path)
  return <Range label={label} min={min} max={max} step={step} value={typeof raw === 'number' ? raw : fallback} onChange={(v) => player.doc.set(path, v, label)} />
}

const DEPTH_NAMES: Record<string, string> = { sky: 'sky', bg: 'far', mid: 'middle', fg: 'front', near: 'nearest' }
// the stage's paper sheet, then per depth how light, thin and hazy its lines and washes go (look.ts)
const LOOK_ROWS: [string, string][] = [
  ['sheetPaper', 'Paper grain'], ['sheetGrain', 'Pigment grain'], ['sheetWash', 'Wash'], ['sheetPatches', 'Wash patches'], ['lineBrown', 'Line brown'], ['lineInk', 'Line value'], ['lineNorm', 'Line match'],
  ['housePitch', 'Camera tilt'], ['groundDetail', 'Ground detail'], ['groundVary', 'Ground wash'], ['groundMix', 'Ground mix'],
  ['groundScale', 'Ground tile size'], ['nearFar', 'Near ground depth'],
  ['edgeSoft', 'Soft edges'], ['grounding', 'Grounding'], ['grassOverlap', 'Grass in front'], ['sunLight', 'Sunlight'],
  ['castShadow', 'Cast shadows'], ['cloudDrift', 'Cloud drift'], ['smoke', 'Smoke'], ['birds', 'Birds'],
  ...DEPTHS.flatMap((d): [string, string][] => {
    const k = lineKeys(d), n = DEPTH_NAMES[d]
    return [[k.fade, `Line lighter, ${n}`], [k.thin, `Line thinner, ${n}`], [k.haze, `Haze, ${n}`]]
  }),
]

const EASE_LABELS: [Ease, string][] = [['inOut', 'Ease in and out'], ['out', 'Ease out'], ['in', 'Ease in'], ['linear', 'Even']]

const POSE: [keyof CamPose, string, number, number, number, number][] = [
  ['x', 'Sideways', -8, 8, 0.1, 0], ['y', 'Height', 0.3, 6, 0.1, 1.6], ['z', 'Forward', -4, 15, 0.1, 0], ['fov', 'Lens', 20, 75, 1, 50],
]

/** One shot (0 = camera, then camera_more): its length moves the later shots; its end pose is the next shot's start. */
function Shot({ player, sceneIndex, k, cam }: { player: Player; sceneIndex: number; k: number; cam: CameraMove }) {
  const sp: Path = ['scenes', sceneIndex]
  const cp: Path = k === 0 ? [...sp, 'camera'] : [...sp, 'camera_more', k - 1]
  const scene = () => player.doc.lesson.scenes[sceneIndex]
  return (
    <div className="flex flex-col gap-1 pt-2">
      <Range label="Duration" min={2} max={20} step={0.5} value={cam.dur_s ?? sceneDuration(scene())}
        onChange={(v) => player.doc.set(sp, setShotDuration(scene(), k, v), 'Shot length')} />
      {(['from', 'to'] as const).map((end) => (
        <div key={end} className="flex flex-col gap-1">
          <span className="text-xs opacity-60">{end === 'from' ? 'Start' : 'End'}</span>
          {POSE.map(([f, label, min, max, step, fb]) => (
            <Range key={f} label={label} min={min} max={max} step={step} value={cam[end]?.[f] ?? fb}
              onChange={(v) => player.doc.set(sp, setShotPose(scene(), k, end, f, v), `Shot ${label}`)} />
          ))}
        </div>
      ))}
      <select className="select select-xs" value={cam.ease ?? 'inOut'} onChange={(e) => player.doc.set([...cp, 'ease'], e.target.value as Ease, 'Ease')}>
        {EASE_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

/** The scene's shots as a segmented list; the picked one's controls below it. */
function Shots({ player, sceneIndex }: { player: Player; sceneIndex: number }) {
  const s = player.doc.lesson.scenes[sceneIndex]
  const shots = [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as CameraMove[]
  const [pick, setPick] = useState(0)
  const k = Math.min(pick, shots.length - 1)
  if (!shots.length) return (
    <div className="mt-1 flex flex-col gap-1">
      <Range label="Duration" min={2} max={40} step={0.5} value={sceneDuration(s)} onChange={(v) => player.doc.set(['scenes', sceneIndex, 'dur_s'], v, 'Scene length')} />
      <button className="btn btn-xs" onClick={() => player.doc.set(['scenes', sceneIndex, 'camera'], { move: 'truck', from: { x: -2, y: 1.6, z: 0, fov: 50 }, to: { x: 2, y: 1.6, z: 0, fov: 50 }, ease: 'inOut', dur_s: sceneDuration(s), at_s: 0 }, 'Camera move')}>Add a camera move</button>
    </div>
  )
  return (
    <div className="mt-1">
      <div className="tabs tabs-box tabs-xs" role="tablist" aria-label="Shots">
        {shots.map((c, i) => (
          <input key={i} type="radio" name={`shot-${sceneIndex}`} className="tab" role="tab" aria-label={`Shot ${i + 1}`} checked={i === k} onChange={() => setPick(i)} />
        ))}
      </div>
      <Shot player={player} sceneIndex={sceneIndex} k={k} cam={shots[k]} />
    </div>
  )
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

function ScenePanel({ player }: { player: Player }) {
  // the dev page's stand-in for S5's interaction card: Continue ends the hold
  const resumeHold = useRef<(() => void) | null>(null)
  useEffect(() => player.onInteraction((_, resume) => { resumeHold.current = resume }), [player])
  const lesson = useSyncExternalStore((fn) => player.doc.subscribe(fn), () => player.doc.lesson)
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  const { index, t, mode } = player.scene()
  const holding = mode === 'holding'
  const s = lesson.scenes[index]
  const sp: Path = ['scenes', index]
  const cam = s.camera
  void tick
  return (
    <div className="lg:fixed lg:right-3 lg:top-3 lg:bottom-3 lg:w-80 lg:overflow-y-auto" data-testid="stage-panel">
    {/* the studio's one panel kit; the column around it does the placing, so the panel itself sits static */}
    <Panel id="stage-scene" className="rounded-box border border-base-300 p-3 text-sm" style={{ position: 'static', width: '100%', minHeight: '100%' }}>
      <div className="flex items-center gap-2">
        {holding
          ? <button className="btn btn-sm btn-primary" data-testid="continue" onClick={() => resumeHold.current?.()}>Continue</button>
          : <button className="btn btn-sm btn-primary" onClick={() => (mode === 'playing' ? player.pause() : player.resume())}>{mode === 'playing' ? 'Pause' : 'Play'}</button>}
        <button className="btn btn-sm btn-ghost" disabled={!player.doc.history.canUndo()} onClick={() => player.doc.undo()}>Undo</button>
        <button className="btn btn-sm btn-ghost" disabled={!player.doc.history.canRedo()} onClick={() => player.doc.redo()}>Redo</button>
        {mode === 'paused' && <span className="badge badge-sm badge-ghost" data-testid="paused">{__('Paused')}</span>}
        <button className="btn btn-sm btn-ghost" data-testid="open-look" onClick={() => panels.open('stage-look')}>{__('Look')}</button>
        <span className="ml-auto text-xs tabular-nums opacity-70" data-testid="fps">{player.fps()} fps</span>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs">
        <span className="opacity-70">Sharpness</span>
        <select className="select select-xs w-32" value={player.stage.renderCap} onChange={(e) => player.stage.setRenderCap(Number(e.target.value))}>
          {RENDER_CAPS.map((c) => <option key={c} value={c}>up to {c} px</option>)}
        </select>
        <span className="ml-auto tabular-nums opacity-70" data-testid="render-size">{player.stage.engine.getRenderWidth()} x {player.stage.engine.getRenderHeight()}</span>
      </label>
      <div className="join mt-3 flex flex-wrap">
        {lesson.scenes.map((sc, i) => (
          <button key={sc.id} className={`btn btn-xs join-item ${i === index ? 'btn-active' : ''}`} onClick={() => void player.seek(i)}>{sc.id}</button>
        ))}
      </div>
      <progress className="progress mt-2 w-full" value={t} max={sceneDuration(s)} />
      <div className="flex text-xs tabular-nums opacity-70" data-testid="clock"><span>{fmt(player.clock())} / {fmt(player.duration())}</span>{holding && <span className="ml-auto">{s.interaction?.type}</span>}</div>
      {s.interaction && (
        <div className="mt-2 flex flex-col gap-1">
          <Num player={player} path={['hold', 'breath_m']} label="Hold drift" min={0} max={0.3} step={0.01} fallback={HOLD_DEFAULTS.breath_m} />
          <Num player={player} path={['hold', 'breath_s']} label="Hold tempo" min={2} max={20} step={0.5} fallback={HOLD_DEFAULTS.breath_s} />
        </div>
      )}
      <h3 className="mt-3 font-semibold">Ground</h3>
      <div className="mt-1 flex flex-col gap-1">
        <select className="select select-xs" data-testid="ground" value={s.set.ground ?? ''} onChange={(e) => player.doc.set([...sp, 'set', 'ground'], e.target.value || undefined, 'Ground')}>
          <option value="">{groundOptions(player.stage.sceneLib).length ? 'Ground of the bundle' : 'Paper'}</option>
          {groundOptions(player.stage.sceneLib).map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <select className="select select-xs" data-testid="near" value={s.set.near ?? ''} onChange={(e) => player.doc.set([...sp, 'set', 'near'], e.target.value || undefined, 'Near ground')}>
          <option value="">Near ground of the bundle</option>
          <option value="none">No near ground</option>
          {nearOptions(player.stage.sceneLib).map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <Num player={player} path={[...sp, 'set', 'horizon']} label="Horizon" min={-80} max={30} step={0.1} fallback={player.stage.horizonOf(s)} />
        {typeof s.set.horizon === 'number'
          ? <button type="button" className="btn btn-ghost btn-xs self-start" data-testid="horizon-auto" onClick={() => player.doc.set([...sp, 'set', 'horizon'], 'auto', 'Horizon')}>Auto horizon</button>
          : <Num player={player} path={[...sp, 'set', 'land_target']} label="Land line" min={0.2} max={0.7} step={0.01} fallback={LAND_TARGET} />}
      </div>
      <h3 className="mt-3 flex items-baseline font-semibold">Camera<span className="ml-auto text-xs font-normal tabular-nums opacity-70" data-testid="scene-length">{sceneDuration(s).toFixed(1)} s</span></h3>
      <Shots key={index} player={player} sceneIndex={index} />
      <h3 className="mt-3 font-semibold">Layers</h3>
      {s.set.layers.map((l, i) => {
        const lp: Path = [...sp, 'set', 'layers', i]
        const m: MotionSpec = typeof l.motion === 'string' ? { kind: l.motion } : l.motion ?? {}
        return (
          <div key={i} className="mt-2 flex flex-col gap-1 border-t border-base-300 pt-2">
            <span className="text-xs font-medium">{String(l.asset ?? l.need)} <span className="opacity-60">{l.depth}</span></span>
            <Num player={player} path={[...lp, 'x']} label="Place" min={0} max={1} step={0.01} fallback={0.5} />
            <Num player={player} path={[...lp, 'scale']} label="Size" min={0.3} max={3} step={0.05} fallback={1} />
            <select className="select select-xs" value={m.kind ?? ''} onChange={(e) => player.doc.set([...lp, 'motion', 'kind'], e.target.value || undefined, 'Motion')}>
              <option value="">Motion of the picture</option><option value="none">Still</option><option value="sway">Sway</option>
              <option value="drift">Drift</option><option value="ripple">Ripple</option><option value="flicker">Flicker</option>
            </select>
            <Num player={player} path={[...lp, 'motion', 'amount']} label="Motion" min={0} max={3} step={0.05} fallback={1} />
            <Num player={player} path={[...lp, 'motion', 'speed']} label="Tempo" min={0.1} max={3} step={0.05} fallback={1} />
            {resolveAsset(player.stage.sceneLib, l, l.depth)?.layer === 'bg' && <Num player={player} path={[...lp, 'feather']} label="Soft edge" min={0} max={0.6} step={0.01} fallback={BG_FEATHER} />}
            {l.depth !== 'sky' && l.depth !== 'bg' && (
              <label className="label cursor-pointer justify-start gap-2 py-0 text-xs">
                <input type="checkbox" className="toggle toggle-xs" checked={!!l.flat} onChange={(e) => player.doc.set([...lp, 'flat'], e.target.checked || undefined, 'Flat on the ground')} />
                Flat on the ground
              </label>
            )}
            {STANDING.includes(l.depth) && !l.flat && <Num player={player} path={[...lp, 'shadow']} label="Shadow" min={0} max={1} step={0.05} fallback={STAIN_DEFAULT} />}
          </div>
        )
      })}
    </Panel>
    </div>
  )
}

const Loading = () => (
  <div className="rounded-box border border-base-300 bg-base-100 p-3 lg:fixed lg:right-3 lg:top-3 lg:w-80"><span className="loading loading-dots loading-sm opacity-60" /></div>
)

// wide: the stage left, the panel fixed on the right; narrow (below lg): the panel under the stage, the page scrolls
let player: Player | null = null

async function main() {
  const root = document.getElementById('root')!
  root.className = 'h-full overflow-y-auto bg-base-200 p-3 lg:overflow-hidden'
  const canvas = document.createElement('canvas')
  canvas.className = 'block w-full outline-none lg:w-[calc(100%-21rem)]'
  canvas.style.aspectRatio = '16 / 9'
  root.appendChild(canvas)
  const ui = root.appendChild(document.createElement('div'))
  ui.className = 'mt-3 lg:mt-0'
  canvas.addEventListener('click', () => { if (player?.scene().mode === 'paused') player.resume() })   // the next tap plays
  const app = createRoot(ui)
  app.render(<Loading />)                // the frame and panel show at once; the lesson fills them when it has loaded
  await loadLocale()
  player = await playLesson(lessonUrl, libraryUrl, canvas)
  panels.open('stage-scene')
  Object.assign(window, { __stage25d: player })
  app.render(<StrictMode><ScenePanel player={player} /><LookPanel player={player} /></StrictMode>)
}
main().catch((err) => { console.error(err); document.body.textContent = String(err) })
