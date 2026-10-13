// The Reference panel: the target picture for this scene, beside the stage, to rebuild a shot in 3D and
// compare (frame matching). It also lies over the stage at an opacity, and holding B shows it at full
// strength. The picture is kept per scene in this browser (IndexedDB, as a Blob next to the lesson, never
// inside the lesson JSON: a 4K panel would make every save slow).
import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent } from 'react'
import { isTypingTarget } from '@hp/ui/keyboard.js'
import { Panel } from '../panels/Panel'
import { inStep, usePanels } from '../panels/store'
import { stepOf, useLesson } from '../lesson/store'
import { idbGet, idbPut } from '../lesson/idb'
import { SliderRow } from '../ui/kit'
import { ICON, Icon } from '../ui/icons'

const MAX_BYTES = 40 * 1024 * 1024
const BLINK_KEY = 'b'
const VIEW_KEY = 'studio.reference'
const NOT_A_PICTURE = 'That file is not a picture.'

type View = { overlay: boolean; opacity: number }
type State = View & { url: string | null; name: string; blink: boolean; actual: boolean; error: string | null }

function loadView(): View {
  const fresh = { overlay: false, opacity: 0.5 }
  try { return { ...fresh, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') } } catch { return fresh }
}

let state: State = { ...loadView(), url: null, name: '', blink: false, actual: false, error: null }
const listeners = new Set<() => void>()
function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({ overlay: state.overlay, opacity: state.opacity })) } catch { /* private window */ }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const useReference = () => useSyncExternalStore(subscribe, () => state)

type Stored = { blob: Blob; name: string }
const keyFor = (lessonId: string, sceneId: string) => `ref:${lessonId}:${sceneId}`

function show(stored: Stored | null | undefined) {
  if (state.url) URL.revokeObjectURL(state.url)
  set({ url: stored ? URL.createObjectURL(stored.blob) : null, name: stored?.name ?? '', actual: false })
}

async function save(key: string, file: File) {
  if (!file.type.startsWith('image/')) return set({ error: NOT_A_PICTURE })
  if (file.size > MAX_BYTES) return set({ error: 'That picture is larger than 40 MB.' })
  const stored: Stored = { blob: file, name: file.name || 'Pasted picture' }
  try {
    await idbPut(key, stored)
    set({ error: null })
    show(stored)
  } catch (e) {
    console.error('reference: could not save the picture', e)
    set({ error: 'The picture could not be saved in this browser.' })
  }
}

async function remove(key: string) {
  try {
    await idbPut(key, null)
    show(null)
  } catch (e) {
    console.error('reference: could not remove the picture', e)
    set({ error: 'The picture could not be removed.' })
  }
}

/** Is the panel on screen in this step? The overlay and B only work while it is. */
function usePanelShown() {
  const st = usePanels()
  const step = stepOf(useLesson().lesson)
  return !!st.open.reference && inStep('reference', step)
}

/** Paste a picture and hold B, while the panel is on screen. */
function useKeys(shown: boolean, key: string) {
  useEffect(() => {
    if (!shown) return
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'))
      if (f) { e.preventDefault(); save(key, f) }
    }
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== BLINK_KEY || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      set({ blink: true })
    }
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === BLINK_KEY) set({ blink: false }) }
    const off = () => set({ blink: false })
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', off)
      off()
    }
  }, [shown, key])
}

export function ReferencePanel() {
  const { lesson, current } = useLesson()
  const ref = useReference()
  const shown = usePanelShown()
  const file = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [natural, setNatural] = useState(0)
  const key = keyFor(lesson.id, current)

  // each scene has its own picture
  useEffect(() => {
    let live = true
    idbGet<Stored | null>(key).then((s) => { if (live) show(s) }, (e) => console.error('reference: could not read the picture', e))
    return () => { live = false }
  }, [key])
  useKeys(shown, key)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'))
    if (f) save(key, f)
    else set({ error: NOT_A_PICTURE })
  }
  const toggleActual = () => set({ actual: !ref.actual })

  return (
    <Panel id="reference" className="flex h-full flex-col">
      <p className="shrink-0 px-3 pb-2 pr-10 pt-3 text-2xs font-semibold tracking-wide text-panel-title">Reference</p>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}
           className={`relative mx-3 min-h-0 flex-1 rounded-box border ${over ? 'border-panel-value' : 'border-panel-hairline'} ${ref.actual ? 'overflow-auto' : 'overflow-hidden'}`}>
        {ref.url ? (
          // actual size = one picture pixel per screen pixel, to judge line weight
          <img src={ref.url} alt={ref.name} draggable={false} onDoubleClick={toggleActual}
               onLoad={(e) => setNatural(e.currentTarget.naturalWidth)}
               className={ref.actual ? 'max-w-none' : 'h-full w-full object-contain'}
               style={ref.actual && natural ? { width: natural / devicePixelRatio } : undefined} />
        ) : (
          <button type="button" onClick={() => file.current?.click()}
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-panel-label hover:text-panel-value">
            <Icon d={ICON.photo} className="h-6 w-6" />
            <span className="text-xs">Add picture</span>
          </button>
        )}
      </div>
      <input ref={file} type="file" accept="image/*" hidden
             onChange={(e) => { const f = e.target.files?.[0]; if (f) save(key, f); e.target.value = '' }} />
      {ref.error && <p role="alert" className="shrink-0 px-3 pt-2 text-xs text-error">{ref.error}</p>}
      {ref.url && (
        <div className="shrink-0 px-3 pb-3 pt-2">
          <label className="flex items-center justify-between gap-3 py-1" data-tooltip="Hold B to compare">
            <span className="text-3xs font-semibold uppercase leading-tight tracking-wide text-panel-label">Over the stage</span>
            <input type="checkbox" checked={ref.overlay} onChange={(e) => set({ overlay: e.target.checked })} className="toggle toggle-sm shrink-0" />
          </label>
          <SliderRow label="Opacity" min={0.05} max={1} step={0.05} value={ref.opacity} onChange={(v) => set({ opacity: v })}
                     format={(v) => String(Math.round(v * 100))} unit="%" />
          <div className="flex items-center gap-1 pt-1">
            <button type="button" className="btn btn-ghost btn-xs" aria-pressed={ref.actual} onClick={toggleActual}>
              {ref.actual ? 'Fit' : 'Actual size'}
            </button>
            <span className="flex-1" />
            <button type="button" className="btn btn-ghost btn-xs btn-square" aria-label="Replace picture" data-tooltip="Replace" onClick={() => file.current?.click()}>
              <Icon d={ICON.folder} />
            </button>
            <button type="button" className="btn btn-ghost btn-xs btn-square" aria-label="Remove picture" data-tooltip="Remove" onClick={() => remove(key)}>
              <Icon d={ICON.trash} />
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}

/** The reference over the stage. Fitted to the stage's HEIGHT and centred, like the camera's vertical
 *  field of view (Babylon's default): a wider stage shows more on the sides, and so does the overlay. */
export function ReferenceOverlay() {
  const ref = useReference()
  const shown = usePanelShown()
  if (!shown || !ref.url || !(ref.overlay || ref.blink)) return null
  // clipped to the stage: a stage narrower than the picture crops its sides, like the camera does
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <img src={ref.url} alt="" data-reference-overlay
           className="absolute inset-y-0 left-1/2 h-full max-w-none -translate-x-1/2 select-none"
           style={{ opacity: ref.blink ? 1 : ref.opacity }} />
    </div>
  )
}
