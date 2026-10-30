import { describe, expect, it } from 'vitest'
import { FAQ, searchFaq } from './faq'

describe('help search', () => {
  it('finds by question, answer or keyword, ignoring case and accents', () => {
    expect(searchFaq('KEYFRAME').length).toBeGreaterThan(0)
    expect(searchFaq('ondertitel').length).toBe(0)
    expect(searchFaq('Subtítle').map((f) => f.q)).toContain('How do I write what is said?')
  })
  it('an empty search lists everything', () => {
    expect(searchFaq('  ')).toHaveLength(FAQ.length)
  })
  it('never uses a long dash in UI text', () => {
    expect(FAQ.some((f) => /—/.test(f.q + f.a))).toBe(false)
  })
})
