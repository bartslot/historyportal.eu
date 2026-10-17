// The scene graph (Figma 2087:1059): beside the script, per scene a grid of 16:10 clay frames, one per shot, each
// with its letter. A frame and its line are one thing: picking either selects both; a new line is a new frame.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from '../panels/Panel'
import { panels } from '../panels/store'
import * as L from '../lesson/store'
import { scenesInOrder } from '../lesson/tree'
import { RIMS } from '../engine/clay-kit'
import { Icon } from '../ui/icons'
import { __ } from '../i18n'
import { renderShot, type Palette, type Rims } from './clay'
import { idOf, nodesOfJson, shotData, shotsOf, speakerOf, type ScriptNode, type ShotData, type ShotRef } from './shots'
import { storyboard, useStoryboard } from './store'

const ADJUST = 'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75'

/** One rim colour per character for the whole lesson, in the order they first speak. */
export function rimsOf(nodes: ScriptNode[]): Rims {
  const ids = [...new Set(nodes.map((n) => speakerOf(n.attrs)).filter((s): s is string => !!s).map(idOf))]
  return Object.fromEntries(ids.map((id, i) => [id, RIMS[i % RIMS.length]]))
}

function Frame({ shot, data, current, palette, rims }: { shot: ShotRef; data: ShotData; current: boolean; palette: Palette; rims: Rims }) {
  const [url, setUrl] = useState<string | null>(null)
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    renderShot(data, palette, rims).then((u) => { if (live) setUrl(u) }).catch((e) => console.error('[clay frame]', e))
    return () => { live = false }
  }, [data, palette, rims])
  useEffect(() => { if (current) el.current?.scrollIntoView({ block: 'nearest' }) }, [current])
  const open = () => { storyboard.pickLine(shot.id); storyboard.direct(shot.id); panels.open('director') }
  return (
    <div ref={el} className="shot-frame" aria-current={current} role="button" tabIndex={0}
         aria-label={__('Shot :letter', { letter: shot.letter })}
         onClick={() => storyboard.pickLine(shot.id)} onDoubleClick={open}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); storyboard.pickLine(shot.id) } }}>
      {url && <img src={url} alt="" draggable={false} />}
      <span className="pointer-events-none absolute left-1.5 top-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-panel-tile-glyph">{shot.letter}</span>
      <button type="button" aria-label={__('Direct shot :letter', { letter: shot.letter })} data-tooltip={__('Direct')}
              onClick={(e) => { e.stopPropagation(); open() }}
              className="absolute right-0.5 top-0.5 grid h-5 w-5 cursor-pointer place-items-center rounded text-panel-tile-glyph hover:text-white">
        <Icon d={ADJUST} className="h-3 w-3" />
      </button>
    </div>
  )
}

export function SceneGraph() {
  const { lesson } = L.useLesson()
  const sb = useStoryboard()
  const nodes = useMemo(() => nodesOfJson(lesson.script), [lesson.script])
  const shots = useMemo(() => shotsOf(nodes), [nodes])
  const rims = useMemo(() => rimsOf(nodes), [nodes])
  // a shot's data keeps its identity while nothing about it changed, so its frame does not render again
  const memo = useRef(new Map<string, { json: string; data: ShotData }>())
  const dataOf = (s: ShotRef) => {
    const data = shotData(s, nodes, lesson.shots)
    const json = JSON.stringify(data)
    const prev = memo.current.get(s.id)
    if (prev?.json === json) return prev.data
    memo.current.set(s.id, { json, data })
    return data
  }
  const scenes = scenesInOrder(lesson.tree)
  return (
    <Panel id="scenegraph">
      <div className="flex shrink-0 items-center gap-2 border-b border-panel-hairline py-2 pl-4 pr-10">
        <h2 className="text-[8px] font-semibold uppercase tracking-[0.5px] text-white">{__('Scene graph')}</h2>
        <div className="tabs tabs-box tabs-panel ml-auto" role="tablist" aria-label={__('Frames')}>
          {(['clay', 'silhouette'] as const).map((p) => (
            <input key={p} type="radio" name="frame-palette" className="tab" role="tab" aria-label={p === 'clay' ? __('Clay') : __('Silhouette')}
                   checked={sb.palette === p} onChange={() => storyboard.setPalette(p)} />
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {scenes.map((scene) => {
          const mine = shots.filter((s) => s.sceneId === scene.id)
          if (!mine.length) return null
          return (
            <section key={scene.id} aria-label={scene.title} className="pt-4">
              <div className="grid grid-cols-2 gap-2.5">
                {mine.map((s) => (
                  <Frame key={s.id} shot={s} data={dataOf(s)} palette={sb.palette} rims={rims}
                         current={!!sb.line && s.lineIds.includes(sb.line)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </Panel>
  )
}
