// The scene rail: every scene of the lesson, in groups that can hold groups. Two views: Preview (the
// pictures only, small) and List (titles as an indented tree). Click a scene to open it; drag one onto
// another to put it before that one, onto a group's row to put it inside. Thumbnails are small
// screenshots of the scene, taken when you leave it and every few saves.
import { useState, type DragEvent, type ReactNode } from 'react'
import { Panel } from '../panels/Panel'
import { panels, usePanels } from '../panels/store'
import * as L from '../lesson/store'
import * as Tree from '../lesson/tree'
import { ICON as I, Icon } from '../ui/icons'

function SmallButton({ label, d, onClick, pressed }: { label: string; d: string; onClick: () => void; pressed?: boolean }) {
  return (
    <button type="button" aria-label={label} data-tooltip={label} aria-pressed={pressed} onClick={(e) => { e.stopPropagation(); onClick() }}
            className={`grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded hover:bg-white/5 hover:text-white ${pressed ? 'bg-white/10 text-panel-value' : 'text-panel-label'}`}>
      <Icon d={d} />
    </button>
  )
}

/** Double-click a title to rename it in place; Enter keeps, Esc cancels. */
function Title({ node, className }: { node: Tree.TreeNode; className: string }) {
  const [editing, setEditing] = useState(false)
  if (!editing) return <span className={className} onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}>{node.title}</span>
  return (
    <input autoFocus defaultValue={node.title} aria-label="Name"
           className="min-w-0 flex-1 rounded bg-panel-hairline px-1 text-xs text-panel-value focus:outline-none"
           onClick={(e) => e.stopPropagation()}
           onKeyDown={(e) => {
             if (e.key === 'Enter') e.currentTarget.blur()
             if (e.key === 'Escape') { e.stopPropagation(); e.currentTarget.value = node.title; setEditing(false) }
           }}
           onBlur={(e) => { const t = e.currentTarget.value.trim(); if (t && t !== node.title) L.editTree((tr) => Tree.rename(tr, node.id, t)); setEditing(false) }} />
  )
}

type Drop = { over: string | null }

/** Preview: pictures two to a row, groups across as labels. */
const GRID = 'grid grid-cols-2 content-start gap-1 px-2'

function Rows({ nodes, depth, preview, drop, setDrop }: { nodes: Tree.TreeNode[]; depth: number; preview: boolean; drop: Drop; setDrop: (d: Drop) => void }) {
  const { lesson, current } = L.useLesson()
  const dragProps = (node: Tree.TreeNode) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => { e.dataTransfer.setData('application/x-hp-node', node.id); e.dataTransfer.effectAllowed = 'move' },
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes('application/x-hp-node')) { e.preventDefault(); setDrop({ over: node.id }) } },
    onDragLeave: () => setDrop({ over: null }),
    onDrop: (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setDrop({ over: null })
      const id = e.dataTransfer.getData('application/x-hp-node')
      if (!id || id === node.id) return
      L.editTree((t) => {
        if (node.kind === 'group') return Tree.move(t, id, node.id)               // onto a group: inside it
        const parent = Tree.parentOf(t, node.id) ?? null                          // onto a scene: just before it
        const without = Tree.remove(t, id)
        const siblings = parent === null ? without : (Tree.find(without, parent) as Tree.GroupNode).children
        return Tree.move(t, id, parent, siblings.findIndex((n) => n.id === node.id))
      })
    },
  })
  const indent = { paddingLeft: 8 + depth * 14 }
  const rows: ReactNode[] = nodes.map((node) => {
    const target = drop.over === node.id ? 'outline outline-1 -outline-offset-1 outline-white/60' : ''
    if (node.kind === 'group') {
      return (
        <li key={node.id} role="treeitem" aria-expanded={node.open} aria-label={node.title} className={preview ? 'col-span-2' : ''}>
          <div {...dragProps(node)} className={`group/row flex items-center gap-1 py-1.5 pr-2 ${target}`} style={indent}>
            <button type="button" onClick={() => L.editTree((t) => Tree.toggleOpen(t, node.id))} aria-label={node.open ? 'Collapse' : 'Expand'}
                    className="grid h-5 w-5 place-items-center rounded text-panel-label hover:text-white">
              <Icon d={I.chevronRight} className={`h-3 w-3 transition-transform ${node.open ? 'rotate-90' : ''}`} />
            </button>
            <Title node={node} className="min-w-0 flex-1 truncate text-2xs font-semibold uppercase tracking-wide text-panel-title" />
            <span className="hidden gap-0.5 group-hover/row:flex group-focus-within/row:flex">
              <SmallButton label="Add a scene here" d={I.plus} onClick={() => void L.addScene(node.id)} />
              <SmallButton label="Delete group" d={I.trash} onClick={() => { if (confirm(`Delete "${node.title}" and every scene in it?`)) void L.deleteNode(node.id) }} />
            </span>
          </div>
          {node.open && <ul role="group" className={preview ? GRID : ''}><Rows nodes={node.children} depth={depth + 1} preview={preview} drop={drop} setDrop={setDrop} /></ul>}
        </li>
      )
    }
    const thumb = lesson.scenes[node.id]?.thumb
    const on = node.id === current
    const picture = (
      <span className={`block shrink-0 overflow-hidden rounded border ${on ? 'border-white' : 'border-panel-hairline'} bg-base-100 ${preview ? 'aspect-video w-full' : 'h-7 w-12'}`}>
        {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
      </span>
    )
    return (
      <li key={node.id} role="treeitem" aria-selected={on} aria-label={node.title}>
        <div {...dragProps(node)} onClick={() => void L.switchTo(node.id)} data-scene={node.id}
             className={`group/row flex cursor-pointer items-center gap-2 ${preview ? 'rounded p-0.5' : 'py-1 pr-2'} ${on && !preview ? 'bg-white/5' : ''} hover:bg-white/5 ${target}`}
             style={preview ? undefined : indent} data-tooltip={preview ? node.title : undefined}>
          {picture}
          {!preview && (
            <>
              <Title node={node} className={`min-w-0 flex-1 truncate text-xs ${on ? 'text-panel-value' : 'text-panel-label'}`} />
              <span className="hidden gap-0.5 group-hover/row:flex group-focus-within/row:flex">
                <SmallButton label="Put in a group" d={I.folder} onClick={() => L.editTree((t) => Tree.group(t, node.id, 'New group').tree)} />
                <SmallButton label="Delete scene" d={I.trash} onClick={() => { if (confirm(`Delete "${node.title}"?`)) void L.deleteNode(node.id) }} />
              </span>
            </>
          )}
        </div>
      </li>
    )
  })
  return <>{rows}</>
}

export function ScenesPanel() {
  const { lesson, error } = L.useLesson()
  const { railView } = usePanels()
  const [drop, setDrop] = useState<Drop>({ over: null })
  const preview = railView === 'preview'
  return (
    <Panel id="scenes">
      <div className="flex items-center gap-1 py-2 pl-4 pr-10">
        <span className="flex-1 text-2xs font-semibold tracking-wide text-panel-title">Scenes</span>
        <SmallButton label="Preview" d={I.grid} pressed={preview} onClick={() => panels.setRailView('preview')} />
        <SmallButton label="List" d={I.list} pressed={!preview} onClick={() => panels.setRailView('list')} />
      </div>
      {error && <p role="alert" className="mx-3 mb-2 rounded border border-panel-hairline p-2 text-xs text-panel-value">{error}</p>}
      <ul role="tree" aria-label="Scenes" className={`min-h-0 flex-1 overflow-y-auto pb-2 ${preview ? GRID : ''}`}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-hp-node')) e.preventDefault() }}
          onDrop={(e) => {   // onto empty rail: to the end of the lesson
            const id = e.dataTransfer.getData('application/x-hp-node')
            if (id) L.editTree((t) => Tree.move(t, id, null))
          }}>
        <Rows nodes={lesson.tree} depth={0} preview={preview} drop={drop} setDrop={setDrop} />
      </ul>
      <div className="flex gap-1 border-t border-panel-hairline p-2">
        <button type="button" className="btn btn-ghost btn-xs flex-1 text-panel-value" onClick={() => void L.addScene()}>Add scene</button>
        <button type="button" className="btn btn-ghost btn-xs flex-1 text-panel-value" onClick={() => L.addGroup()}>Add group</button>
      </div>
    </Panel>
  )
}
