import { describe, it, expect, afterEach } from 'vitest'
import { dioramaObjects } from '../scene-objects.js'

afterEach(() => { delete window.__diorama })

describe('the timeline lists diorama items', () => {
  it('one row per item on the stage, as a dio: target with its label', () => {
    window.__diorama = { items: () => [{ id: 'sailor_1', label: 'Sailor' }, { id: 'barrel_1' }] }
    expect(dioramaObjects()).toEqual([
      { target: 'dio:sailor_1', kind: 'dio', label: 'Sailor' },
      { target: 'dio:barrel_1', kind: 'dio', label: 'barrel_1' },
    ])
  })

  it('no diorama on the stage, no rows', () => {
    expect(dioramaObjects()).toEqual([])
  })
})
