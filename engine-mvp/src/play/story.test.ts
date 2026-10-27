import { describe, expect, it } from 'vitest'
import { storyAt } from './story'
import { direct } from '../director/direct'
import { LESSON, LIBRARY } from '../director/fixture'

const d = direct(LESSON, LIBRARY)
const s = d.scenes[3] // two balloons, figures, 14 s

describe('story layer', () => {
  it('shows the narrator\'s line while the director has it spoken', () => {
    expect(storyAt(s, (s.narration_at_s ?? 0) + 1).caption).toBe(s.narration)
    const silent = d.scenes[4] // the turn: a 1.2 s silence before the narrator
    expect(silent.narration_at_s).toBeGreaterThan(0)
    expect(storyAt(silent, 0.5).caption).toBeNull()
    expect(storyAt(silent, silent.narration_at_s! + 0.5).caption).toBe(silent.narration)
  })
  it('shows each balloon only for its read time, one at a time, over its speaker', () => {
    const [a, b] = s.balloons!
    expect(storyAt(s, a.at_s! + 0.1).balloons.map((x) => x.text)).toEqual([a.text])
    expect(storyAt(s, b.at_s! + 0.1).balloons.map((x) => x.text)).toEqual([b.text])
    expect(storyAt(s, a.at_s! + a.dur_s! + 0.05).balloons).toEqual([])
    const x = storyAt(s, a.at_s! + 0.1).balloons[0].x
    expect(x).toBeGreaterThanOrEqual(0.2); expect(x).toBeLessThanOrEqual(0.8)
  })
  it('carries no speaker name, only the line', () => {
    expect(Object.keys(storyAt(s, s.balloons![0].at_s! + 0.1).balloons[0])).toEqual(['text', 'x'])
  })
})
