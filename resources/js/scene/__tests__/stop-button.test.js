import { describe, it, expect } from 'vitest'
import { stopButtonOn, stopHasContent } from '../stop-button.js'

/** Bart, 2026-11-23: an empty stop kept a button the class could click. */
describe('voyage stop button', () => {
  it('is off for an empty stop, even with a title', () => {
    expect(stopButtonOn(null)).toBe(false)
    expect(stopButtonOn({ title: 'Hormuz', date_label: '', story: '  ', images: [] })).toBe(false)
  })

  it('is on once the stop has a story or a picture', () => {
    expect(stopButtonOn({ story: 'Schepen zonder spijkers.' })).toBe(true)
    expect(stopButtonOn({ images: [{ url: '/a.jpg' }] })).toBe(true)
    expect(stopButtonOn({ images: ['/a.jpg'] })).toBe(true)
    expect(stopButtonOn({}, ['/pin.jpg'])).toBe(true)
    expect(stopHasContent({ images: [{ url: '' }] })).toBe(false)
  })

  it('follows the teacher switch either way', () => {
    expect(stopButtonOn({ story: 'Iets', button: false })).toBe(false)
    expect(stopButtonOn({ title: 'Hormuz', button: true })).toBe(true)
  })
})
