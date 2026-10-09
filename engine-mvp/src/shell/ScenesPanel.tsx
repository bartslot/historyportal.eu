// The scene rail: every scene of the lesson, in groups that can hold groups. Two views: Preview (the
// pictures only, small) and List (titles as an indented tree). Click a scene to open it; drag one onto
// another to put it before that one, onto a group's row to put it inside. Thumbnails are small
// screenshots of the scene, taken when you leave it and every few saves.
import { useState, type DragEvent, type ReactNode } from 'react'
import { Panel } from '../panels/Panel'
import { panels, usePanels } from '../panels/store'
import * as L from '../lesson/store'
import * as Tree from '../lesson/tree'

const Icon = ({ d, className = 'h-3.5 w-3.5' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)
const I = {
  chevron: 'm8.25 4.5 7.5 7.5-7.5 7.5',
  grid: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  list: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
  plus: 'M12 4.5v15m7.5-7.5h-15',
  folder: 'M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z',
  trash: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
}

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
              <Icon d={I.chevron} className={`h-3 w-3 transition-transform ${node.open ? 'rotate-90' : ''}`} />
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
