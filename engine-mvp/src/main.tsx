import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { engineReady } from './bridge'
import * as TL from './timeline/model'
import './studio.css'

if (import.meta.env.DEV) (window as any).__tl = TL // read-only handle for browser tests

const root = createRoot(document.getElementById('root')!)
flushSync(() => root.render(<App />)) // every element the engine binds to by id exists before it loads
import('./boot')
  .then(engineReady)
  .catch((err) => {
    document.getElementById('sel')!.textContent = 'The scene could not start: ' + (err instanceof Error ? err.message : String(err))
    throw err
  })
