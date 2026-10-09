import { describe, expect, it } from 'vitest'
import { planChanges, type Setting } from './settings'

const offered: Setting[] = [
  { id: 'lookInk', label: 'Ink', type: 'range', min: 0, max: 1.5, step: 0.05, value: 0.9 },
  { id: 'lookOn', label: 'On', type: 'toggle', value: true },
  { id: 'lookInkBlend', label: 'Ink blend', type: 'select', options: [['0', 'Normal'], ['1', 'Multiply']], value: '0' },
]

describe('planChanges', () => {
  it('clamps a number to its range', () => {
    expect(planChanges(offered, [{ id: 'lookInk', value: 9 }])).toEqual([{ id: 'lookInk', value: 1.5 }])
  })
  it('drops a setting that was not offered and a non-number for a range', () => {
    expect(planChanges(offered, [{ id: 'skyUpload', value: 1 }, { id: 'lookInk', value: 'lots' }])).toEqual([])
  })
  it('keeps an option only when the control has it', () => {
    expect(planChanges(offered, [{ id: 'lookInkBlend', value: 1 }, { id: 'lookInkBlend', value: '7' }])).toEqual([{ id: 'lookInkBlend', value: '1' }])
  })
  it('reads a toggle as true or false', () => {
    expect(planChanges(offered, [{ id: 'lookOn', value: 'false' }])).toEqual([{ id: 'lookOn', value: false }])
  })
  it('ignores anything that is not a list', () => {
    expect(planChanges(offered, { id: 'lookInk', value: 1 })).toEqual([])
  })
})
