import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LOCALES, fill, negotiate } from './index'

describe('negotiate', () => {
  it('prefers the stored choice, then the browser, then English', () => {
    expect(negotiate('de', ['nl-NL'])).toBe('de')
    expect(negotiate(null, ['fr-BE', 'en'])).toBe('fr')
    expect(negotiate('xx', ['es-ES', 'pt'])).toBe('en')
  })
})

describe('fill', () => {
  it('fills Laravel-style placeholders', () => expect(fill(':name is working', { name: 'Teo' })).toBe('Teo is working'))
  it('leaves text without placeholders alone', () => expect(fill('Save')).toBe('Save'))
})

describe('LOCALES', () => {
  it('matches App\\Support\\Locales, the single source', () => {
    const php = readFileSync(new URL('../../../app/Support/Locales.php', import.meta.url), 'utf8')
    const codes = [...php.matchAll(/^\s*'([a-z]{2})' => \['name' => '([^']+)'/gm)].map((m) => [m[1], m[2]])
    expect(LOCALES.map((l) => [l.code, l.name])).toEqual(codes)
  })
  it('has a translation file for every language but English', () => {
    for (const { code } of LOCALES.filter((l) => l.code !== 'en')) {
      expect(() => readFileSync(new URL(`../../../lang/${code}.json`, import.meta.url))).not.toThrow()
    }
  })
})
