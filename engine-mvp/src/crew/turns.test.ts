import { describe, expect, it } from 'vitest'
import { firstSentence, latestTurnStart } from './turns'

describe('latestTurnStart', () => {
  it('is 0 without a client message', () => expect(latestTurnStart([{ who: 'set' }, { who: 'director' }])).toBe(0))
  it('is 0 for no lines', () => expect(latestTurnStart([])).toBe(0))
  it('starts right after the last client line', () => {
    expect(latestTurnStart([{ who: 'client' }, { who: 'set' }, { who: 'client' }, { who: 'set' }, { who: 'director' }])).toBe(3)
  })
  it('is the length when the client spoke last', () => expect(latestTurnStart([{ who: 'set' }, { who: 'client' }])).toBe(2))
})

describe('firstSentence', () => {
  it('cuts at the first full stop', () => expect(firstSentence('One here. Two there.')).toBe('One here.'))
  it('keeps a dot inside a number', () => expect(firstSentence('It is 3.5 metres wide. Next.')).toBe('It is 3.5 metres wide.'))
  it('collapses whitespace and newlines', () => expect(firstSentence('  Hello\n  world?  Yes.')).toBe('Hello world?'))
  it('returns all text without a stop', () => expect(firstSentence('no stop here')).toBe('no stop here'))
  it('caps a very long sentence', () => expect(firstSentence('a'.repeat(500)).length).toBe(140))
  it('is empty for empty text', () => expect(firstSentence('')).toBe(''))
})
