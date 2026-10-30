import { describe, expect, it } from 'vitest'
import { cleanChoices, scopeOf } from './choices'
import { lessonPatch } from './settings'

const opt = (label: string, extra = {}) => ({ label, why: 'because', ...extra })

describe('cleanChoices', () => {
  it('keeps a good set and puts the recommended option first', () => {
    const c = cleanChoices({ question: 'Which look?', options: [opt('A'), opt('B', { recommended: true }), opt('C')] })
    expect(c?.options.map((o) => o.label)).toEqual(['B', 'A', 'C'])
    expect(c?.options[0].recommended).toBe(true)
  })
  it('keeps only one recommended', () => {
    const c = cleanChoices({ question: 'q', options: [opt('A', { recommended: true }), opt('B', { recommended: true })] })
    expect(c?.options.filter((o) => o.recommended)).toHaveLength(1)
  })
  it('rejects bad counts, missing question and non-objects', () => {
    expect(cleanChoices({ question: 'q', options: [opt('A')] })).toBeUndefined()
    expect(cleanChoices({ question: 'q', options: ['a', 'b', 'c', 'd', 'e'].map((x) => opt(x)) })).toBeUndefined()
    expect(cleanChoices({ question: ' ', options: [opt('A'), opt('B')] })).toBeUndefined()
    expect(cleanChoices(null)).toBeUndefined()
    expect(cleanChoices({ question: 'q', options: [{ label: 3 }, { label: '' }] })).toBeUndefined()
  })
  it('caps lengths and reads scope as a strict boolean', () => {
    const c = cleanChoices({ question: 'x'.repeat(300), scope: 'yes', options: [opt('l'.repeat(90), { why: 'w'.repeat(400) }), opt('B')] })
    expect(c?.question).toHaveLength(200)
    expect(c?.options[0].label).toHaveLength(60)
    expect(c?.options[0].why).toHaveLength(200)
    expect(c?.scope).toBeUndefined()
    expect(cleanChoices({ question: 'q', scope: true, options: [opt('A'), opt('B')] })?.scope).toBe(true)
  })
})

describe('scopeOf', () => {
  it('maps whole-lesson labels in several languages', () => {
    for (const l of ['Whole lesson', 'Hele les', 'Ganze Lektion', 'Toute la leçon, alle scenes']) expect(scopeOf(l)).toBe('lesson')
    for (const l of ['This scene', 'Deze scene', 'Diese Szene']) expect(scopeOf(l)).toBe('scene')
  })
})

describe('lessonPatch', () => {
  const s = (id: string, value: string | number): any => ({ id, label: id, type: 'select', options: [], value })
  it('carries the applied changes and anything a preset rewrote', () => {
    const before = [s('lookPreset', 'a'), s('lookTime', 1), s('same', 5)]
    const after = [s('lookPreset', 'b'), s('lookTime', 9), s('same', 5)]
    expect(lessonPatch(before, after, [{ id: 'lookPreset', value: 'b' }])).toEqual({ lookPreset: 'b', lookTime: 9 })
  })
})
