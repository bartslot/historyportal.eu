import { beforeEach, describe, expect, it } from 'vitest'
import * as L from './store'

beforeEach(() => {
  const l = L.getLesson().lesson
  L.replaceLesson({ ...l, step: 'script', reached: 'script', approved: false })
})

describe('steps, strictly in order', () => {
  it('Visual waits for the approved script, Animate for the finished picture', () => {
    expect(L.lockedReason('visual')).toBe('Approve the script first')
    expect(L.goToStep('animate')).toBe(false)
    L.approveScript()
    expect(L.stepOf()).toBe('visual')
    expect(L.lockedReason('animate')).toBe('Finish the visual step first')
    L.finishVisual()
    expect(L.stepOf()).toBe('animate')
  })
  it('going back is always allowed', () => {
    L.approveScript(); L.finishVisual()
    expect(L.goToStep('script')).toBe(true)
    expect(L.goToStep('animate')).toBe(true)
  })
})
