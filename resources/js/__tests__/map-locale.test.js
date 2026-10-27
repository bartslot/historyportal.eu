import { describe, test, expect, afterEach } from 'vitest'
import { mapLocale } from '../map-locale.js'

/** Pair test 2026-10-24: a Dutch editor's map announced itself as "Map" with "Zoom in"/"Zoom out". */
describe('mapLocale', () => {
  afterEach(() => { delete window.__lpLang })

  test('hands MapLibre the translated control labels', () => {
    window.__lpLang = { Map: 'Kaart', 'Zoom in': 'Inzoomen', 'Zoom out': 'Uitzoomen' }

    const locale = mapLocale()

    expect(locale['Map.Title']).toBe('Kaart')
    expect(locale['NavigationControl.ZoomIn']).toBe('Inzoomen')
    expect(locale['NavigationControl.ZoomOut']).toBe('Uitzoomen')
  })

  test('falls back to English when no dictionary is published', () => {
    expect(mapLocale()['NavigationControl.ZoomIn']).toBe('Zoom in')
  })
})
