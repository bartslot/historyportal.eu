// Private notes: a floating panel over the stage, kept in this browser only. Never projected.
import { Panel } from '../panels/Panel'

const KEY = 'studio.notes'
const read = () => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } }
const write = (v: string) => { try { localStorage.setItem(KEY, v) } catch { /* private window: notes last until reload */ } }

export function Notes() {
  return (
    <Panel id="notes" className="p-3 pt-2">
      <p className="mb-2 pr-8 text-2xs font-semibold tracking-wide text-panel-title">Notes</p>
      <textarea defaultValue={read()} onChange={(e) => write(e.target.value)} rows={6} aria-label="Notes"
                className="textarea textarea-sm w-full border-panel-hairline bg-base-100 text-panel-value" />
    </Panel>
  )
}
