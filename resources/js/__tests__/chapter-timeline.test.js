import { describe, it, expect } from 'vitest'
import { buildChapters, canSeek, reachedFurther, formatClock, chapterTooltip, chapterOf, pointInChapter, chapterProgress, chapterCardFor, chapterCardHoldMs } from '../scene/chapter-timeline.js'

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

// `chapter`: the name the lesson gave; `chapter_name`: the server's display name (Scene::chapterName, never empty)
const shot = (chapter, seconds, type = 'narration', estimated = false) => ({ chapter, chapter_name: chapter ?? 'Uruk, about 3000 BCE', timeline: { seconds, estimated, type } })
// two chapters of shots; a quiz card (no chapter) joins the one before it
const chaptered = [
  shot('Between two rivers', 5), shot('Between two rivers', 7), shot(null, 120, 'quiz', true),
  shot('The lion', 4), shot('The lion', 6),
]

describe('chapters of scenes', () => {
  const chapters = buildChapters(chaptered, n => `Chapter ${n + 1}`)

  it('groups the shots of one chapter, a card joining the chapter before it', () => {
    expect(chapters.map(c => [c.name, c.index, c.last, c.seconds])).toEqual([
      ['Between two rivers', 0, 2, 132],
      ['The lion', 3, 4, 10],
    ])
    expect(chapters[1]).toMatchObject({ start: 132, afterEstimate: true, estimated: false })
  })

  it('keeps one chapter per scene in a lesson without chapter names', () => {
    const old = buildChapters([shot(null, 5), { timeline: { seconds: 6, estimated: false, type: 'narration' } }], n => `Chapter ${n + 1}`)
    expect(old.map(c => [c.name, c.index, c.last])).toEqual([['Uruk, about 3000 BCE', 0, 0], ['Chapter 2', 1, 1]])
  })

  it('finds the chapter of a scene, the scene under a click and the fill', () => {
    expect(chapterOf(chapters, 2).name).toBe('Between two rivers')
    expect(pointInChapter(chapters[0], 0)).toEqual({ index: 0, time: 0 })
    expect(pointInChapter(chapters[0], 6)).toEqual({ index: 1, time: 1 })
    expect(chapterProgress(chapters[0], { index: 1, time: 1 })).toBeCloseTo(6 / 132)
    expect(chapterProgress(chapters[0], { index: 3, time: 0 })).toBe(1)
    expect(chapterProgress(chapters[1], { index: 2, time: 50 })).toBe(0)
  })
})

describe('the chapter card', () => {
  const chapters = buildChapters(chaptered, n => `Chapter ${n + 1}`)

  it('shows when playback enters a chapter from the one before', () => {
    expect(chapterCardFor(chapters, 3, { from: 2 })?.name).toBe('The lion')
    expect(chapterCardFor(chapters, 0, { from: 4 })?.name).toBe('Between two rivers')
  })

  it('does not show after the title screen, inside a chapter, on a seek, or in a lesson without names', () => {
    expect(chapterCardFor(chapters, 0, { from: null })).toBeNull()
    expect(chapterCardFor(chapters, 4, { from: 3 })).toBeNull()
    expect(chapterCardFor(chapters, 3, { from: 4 })).toBeNull()
    expect(chapterCardFor(chapters, 3, { from: 2, at: 2 })).toBeNull()
    const old = buildChapters([shot(null, 5), shot(null, 6)], n => `Chapter ${n + 1}`)
    expect(chapterCardFor(old, 1, { from: 0 })).toBeNull()
  })

  it('holds for its reading time, at least 2.5 s and at most 4.5 s', () => {
    expect(chapterCardHoldMs('Uruk')).toBe(2500)
    expect(chapterCardHoldMs('x'.repeat(30))).toBe(3500)
    expect(chapterCardHoldMs('x'.repeat(90))).toBe(4500)
  })
})
