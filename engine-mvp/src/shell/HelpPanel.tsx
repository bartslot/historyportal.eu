// Help: the studio's questions and answers, floating over the stage (it never takes room from the
// canvas). One answer open at a time: native <details name> does that, DaisyUI's collapse styles it.
import { useState } from 'react'
import { Panel } from '../panels/Panel'
import { searchFaq } from '../help/faq'
import { ICON, Icon } from '../ui/icons'
import { __ } from '../i18n'

export function HelpPanel() {
  const [query, setQuery] = useState('')
  const found = searchFaq(query)
  return (
    <Panel id="help" className="flex flex-col p-0" style={{ top: 12, bottom: 12, width: 380, maxWidth: 'calc(100% - 24px)' }}>
      <p className="px-4 pb-2 pt-3 text-2xs font-semibold tracking-wide text-panel-title">{__('Help')}</p>
      <label className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-panel-hairline px-2">
        <Icon d={ICON.find} className="h-3.5 w-3.5 shrink-0 text-panel-label" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={__('Search help')} aria-label={__('Search help')}
               className="h-8 min-w-0 flex-1 bg-transparent text-xs text-panel-value focus:outline-none" />
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {found.map((f) => (
          <details key={f.q} name="studio-help" className="collapse collapse-arrow rounded-none border-t border-panel-hairline">
            <summary className="collapse-title min-h-0 py-3 pl-2 pr-8 text-sm font-medium text-panel-value">{f.q}</summary>
            <div className="collapse-content px-2 text-sm leading-relaxed text-panel-label">{f.a}</div>
          </details>
        ))}
        {!found.length && <p className="px-2 py-3 text-sm text-panel-label">{__('Nothing found for ":query".', { query })}</p>}
      </div>
    </Panel>
  )
}
