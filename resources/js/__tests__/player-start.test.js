import { startSceneIndex, mayAutoplay, canStartLesson } from '../player-start.js'

/**
 * The editor's Play opens the real player at the scene the teacher has selected (PM, 2026-10-17:
 * "speel de les doesn't really play the lesson"). The editor knows a scene by its id, the player
 * plays by index; and the teacher's click on Play, in the editor around the frame, is the gesture
 * that lets it start with sound.
 */
const params = (q) => new URLSearchParams(q)
const scenes = [{ id: 1589 }, { id: 1590 }, { id: 1591 }, { id: 1600 }]

describe('startSceneIndex', () => {
  it('maps the editor\'s scene id to the player\'s index', () => {
    expect(startSceneIndex(scenes, params('scene_id=1591'))).toBe(2)
    expect(startSceneIndex(scenes, params('scene_id=1600&scene=0'))).toBe(3)
  })
  it('an unknown id starts at the beginning, or at an index given as well', () => {
    expect(startSceneIndex(scenes, params('scene_id=9'))).toBe(0)
    expect(startSceneIndex(scenes, params('scene_id=9&scene=1'))).toBe(1)
  })
  it('keeps the old index parameter', () => {
    expect(startSceneIndex(scenes, params('scene=2'))).toBe(2)
    expect(startSceneIndex(scenes, params('scene=-4'))).toBe(0)
    expect(startSceneIndex(scenes, params(''))).toBe(0)
    expect(startSceneIndex(undefined, params('scene_id=1591'))).toBe(0)
  })
})

describe('mayAutoplay', () => {
  const win = (own, parent) => {
    const w = { navigator: { userActivation: own === undefined ? undefined : { hasBeenActive: own } } }
    w.parent = parent === undefined ? w : { navigator: { userActivation: { hasBeenActive: parent } } }
    return w
  }
  it('plays after a click in this page', () => expect(mayAutoplay(win(true))).toBe(true))
  it('a cold reload of a page on its own does not start talking', () => expect(mayAutoplay(win(false))).toBe(false))
  it('a frame plays when the page around it was clicked (the editor\'s Play)', () => {
    expect(mayAutoplay(win(false, true))).toBe(true)
    expect(mayAutoplay(win(false, false))).toBe(false)
  })
  it('a parent on another origin is no permission', () => {
    const w = win(false)
    Object.defineProperty(w, 'parent', { get () { throw new Error('cross-origin') } })
    expect(mayAutoplay(w)).toBe(false)
  })
  it('a browser without userActivation keeps the old behaviour', () => expect(mayAutoplay(win(undefined))).toBe(true))
})

/** Pair test round 5: a narration-free lesson showed "Audio wordt gemaakt…" forever. */
describe('canStartLesson', () => {
  test('a lesson with nothing generating can start, narrated or not', () => {
    expect(canStartLesson({ scenes: [{ kind: 'narration', status: 'ready' }, { kind: 'game', game_type: 'quiz', status: 'ready' }] })).toBe(true)
  })

  test('a lesson whose narration is still being made waits', () => {
    expect(canStartLesson({ scenes: [{ kind: 'narration', status: 'generating' }, { kind: 'narration', status: 'ready' }] })).toBe(false)
    expect(canStartLesson({ scenes: [{ kind: 'narration', status: 'pending' }] })).toBe(false)
  })

  test('scenes that play without narration never block, generating or not', () => {
    expect(canStartLesson({ scenes: [{ kind: 'map', status: 'pending' }, { kind: 'game', game_type: 'quiz', status: 'generating' }, { kind: 'narration', status: 'ready' }] })).toBe(true)
    // Re-narrating a scene that still has its old recording does not hold the class.
    expect(canStartLesson({ scenes: [{ kind: 'narration', status: 'generating', audio_url: '/a.m4a' }] })).toBe(true)
  })

  /** Pair test round 6: Start showed while later scenes were still being narrated. */
  test('a partly narrated lesson waits until every scene that needs a voice is made', () => {
    expect(canStartLesson({
      audio_url: '/lesson.m4a',
      scenes: [
        { kind: 'narration', status: 'ready', audio_url: '/1.m4a' },
        { kind: 'map', status: 'ready' },
        { kind: 'narration', status: 'pending' },
      ],
    })).toBe(false)
  })

  test('an empty lesson cannot start', () => {
    expect(canStartLesson({ scenes: [] })).toBe(false)
  })
})
