import { describe, expect, it } from 'vitest'
import * as L from './store'

describe('patchSceneSettings', () => {
  it('patches other scenes immutably, creates a doc for unopened ones, and restores them', () => {
    const { lesson } = L.getLesson()
    const id = Object.keys(lesson.scenes)[0]
    const entry = lesson.scenes[id]
    const prev = L.patchSceneSettings([id], { lookTime: 9, flag: true })
    const after = L.getLesson().lesson.scenes[id].doc
    expect(after.settings).toMatchObject({ lookTime: '9', flag: true })
    expect(after.version).toBe(1)
    expect(L.getLesson().lesson.scenes[id]).not.toBe(entry)
    L.restoreSceneDocs(prev)
    expect(L.getLesson().lesson.scenes[id].doc).toBe(prev[id])
  })
})
