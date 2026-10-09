// The object list (left): everything in the scene, click to select, the eye to hide while working.
import { useEngine } from '../bridge'
import { Panel } from '../panels/Panel'
import * as TL from '../timeline/model'

const EYE = 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
const EYE_OFF = 'M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243'

export function ObjectsPanel() {
  const { objects, selected } = useEngine()
  const hidden = TL.useTimeline().hidden
  return (
    <Panel id="objects">
      <p className="py-3 pl-4 pr-10 text-2xs font-semibold tracking-wide text-panel-title">Objects</p>
      <ul className="flex flex-col pb-2">
        {objects.map((o) => {
          const active = !!selected && TL.targetOfId(selected.id) === o.target
          return (
            <li key={o.target} className={`flex items-center border-t border-panel-hairline ${active ? 'bg-white/5' : ''}`}>
              <button type="button" onClick={() => (window as any).__mvp.select(TL.actorOf(o.target))}
                      className="min-w-0 flex-1 cursor-pointer truncate py-2 pl-4 text-left text-xs text-panel-value">{o.name}</button>
              <button type="button" onClick={() => TL.toggleHidden(o.target)} aria-pressed={!!hidden[o.target]}
                      aria-label={hidden[o.target] ? `Show ${o.name}` : `Hide ${o.name}`} data-tooltip={hidden[o.target] ? 'Show' : 'Hide'}
                      className={`mr-2 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded hover:bg-white/5 ${hidden[o.target] ? 'text-panel-label' : 'text-panel-icon'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={hidden[o.target] ? EYE_OFF : EYE} />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
