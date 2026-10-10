// The ONE panel. Docked panels (left, right, bottom) slide in from their own edge and the stage gives
// them the room; a floating panel rises 8px and fades; a menu drops 4px and fades under its button.
// Motion: enter = --ease-enter over --panel-in, exit = --ease-exit over --panel-out (studio.css).
// Closing: X on every closable panel; Esc closes the newest overlay (menu, floating); an outside
// press closes a menu. The body stays mounted when closed: the engine binds to its controls by id.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { PANELS, inStep, panels, usePanels } from './store'
import { stepOf, useLesson } from '../lesson/store'
import { ResizeHandle } from './ResizeHandle'

const X_MARK = 'M6 18 18 6M6 6l12 12'
/** The bottom dock never takes more than this share of the screen height: the canvas keeps the rest. */
const BOTTOM_MAX_VH = 40

export function CloseButton({ id }: { id: string }) {
  return (
    <button type="button" aria-label={`Close ${panels.def(id).title}`} data-tooltip="Close" onClick={() => panels.close(id)}
            className="absolute right-2 top-2 z-10 grid h-7 w-7 cursor-pointer place-items-center rounded text-panel-label hover:bg-white/5 hover:text-white">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={X_MARK} />
      </svg>
    </button>
  )
}

type Props = { id: string; children: ReactNode; anchor?: RefObject<HTMLElement | null>; className?: string; style?: React.CSSProperties }

export function Panel({ id, children, anchor, className = '', style }: Props) {
  const st = usePanels()
  const step = stepOf(useLesson().lesson)
  const d = panels.def(id)
  const open = !!st.open[id] && inStep(id, step)
  // a side holding more than one panel in this step shows them as tabs (Settings | Crew)
  const siblings = d.place === 'left' || d.place === 'right' ? PANELS.filter((p) => p.place === d.place && inStep(p.id, step)) : []
  const size = panels.sizeOf(id)
  const body = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // a menu sits under its button, kept on screen
  useEffect(() => {
    if (d.place !== 'menu' || !open || !anchor?.current) return
    const r = anchor.current.getBoundingClientRect()
    const w = body.current?.offsetWidth ?? 220
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) })
  }, [open, d.place, anchor])

  // a press outside a menu (and outside its button) closes it
  useEffect(() => {
    if (d.place !== 'menu' || !open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (body.current?.contains(t) || anchor?.current?.contains(t)) return
      panels.close(id)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [open, d.place, id, anchor])

  const docked = d.place === 'left' || d.place === 'right' || d.place === 'bottom'
  const showX = d.closable && d.place !== 'menu'
  const inner = (
    <div ref={body} className={`panel-body ${className}`} data-panel={id} data-place={d.place} data-open={open} inert={!open}
         aria-hidden={!open} role={d.place === 'menu' ? 'menu' : 'region'} aria-label={d.title}
         style={{ ...(docked ? (d.place === 'bottom' ? { height: `min(${size}px, ${BOTTOM_MAX_VH}dvh)` } : { width: size }) : {}), ...(d.place === 'menu' && pos ? { top: pos.top, left: pos.left } : {}), ...style }}>
      {showX && <CloseButton id={id} />}
      {siblings.length > 1 && (
        <div className="flex shrink-0 items-center border-b border-panel-hairline py-1.5 pl-3 pr-10">
          <div className="tabs tabs-box tabs-panel" role="tablist" aria-label={`${d.place} panels`}>
            {siblings.map((p) => (
              <input key={p.id} type="radio" name={`side-${id}`} className="tab" role="tab" aria-label={p.title}
                     checked={p.id === id} onChange={() => panels.open(p.id)} />
            ))}
          </div>
        </div>
      )}
      {children}
      {docked && d.min !== undefined && <ResizeHandle id={id} />}
    </div>
  )
  if (!docked) return inner
  // the slot animates its width/height (the stage gives way); the body slides inside it
  return (
    <div className="panel-slot" data-place={d.place} data-open={open}
         style={{ [d.place === 'bottom' ? 'height' : 'width']: open ? (d.place === 'bottom' ? `min(${size}px, ${BOTTOM_MAX_VH}dvh)` : size) : 0, gridArea: id }}>
      {inner}
    </div>
  )
}
