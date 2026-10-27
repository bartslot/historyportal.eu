import { describe, expect, it } from 'vitest'
import { ARM_BACK, ARM_FWD, armViolations } from './puppet'

describe('puppet 2D guards', () => {
  it('lets an arm swing inside the human range', () => expect(armViolations({ armN: 78, armF: -14 })).toEqual([]))
  it('catches an arm swung past the shoulder or behind the back', () => {
    expect(armViolations({ armN: ARM_FWD + 20, armF: 0 })).toHaveLength(1)
    expect(armViolations({ armN: 0, armF: -ARM_BACK - 15 })).toHaveLength(1)
  })
})
