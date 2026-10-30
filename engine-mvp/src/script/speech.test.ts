import { describe, expect, it } from 'vitest'
import { languageOf, pickVoice } from './speech'

const voice = (name: string, lang: string) => ({ name, lang, voiceURI: name }) as SpeechSynthesisVoice
// the order a Mac lists them in: Belgian Dutch and American English come first
const VOICES = [voice('Ellen', 'nl-BE'), voice('Samantha', 'en-US'), voice('Xander', 'nl-NL'), voice('Daniel', 'en-GB'), voice('Moira', 'en-IE'), voice('Anna', 'de-DE')]

describe('the draft voice follows the script language, natively', () => {
  it('reads an English script in en-GB, never nl-BE or American', () => {
    expect(pickVoice(VOICES, 'en')?.name).toBe('Daniel')
  })

  it('reads a Dutch script in nl-NL before nl-BE', () => {
    expect(pickVoice(VOICES, 'nl')?.name).toBe('Xander')
  })

  it('falls back to the language by prefix, but never to American English', () => {
    expect(pickVoice([voice('Samantha', 'en-US'), voice('Moira', 'en-IE')], 'en')?.name).toBe('Moira')
    expect(pickVoice([voice('Samantha', 'en-US')], 'en')).toBeNull()
    expect(pickVoice([voice('Ellen', 'nl-BE')], 'nl')?.name).toBe('Ellen')
  })

  it('has no voice rather than one in another language', () => {
    expect(pickVoice(VOICES, 'fr')).toBeNull()
  })

  it('keeps a remembered voice only when it speaks the script language', () => {
    const store = new Map([['studio.voice', 'Ellen']])
    ;(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null }
    expect(pickVoice(VOICES, 'en')?.name).toBe('Daniel')
    expect(pickVoice(VOICES, 'nl')?.name).toBe('Ellen')
    delete (globalThis as any).localStorage
  })

  it('tells the five languages apart from a few lines', () => {
    expect(languageOf("At the town gate, a guildsman pushes a paper against Dante's chest. Dante pushes it back and looks him in the eye.")).toBe('en')
    expect(languageOf('Bij de stadspoort duwt een gildeman een papier tegen de borst van Dante. Hij kijkt hem aan.')).toBe('nl')
    expect(languageOf('Am Stadttor drückt ein Zunftmann Dante ein Papier gegen die Brust, und er ist nicht froh.')).toBe('de')
    expect(languageOf("À la porte de la ville, un homme pousse un papier contre la poitrine de Dante et il ne dit pas un mot.")).toBe('fr')
    expect(languageOf('Alla porta della città un uomo spinge un foglio contro il petto di Dante, che non dice una parola.')).toBe('it')
    expect(languageOf('Dante.')).toBeNull()
  })
})
