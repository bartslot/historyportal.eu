import { describe, it, expect } from 'vitest'
import { buildChapters, canSeek, reachedFurther, formatClock, chapterTooltip } from '../scene/chapter-timeline.js'

const queue = [
  { kind: 'narration', chapter_name: 'De haven', timeline: { seconds: 200, estimated: false, type: 'narration' } },
  { kind: 'game', game_type: 'quiz', chapter_name: 'Quiz', timeline: { seconds: 120, estimated: true, type: 'quiz' } },
  { kind: 'narration', chapter_name: 'De reis', timeline: { seconds: 90, estimated: false, type: 'narration' } },
]

describe('the chapter list', () => {
  it('holds every scene, quizzes included, with where each one starts', () => {
    const chapters = buildChapters(queue, i => `Chapter ${i + 1}`)

    expect(chapters.map(c => c.start)).toEqual([0, 200, 320])
    expect(chapters[1]).toMatchObject({ index: 1, type: 'quiz', estimated: true, seconds: 120 })
  })

  it('marks every chapter after an estimate as approximate', () => {
    const chapters = buildChapters(queue, i => `Chapter ${i + 1}`)

    expect(chapters.map(c => c.afterEstimate)).toEqual([false, false, true])
  })

  it('names an unnamed chapter by its number', () => {
    const [chapter] = buildChapters([{ kind: 'narration', timeline: { seconds: 5, estimated: false, type: 'narration' } }], i => `Chapter ${i + 1}`)

    expect(chapter.name).toBe('Chapter 1')
  })
})

describe('where a student may jump', () => {
  const furthest = { index: 2, time: 30 }

  it('allows any point already reached', () => {
    expect(canSeek({ index: 0, time: 150 }, furthest, { type: 'narration' })).toBe(true)
    expect(canSeek({ index: 2, time: 30 }, furthest, { type: 'narration' })).toBe(true)
  })

  it('refuses anything past the furthest point', () => {
    expect(canSeek({ index: 2, time: 31 }, furthest, { type: 'narration' })).toBe(false)
    expect(canSeek({ index: 3, time: 0 }, furthest, { type: 'narration' })).toBe(false)
  })

  it('never replays a strategy game the class already played', () => {
    expect(canSeek({ index: 1, time: 0 }, furthest, { type: 'game' })).toBe(false)
  })

  it('lets the teacher go anywhere', () => {
    expect(canSeek({ index: 5, time: 99 }, furthest, { type: 'game', teacher: true })).toBe(true)
  })
})

describe('the furthest point reached', () => {
  it('moves forward and never back', () => {
    const start = { index: 1, time: 20 }

    expect(reachedFurther(start, { index: 1, time: 40 })).toEqual({ index: 1, time: 40 })
    expect(reachedFurther(start, { index: 2, time: 0 })).toEqual({ index: 2, time: 0 })
    expect(reachedFurther(start, { index: 0, time: 90 })).toBe(start)
    expect(reachedFurther(start, { index: 1, time: 5 })).toBe(start)
  })
})

describe('the tooltip', () => {
  const chapters = buildChapters(queue, i => `Chapter ${i + 1}`)
  const label = type => ({ narration: 'Verhaal', quiz: 'Quiz' })[type]

  it('gives a narrated point its exact place in the lesson', () => {
    expect(chapterTooltip(chapters[0], 70, label)).toBe('1:10 · Verhaal · De haven')
  })

  it('gives an interactive block its estimate', () => {
    expect(chapterTooltip(chapters[1], 0, label)).toBe('Quiz · Quiz · ≈ 2 min')
  })

  it('marks a time after an estimate as approximate', () => {
    expect(chapterTooltip(chapters[2], 10, label)).toBe('≈ 5:30 · Verhaal · De reis')
  })

  it('formats clock times past an hour', () => {
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(9)).toBe('0:09')
  })
})
