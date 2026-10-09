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

/** The remembered voice, else a Dutch one, else British English (never an American default). */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  let saved: string | null = null
  try { saved = localStorage.getItem(VOICE_KEY) } catch { /* private window */ }
  return voices.find((v) => v.voiceURI === saved)
    ?? voices.find((v) => v.lang.startsWith('nl'))
    ?? voices.find((v) => v.lang === 'en-GB')
    ?? voices[0] ?? null
}

export function rememberVoice(v: SpeechSynthesisVoice) {
  try { localStorage.setItem(VOICE_KEY, v.voiceURI) } catch { /* private window */ }
}

/** Speak one line; resolves with how long it took (seconds), or null when it was cut off. */
export function speak(text: string, voice: SpeechSynthesisVoice | null): Promise<number | null> {
  if (!speechAvailable() || !text.trim()) return Promise.resolve(null)
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    if (voice) { u.voice = voice; u.lang = voice.lang }
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
