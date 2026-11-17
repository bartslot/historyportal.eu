import { describe, it, expect } from 'vitest'
import { hasVoyage, playsStoryGame } from '../lesson-content.js'

// A lesson behaves by what it contains, never by the game_type it was created with (Bart 2026-11-17).
const meters = [{ key: 'food', label: 'Food', start: 50 }]
const choice = { kind: 'narration', branch_group: 1, branch_role: 'question' }

describe('playsStoryGame', () => {
  it('runs the meters engine for choices with meters, whatever the lesson type', () => {
    expect(playsStoryGame({ game_type: 'quiz', game_config: { meters }, scenes: [choice] })).toBe(true)
    expect(playsStoryGame({ game_type: null, game_config: { meters }, scenes: [choice] })).toBe(true)
  })

  it('leaves choices without meters to play both options in a row', () => {
    expect(playsStoryGame({ game_type: 'story_game', game_config: { meters: [] }, scenes: [choice] })).toBe(false)
    expect(playsStoryGame({ game_type: 'story_game', game_config: null, scenes: [choice] })).toBe(false)
  })

  it('needs a Decision point to apply meters to', () => {
    expect(playsStoryGame({ game_type: 'story_game', game_config: { meters }, scenes: [{ kind: 'narration' }] })).toBe(false)
    expect(playsStoryGame({ game_config: { meters } })).toBe(false)
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
