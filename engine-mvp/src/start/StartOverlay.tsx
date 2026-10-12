// The light screens over the studio: the start screen and the build view. The studio keeps running beneath
// (made inert by App while one of these is up). Each screen change moves focus to the new screen.
import { useEffect, useRef } from 'react'
import { BuildView } from './BuildView'
import { StartScreen } from './StartScreen'
import { useStart } from './store'
import { __ } from '../i18n'

export function StartOverlay() {
  const { mode } = useStart()
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (mode === 'build') root.current?.focus()
  }, [mode])
  if (mode === 'studio' || mode === 'loading') return null
  return (
    <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={mode === 'start' ? __('New lesson') : __('The crew is making your lesson')}
         data-theme="learningportal-light" className="fixed inset-0 z-[60] overflow-y-auto bg-base-200 text-base-content outline-none">
      {mode === 'start' && <StartScreen />}
      {mode === 'build' && <BuildView />}
    </div>
  )
}
