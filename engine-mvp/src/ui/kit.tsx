// The History Portal panel kit, ported ONCE from resources/views/components/ui/*.blade.php. Same class
// strings as the Blade components, so the studio and the wizard draw from one theme (resources/css/app.css).
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'

export function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

/** Figma `Title container`: a titled band that collapses. `name` remembers open/closed per viewer. */
export function SettingsSection({ title, open = true, name, children }: { title: string; open?: boolean; name?: string; children: ReactNode }) {
  const key = name ? `studio.section.${name}` : null
  const [isOpen, setOpen] = useState(() => {
    if (!key) return open
    try { const saved = localStorage.getItem(key); return saved === null ? open : saved === '1' } catch { return open }
  })
  const toggle = () => {
    setOpen((v) => {
      if (key) try { localStorage.setItem(key, v ? '0' : '1') } catch { /* private window: forget it */ }
      return !v
    })
  }
  return (
    <div className="w-full border-t border-panel-hairline">
      <button type="button" onClick={toggle} aria-expanded={isOpen} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-2xs font-semibold tracking-wide text-panel-title">{title}</span>
        <ChevronDown className={`h-2.5 w-2.5 shrink-0 text-panel-label transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
      </button>
      {/* hidden, not unmounted: the engine binds to these controls by id once, at load */}
      <div hidden={!isOpen} className="px-4 pb-3">{children}</div>
    </div>
  )
}

const DIAMOND = { width: 12.872, height: 12.872 }

export function KeyframeDiamond({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} data-tooltip={on ? 'Update keyframe' : 'Add keyframe'}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded hover:bg-white/5" style={DIAMOND}>
      <span className={`-rotate-45 rounded-[1px] border ${on ? 'border-timeline-mark bg-timeline-mark' : 'border-panel-label'}`} style={{ width: 9.102, height: 9.102 }} />
    </button>
  )
}

const LABEL_W = 'var(--settings-panel-label-w, 3.0625rem)'

export function PanelRow({ label, keyframe, labelWidth = LABEL_W, children }: { label: string; keyframe?: ReactNode; labelWidth?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2" style={{ minHeight: 'var(--settings-panel-row-h, 2rem)' }}>
      <span className="shrink-0 select-none text-3xs font-semibold uppercase leading-tight tracking-wide text-panel-label"
            style={{ width: labelWidth }}>{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
      <span className="flex shrink-0 items-center justify-center" style={{ width: DIAMOND.width }}>{keyframe}</span>
    </div>
  )
}

const POLL_MS = 400 // engine presets set .value without an input event; re-read while the row is on screen

type SliderProps = {
  label: string; min: number; max: number; step: number
  /** engine-bound: the engine finds the input by this id and owns its value */
  id?: string; defaultValue?: number
  /** React-bound */
  value?: number; onChange?: (v: number) => void
  unit?: string; format?: (v: number) => string; keyframe?: ReactNode; labelWidth?: string
  /** what the numbers mean, for the crew (src/crew/settings.ts) */
  hint?: string
}

/** ONE slider row (Figma `row-rotate` 1471:2104): label, thin rail with a muted fill, value. */
export function SliderRow({ label, min, max, step, id, defaultValue, value, onChange, unit, format, keyframe, labelWidth, hint }: SliderProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [own, setOwn] = useState(defaultValue ?? min)
  const v = value ?? own
  useEffect(() => {
    if (value !== undefined) return
    const el = ref.current
    if (!el) return
    const read = () => setOwn(Number(el.value))
    el.addEventListener('input', read)
    const t = setInterval(() => { if (el.offsetParent && Number(el.value) !== own) read() }, POLL_MS)
    return () => { el.removeEventListener('input', read); clearInterval(t) }
  }, [value, own])
  const pct = max > min ? Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)) : 0
  const fill = { '--range-pct': `${pct.toFixed(2)}%`, '--range-t': (pct / 100).toFixed(4) } as React.CSSProperties
  const shown = format ? format(v) : String(+v.toFixed(2))
  return (
    <PanelRow label={label} keyframe={keyframe} labelWidth={labelWidth}>
      <span className="range-panel-knob min-w-0 flex-1" style={fill}>
        <input ref={ref} id={id} type="range" min={min} max={max} step={step} aria-label={label} data-hint={hint}
               {...(value !== undefined ? { value, onChange: (e) => onChange?.(Number(e.target.value)) } : { defaultValue })}
               style={fill} className="range range-panel min-w-0" />
      </span>
      <span className="flex w-11 shrink-0 items-baseline justify-end gap-0.5">
        <span className="text-xs font-medium text-panel-value">{shown}</span>
        {unit && <span className="text-3xs font-semibold uppercase tracking-wide text-panel-label">{unit}</span>}
      </span>
    </PanelRow>
  )
}

export function ToggleRow({ label, id, defaultChecked }: { label: string; id: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-3xs font-semibold uppercase leading-tight tracking-wide text-panel-label">{label}</span>
      <input id={id} type="checkbox" defaultChecked={defaultChecked} className="toggle toggle-sm shrink-0" />
    </label>
  )
}

// uncontrolled (the engine binds it by id) unless value + onChange are given (React owns it)
export function SelectRow({ label, id, defaultValue, options, labelWidth, value, onChange }: {
  label: string; id?: string; defaultValue?: string; options?: [string, string][]; labelWidth?: string
  value?: string; onChange?: (v: string) => void
}) {
  const controlled = value !== undefined && onChange ? { value, onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) } : { defaultValue }
  return (
    <PanelRow label={label} labelWidth={labelWidth}>
      <select id={id} {...controlled} aria-label={label}
              className="w-full appearance-none rounded-lg border border-panel-hairline bg-base-100 py-1 pl-3 pr-7 text-xs text-panel-value">
        {options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </PanelRow>
  )
}

/** A quiet group label inside a band (Advanced holds several). */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1 mt-3 text-3xs font-semibold uppercase tracking-wide text-panel-title first:mt-0">{children}</p>
}
