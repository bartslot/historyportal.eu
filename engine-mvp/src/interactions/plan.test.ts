import { describe, expect, it } from 'vitest'
import { cardKind, cardSeconds, holdAt, isCorrect, meterWords, sortedOptions, type PowerMeter, type Quiz } from './plan'
import { LESSON } from '../director/fixture'

const scene = (interaction: unknown) => ({ ...LESSON.scenes[0], interaction }) as never

describe('interaction plan', () => {
  it('picks one card per way the class takes part', () => {
    expect(cardKind({ type: 'quiz', format: 'mc' } as Quiz)).toBe('answer')
    expect(cardKind({ type: 'quiz', format: 'true-false' } as Quiz)).toBe('answer')
    expect(cardKind({ type: 'quiz', format: 'open' } as Quiz)).toBe('discuss')
    expect(cardKind({ type: 'quiz', format: 'sort' } as Quiz)).toBe('sort')
    expect(cardKind({ type: 'quiz', format: 'team' } as Quiz)).toBe('team')
    expect(cardKind({ type: 'choice' } as never)).toBe('choose')
    expect(cardKind({ type: 'choice', format: 'vote' } as never)).toBe('vote')
    expect(cardKind({ type: 'choice', format: 'team' } as never)).toBe('team')
    expect(cardKind({ type: 'power-meter' } as never)).toBe('meter')
  })

  it('plans the card for the timing.json time (same model as validate.py)', () => {
    expect(cardSeconds(scene({ type: 'quiz', format: 'open' }))).toBe(120)
    expect(cardSeconds(scene({ type: 'choice', format: 'vote' }))).toBe(60)
    expect(cardSeconds(scene({ type: 'quiz', format: 'team', class_action_s: 90 }))).toBe(90)
  })

  it('holds a meter mid-scene (the class moves the rest) and every other card on the last frame', () => {
    expect(holdAt(scene({ type: 'power-meter' }), 10)).toBeCloseTo(5.5, 5)
    expect(holdAt(scene({ type: 'quiz' }), 10)).toBeCloseTo(9.85, 5)
  })

  it('mixes a meter\'s words the same way every time, all of them', () => {
    const m = { right: ['samen', 'rollen', 'oprit'], wrong: ['kraan', 'reuzen'] } as PowerMeter
    const a = meterWords(m)
    expect(a).toEqual(meterWords(m))
    expect(a.map((w) => w.word).sort()).toEqual(['kraan', 'oprit', 'reuzen', 'rollen', 'samen'])
    expect(a.filter((w) => w.right).length).toBe(3)
    expect(a.slice(0, 3).every((w) => w.right)).toBe(false) // not simply the right ones first
  })

  it('reads correct as an index, a list, or nothing', () => {
    expect(isCorrect({ correct: 1 } as Quiz, 1)).toBe(true)
    expect(isCorrect({ correct: [0, 2] } as Quiz, 2)).toBe(true)
    expect(isCorrect({ correct: null } as Quiz, 0)).toBe(false)
    expect(sortedOptions({ options: ['a', 'b', 'c'], correct: [2, 0, 1] } as Quiz)).toEqual(['c', 'a', 'b'])
  })
})
