// The lesson's scenes along the top of the bottom dock, in playing order: each a block as wide as the
// scene is long, with its picture and name; a group is a bracket over its scenes (groups in groups).
// Click a scene to open it; drag one onto another to put it before, onto a group's bracket to put it
// inside; double-click a name to rename it. Replaces the left scene rail (Bart 2026-10-10).
import { useState, type DragEvent, type ReactNode } from 'react'
import * as L from '../lesson/store'
import * as Tree from '../lesson/tree'
import * as TL from '../timeline/model'
import { ICON, Icon } from '../ui/icons'
import { __ } from '../i18n'

const PX_PER_SECOND = 14
const MIN_BLOCK_PX = 104
const DEFAULT_SECONDS = 8
const DRAG_TYPE = 'application/x-hp-node'

/** Double-click a name to rename it in place; Enter keeps, Esc cancels. */
function Name({ node, className }: { node: Tree.TreeNode; className: string }) {
  const [editing, setEditing] = useState(false)
  if (!editing) return <span className={className} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}>{node.title}</span>
  return (
    <input autoFocus defaultValue={node.title} aria-label={__('Name')} onClick={(e) => e.stopPropagation()}
           className="min-w-0 flex-1 rounded bg-panel-hairline px-1 text-xs text-panel-value focus:outline-none"
           onKeyDown={(e) => {
             if (e.key === 'Enter') e.currentTarget.blur()
             if (e.key === 'Escape') { e.stopPropagation(); e.currentTarget.value = node.title; setEditing(false) }
           }}
           onBlur={(e) => { const t = e.currentTarget.value.trim(); if (t && t !== node.title) L.editTree((tr) => Tree.rename(tr, node.id, t)); setEditing(false) }} />
  )
}

function useDrag() {
  const [over, setOver] = useState<string | null>(null)
  const props = (node: Tree.TreeNode) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => { e.dataTransfer.setData(DRAG_TYPE, node.id); e.dataTransfer.effectAllowed = 'move' },
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.stopPropagation(); setOver(node.id) } },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setOver(null)
      const id = e.dataTransfer.getData(DRAG_TYPE)
      if (id) L.editTree((t) => Tree.dropOn(t, id, node.id))
    },
  })
  return { over, props }
}

export function SceneStrip() {
  const { lesson, current } = L.useLesson()
  const duration = TL.useTimeline().duration
  const { over, props } = useDrag()
  const secondsOf = (id: string) => (id === current ? duration : lesson.scenes[id]?.doc?.timeline?.duration ?? DEFAULT_SECONDS)
  const ring = (id: string) => (over === id ? 'outline outline-1 -outline-offset-1 outline-white/60' : '')

  const render = (nodes: Tree.TreeNode[]): ReactNode[] => nodes.map((node) => {
    if (node.kind === 'group') {
      return (
        <div key={node.id} role="group" aria-label={node.title} className="flex shrink-0 flex-col gap-1">
          <div {...props(node)} className={`group/g flex items-center gap-1 border-t border-panel-label/50 pt-0.5 ${ring(node.id)}`}>
            <button type="button" onClick={() => L.editTree((t) => Tree.toggleOpen(t, node.id))} aria-label={node.open ? __('Fold') : __('Unfold')}
                    className="grid h-4 w-4 place-items-center text-panel-label hover:text-white">
              <Icon d={ICON.chevronRight} className={`h-3 w-3 transition-transform ${node.open ? 'rotate-90' : ''}`} />
            </button>
            <Name node={node} className="truncate text-3xs font-semibold uppercase tracking-wide text-panel-title" />
            <button type="button" aria-label={__('Delete group')} data-tooltip={__('Delete group')}
                    onClick={() => { if (confirm(__('Delete ":name" and every scene in it?', { name: node.title }))) void L.deleteNode(node.id) }}
                    className="ml-auto hidden h-4 w-4 place-items-center text-panel-label hover:text-white group-hover/g:grid"><Icon d={ICON.trash} className="h-3 w-3" /></button>
          </div>
          {node.open && <div className="flex gap-1">{render(node.children)}</div>}
        </div>
      )
    }
    const on = node.id === current
    const thumb = lesson.scenes[node.id]?.thumb
    const seconds = secondsOf(node.id)
    return (
      <div key={node.id} {...props(node)} role="button" tabIndex={0} aria-pressed={on} aria-label={node.title} data-scene={node.id}
           onClick={() => void L.switchTo(node.id)} onKeyDown={(e) => { if (e.key === 'Enter') void L.switchTo(node.id) }}
           className={`group/s relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded border bg-base-100 ${on ? 'border-white' : 'border-panel-hairline hover:border-panel-label'} ${ring(node.id)}`}
           style={{ width: Math.max(MIN_BLOCK_PX, seconds * PX_PER_SECOND) }}>
        <span className="block h-10 w-full overflow-hidden">{thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5">
          <Name node={node} className={`min-w-0 flex-1 truncate text-xs ${on ? 'text-panel-value' : 'text-panel-label'}`} />
          <span className="shrink-0 text-3xs text-panel-label">{Math.round(seconds)} s</span>
        </span>
        <span className="absolute right-0.5 top-0.5 hidden gap-0.5 group-hover/s:flex group-focus-within/s:flex">
          <button type="button" aria-label={__('Put in a group')} data-tooltip={__('Put in a group')} onClick={(e) => { e.stopPropagation(); L.editTree((t) => Tree.group(t, node.id, __('New group')).tree) }}
                  className="grid h-5 w-5 place-items-center rounded bg-base-200/90 text-panel-label hover:text-white"><Icon d={ICON.folder} className="h-3 w-3" /></button>
          <button type="button" aria-label={__('Delete scene')} data-tooltip={__('Delete scene')} onClick={(e) => { e.stopPropagation(); if (confirm(__('Delete ":name"?', { name: node.title }))) void L.deleteNode(node.id) }}
                  className="grid h-5 w-5 place-items-center rounded bg-base-200/90 text-panel-label hover:text-white"><Icon d={ICON.trash} className="h-3 w-3" /></button>
        </span>
      </div>
    )
  })

  return (
    <div className="flex shrink-0 items-end gap-1 overflow-x-auto border-b border-panel-hairline px-4 py-2" aria-label={__('Scenes')}
         onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault() }}
         onDrop={(e) => { const id = e.dataTransfer.getData(DRAG_TYPE); if (id) L.editTree((t) => Tree.move(t, id, null)) }}>
      {render(lesson.tree)}
      <div className="ml-1 flex shrink-0 flex-col gap-1">
        <button type="button" className="btn btn-ghost btn-xs text-panel-value" onClick={() => void L.addScene()}>{__('Add scene')}</button>
        <button type="button" className="btn btn-ghost btn-xs text-panel-value" onClick={() => L.addGroup()}>{__('Add group')}</button>
      </div>
    </div>
  )
}
