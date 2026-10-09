// ONE resize handle for every docked panel: drag the inner edge, double-click to reset, arrow keys
// step it; the width is remembered by the panel store. (The wizard had three hand-written copies.)
import type { KeyboardEvent, PointerEvent } from 'react'
import { panels } from './store'

const KEY_STEP = 16

export function ResizeHandle({ id }: { id: string }) {
  const place = panels.def(id).place
  const horizontal = place !== 'bottom'
  // which way a positive pointer delta grows the panel: a right panel grows when dragged LEFT
  const sign = place === 'right' || place === 'bottom' ? -1 : 1

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    const start = horizontal ? e.clientX : e.clientY
    const from = panels.sizeOf(id)
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    document.documentElement.classList.add('panel-resizing')
    const move = (ev: globalThis.PointerEvent) => panels.resize(id, from + sign * ((horizontal ? ev.clientX : ev.clientY) - start))
    const up = () => {
      el.removeEventListener('pointermove', move)
      document.documentElement.classList.remove('panel-resizing')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up, { once: true })
    el.addEventListener('pointercancel', up, { once: true })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const grow = horizontal ? (e.key === 'ArrowLeft' ? -sign : e.key === 'ArrowRight' ? sign : 0) : (e.key === 'ArrowUp' ? -sign : e.key === 'ArrowDown' ? sign : 0)
    if (!grow) return
    e.preventDefault()
    panels.resize(id, panels.sizeOf(id) + grow * KEY_STEP)
  }

  return (
    <div role="separator" aria-orientation={horizontal ? 'vertical' : 'horizontal'} aria-label={`Resize ${panels.def(id).title}`}
         tabIndex={0} data-resize={id} data-place={place} className="panel-resize"
         onPointerDown={onPointerDown} onDoubleClick={() => panels.resetSize(id)} onKeyDown={onKeyDown} />
  )
}
