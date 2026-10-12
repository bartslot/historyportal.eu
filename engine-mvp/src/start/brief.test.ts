import { describe, expect, it } from 'vitest'
import { DEFAULT_BRIEF, briefMessage, isEmptyLesson } from './brief'

describe('briefMessage', () => {
  it('sends the teacher\'s words first, then the choices from the chips', () => {
    const m = briefMessage('  Abel Tasman sails south.  ', { ...DEFAULT_BRIEF, kind: 'game' })
    expect(m).toBe('Abel Tasman sails south.\n\nLesson type: Game. Class: Groep 7. Length: 30 min. Language: Nederlands.')
  })
  it('falls back to the first lesson type for an unknown one', () => {
    expect(briefMessage('x', { ...DEFAULT_BRIEF, kind: 'nope' as never })).toContain('Lesson type: Story driven.')
  })
})

describe('isEmptyLesson', () => {
  it('is empty with no crew talk and no script text', () => {
    expect(isEmptyLesson({ crew: [], script: null })).toBe(true)
    expect(isEmptyLesson({ script: { type: 'doc', content: [{ type: 'paragraph' }] } })).toBe(true)
  })
  it('is not empty once a scene was built or a second scene added', () => {
    expect(isEmptyLesson({ script: null, scenes: { a: { doc: { actors: [] } } } })).toBe(false)
    expect(isEmptyLesson({ script: null, scenes: { a: { doc: null }, b: { doc: null } } })).toBe(false)
    expect(isEmptyLesson({ script: null, scenes: { a: { doc: null } } })).toBe(true)
  })
  it('is not empty once the crew talked or the script has words', () => {
    expect(isEmptyLesson({ crew: [{ who: 'client', text: 'hi' }], script: null })).toBe(false)
    expect(isEmptyLesson({ script: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Batavia' }] }] } })).toBe(false)
  })
})
