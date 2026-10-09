// The History Portal timeline, in React: resources/views/components/lesson/animation-timeline.blade.php
// ported once, same classes and tokens. Figma's split: the RULER scrubs, the TRACKS select (click,
// Shift+click, marquee); dragging a key moves the whole selection; double-click jumps to a key;
// a stretch between keys opens its easing; Cmd/Ctrl+wheel zooms about the pointer.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { keyId, snapToNearest } from '@hp/anim/timeline-edit.js'
import { easingFn, sortedKeys } from '@hp/anim/keyframes.js'
import {
  DRAG_THRESHOLD_PX, LANE_PAD_PX, fitZoom, sliderFromZoom, tickStep, ticksFor, timeAtX, toleranceSeconds, zoomFromSlider,
} from '@hp/anim/timeline-view.js'
import * as TL from './model'
import { useEngine } from '../bridge'
import { usePlacedLines } from '../script/player'
import { panels } from '../panels/store'
import { KeyframeDiamond } from '../ui/kit'

const GROUP_H = 38
const WHEEL_ZOOM_RATE = 0.01
const MIN_ZOOM = 2
const MAX_ZOOM = 2000
const ZOOM_STEPS = 1000
const EASING_PRESETS = ['linear', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInBack', 'easeOutBack', 'easeInOutBack', 'hold']
const EASING_LABEL: Record<string, string> = {
  auto: 'Automatic', linear: 'Linear', easeInCubic: 'Ease in', easeOutCubic: 'Ease out', easeInOutCubic: 'Ease in and out',
  easeInBack: 'Ease in back', easeOutBack: 'Ease out back', easeInOutBack: 'Ease in and out back', hold: 'Hold',
}
const round1 = (v: number) => Math.round(v * 10) / 10

/** A small picture of an easing curve, drawn from the same easing function playback uses. */
function curvePath(name: string) {
  const f = easingFn(name)
  return Array.from({ length: 21 }, (_, i) => {
    const t = i / 20
    return `${i ? 'L' : 'M'}${(t * 40).toFixed(1)},${(22 - f(t) * 20).toFixed(1)}`
  }).join(' ')
}

const Icon = ({ d, className = 'h-4 w-4', width = 1.5 }: { d: string; className?: string; width?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)
const PLAY = 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z'
const PAUSE = 'M15.75 5.25v13.5m-7.5-13.5v13.5'
const LOOP = 'M16.023 9.348h4.992V4.356M20.015 9.348a8.25 8.25 0 0 0-14.03-3.028L3 8.25m0 6.402h4.992v4.992M3 14.652a8.25 8.25 0 0 0 14.03 3.028L21 15.75'
const CHEVRON_L = 'M15.75 19.5 8.25 12l7.5-7.5'
const CHEVRON_R = 'm8.25 4.5 7.5 7.5-7.5 7.5'

function ToolButton({ label, pressed, disabled, onClick, children }: { label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} data-tooltip={label}
            aria-pressed={pressed === undefined ? undefined : pressed}
            className={`grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded hover:text-white disabled:cursor-default disabled:opacity-30 ${pressed ? 'bg-white/10 text-panel-value' : pressed === false ? 'text-panel-label' : 'text-panel-value'}`}>
      {children}
    </button>
  )
}

function MsField({ label, value, min, step, onChange }: { label: string; value: number; min: number; step: number; onChange: (ms: number) => void }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <span className="select-none text-3xs uppercase tracking-wide text-panel-label">{label}</span>
      <input type="number" min={min} step={step} value={Math.round(value * 1000)} onChange={(e) => onChange(Number(e.target.value))}
             className="h-7 w-16 rounded bg-panel-hairline px-1.5 text-right font-mono text-2xs text-panel-value focus:outline-none" />
      <span className="text-3xs text-panel-label">ms</span>
    </label>
  )
}

type Drag =
  | { kind: 'scrub' }
  | { kind: 'marquee'; startX: number; startY: number; moved: boolean; origin: { x: number; y: number }; base: string[] }
  | { kind: 'key'; startX: number; startY: number; moved: boolean; anchor: number; refs: TL.KeyRef[]; baseTracks: TL.Track[]; onClick: (() => void) | null }

export function Timeline() {
  const st = TL.useTimeline()
  const lines = usePlacedLines()
  // the object list follows the scene (things are added and deleted on the canvas); only floor objects animate
  const objects: TL.TimelineObject[] = useEngine().objects.filter((o) => o.kind === 'model').map((o) => ({ target: o.target, label: o.name }))
  const [zoom, setZoom] = useState(100)
  const [fitted, setFitted] = useState(100)
  const [zoomIsMine, setZoomIsMine] = useState(false)
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [easing, setEasing] = useState<{ target: string; property: string; index: number; top: number; left: number } | null>(null)
  const lanes = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  // fit the duration to the lanes until the teacher takes the zoom
  useLayoutEffect(() => {
    const el = lanes.current
    if (!el) return
    const measure = () => {
      const width = el.clientWidth - 2 * LANE_PAD_PX
      if (width > 0 && st.duration > 0) {
        const z = fitZoom(width, st.duration)
        setFitted(z)
        if (!zoomIsMine) setZoom(z)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [st.duration, zoomIsMine])

  const xOf = (t: number) => LANE_PAD_PX + t * zoom
  const rawTime = (clientX: number) => {
    const el = lanes.current!
    return timeAtX(clientX, el.getBoundingClientRect().left + LANE_PAD_PX, el.scrollLeft, zoom)
  }
  const timeAt = (clientX: number) => Math.min(st.duration, Math.max(0, rawTime(clientX)))
  const barStyle = (span: { from: number; to: number } | null) =>
    span ? { left: xOf(span.from), width: Math.max(2, xOf(span.to) - xOf(span.from)) } : { display: 'none' }

  // keep the playhead in view while playing
  useEffect(() => {
    const el = lanes.current
    if (!el || !st.playing) return
    const x = xOf(st.time)
    const margin = 40
    if (x < el.scrollLeft + margin) el.scrollLeft = Math.max(0, x - margin)
    else if (x > el.scrollLeft + el.clientWidth - margin) el.scrollLeft = x - el.clientWidth + margin
  })

  function applyZoom(next: number, anchor = st.time) {
    const el = lanes.current
    const before = xOf(anchor) - (el?.scrollLeft ?? 0)
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next || MIN_ZOOM))
    setZoom(z)
    setZoomIsMine(true)
    requestAnimationFrame(() => { if (el) el.scrollLeft = Math.max(0, LANE_PAD_PX + anchor * z - before) })
  }

  // ---------- pointer ----------
  const contentPoint = (e: { clientX: number; clientY: number }) => {
    const box = content.current!.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  function startScrub(e: RPE) {
    if (e.button !== 0) return
    e.stopPropagation()
    TL.pause()
    drag.current = { kind: 'scrub' }
    TL.seek(timeAt(e.clientX))
  }

  function startMarquee(e: RPE) {
    if (e.button !== 0) return
    drag.current = { kind: 'marquee', startX: e.clientX, startY: e.clientY, moved: false, origin: contentPoint(e), base: e.shiftKey ? [...st.selected] : [] }
  }

  function startMove(e: RPE, refs: TL.KeyRef[], anchor: number, onClick: (() => void) | null) {
    setEasing(null)
    drag.current = { kind: 'key', startX: e.clientX, startY: e.clientY, moved: false, anchor, refs, baseTracks: TL.getState().tracks, onClick }
  }

  function startKeyDrag(e: RPE, target: string, property: string, time: number) {
    if (e.button !== 0) return
    e.stopPropagation()
    TL.pause()
    const id = keyId({ target, property, time })
    const was = st.selected.includes(id)
    let onClick: (() => void) | null = null
    let selected = st.selected
    if (e.shiftKey) {
      if (was) onClick = () => TL.select(TL.getState().selected.filter((s) => s !== id))
      else selected = [...selected, id]
    } else if (was) onClick = () => TL.select([id])
    else selected = [id]
    TL.select(selected)
    const refs = TL.selectedRefs()
    startMove(e, refs, time, onClick)
  }

  function startSegment(e: RPE, target: string, property: string, index: number) {
    if (e.button !== 0) return
    e.stopPropagation()
    TL.pause()
    const refs = TL.refsOf(target, property)
    const rect = e.currentTarget.getBoundingClientRect()
    startMove(e, refs, Math.min(...refs.map((r) => r.time)), () => {
      const below = rect.bottom + 6
      const menuH = 330
      setEasing({
        target, property, index,
        top: below + menuH > window.innerHeight ? Math.max(8, rect.top - menuH - 6) : below,
        left: Math.min(window.innerWidth - 216, Math.max(8, rect.left + rect.width / 2 - 104)),
      })
    })
  }

  function startObjectBar(e: RPE, target: string) {
    if (e.button !== 0) return
    e.stopPropagation()
    TL.pause()
    const refs = TL.refsOf(target)
    startMove(e, refs, Math.min(...refs.map((r) => r.time)), () => TL.select(refs.map(keyId)))
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (d.kind === 'scrub') { TL.seek(timeAt(e.clientX)); return }
      if (!d.moved && Math.abs(e.clientX - d.startX) < DRAG_THRESHOLD_PX && Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD_PX) return
      d.moved = true
      if (d.kind === 'marquee') {
        const p = contentPoint(e)
        const o = d.origin
        const m = { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) }
        setMarquee(m)
        const box = content.current!.getBoundingClientRect()
        const r = { left: box.left + m.x, top: box.top + m.y, right: box.left + m.x + m.w, bottom: box.top + m.y + m.h }
        const hit = [...content.current!.querySelectorAll<HTMLElement>('[data-key-id]')]
          .filter((n) => n.offsetParent)
          .filter((n) => { const b = n.getBoundingClientRect(); return b.right >= r.left && b.left <= r.right && b.bottom >= r.top && b.top <= r.bottom })
          .map((n) => n.dataset.keyId!)
        TL.select([...new Set([...d.base, ...hit])])
        return
      }
      // a key drag: Shift snaps to other keys and the playhead; the playhead follows the drag
      const wanted = d.anchor + (e.clientX - d.startX) / zoom
      let snapped = wanted
      if (e.shiftKey) {
        const moving = new Set(d.refs.map(keyId))
        const others = d.baseTracks.flatMap((t) => sortedKeys(t)
          .filter((k: TL.Key) => !moving.has(keyId({ target: t.target, property: t.property, time: k.time })))
          .map((k: TL.Key) => k.time))
        snapped = snapToNearest(wanted, [TL.getState().time, ...others], toleranceSeconds(zoom))
      }
      const delta = TL.moveFrom(d.baseTracks, d.refs, snapped - d.anchor)
      if (!e.shiftKey) TL.seek(d.anchor + delta); else TL.applyFrame()
    }
    const onUp = () => {
      const d = drag.current
      if (d?.kind === 'key' && !d.moved) d.onClick?.()
      if (d?.kind === 'marquee' && !d.moved) TL.select(d.base)
      drag.current = null
      setMarquee(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const d = drag.current
      if (easing && !d) { setEasing(null); return }
      if (!d) { TL.select([]); return }
      if (d.kind === 'key') TL.setTracks(d.baseTracks)
      if (d.kind === 'marquee') TL.select(d.base)
      drag.current = null
      setMarquee(null)
    }
    // the easing menu closes on a press anywhere outside it
    const onDown = (e: PointerEvent) => {
      if (easing && !(e.target as HTMLElement).closest?.('[data-timeline-easing-menu]')) setEasing(null)
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
    }
  })

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    applyZoom(zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_RATE), rawTime(e.clientX))
  }

  const anyOpen = objects.some((o) => st.openGroups[o.target])
  const nothing = TL.nothingToPlay()
  const ticks: number[] = ticksFor(st.duration, tickStep(zoom))
  const contentWidth = Math.max(0, st.duration * zoom) + 2 * LANE_PAD_PX
  const seg = easing ? TL.segmentsOf(easing.target, easing.property)[easing.index] : null

  return (
    <div data-timeline className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--color-timeline-ground)' }}>
      <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto px-4" style={{ height: 44, background: 'var(--color-timeline-strip)' }}>
        <ToolButton label={st.playing ? 'Pause' : nothing ? 'Set two keyframes on a property to make something move' : 'Play'}
                    disabled={nothing && !st.playing} onClick={TL.togglePlay}>
          <Icon d={st.playing ? PAUSE : PLAY} />
        </ToolButton>
        <ToolButton label={st.autoKey ? 'Auto-keyframe on' : 'Auto-keyframe off'} pressed={st.autoKey} onClick={() => TL.setAutoKey(!st.autoKey)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8.5 15.5 12 12 15.5 8.5 12Z" fill={st.autoKey ? 'currentColor' : 'none'} />
          </svg>
        </ToolButton>
        <MsField label="Time" value={st.time} min={0} step={10} onChange={(ms) => TL.seek(ms / 1000)} />
        <MsField label="Length" value={st.duration} min={100} step={100} onChange={(ms) => TL.setDuration(ms / 1000)} />
        <ToolButton label={st.loop ? 'Looping' : 'Loop'} pressed={st.loop} onClick={() => TL.setLoop(!st.loop)}>
          <Icon d={LOOP} />
        </ToolButton>
        <span className="h-4 w-px shrink-0 bg-panel-hairline" aria-hidden="true" />
        <ToolButton label={anyOpen ? 'Collapse all' : 'Expand all'} onClick={() => TL.setGroups(objects.map((o) => o.target), !anyOpen)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-panel-label" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 10.5h10.5M3.75 15h6" />
            <path strokeLinecap="round" strokeLinejoin="round" d={anyOpen ? 'M15.5 13.5 18.5 16.5 21.5 13.5' : 'M15.5 16.5 18.5 13.5 21.5 16.5'} />
          </svg>
        </ToolButton>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="range-panel-knob" style={{ width: 88, '--range-t': sliderFromZoom(zoom, fitted) / ZOOM_STEPS } as React.CSSProperties}>
            <input type="range" min={0} max={ZOOM_STEPS} step={1} aria-label="Zoom" value={sliderFromZoom(zoom, fitted)}
                   style={{ '--range-t': sliderFromZoom(zoom, fitted) / ZOOM_STEPS } as React.CSSProperties}
                   onChange={(e) => applyZoom(zoomFromSlider(Number(e.target.value), fitted))} className="range-panel range range-xs" />
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        {/* labels and value fields */}
        <div className="shrink-0 border-r border-panel-hairline" style={{ width: 'var(--timeline-label-col)' }}>
          <div className="shrink-0" style={{ height: GROUP_H }} />
          {lines.length > 0 && (
            <div className="flex w-full items-center border-t border-panel-hairline pl-4" style={{ height: GROUP_H }}>
              <span className="truncate text-2xs font-semibold text-panel-value">Narration</span>
            </div>
          )}
          {!objects.length && !lines.length && <p className="px-4 pb-3 text-2xs text-panel-label">Nothing on this scene can be animated yet.</p>}
          {objects.map((o) => (
            <div key={o.target}>
              <div className={`flex w-full items-center border-t border-panel-hairline ${st.activeTarget === o.target ? 'bg-white/5' : ''}`} style={{ height: GROUP_H }}>
                <button type="button" onClick={() => { TL.select(TL.refsOf(o.target).map(keyId)); (window as any).__mvp?.select(TL.actorOf(o.target)) }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 pl-4 text-left" style={{ height: GROUP_H }}>
                  <span className="truncate text-2xs font-semibold text-panel-value">{o.label}</span>
                </button>
                <button type="button" onClick={() => TL.toggleGroup(o.target)} aria-expanded={!!st.openGroups[o.target]}
                        aria-label={st.openGroups[o.target] ? 'Collapse' : 'Expand'}
                        className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-panel-label hover:bg-white/5 hover:text-white">
                  <Icon d={CHEVRON_R} className={`h-3 w-3 transition-transform ${st.openGroups[o.target] ? 'rotate-90' : ''}`} />
                </button>
                <button type="button" onClick={() => TL.toggleHidden(o.target)} aria-pressed={!!st.hidden[o.target]}
                        data-tooltip={st.hidden[o.target] ? 'Show' : 'Hide'} aria-label={st.hidden[o.target] ? 'Show' : 'Hide'}
                        className={`mr-3 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded hover:bg-white/5 hover:text-white ${st.hidden[o.target] ? 'text-panel-label' : 'text-panel-icon'}`}>
                  {st.hidden[o.target]
                    ? <Icon className="h-3.5 w-3.5" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243" />
                    : <Icon className="h-3.5 w-3.5" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />}
                </button>
              </div>
              {st.openGroups[o.target] && TL.propertiesOf(o.target).map((p) => (
                <label key={p.key} className="flex items-center gap-1.5 pl-2 pr-4" style={{ height: 'var(--timeline-row-pitch)' }}>
                  <span className="mb-2 h-2.5 w-2 shrink-0 rounded-bl-[2px] border-b border-l border-panel-hairline" aria-hidden="true" />
                  <span className="shrink-0 select-none text-3xs uppercase tracking-wide text-panel-label" style={{ width: 'calc(var(--settings-panel-label-w) - 0.75rem)' }}>{p.label}</span>
                  <input type="number" step="any" aria-label={`${o.label} ${p.label}`} data-timeline-value={`${o.target}:${p.key}`}
                         key={`${st.time}:${st.canvasTick}:${st.tracks.length}`}
                         defaultValue={round1(TL.valueAt(o.target, p.key))}
                         onChange={(e) => TL.setValue(o.target, p.key, Number(e.target.value))}
                         className="h-[21px] min-w-0 flex-1 rounded bg-panel-hairline px-1.5 text-right font-mono text-3xs text-panel-value focus:outline-none" />
                  <button type="button" onClick={(e) => { e.preventDefault(); const t = TL.prevKeyTime(o.target); if (t !== null) TL.seek(t) }}
                          disabled={TL.prevKeyTime(o.target) === null} data-tooltip="Previous keyframe" aria-label="Previous keyframe"
                          className="shrink-0 rounded p-0.5 text-panel-label hover:bg-white/5 disabled:opacity-25">
                    <Icon d={CHEVRON_L} className="h-3 w-3" width={2} />
                  </button>
                  <span data-timeline-key={`${o.target}:${p.key}`}>
                    <KeyframeDiamond on={TL.hasKeyHere(o.target, p.key)} onClick={() => TL.toggleKey(o.target, p.key)} />
                  </span>
                  <button type="button" onClick={(e) => { e.preventDefault(); const t = TL.nextKeyTime(o.target); if (t !== null) TL.seek(t) }}
                          disabled={TL.nextKeyTime(o.target) === null} data-tooltip="Next keyframe" aria-label="Next keyframe"
                          className="shrink-0 rounded p-0.5 text-panel-label hover:bg-white/5 disabled:opacity-25">
                    <Icon d={CHEVRON_R} className="h-3 w-3" width={2} />
                  </button>
                </label>
              ))}
            </div>
          ))}
        </div>

        {/* lanes */}
        <div ref={lanes} data-timeline-lanes className="relative min-w-0 flex-1 overflow-x-auto" onWheel={onWheel}>
          <div ref={content} className="relative select-none" style={{ width: Math.max(contentWidth, 100) }} onPointerDown={startMarquee}>
            <div className="relative shrink-0 cursor-col-resize select-none" style={{ height: GROUP_H }} data-timeline-ruler onPointerDown={startScrub}>
              {ticks.map((t) => (
                <span key={t} className="absolute top-1.5 text-3xs text-panel-label" style={{ left: xOf(t) }}>{Math.round(t * 1000)}</span>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="relative" style={{ height: GROUP_H }} data-timeline-narration>
                {lines.map((l) => (
                  <button key={l.id} type="button" data-line-bar={l.id} data-tooltip={l.text}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => { TL.pause(); TL.seek(l.start); panels.open('script'); window.dispatchEvent(new CustomEvent('script:focus-line', { detail: l.id })) }}
                          className="absolute cursor-pointer overflow-hidden rounded-[3px] px-1.5 text-left text-3xs text-white/90 hover:brightness-125"
                          style={{ left: xOf(l.start), width: Math.max(2, (l.end - l.start) * zoom), top: 9, height: 'var(--timeline-lane-h)', background: 'var(--color-timeline-bar-group)' }}>
                    <span className="block truncate leading-[var(--timeline-lane-h)]">{l.speaker ? `${l.speaker}: ` : ''}{l.text}</span>
                  </button>
                ))}
              </div>
            )}
            {objects.map((o) => (
              <div key={o.target} className={st.activeTarget === o.target ? 'bg-white/5' : ''}>
                <div className="relative" style={{ height: GROUP_H }}>
                  <div className="absolute cursor-grab rounded-[3px]" data-timeline-bar-group={o.target} onPointerDown={(e) => startObjectBar(e, o.target)}
                       style={{ ...barStyle(TL.objectSpan(o.target)), top: 9, height: 'var(--timeline-lane-h)', background: 'var(--color-timeline-bar-group)' }} />
                </div>
                {st.openGroups[o.target] && TL.propertiesOf(o.target).map((p) => (
                  <div key={p.key} className="relative" style={{ height: 'var(--timeline-row-pitch)' }}>
                    <div className="absolute inset-x-0 top-0 rounded-[2px]" style={{ height: 'var(--timeline-lane-h)', background: 'var(--color-panel-hairline)' }} />
                    <div className="pointer-events-none absolute grid place-items-center overflow-hidden rounded-[2px]" data-timeline-bar={`${o.target}:${p.key}`}
                         style={{ ...barStyle(TL.spanOf(o.target, p.key)), top: 0, height: 'var(--timeline-lane-h)', background: 'var(--color-timeline-bar)' }}>
                      <span className="select-none truncate px-2 text-3xs font-medium text-white/90">{p.label}</span>
                    </div>
                    {TL.segmentsOf(o.target, p.key).map((s) => (
                      <div key={s.index} data-timeline-segment={`${o.target}:${p.key}:${s.index}`} data-tooltip={EASING_LABEL[s.easing] ?? s.easing}
                           className={`absolute cursor-grab rounded-[2px] hover:bg-white/10 ${easing && easing.target === o.target && easing.property === p.key && easing.index === s.index ? 'bg-white/20' : ''}`}
                           style={{ ...barStyle(s), top: 0, height: 'var(--timeline-lane-h)' }}
                           onPointerDown={(e) => startSegment(e, o.target, p.key, s.index)} />
                    ))}
                    {TL.keysOf(o.target, p.key).map((k) => {
                      const id = keyId({ target: o.target, property: p.key, time: k.time })
                      const on = st.selected.includes(id)
                      return (
                        <span key={k.time} data-key-id={id} data-timeline-diamond={`${o.target}:${p.key}`} aria-selected={on}
                              className="absolute grid cursor-grab place-items-center" style={{ left: xOf(k.time) - 6, top: 4, width: 12.872, height: 12.872 }}
                              onPointerDown={(e) => startKeyDrag(e, o.target, p.key, k.time)}
                              onDoubleClick={(e) => { e.stopPropagation(); TL.pause(); TL.select([id]); TL.seek(k.time) }}>
                          <span className={`-rotate-45 rounded-[1px] border border-white bg-white ${on ? 'outline-2 outline-offset-2 outline-white' : ''}`} style={{ width: 9.102, height: 9.102 }} />
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 w-px" data-timeline-playhead style={{ left: xOf(st.time), background: 'var(--color-timeline-mark)' }} />
            {marquee && <div className="pointer-events-none absolute border border-white/60 bg-white/10" data-timeline-marquee
                             style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
          </div>
        </div>
      </div>

      {easing && seg && (
        <div className="fixed z-50 w-52 rounded-box border border-panel-hairline bg-base-200 p-1" data-timeline-easing-menu
             style={{ top: easing.top, left: easing.left }} onPointerDown={(e) => e.stopPropagation()}>
          <ul className="menu menu-sm w-full p-0">
            {['auto', ...EASING_PRESETS].map((name) => {
              const auto = TL.segmentsOf(easing.target, easing.property).length
              const curve = name === 'auto' ? (TL.autoEasing(seg.index, auto)) : name
              const current = seg.chosen ? seg.easing : 'auto'
              return (
                <li key={name}>
                  <button type="button" data-easing={name} className={`flex items-center gap-2 ${current === name ? 'menu-active' : ''}`}
                          onClick={() => { TL.setSegmentEasing(easing.target, easing.property, easing.index, name); setEasing(null) }}>
                    <svg viewBox="0 0 40 24" className="h-4 w-7 shrink-0 overflow-visible" aria-hidden="true">
                      <path d={curvePath(curve)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="flex-1 text-left text-xs">{name === 'auto' ? `Automatic · ${EASING_LABEL[curve]}` : EASING_LABEL[name]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
