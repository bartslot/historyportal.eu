import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { engineReady } from './bridge'
import * as Lesson from './lesson/store'
import * as TL from './timeline/model'
import { decide, openStudio } from './start/store'
import './studio.css'

if (import.meta.env.DEV) Object.assign(window, { __tl: TL, __lesson: Lesson }) // read-only handles for browser tests

const root = createRoot(document.getElementById('root')!)
flushSync(() => root.render(<App />)) // every element the engine binds to by id exists before it loads
import('./boot')
  .then(engineReady)
  .then(Lesson.initLesson)
  .then(decide)
  .catch((err) => {
    openStudio()
    document.getElementById('sel')!.textContent = 'The scene could not start: ' + (err instanceof Error ? err.message : String(err))
    throw err
  })
