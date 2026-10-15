import { describe, it, expect, afterEach } from 'vitest'
import { t, tn } from '../i18n.js'

/**
 * Player-side translation.
 *
 * `lang:audit` only reads PHP and Blade, so it reported five languages at 100% while every string
 * inside the player's JavaScript stayed English — a French class saw "Nice!" and "No worries, you
 * will hear this later in the story!" in the middle of a French lesson. Blade fills
 * window.__lpLang from the same lang/*.json the rest of the interface uses; this is the lookup.
 */
describe('t()', () => {
  afterEach(() => { delete window.__lpLang })

  it('returns the English source when no dictionary has been published', () => {
    expect(t('Nice!')).toBe('Nice!')
  })

  it('returns the translation when one exists', () => {
    window.__lpLang = { 'Nice!': 'Bien joué !' }
    expect(t('Nice!')).toBe('Bien joué !')
  })

  it('falls back to the English source for a string the dictionary does not carry', () => {
    window.__lpLang = { 'Nice!': 'Bien joué !' }
    expect(t('Keep going!')).toBe('Keep going!')
  })

  it('fills :placeholders so a translator can move them within the sentence', () => {
    window.__lpLang = { 'answers unlock in :count' : 'réponses dans :count' }
    expect(t('answers unlock in :count', { count: 3 })).toBe('réponses dans 3')
  })

  it('ignores a dictionary that is not an object, rather than throwing mid-quiz', () => {
    window.__lpLang = 'not a dictionary'
    expect(t('Nice!')).toBe('Nice!')
  })
})

describe('tn(): one|many', () => {
  afterEach(() => { delete window.__lpLang })

  it('says "kost 1 punt", never "1 punten"', () => {
    window.__lpLang = { ':item, costs :count point|:item, costs :count points': ':item, kost :count punt|:item, kost :count punten' }
    expect(tn(':item, costs :count point|:item, costs :count points', 1, { item: 'Kompas' })).toBe('Kompas, kost 1 punt')
    expect(tn(':item, costs :count point|:item, costs :count points', 3, { item: 'Rijst' })).toBe('Rijst, kost 3 punten')
    expect(tn(':item, costs :count point|:item, costs :count points', 0, { item: 'X' })).toBe('X, kost 0 punten')
  })

  it('falls back to the English forms, and copes with a line that has one form', () => {
    expect(tn(':count place free|:count places free', 1)).toBe('1 place free')
    expect(tn(':count place free|:count places free', 4)).toBe('4 places free')
    expect(tn(':count things', 1)).toBe('1 things')
  })
})
