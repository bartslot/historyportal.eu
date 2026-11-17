import { describe, it, expect } from 'vitest'
import { hasChoices, hasMeters, hasVoyage } from '../lesson-content.js'

// A lesson behaves by what it contains, never by the game_type it was created with (Bart 2026-11-17).
const meters = [{ key: 'food', label: 'Food', start: 50 }]
const choice = { kind: 'narration', branch_group: 1, branch_role: 'question' }

describe('hasChoices', () => {
  it('asks the class at a Decision point with or without meters, whatever the lesson type', () => {
    expect(hasChoices({ game_type: 'quiz', game_config: { meters }, scenes: [choice] })).toBe(true)
    expect(hasChoices({ game_type: null, game_config: { meters: [] }, scenes: [choice] })).toBe(true)
    expect(hasChoices({ game_type: 'story_game', game_config: null, scenes: [choice] })).toBe(true)
  })

  it('is false without a Decision point, meters or not', () => {
    expect(hasChoices({ game_type: 'story_game', game_config: { meters }, scenes: [{ kind: 'narration' }] })).toBe(false)
    expect(hasChoices({ game_config: { meters } })).toBe(false)
  })
})

describe('hasMeters', () => {
  it('is the add-on: true only when the lesson has class meters', () => {
    expect(hasMeters({ game_config: { meters } })).toBe(true)
    expect(hasMeters({ game_config: { meters: [] } })).toBe(false)
    expect(hasMeters({ game_config: null })).toBe(false)
    expect(hasMeters({})).toBe(false)
  })
})

describe('hasVoyage', () => {
  it('is true for any lesson holding a voyage scene', () => {
    expect(hasVoyage({ game_type: 'quiz', scenes: [{ kind: 'narration' }, { kind: 'voyage' }] })).toBe(true)
  })

  it('is false for a lesson typed voyage without a voyage scene', () => {
    expect(hasVoyage({ game_type: 'voyage', scenes: [{ kind: 'narration' }] })).toBe(false)
    expect(hasVoyage({})).toBe(false)
  })
})
