import { describe, expect, it } from 'vitest'
import { DEFAULT_LESSON, lessonUrlOf, needsResync, syncAction, voiceUrl, type SyncState } from './route'

describe('play route', () => {
  it('plays hunebedden by default, and only vault lessons', () => {
    expect(DEFAULT_LESSON).toBe('hunebedden')
    expect(lessonUrlOf(null)).toBe('lessons/vault/hunebedden/lesson.json')
    expect(lessonUrlOf('voc')).toBe('lessons/vault/voc/lesson.json')
    expect(lessonUrlOf('/Users/x/Memory/historyportal/topics/autonomous-lessons/lessons/eerste-boeren-1/lesson.json')).toBe('lessons/vault/eerste-boeren-1/lesson.json')
    expect(lessonUrlOf('topics/autonomous-lessons/lessons/eerste-boeren-2/')).toBe('lessons/vault/eerste-boeren-2/lesson.json')
    for (const bad of ['https://evil.example/l.json', '../../etc/passwd', 'lessons/_placeholder.json', 'topics/autonomous-lessons/lessons/../x', 'a b'])
      expect(() => lessonUrlOf(bad), bad).toThrow()
  })

  it('finds a scene\'s narration (scene.audio) under the narration root, never outside it', () => {
    expect(voiceUrl('hunebedden/sc01.mp3')).toBe('narration/hunebedden/sc01.mp3')
    for (const bad of ['../voc/sc01.mp3', '/etc/sc01.mp3', 'hunebedden/../x.mp3', 'hunebedden/sc01.exe', 'sc01.mp3', undefined, '',
      // escapes the browser would decode on the way out (the checker's %2e%2e fetched outside the folder)
      '%2e%2e/%2e%2e/escape.mp3', 'hunebedden/%2e%2e%2fescape.mp3', '..%2fvoc%2fsc01.mp3', 'hunebedden%2f..%2f..%2fx.mp3',
      'hunebedden\\..\\x.mp3', 'hunebedden/..\\x.mp3', 'http://evil.example/x.mp3', '//evil.example/x.mp3', 'C:/x/sc01.mp3',
      'hunebedden/sc01.mp3?x=1', 'hunebedden/sc01.mp3#x', 'hunebedden/%zz.mp3', 'hunebedden/./sc01.mp3', 'hunebedden//sc01.mp3'])
      expect(voiceUrl(bad), String(bad)).toBeUndefined()
    expect(voiceUrl('hunebedden/sc01.v2.mp3')).toBe('narration/hunebedden/sc01.v2.mp3')
    // what the browser fetches stays under /narration/ for every accepted path
    for (const ok of ['hunebedden/sc01.mp3', 'voc/sc12.m4a']) expect(new URL(voiceUrl(ok)!, 'http://h/play.html').pathname.startsWith('/narration/')).toBe(true)
  })

  it('re-places the sound only past the drift threshold', () => {
    expect(needsResync(10, 10.2)).toBe(false)
    expect(needsResync(10, 10.5)).toBe(true)
  })
})

describe('sound follows the picture (syncAction)', () => {
  const base: SyncState = { mode: 'playing', cardOpen: false, ctxRunning: true, soundTime: 10, clock: 10, msSinceFix: 5000 }
  it('leaves a card\'s held sound alone', () => expect(syncAction({ ...base, cardOpen: true, mode: 'holding', soundTime: 0 })).toBe('none'))
  it('suspends on pause, a hold without a card, and the end', () => {
    for (const mode of ['paused', 'holding', 'ended'] as const) expect(syncAction({ ...base, mode })).toBe('suspend')
    expect(syncAction({ ...base, mode: 'paused', ctxRunning: false })).toBe('none')
  })
  it('resumes when the picture plays again', () => expect(syncAction({ ...base, ctxRunning: false })).toBe('resume'))
  it('re-places a drifted sound, at most once a second', () => {
    expect(syncAction({ ...base, soundTime: 3 })).toBe('resync')
    expect(syncAction({ ...base, soundTime: 3, msSinceFix: 200 })).toBe('none')
    expect(syncAction({ ...base, soundTime: 10.1 })).toBe('none')
  })
})
