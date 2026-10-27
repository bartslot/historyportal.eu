import { describe, expect, it } from 'vitest'
import { lessonUrlOf, needsResync } from './route'

describe('play route', () => {
  it('reads ?lesson= as an id, a vault path or a URL', () => {
    expect(lessonUrlOf(null)).toBe('lessons/vault/eerste-boeren-1/lesson.json')
    expect(lessonUrlOf('voc')).toBe('lessons/vault/voc/lesson.json')
    expect(lessonUrlOf('/Users/x/Memory/historyportal/topics/autonomous-lessons/lessons/hunebedden/lesson.json')).toBe('lessons/vault/hunebedden/lesson.json')
    expect(lessonUrlOf('topics/autonomous-lessons/lessons/eerste-boeren-2/')).toBe('lessons/vault/eerste-boeren-2/lesson.json')
    expect(lessonUrlOf('lessons/_placeholder.json')).toBe('lessons/_placeholder.json')
  })

  it('re-places the sound only past the drift threshold', () => {
    expect(needsResync(10, 10.2)).toBe(false)
    expect(needsResync(10, 10.5)).toBe(true)
    expect(needsResync(17.3, 10)).toBe(true)
  })
})
