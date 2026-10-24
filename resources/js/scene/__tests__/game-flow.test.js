import { describe, it, expect } from 'vitest'
import { gameFlowFor } from '../game-flow.js'

describe('gameFlowFor', () => {
  it('skips a quiz scene that has no questions instead of showing the lesson-level game', () => {
    expect(gameFlowFor({ kind: 'game', game_type: 'quiz', quiz_questions: [] }, [])).toEqual({ flow: 'skip' })
  })

  it('skips an empty quiz scene even when the lesson plays a strategy game (never borrows it)', () => {
    // MP1EPN scene 7 after prod cleanup: no questions, and either no lesson game or a strategy one.
    expect(gameFlowFor({ kind: 'game', game_type: 'quiz', quiz_questions: [] }, [], 'strategy')).toEqual({ flow: 'skip' })
    expect(gameFlowFor({ kind: 'game', game_type: 'quiz' }, undefined, null)).toEqual({ flow: 'skip' })
  })

  it('runs a quiz scene with its own questions', () => {
    const q = [{ id: 1 }]
    expect(gameFlowFor({ game_type: 'quiz', quiz_questions: q }, [])).toEqual({ flow: 'quiz', questions: q })
  })

  it('falls back to the lesson questions for a quiz scene without its own', () => {
    const q = [{ id: 2 }]
    expect(gameFlowFor({ game_type: 'quiz' }, q)).toEqual({ flow: 'quiz', questions: q })
  })

  it('skips predict and team moments that carry no config', () => {
    expect(gameFlowFor({ game_type: 'predict', config: {} }).flow).toBe('skip')
    expect(gameFlowFor({ game_type: 'team' }).flow).toBe('skip')
    expect(gameFlowFor({ game_type: 'team', config: { team: {} } }).flow).toBe('team')
  })

  it('only a strategy or debate scene opens the strategy brief', () => {
    expect(gameFlowFor({ game_type: 'strategy' }).flow).toBe('strategy')
    expect(gameFlowFor({ game_type: 'debate' }).flow).toBe('strategy')
    expect(gameFlowFor({ game_type: null }).flow).toBe('skip')
    expect(gameFlowFor({ game_type: null }, [], 'strategy').flow).toBe('strategy')
  })
})
