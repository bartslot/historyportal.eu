// Read-aloud with the browser's own voices (Web Speech API): free, local, nothing to set up, and
// good enough to hear the timing of a script. It is a draft voice; the lesson's real narration is
// generated later (Azure). Typing never speaks: only Read aloud and timeline Play do.
const VOICE_KEY = 'studio.voice'

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Voices load asynchronously in most browsers: resolve once there are some (or after a short wait). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechAvailable()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices())
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

// The draft voice speaks the SCRIPT's language, natively (Bart): en = en-GB (never American), nl = nl-NL.
const REGION: Record<string, string> = { en: 'en-GB', nl: 'nl-NL', de: 'de-DE', fr: 'fr-FR', it: 'it-IT' }
const NEVER = new Set(['en-us'])
// the commonest short words of each language: enough to tell five languages apart in a script
const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'and', 'of', 'to', 'is', 'you', 'that', 'he', 'it', 'was', 'with', 'his', 'i', 'a'],
  nl: ['de', 'het', 'een', 'en', 'van', 'is', 'niet', 'dat', 'hij', 'je', 'ik', 'op', 'zijn', 'met'],
  de: ['der', 'die', 'das', 'und', 'nicht', 'ist', 'ein', 'ich', 'sie', 'mit', 'zu', 'den', 'er'],
  fr: ['le', 'la', 'les', 'et', 'est', 'un', 'une', 'pas', 'que', 'il', 'je', 'des', 'du'],
  it: ['il', 'la', 'che', 'e', 'di', 'un', 'una', 'non', 'per', 'sono', 'gli', 'del', 'mi'],
}
const MIN_HITS = 3

/** The language a text is written in (en, nl, de, fr, it), or null when there is too little to tell. */
export function languageOf(text: string): string | null {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
  let best: string | null = null
  let most = MIN_HITS - 1
  for (const [lang, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list)
    const hits = words.filter((w) => set.has(w)).length
    if (hits > most) { most = hits; best = lang }
  }
  return best
}

/** The browser region tag a language is read in: en -> en-GB. */
export const regionOf = (lang: string) => REGION[lang] ?? lang

const tag = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()

/** A voice for `lang` (en, nl...): the remembered one if it speaks it, else the native region exactly, else any of
 *  the language (never American English), else none (better silence than the wrong language). */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  let saved: string | null = null
  try { saved = localStorage.getItem(VOICE_KEY) } catch { /* private window */ }
  const region = regionOf(lang).toLowerCase()
  const ofLang = (v: SpeechSynthesisVoice) => tag(v).split('-')[0] === lang && !NEVER.has(tag(v))
  const mine = voices.find((v) => v.voiceURI === saved)
  return (mine && ofLang(mine) ? mine : null)
    ?? voices.find((v) => tag(v) === region)
    ?? voices.find(ofLang)
    ?? null
}

export function rememberVoice(v: SpeechSynthesisVoice) {
  try { localStorage.setItem(VOICE_KEY, v.voiceURI) } catch { /* private window */ }
}

/** Speak one line; resolves with how long it took (seconds), or null when it was cut off. */
export function speak(text: string, voice: SpeechSynthesisVoice | null, lang?: string): Promise<number | null> {
  if (!speechAvailable() || !text.trim()) return Promise.resolve(null)
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    if (voice) { u.voice = voice; u.lang = voice.lang } else if (lang) u.lang = regionOf(lang)
    let t0 = 0
    u.onstart = () => { t0 = performance.now() }
    u.onend = () => resolve(t0 ? (performance.now() - t0) / 1000 : null)
    u.onerror = () => resolve(null)
    speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (speechAvailable()) speechSynthesis.cancel()
}
