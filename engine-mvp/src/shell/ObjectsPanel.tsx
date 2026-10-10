// The object list: everything in the scene and where it is. Things hang under what they are attached
// to (a picture on a house, a door in a wall); each row says where it stands, whether it moves and
// whether it is hidden. Hover a row and the object is boxed on the stage; double-click (or Find) flies
// the camera to it. Narrow the panel and it keeps only the icons (as the wizard's list does).
import { useEffect, useRef } from 'react'
import { useEngine, type SceneObject } from '../bridge'
import { Panel } from '../panels/Panel'
import { usePanels } from '../panels/store'
import * as TL from '../timeline/model'
import { ICON, Icon } from '../ui/icons'

/* eslint-disable @typescript-eslint/no-explicit-any */
const mvp = (): any => (window as any).__mvp
const COMPACT_BELOW_PX = 120
const INDENT_PX = 14

const iconOf = (o: SceneObject) => (o.kind === 'picture' ? ICON.photo : o.kind === 'door' ? ICON.door : o.character ? ICON.user : ICON.cube)

/** Two things with the same name read as "Crate" and "Crate 2". */
function labels(objects: SceneObject[]) {
  const seen = new Map<string, number>()
  return new Map(objects.map((o) => {
    const n = (seen.get(o.name) ?? 0) + 1
    seen.set(o.name, n)
    return [o.target, n > 1 ? `${o.name} ${n}` : o.name]
  }))
}

function RowButton({ label, d, onClick }: { label: string; d: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} data-tooltip={label} onClick={(e) => { e.stopPropagation(); onClick() }}
            className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-panel-label hover:bg-white/5 hover:text-white">
      <Icon d={d} />
    </button>
  )
}

export function ObjectsPanel() {
  const { objects, selected } = useEngine()
  const compact = usePanels().size.objects < COMPACT_BELOW_PX
  const names = labels(objects)
  const activeTarget = selected ? TL.targetOfId(selected.id) : null
  const list = useRef<HTMLUListElement>(null)

  // the row of whatever is selected on the stage comes into view
  useEffect(() => {
    if (activeTarget) list.current?.querySelector(`[data-obj="${activeTarget}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeTarget])
  // nothing stays boxed when the pointer leaves the list
  useEffect(() => () => mvp()?.locate?.highlight(null), [])

  const children = (parent: string | null) => objects.filter((o) => o.parent === parent)
  const rows = (parent: string | null, depth: number): React.ReactNode[] => children(parent).flatMap((o) => {
    const actor = () => TL.actorOf(o.target)
    const host = o.parent ? names.get(o.parent) : null
    const where = host ? `on ${host}` : `${o.x}, ${o.z} m`
    const active = o.target === activeTarget
    return [
      <li key={o.target} role="treeitem" aria-selected={active} aria-label={names.get(o.target)} data-obj={o.target}
          className={`group/row flex items-center gap-2 border-t border-panel-hairline pr-1 ${active ? 'bg-white/5' : 'hover:bg-white/5'} ${o.hidden ? 'opacity-50' : ''}`}
          style={{ paddingLeft: compact ? 0 : 12 + depth * INDENT_PX }}
          onMouseEnter={() => mvp().locate.highlight(actor())} onMouseLeave={() => mvp().locate.highlight(null)}>
        <button type="button" onClick={() => mvp().select(actor())} onDoubleClick={() => mvp().locate.frame(actor())}
                onFocus={() => mvp().locate.highlight(actor())} onBlur={() => mvp().locate.highlight(null)}
                data-tooltip={compact ? names.get(o.target) : undefined}
                className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left ${compact ? 'justify-center' : ''}`}>
          <span className="shrink-0 text-panel-icon"><Icon d={iconOf(o)} /></span>
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-panel-value">{names.get(o.target)}</span>
              <span className="block truncate text-3xs uppercase tracking-wide text-panel-label">{where}</span>
            </span>
          )}
        </button>
        {!compact && o.animated && (
          <span aria-label="Animated" data-tooltip="Moves on the timeline" className="grid h-6 w-4 shrink-0 place-items-center">
            <span className="-rotate-45 rounded-[1px] border border-panel-label" style={{ width: 7, height: 7 }} />
          </span>
        )}
        {!compact && (
          <span className="hidden gap-0.5 group-hover/row:flex group-focus-within/row:flex">
            <RowButton label="Find on the stage" d={ICON.find} onClick={() => mvp().locate.frame(actor())} />
            <RowButton label="Duplicate" d={ICON.duplicate} onClick={() => void mvp().duplicate(actor())} />
            <RowButton label="Delete" d={ICON.trash} onClick={() => { mvp().locate.highlight(null); mvp().deleteActor(actor()) }} />
          </span>
        )}
        {!compact && (
          <RowButton label={o.hidden ? `Show ${names.get(o.target)}` : `Hide ${names.get(o.target)}`} d={o.hidden ? ICON.eyeOff : ICON.eye}
                     onClick={() => TL.toggleHidden(o.target)} />
        )}
      </li>,
      ...rows(o.target, depth + 1),
    ]
  })

  return (
    <Panel id="objects">
      {!compact && <p className="py-3 pl-4 pr-10 text-2xs font-semibold tracking-wide text-panel-title">Objects</p>}
      {compact && <div className="h-10 shrink-0" />}
      <ul ref={list} role="tree" aria-label="Objects" className="min-h-0 flex-1 overflow-y-auto pb-2">{rows(null, 0)}</ul>
    </Panel>
  )
}
