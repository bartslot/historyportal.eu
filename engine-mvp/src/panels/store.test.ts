import { expect, test } from 'vitest'
import { panels } from './store'

test('the Reference column opens beside Settings without closing it', () => {
  panels.layoutFor('visual')
  panels.open('reference')
  expect(panels.isOpen('reference')).toBe(true)
  expect(panels.isOpen('inspector')).toBe(true)
})

test('Settings and Crew still share the right side: opening one closes the other', () => {
  panels.open('inspector')
  panels.open('crew')
  expect(panels.isOpen('crew')).toBe(true)
  expect(panels.isOpen('inspector')).toBe(false)
  expect(panels.isOpen('reference')).toBe(true)
})

test('changing step leaves the Reference column as the teacher set it', () => {
  panels.open('reference')
  panels.layoutFor('animate')
  expect(panels.isOpen('reference')).toBe(true)
  panels.close('reference')
  panels.layoutFor('visual')
  expect(panels.isOpen('reference')).toBe(false)
})

test('a step without the Reference column hides it but keeps it open for when you come back', () => {
  panels.open('reference')
  panels.layoutFor('script')
  panels.layoutFor('visual')
  expect(panels.isOpen('reference')).toBe(true)
})
