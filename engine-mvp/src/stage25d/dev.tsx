// Dev page: stage25d.html?lesson=<url>&library=<url>. The stage fills the frame; a small panel holds every
// motion and timing value of the scene on screen, each change one undo step.
import '../studio.css'
import { StrictMode, useEffect, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { playLesson, type Player } from './stage'
import { getIn, type Path } from './edits'
import { sceneDuration } from './layout'
import type { Ease, MotionSpec } from './types'

const q = new URLSearchParams(location.search)
const lessonUrl = q.get('lesson') ?? 'lessons/_placeholder.json'
const libraryUrl = q.get('library') ?? undefined

function Num({ player, path, label, min, max, step, fallback }: { player: Player; path: Path; label: string; min: number; max: number; step: number; fallback: number }) {
  const raw = getIn(player.doc.lesson, path)
  const v = typeof raw === 'number' ? raw : fallback
  return (
    <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-xs">
      <span className="opacity-70">{label}</span>
      <input type="range" className="range range-xs" min={min} max={max} step={step} value={v}
        onChange={(e) => player.doc.set(path, Number(e.target.value), label)} />
      <span className="tabular-nums text-right">{v.toFixed(step < 1 ? 2 : 0)}</span>
    </label>
  )
}

function Panel({ player }: { player: Player }) {
  const lesson = useSyncExternalStore((fn) => player.doc.subscribe(fn), () => player.doc.lesson)
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(id) }, [])
  const { index, t, playing } = player.scene()
  const s = lesson.scenes[index]
  const sp: Path = ['scenes', index]
  const cam = s.camera
  void tick
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-3 text-sm lg:fixed lg:right-3 lg:top-3 lg:bottom-3 lg:w-80 lg:overflow-y-auto" data-testid="stage-panel">
      <div className="flex items-center gap-2">
        <button className="btn btn-sm btn-primary" onClick={() => (playing ? player.pause() : player.play())}>{playing ? 'Pause' : 'Play'}</button>
        <button className="btn btn-sm btn-ghost" disabled={!player.doc.history.canUndo()} onClick={() => player.doc.undo()}>Undo</button>
        <button className="btn btn-sm btn-ghost" disabled={!player.doc.history.canRedo()} onClick={() => player.doc.redo()}>Redo</button>
        <span className="ml-auto text-xs tabular-nums opacity-70" data-testid="fps">{player.fps()} fps</span>
      </div>
      <div className="join mt-3 flex flex-wrap">
        {lesson.scenes.map((sc, i) => (
          <button key={sc.id} className={`btn btn-xs join-item ${i === index ? 'btn-active' : ''}`} onClick={() => void player.seek(i)}>{sc.id}</button>
        ))}
      </div>
      <progress className="progress mt-2 w-full" value={t} max={sceneDuration(s)} />
      <h3 className="mt-3 font-semibold">Camera</h3>
      {cam ? (
        <div className="mt-1 flex flex-col gap-1">
          <Num player={player} path={[...sp, 'camera', 'dur_s']} label="Duration" min={2} max={20} step={0.5} fallback={8} />
          {(['from', 'to'] as const).map((end) => (
            <div key={end} className="flex flex-col gap-1">
              <span className="text-xs opacity-60">{end === 'from' ? 'Start' : 'End'}</span>
              <Num player={player} path={[...sp, 'camera', end, 'x']} label="Sideways" min={-8} max={8} step={0.1} fallback={0} />
              <Num player={player} path={[...sp, 'camera', end, 'y']} label="Height" min={0.3} max={6} step={0.1} fallback={1.6} />
              <Num player={player} path={[...sp, 'camera', end, 'z']} label="Forward" min={-4} max={15} step={0.1} fallback={0} />
              <Num player={player} path={[...sp, 'camera', end, 'fov']} label="Lens" min={20} max={75} step={1} fallback={50} />
            </div>
          ))}
          <select className="select select-xs" value={cam.ease ?? 'inOut'} onChange={(e) => player.doc.set([...sp, 'camera', 'ease'], e.target.value as Ease, 'Ease')}>
            <option value="inOut">Ease in and out</option><option value="out">Ease out</option><option value="in">Ease in</option><option value="linear">Even</option>
          </select>
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-1">
          <Num player={player} path={[...sp, 'est_s']} label="Duration" min={2} max={20} step={0.5} fallback={8} />
          <button className="btn btn-xs" onClick={() => player.doc.set([...sp, 'camera'], { move: 'truck', from: { x: -2, y: 1.6, z: 0, fov: 50 }, to: { x: 2, y: 1.6, z: 0, fov: 50 }, ease: 'inOut', dur_s: s.est_s ?? 8 }, 'Camera move')}>Add a camera move</button>
        </div>
      )}
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
          </div>
        )
      })}
    </div>
  )
}

const Loading = () => (
  <div className="rounded-box border border-base-300 bg-base-100 p-3 lg:fixed lg:right-3 lg:top-3 lg:w-80"><span className="loading loading-dots loading-sm opacity-60" /></div>
)

// wide: the stage left, the panel fixed on the right; narrow (below lg): the panel under the stage, the page scrolls
async function main() {
  const root = document.getElementById('root')!
  root.className = 'h-full overflow-y-auto bg-base-200 p-3 lg:overflow-hidden'
  const canvas = document.createElement('canvas')
  canvas.className = 'block w-full outline-none lg:w-[calc(100%-21rem)]'
  canvas.style.aspectRatio = '16 / 9'
  root.appendChild(canvas)
  const ui = root.appendChild(document.createElement('div'))
  ui.className = 'mt-3 lg:mt-0'
  const app = createRoot(ui)
  app.render(<Loading />)                // the frame and panel show at once; the lesson fills them when it has loaded
  const player = await playLesson(lessonUrl, libraryUrl, canvas)
  Object.assign(window, { __stage25d: player })
  app.render(<StrictMode><Panel player={player} /></StrictMode>)
}
main().catch((err) => { console.error(err); document.body.textContent = String(err) })
