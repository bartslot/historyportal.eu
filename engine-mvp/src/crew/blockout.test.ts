import { describe, expect, it } from 'vitest'
import { blockoutCaption, isBlank } from './blockout'

describe('isBlank', () => {
  it('is blank for transparent or black pixels, not for a drawn stage', () => {
    expect(isBlank([0, 0, 0, 0, 0, 0, 0, 0])).toBe(true)
    expect(isBlank([0, 0, 0, 255, 2, 2, 2, 255])).toBe(true)
    expect(isBlank([0, 0, 0, 255, 120, 90, 60, 255])).toBe(false)
  })
})
describe('blockoutCaption', () => {
  it('prefers the writer sketch, else the first sentence of the designer text', () => {
    expect(blockoutCaption('A harbour at dawn.', 'Built it. More.')).toBe('A harbour at dawn.')
    expect(blockoutCaption(undefined, 'Built the harbour. Added ships.')).toBe('Built the harbour.')
    expect(blockoutCaption('  ', 'No stop')).toBe('No stop')
  })
})
