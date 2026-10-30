// The language loads FIRST, and only then the studio itself (mount.tsx): every module may call __() at
// import time and gets the teacher's language, not English.
import { loadLocale } from './i18n'
import './studio.css'

await loadLocale()
await import('./mount')
