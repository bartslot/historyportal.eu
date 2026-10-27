// The studio speaks the app's five languages from the SAME files Laravel uses (lang/{code}.json, English
// source strings as keys). `__('Save')` works like Laravel's: missing keys fall back to the English string,
// `:name` placeholders are filled from `replace`. `php artisan lang:audit` scans engine-mvp/src too, so a new
// `__()` string must be translated in all four languages before the coverage test is green.
// Write keys as plain '...' or "..." literals: the audit cannot read a template literal or a variable.

/** Mirrors App\Support\Locales::SUPPORTED (i18n.test.ts fails if they drift). */
export const LOCALES = [
  { code: 'en', name: 'English', region: 'en-GB' },
  { code: 'nl', name: 'Nederlands', region: 'nl-NL' },
  { code: 'de', name: 'Deutsch', region: 'de-DE' },
  { code: 'fr', name: 'Français', region: 'fr-FR' },
  { code: 'it', name: 'Italiano', region: 'it-IT' },
] as const
export type Locale = (typeof LOCALES)[number]['code']

const KEY = 'studio.locale'
const files = import.meta.glob<Record<string, string>>('../../../lang/*.json', { import: 'default' })
let current: Locale = 'en'
let dict: Record<string, string> = {}

const isLocale = (c: string | null | undefined): c is Locale => !!c && LOCALES.some((l) => l.code === c)

/** The teacher's own choice first, then the browser's languages, then English. Pure. */
export function negotiate(stored: string | null, browser: readonly string[]): Locale {
  if (isLocale(stored)) return stored
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return 'en'
}

/** Fill Laravel-style `:name` placeholders. Pure. */
export function fill(text: string, replace: Record<string, string | number> = {}): string {
  return Object.entries(replace).reduce((s, [k, v]) => s.split(`:${k}`).join(String(v)), text)
}

export function __(key: string, replace?: Record<string, string | number>): string {
  return fill(dict[key] ?? key, replace)
}

export const locale = (): Locale => current
export const localeName = (code: string): string => LOCALES.find((l) => l.code === code)?.name ?? code

/** Load the language before the first render (main.tsx). English needs no file: the keys are English. */
export async function loadLocale(): Promise<Locale> {
  let stored: string | null = null
  try { stored = localStorage.getItem(KEY) } catch { /* private window */ }
  current = negotiate(stored, typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language])
  const load = files[`../../../lang/${current}.json`]
  try { dict = current !== 'en' && load ? await load() : {} } catch { dict = {}; current = 'en' }
  document.documentElement.lang = LOCALES.find((l) => l.code === current)!.region
  return current
}

/** Speak one language for this page only (the lesson player follows the lesson's language), without
 *  touching the teacher's stored choice. An unknown code falls back to English. */
export async function speakLocale(code: string): Promise<Locale> {
  current = isLocale(code) ? code : 'en'
  const load = files[`../../../lang/${current}.json`]
  try { dict = current !== 'en' && load ? await load() : {} } catch { dict = {}; current = 'en' }
  document.documentElement.lang = LOCALES.find((l) => l.code === current)!.region
  return current
}

/** Switch language: remembered in this browser, then a full reload so every screen (and the engine's own
 *  controls) is drawn again in it. The lesson is saved in IndexedDB, so nothing is lost. */
export function setLocale(code: Locale) {
  try { localStorage.setItem(KEY, code) } catch { /* private window: this visit only */ }
  location.reload()
}
